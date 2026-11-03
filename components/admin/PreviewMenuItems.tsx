'use client'

import { PopupList, toast, useDocumentInfo } from '@payloadcms/ui'

/**
 * Entries in the three-dot menu beside Publish on an article: open the draft
 * preview, or copy its link. Neither checks a permission — the preview page
 * itself only asks for a newsroom login — so anyone who can open the article
 * can see how it will look.
 */
export function PreviewMenuItems() {
  const { id } = useDocumentInfo()
  if (!id) return null

  const path = `/preview/${id}`

  const copyLink = async () => {
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Preview link copied. It works for anyone signed in to the newsroom.')
    } catch {
      toast.error(`Could not copy. The link is ${url}`)
    }
  }

  return (
    <>
      <PopupList.Button
        id="action-preview-draft"
        onClick={() => {
          window.open(path, '_blank', 'noopener')
        }}
      >
        Preview draft
      </PopupList.Button>
      <PopupList.Button id="action-copy-preview-link" onClick={copyLink}>
        Copy preview link
      </PopupList.Button>
    </>
  )
}
