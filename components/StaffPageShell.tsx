import type { ReactNode } from 'react'
import Header from '@/components/Header'

export default function StaffPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-main text-text-main font-sans selection:bg-gray-200 transition-colors duration-300">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 py-10 md:px-6 xl:px-[30px]">
        {children}
      </main>
    </div>
  )
}
