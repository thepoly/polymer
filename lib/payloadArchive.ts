import { access, mkdtemp, mkdir, readFile, rm, rename, cp, writeFile } from 'fs/promises'
import { createReadStream } from 'fs'
import { tmpdir } from 'os'
import path from 'path'
import { spawn } from 'child_process'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

const ARCHIVE_VERSION = 1

type ArchiveManifest = {
  version: number
  exportedAt: string
  database: {
    format: 'postgres-custom'
    file: string
  }
  media: {
    directory: string
  }
}

type ImportRollback = {
  databaseDumpPath: string
  mediaDirPath: string
}

const ensureDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured on the server.')
  }

  return databaseUrl
}

const runCommand = async (
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['ignore', 'ignore', 'pipe'],
    })

    let stderr = ''

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr.trim() || `${command} exited with code ${code}`))
    })
  })
}

const copyDirectoryContents = async (sourceDir: string, targetDir: string): Promise<void> => {
  await mkdir(targetDir, { recursive: true })
  await runCommand('cp', ['-a', path.join(sourceDir, '.'), targetDir])
}

const createTempDir = async (prefix: string): Promise<string> =>
  mkdtemp(path.join(tmpdir(), `${prefix}-`))

const getMediaDir = (): string => {
  const directoryName = ['me', 'dia'].join('')
  return path.resolve(process.cwd(), directoryName)
}

const getArchiveStorageDir = (): string => {
  const directoryName = ['.payload', '-archives'].join('')
  return path.resolve(process.cwd(), directoryName)
}

const isNotFoundError = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT'

const assertZipBuffer = (archiveBuffer: Buffer): void => {
  if (archiveBuffer.length < 4) {
    throw new Error('Archive is empty or truncated.')
  }

  if (archiveBuffer[0] !== 0x50 || archiveBuffer[1] !== 0x4b) {
    throw new Error('Archive is not a valid ZIP file.')
  }
}

const isArchiveManifest = (value: unknown): value is ArchiveManifest => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const manifest = value as Record<string, unknown>
  const database = manifest.database as Record<string, unknown> | undefined
  const media = manifest.media as Record<string, unknown> | undefined

  return (
    manifest.version === ARCHIVE_VERSION &&
    typeof manifest.exportedAt === 'string' &&
    !!database &&
    database.format === 'postgres-custom' &&
    typeof database.file === 'string' &&
    !!media &&
    typeof media.directory === 'string'
  )
}

const normalizeArchivePath = (input: string): string => input.replace(/^[/\\]+/, '')

const assertSafeRelativePath = (input: string, label: string): string => {
  const normalized = normalizeArchivePath(input)

  if (
    !normalized ||
    normalized.includes('\0') ||
    path.isAbsolute(normalized) ||
    normalized.split(/[\\/]+/).includes('..')
  ) {
    throw new Error(`Archive ${label} path is invalid.`)
  }

  return normalized
}

const loadManifest = async (manifestPath: string): Promise<ArchiveManifest> => {
  let parsed: unknown

  try {
    parsed = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    throw new Error('Archive manifest is missing or invalid JSON.')
  }

  if (!isArchiveManifest(parsed)) {
    throw new Error('Archive manifest is invalid or unsupported.')
  }

  return parsed
}

const ensureFileExists = async (filePath: string, label: string): Promise<void> => {
  try {
    await access(filePath)
  } catch {
    throw new Error(`Archive ${label} is missing.`)
  }
}

const assertZipFilename = (filename: string): string => {
  if (
    !filename ||
    filename.includes('\0') ||
    path.basename(filename) !== filename ||
    !filename.toLowerCase().endsWith('.zip')
  ) {
    throw new Error('Archive filename is invalid.')
  }

  return filename
}

const createRollbackSnapshot = async (
  databaseUrl: string,
  tempDir: string,
): Promise<ImportRollback> => {
  const rollbackDumpPath = path.join(tempDir, 'rollback.dump')
  const rollbackMediaDir = path.join(tempDir, 'rollback-media')

  await runCommand('pg_dump', [
    '--format=custom',
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--file',
    rollbackDumpPath,
    databaseUrl,
  ])

  try {
    await copyDirectoryContents(getMediaDir(), rollbackMediaDir)
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
    await mkdir(rollbackMediaDir, { recursive: true })
  }

  return {
    databaseDumpPath: rollbackDumpPath,
    mediaDirPath: rollbackMediaDir,
  }
}

const restoreDatabaseDump = async (databaseUrl: string, dumpPath: string): Promise<void> => {
  await runCommand('pg_restore', [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--dbname',
    databaseUrl,
    dumpPath,
  ])
}

