'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRightIcon, HomeIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href: string
  current: boolean
}

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = []
    
    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      
      // Skip dashboard in breadcrumb
      if (path === 'dashboard') return
      
      let label = path.charAt(0).toUpperCase() + path.slice(1)
      
      // Special case for organization section
      if (path === 'organization' && paths.length === 2) {
        label = 'Organization Management'
      }
      
      items.push({
        label,
        href: currentPath,
        current: index === paths.length - 1
      })
    })
    
    return items
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Breadcrumb navigation */}
      <div className="border-b bg-card/50">
        <div className="container flex h-14 items-center space-x-2 px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors",
            )}
          >
            <HomeIcon className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((item, index) => (
            <div key={item.href} className="flex items-center space-x-2">
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
              <Link
                href={item.href}
                className={cn(
                  "text-sm transition-colors hover:text-foreground",
                  item.current
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
} 