'use client'
export default function Editor({ audioJobId }: { audioJobId: string; title: string; kind: string }) {
  return (
    <div style={{ padding: '2rem' }}>
      Editor coming for job {audioJobId}…
    </div>
  )
}
