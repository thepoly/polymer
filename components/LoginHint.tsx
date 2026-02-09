'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'

export const LoginHint = () => {
  const pathname = usePathname()
  const [showHint, setShowHint] = useState(false)
  const [target, setTarget] = useState<Element | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const isLoginPage = /\/login\/?$/.test(pathname || '')
    if (!isLoginPage) {
      setShowHint(false)
      setTarget(null)
      return
    }

    const check = () => {
      const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement
      
      // Try multiple selectors for the password field container
      const passwordField = document.querySelector('.field-type-password') || 
                            document.querySelector('.password') ||
                            passwordInput?.parentElement

      if (passwordField && !target) {
        setTarget(passwordField)
      }

      if (emailInput && passwordInput) {
        if (emailInput.value && passwordInput.value) {
          if (!timerRef.current && !showHint) {
            timerRef.current = setTimeout(() => {
              setShowHint(true)
            }, 1000)
          }
        } else {
          setShowHint(false)
          if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
          }
        }
        return true
      }
      return false
    }

    // Polling as a fallback to MutationObserver for high reliability
    const interval = setInterval(check, 500)
    
    const handleInput = () => {
      setShowHint(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      // check() will be called by interval or we can call it here
      check()
    }

    document.addEventListener('input', handleInput)

    return () => {
      clearInterval(interval)
      document.removeEventListener('input', handleInput)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname]) // Removed target from dependencies

  if (!showHint || !target) return null

  return createPortal(
    <div className="login-hit-enter-hint">
      hit enter
    </div>,
    target
  )
}
