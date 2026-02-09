import React from 'react'
import type { User } from '@/payload-types.ts'

export const Greeting = ({ user }: { user: User | null | undefined }) => {
  // Fallback if name is missing (e.g. strict null checks)
  const firstName = user?.firstName || user?.email || 'Editor'
  
  // Get the highest role to show as status
  const roles = user?.roles || []
  const status = roles.includes('admin') ? 'Admin' 
               : roles.includes('eic') ? 'EIC'
               : roles.includes('copy-editor') ? 'Copy Editor'
               : roles.includes('editor') ? 'Section Editor'
               : 'Writer'

  return (
    <div className="greeting">
      <h1>Hi {firstName}!</h1>
      <p className="subtext">What&apos;s the plan for today?</p>
      
      {/* Role Footer */}
      <div className="role-footer">
        <div className="role-footer-content">
          <span className="role-label">Access Level</span>
          <span className="role-value">{status}</span>
        </div>
      </div>
    </div>
  )
}