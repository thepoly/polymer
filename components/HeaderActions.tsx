'use client'
import React from 'react'
import { PublishButton } from '@payloadcms/ui'
import { WorkflowActions } from './WorkflowActions'

export const HeaderActions: React.FC = () => {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <WorkflowActions />
      <PublishButton />
    </div>
  )
}
