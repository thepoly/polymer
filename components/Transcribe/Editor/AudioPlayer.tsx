'use client'
import { forwardRef } from 'react'

interface Props {
  audioJobId: string
}

const AudioPlayer = forwardRef<HTMLAudioElement, Props>(function AudioPlayer({ audioJobId }, ref) {
  return (
    <audio
      ref={ref}
      src={`/api/transcribe/${audioJobId}/audio`}
      controls
      preload="metadata"
      style={{ width: '100%' }}
    />
  )
})

export default AudioPlayer
