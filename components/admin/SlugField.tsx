'use client'

import { useField, useFormFields, TextInput, FieldLabel } from '@payloadcms/ui'
import { useCallback, useEffect, useRef } from 'react'

function toSlug(value: string): string {
  const words = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
  return words.join('-')
}

export const SlugField = ({ path, label }: { path: string; label?: string }) => {
  const { value, setValue } = useField<string>({ path })
  const title = useFormFields(([fields]) => fields['title'])
  const userEditedRef = useRef(false)

  // If the doc already has a slug on mount, treat it as user-set
  useEffect(() => {
    if (value) {
      userEditedRef.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userEditedRef.current) return
    const titleValue = title?.value as string | undefined
    if (!titleValue) return
    setValue(toSlug(titleValue))
  }, [title?.value, setValue])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value
      userEditedRef.current = next !== ''
      setValue(next)
    },
    [setValue],
  )

  return (
    <div>
      <FieldLabel label={label ?? 'Slug'} htmlFor={`field-${path}`} />
      <TextInput
        path={path}
        value={value ?? ''}
        onChange={handleChange}
      />
    </div>
  )
}
