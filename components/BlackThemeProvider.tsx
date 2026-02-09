'use client'
import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { User } from '@/payload-types'

export const BlackThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth<User>()
  const pathname = usePathname()

  useEffect(() => {
    const isLoginPage = /\/login\/?$/.test(pathname || '')
    const isBlack = user?.blackTheme || isLoginPage
    
    if (isBlack) {
      document.documentElement.setAttribute('data-black-theme', 'true')
    } else {
      document.documentElement.removeAttribute('data-black-theme')
    }
  }, [user, pathname])

  return <>{children}</>
}
