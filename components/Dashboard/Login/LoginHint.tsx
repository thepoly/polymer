'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'

const LoginHintInner = () => {
  const [showHint, setShowHint] = useState(false)
  const [target, setTarget] = useState<Element | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const check = useCallback(() => {
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement
    
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
        if (showHint) setShowHint(false)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
          timerRef.current = null
        }
      }
      return true
    }
    return false
  }, [showHint, target])

  useEffect(() => {
    const interval = setInterval(check, 500)
    
    const handleInput = () => {
      if (showHint) setShowHint(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      check()
    }

    document.addEventListener('input', handleInput)

    return () => {
      clearInterval(interval)
      document.removeEventListener('input', handleInput)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [check, showHint])

  if (!showHint || !target) return null

  return createPortal(
    <div className="login-hit-enter-hint">
      hit enter
    </div>,
    target
  )
}

export const LoginHint = () => {
  const pathname = usePathname()
  const isLoginPage = /\/login\/?$/.test(pathname || '')

  if (!isLoginPage) return null

  return <LoginHintInner />
}
