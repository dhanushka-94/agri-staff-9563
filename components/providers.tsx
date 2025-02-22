'use client'

import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Any client-side-only initialization can go here
  }, [])

  return <>{children}</>
} 