import type { ReactNode } from 'react'
import StaffPageShell from '@/components/StaffPageShell'

export default function Staff2Layout({ children }: { children: ReactNode }) {
  return <StaffPageShell>{children}</StaffPageShell>
}
