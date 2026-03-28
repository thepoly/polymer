'use client'

import type { FormEvent } from 'react'
import { useRef, useState } from 'react'

type ImportState =
  | { type: 'idle'; message: string | null }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

const parseResponseBody = async (
  response: Response,
): Promise<{
  error?: string
  exportedAt?: string
  requestId?: string
  serverPath?: string
  downloadUrl?: string
}> => {
  const text = await response.text()

  if (!text) {
    return {}
  }

  const contentType = response.headers.get('content-type') || ''

  try {
    return JSON.parse(text) as {
      error?: string
      exportedAt?: string
      requestId?: string
      serverPath?: string
      downloadUrl?: string
    }
  } catch {
    if (contentType.includes('text/html')) {
      const titleMatch = text.match(/<title>(.*?)<\/title>/i)
      const headingMatch = text.match(/<h1[^>]*>(.*?)<\/h1>/i)
      const summary = titleMatch?.[1] || headingMatch?.[1] || 'The server returned an HTML error page.'

      return {
        error: summary.replace(/\s+/g, ' ').trim(),
      }
    }

    return {
      error: text.trim() || 'The server returned an unreadable response.',
    }
  }
}

export const BackupPanel = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [state, setState] = useState<ImportState>({ type: 'idle', message: null })
  const [serverArchivePath, setServerArchivePath] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const response = await fetch('/api/admin/archive/export', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
        },
      })

      const payload = await parseResponseBody(response)

      if (!response.ok || !payload.downloadUrl || !payload.serverPath) {
        throw new Error(payload.error || 'Export failed.')
      }

      setServerArchivePath(payload.serverPath)
      setState({
        type: 'success',
        message: `Archive built. Server copy: ${payload.serverPath}`,
      })

      window.location.href = payload.downloadUrl
    } catch (error) {
      setState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Export failed.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const file = fileInputRef.current?.files?.[0]
    const trimmedServerPath = serverArchivePath.trim()

    if (!file && !trimmedServerPath) {
      setState({ type: 'error', message: 'Choose a ZIP or enter a server archive path.' })
      return
    }

    const confirmed = window.confirm(
      'Importing replaces the current database and media library. Continue?',
    )

    if (!confirmed) {
      return
    }

    setIsImporting(true)
    setState({ type: 'idle', message: null })

    try {
      const response = trimmedServerPath
        ? await fetch('/api/admin/archive/import', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ serverPath: trimmedServerPath }),
          })
        : await fetch('/api/admin/archive/import', {
            method: 'POST',
            body: (() => {
              const formData = new FormData()
              formData.set('archive', file as File)
              return formData
            })(),
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
              Accept: 'application/json',
            },
          })

      const payload = await parseResponseBody(response)

      if (!response.ok) {
        const requestIdSuffix = payload.requestId ? ` Request ID: ${payload.requestId}.` : ''
        throw new Error((payload.error || 'Import failed.') + requestIdSuffix)
      }

      setState({
        type: 'success',
        message: payload.exportedAt
          ? `Archive imported. Export timestamp: ${new Date(payload.exportedAt).toLocaleString()}.`
          : 'Archive imported successfully.',
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Import failed.',
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="dashboard-backup-panel">
      <div className="dashboard-backup-copy">
        <p className="dashboard-backup-eyebrow">Disaster Recovery</p>
        <h2>Export everything. Restore everything.</h2>
        <p className="subtext">
          Download a ZIP with the full Postgres database and every uploaded image in
          <code> media/</code>. Export also saves a server-side copy so large restores can bypass
          browser upload limits.
        </p>
      </div>

      <div className="dashboard-backup-actions">
        <button
          type="button"
          className="dashboard-backup-button dashboard-backup-button-primary"
          onClick={handleExport}
          disabled={isExporting || isImporting}
        >
          {isExporting ? 'Building archive...' : 'Export ZIP'}
        </button>

        <form className="dashboard-backup-import-form" onSubmit={handleImport}>
          <label className="dashboard-backup-file">
            <span>Import ZIP Upload</span>
            <input ref={fileInputRef} type="file" accept=".zip,application/zip" />
          </label>
          <label className="dashboard-backup-file">
            <span>Server Archive Path</span>
            <input
              type="text"
              value={serverArchivePath}
              onChange={(event) => setServerArchivePath(event.target.value)}
              placeholder="/home/red/poly/polymer/.payload-archives/payload-backup-....zip"
            />
          </label>
          <button
            type="submit"
            className="dashboard-backup-button dashboard-backup-button-danger"
            disabled={isImporting || isExporting}
          >
            {isImporting ? 'Importing archive...' : 'Replace Instance'}
          </button>
        </form>
      </div>

      {state.message && (
        <p
          className={
            state.type === 'error'
              ? 'dashboard-backup-status dashboard-backup-status-error'
              : 'dashboard-backup-status dashboard-backup-status-success'
          }
        >
          {state.message}
        </p>
      )}
    </section>
  )
}
