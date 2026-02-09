'use client'
import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'
import type { User } from '@/payload-types'

export const BlackThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth<User>()

  useEffect(() => {
    const isBlack = user?.blackTheme
    
    if (isBlack) {
      document.documentElement.setAttribute('data-black-theme', 'true')
    } else {
      document.documentElement.removeAttribute('data-black-theme')
    }
  }, [user])

  return <>{children}</>
}
