'use client'

import { usePathname } from "next/navigation"
import { Footer } from "@/components/footer"

export function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/sign-')

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">{children}</main>
      {!isAuthPage && <Footer />}
    </div>
  )
} 