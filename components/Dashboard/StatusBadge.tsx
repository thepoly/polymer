'use client'
import React from 'react'
import './status.css'

const labels: Record<string, string> = {
  draft: 'Draft',
  'needs-copy': 'Needs Assignment',
  'needs-1st': 'Needs 1st Copy',
  'needs-2nd': 'Needs 2nd Copy',
  'needs-3rd': 'Needs 3rd Copy',
  ready: 'Ready to Publish',
  published: 'Published',
}

export const StatusBadge = ({ cellData }: { cellData: string }) => {
  const statusClass = `status-${cellData}`
  return (
    <div className={`badge ${statusClass}`}>
      {labels[cellData] || cellData}
    </div>
  )
}