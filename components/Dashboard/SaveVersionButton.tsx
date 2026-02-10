'use client'
import React from 'react'
import { useForm, Button } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

export const SaveVersionButton: React.FC = () => {
  const { submit } = useForm()
  const router = useRouter()

  const handleSave = async () => {
    // This triggers a save as a draft/version in Payload
    await submit({ overrides: { _status: 'draft' } })
    router.refresh()
  }

  return (
    <Button 
      buttonStyle="secondary" 
      onClick={handleSave}
      className="save-version-button"
    >
      Save Version
    </Button>
  )
}
