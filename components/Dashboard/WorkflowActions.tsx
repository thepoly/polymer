'use client'
import React from 'react'
import { useForm, useDocumentInfo, useAuth, Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import type { User, Article } from '@/payload-types'

export const WorkflowActions: React.FC = () => {
  const { submit } = useForm()
  const { initialData } = useDocumentInfo()
  const { user } = useAuth<User>()
  const router = useRouter()

  const status = (initialData as Article)?.status || 'draft'
  const roles = user?.roles || []
  const isEIC = roles.includes('eic') || roles.includes('admin')
  
  let actionText = ''
  let nextStatus = ''
  let btnClass = ''
  let showAdvanceButton = true

  switch (status) {
    case 'draft':
      actionText = 'Send to Copy'
      nextStatus = 'needs-copy'
      btnClass = 'btn-blue'
      break
    case 'needs-copy':
      actionText = 'Start Copy Process'
      nextStatus = 'needs-1st'
      btnClass = 'btn-yellow'
      break
    case 'needs-1st':
    case 'needs-2nd':
      const isNeeds1st = status === 'needs-1st'
      actionText = isNeeds1st ? 'Submit 1st' : 'Submit 2nd'
      nextStatus = isNeeds1st ? 'needs-2nd' : 'needs-3rd'
      btnClass = 'btn-yellow'
      break
    case 'needs-3rd':
      if (isEIC) {
        actionText = 'Mark Ready to Publish'
        nextStatus = 'ready'
        btnClass = 'btn-green'
      } else {
        showAdvanceButton = false 
      }
      break
    default:
      showAdvanceButton = false
  }

  const handleAdvance = async () => {
    if (nextStatus) {
      await submit({ overrides: { status: nextStatus } })
      router.refresh()
    }
  }

  if (!showAdvanceButton) return null

  return (
    <Button 
      buttonStyle="secondary" 
      onClick={handleAdvance}
      className={`workflow-header-button ${btnClass}`}
    >
      {actionText}
    </Button>
  )
}