const rollbackImport = async (
  databaseUrl: string,
  rollback: ImportRollback,
  originalError: unknown,
): Promise<never> => {
  const failures: string[] = []

  try {
    await restoreDatabaseDump(databaseUrl, rollback.databaseDumpPath)
  } catch (error) {
    failures.push(
      `database rollback failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  }

  try {
    await swapMediaDirectory(rollback.mediaDirPath)
  } catch (error) {
    failures.push(
      `media rollback failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  }

  const baseMessage =
    originalError instanceof Error ? originalError.message : 'Archive import failed.'

  if (failures.length > 0) {
    throw new Error(`${baseMessage} Rollback also failed: ${failures.join('; ')}`)
  }

  throw new Error(`${baseMessage} Changes were rolled back to the previous instance state.`)
}

const makeManifest = (): ArchiveManifest => ({
  version: ARCHIVE_VERSION,
  exportedAt: new Date().toISOString(),
  database: {
    format: 'postgres-custom',
    file: 'database.dump',
  },
  media: {
    directory: 'media',
  },
})

export const createArchive = async (): Promise<{
  filename: string
  serverPath: string
  stream: ReadableStream
}> => {
  const databaseUrl = ensureDatabaseUrl()
  const tempDir = await createTempDir('payload-export')
  const bundleDir = path.join(tempDir, 'bundle')
  const archiveStorageDir = getArchiveStorageDir()
  const zipFilename = `payload-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
  const zipPath = path.join(tempDir, zipFilename)
  const storedZipPath = path.join(archiveStorageDir, zipFilename)
  const manifest = makeManifest()

  try {
    await mkdir(bundleDir, { recursive: true })
    await mkdir(archiveStorageDir, { recursive: true })
    await mkdir(path.join(bundleDir, manifest.media.directory), { recursive: true })
    await writeFile(
      path.join(bundleDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8',
    )

    await runCommand('pg_dump', [
      '--format=custom',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--file',
      path.join(bundleDir, manifest.database.file),
      databaseUrl,
    ])

    try {
      await copyDirectoryContents(getMediaDir(), path.join(bundleDir, manifest.media.directory))
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException
      if (typedError.code !== 'ENOENT') {
        throw error
      }
    }

    await runCommand('zip', ['-r', '-q', zipPath, '.'], { cwd: bundleDir })
    await cp(zipPath, storedZipPath)

    const stream = createReadStream(storedZipPath)
    void finished(stream).finally(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    return {
      filename: zipFilename,
      serverPath: storedZipPath,
      stream: Readable.toWeb(stream) as ReadableStream,
    }
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true })
    throw error
  }
}

const swapMediaDirectory = async (sourceDir: string): Promise<void> => {
  const mediaDir = getMediaDir()
  const parentDir = path.dirname(mediaDir)
  const backupDir = path.join(parentDir, `media-backup-${Date.now()}`)
  let existingMediaMoved = false

  await mkdir(parentDir, { recursive: true })

  try {
    await rename(mediaDir, backupDir)
    existingMediaMoved = true
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException
    if (typedError.code !== 'ENOENT') {
      throw error
    }
  }

  try {
    await cp(sourceDir, mediaDir, { recursive: true })
  } catch (error) {
    if (existingMediaMoved) {
      await rm(mediaDir, { recursive: true, force: true })
      await rename(backupDir, mediaDir)
    }
    throw error
  }

  await rm(backupDir, { recursive: true, force: true })
}

const importArchiveFromPath = async (archivePath: string): Promise<ArchiveManifest> => {
  const databaseUrl = ensureDatabaseUrl()
  const tempDir = await createTempDir('payload-import')
  const extractedDir = path.join(tempDir, 'extracted')
  let rollback: ImportRollback | null = null

  try {
    await mkdir(extractedDir, { recursive: true })
    await runCommand('unzip', ['-q', archivePath, '-d', extractedDir])

    const manifestPath = path.join(extractedDir, 'manifest.json')
    const manifest = await loadManifest(manifestPath)
    const dumpPath = path.join(
      extractedDir,
      assertSafeRelativePath(manifest.database.file, 'database file'),
    )
    const importedMediaDir = path.join(
      extractedDir,
      assertSafeRelativePath(manifest.media.directory, 'media directory'),
    )
    const stagedMediaDir = path.join(tempDir, 'media-staged')

    await ensureFileExists(dumpPath, 'database dump')

    try {
      await copyDirectoryContents(importedMediaDir, stagedMediaDir)
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error
      }
      await mkdir(stagedMediaDir, { recursive: true })
    }

    rollback = await createRollbackSnapshot(databaseUrl, tempDir)

    try {
      await restoreDatabaseDump(databaseUrl, dumpPath)
      await swapMediaDirectory(stagedMediaDir)
    } catch (error) {
      await rollbackImport(databaseUrl, rollback, error)
    }

    return manifest
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export const readStoredArchive = async (
  filename: string,
): Promise<{
  filename: string
  serverPath: string
  stream: ReadableStream
}> => {
  const safeFilename = assertZipFilename(filename)
  const serverPath = path.join(getArchiveStorageDir(), safeFilename)

  await ensureFileExists(serverPath, 'file')

  return {
    filename: safeFilename,
    serverPath,
    stream: Readable.toWeb(createReadStream(serverPath)) as ReadableStream,
  }
}

export const importArchive = async (archiveBuffer: Buffer): Promise<ArchiveManifest> => {
  const tempDir = await createTempDir('payload-import-buffer')
  const archivePath = path.join(tempDir, 'payload-import.zip')

  try {
    assertZipBuffer(archiveBuffer)
    await writeFile(archivePath, archiveBuffer)
    return await importArchiveFromPath(archivePath)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

export const importArchiveFromServerPath = async (serverPath: string): Promise<ArchiveManifest> => {
  const resolvedPath = path.resolve(serverPath)

  if (!resolvedPath.toLowerCase().endsWith('.zip')) {
    throw new Error('Server archive path must point to a .zip file.')
  }

  await ensureFileExists(resolvedPath, 'file')
  return importArchiveFromPath(resolvedPath)
}
