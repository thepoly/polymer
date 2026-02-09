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

  const headshot = user?.headshot && typeof user.headshot === 'object' ? user.headshot : null

  return (
    <div className="greeting-container">
      <div className="greeting">
        <h1>Hi {firstName}! What&apos;s the plan for today?</h1>
        
        {/* Role Footer */}
        <div className="role-footer">
          <div className="role-footer-content">
            <span className="role-label">Access Level</span>
            <span className="role-value">{status}</span>
          </div>
        </div>
      </div>
      <a href="/admin/account" className="profile-link">
        {headshot?.url && (
          <div className="profile-picture">
            <img src={headshot.url} alt={firstName} />
          </div>
        )}
        {!headshot?.url && (
          <div className="profile-picture-fallback">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
      </a>
    </div>
  )
}