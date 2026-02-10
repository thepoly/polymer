'use client'

import { useRowLabel } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

export const PositionRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ jobTitle?: { title: string } | string | number }>()
  const [fetchedName, setFetchedName] = useState<string>('')

  const jobTitle = data?.jobTitle

  useEffect(() => {
    if (jobTitle && (typeof jobTitle === 'number' || typeof jobTitle === 'string')) {
      // If we only have an ID (common in the admin UI before population), fetch the document
      fetch(`/api/job-titles/${jobTitle}?depth=0`)
        .then((res) => res.json())
        .then((doc) => {
          if (doc?.title) {
            setFetchedName(doc.title)
          } else {
            setFetchedName(String(jobTitle))
          }
        })
        .catch(() => {
          setFetchedName(String(jobTitle))
        })
    }
  }, [jobTitle])

  let positionName = ''
  if (typeof jobTitle === 'object' && jobTitle?.title) {
    positionName = jobTitle.title
  } else if (fetchedName) {
    positionName = fetchedName
  } else if (jobTitle && (typeof jobTitle === 'number' || typeof jobTitle === 'string')) {
    positionName = String(jobTitle)
  }

  return (
    <div>
      {positionName || `Position ${rowNumber !== undefined ? rowNumber + 1 : ''}`}
    </div>
  )
}