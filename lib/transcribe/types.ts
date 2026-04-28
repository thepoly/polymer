export interface Speaker {
  id: string
  label: string | null
}

export interface Word {
  word: string
  start: number
  end: number
  score?: number
}

export interface Segment {
  id: string
  speakerId: string
  start: number
  end: number
  text: string
  words: Word[]
  edited?: boolean
}

export interface TranscriptData {
  language: string
  duration: number
  model: string
  speakers: Speaker[]
  segments: Segment[]
}

export interface TranscribeWebhookSegment {
  id: string
  speaker_id: string
  start: number
  end: number
  text: string
  words: { word: string; start: number; end: number; score?: number }[]
}

export interface TranscribeWebhookBody {
  job_id: string
  status: 'completed' | 'failed'
  metadata: { audioJobId: number } | null
  result: {
    language: string
    duration: number
    model: string
    speakers: { id: string }[]
    segments: TranscribeWebhookSegment[]
  } | null
  error: string | null
}
