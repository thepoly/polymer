import { mkdtemp, mkdir, readFile, rm, rename, cp, writeFile } from 'fs/promises'
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

const createTempDir = async (prefix: string): Promise<string> =>
  mkdtemp(path.join(tmpdir(), `${prefix}-`))

const getMediaDir = (): string => {
  const directoryName = ['me', 'dia'].join('')
  return path.resolve(process.cwd(), directoryName)
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
  stream: ReadableStream
}> => {
  const databaseUrl = ensureDatabaseUrl()
  const tempDir = await createTempDir('payload-export')
  const bundleDir = path.join(tempDir, 'bundle')
  const zipFilename = `payload-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
  const zipPath = path.join(tempDir, zipFilename)
  const manifest = makeManifest()

  try {
    await mkdir(bundleDir, { recursive: true })
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
      await cp(getMediaDir(), path.join(bundleDir, manifest.media.directory), { recursive: true })
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException
      if (typedError.code !== 'ENOENT') {
        throw error
      }
    }

    await runCommand('zip', ['-r', '-q', zipPath, '.'], { cwd: bundleDir })

    const stream = createReadStream(zipPath)
    void finished(stream).finally(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    return {
      filename: zipFilename,
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

export const importArchive = async (archiveBuffer: Buffer): Promise<ArchiveManifest> => {
  const databaseUrl = ensureDatabaseUrl()
  const tempDir = await createTempDir('payload-import')
  const archivePath = path.join(tempDir, 'payload-import.zip')
  const extractedDir = path.join(tempDir, 'extracted')

  try {
    await writeFile(archivePath, archiveBuffer)
    await mkdir(extractedDir, { recursive: true })
    await runCommand('unzip', ['-q', archivePath, '-d', extractedDir])

    const manifestPath = path.join(extractedDir, 'manifest.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ArchiveManifest

    if (manifest.version !== ARCHIVE_VERSION) {
      throw new Error(`Unsupported archive version: ${manifest.version}`)
    }

    if (manifest.database.format !== 'postgres-custom') {
      throw new Error(`Unsupported database format: ${manifest.database.format}`)
    }

    const dumpPath = path.join(extractedDir, manifest.database.file)
    const importedMediaDir = path.join(extractedDir, manifest.media.directory)
    const stagedMediaDir = path.join(tempDir, 'media-staged')

    try {
      await cp(importedMediaDir, stagedMediaDir, { recursive: true })
    } catch (error) {
      const typedError = error as NodeJS.ErrnoException
      if (typedError.code !== 'ENOENT') {
        throw error
      }
      await mkdir(stagedMediaDir, { recursive: true })
    }

    await runCommand('pg_restore', [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      '--dbname',
      databaseUrl,
      dumpPath,
    ])

    await swapMediaDirectory(stagedMediaDir)

    return manifest
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
