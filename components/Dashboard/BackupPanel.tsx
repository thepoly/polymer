'use client'

import type { FormEvent } from 'react'
import { useRef, useState } from 'react'

type ImportState =
  | { type: 'idle'; message: string | null }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

export const BackupPanel = () => {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [state, setState] = useState<ImportState>({ type: 'idle', message: null })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = () => {
    setIsExporting(true)
    window.location.href = '/api/admin/archive/export'
    window.setTimeout(() => {
      setIsExporting(false)
    }, 1500)
  }

  const handleImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const file = fileInputRef.current?.files?.[0]

    if (!file) {
      setState({ type: 'error', message: 'Choose a ZIP archive first.' })
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
      const formData = new FormData()
      formData.set('archive', file)

      const response = await fetch('/api/admin/archive/import', {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json()) as {
        error?: string
        exportedAt?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || 'Import failed.')
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
          <code> media/</code>. Importing the same ZIP replaces the current instance.
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
            <span>Import ZIP</span>
            <input ref={fileInputRef} type="file" accept=".zip,application/zip" />
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
