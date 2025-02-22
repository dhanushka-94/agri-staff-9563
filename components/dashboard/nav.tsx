'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export function DashboardNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [logo, setLogo] = useState<string | null>(null)

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('logo_url')
        .single()

      if (settings?.logo_url) {
        setLogo(settings.logo_url)
      }
    } catch (error) {
      console.error('Error loading logo:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const navItems = [
    {
      href: '/dashboard',
      label: 'Overview'
    },
    {
      href: '/dashboard/contacts',
      label: 'Contacts'
    },
    {
      href: '/dashboard/organization',
      label: 'Organization'
    },
    {
      href: '/dashboard/designations',
      label: 'Designations'
    },
    {
      href: '/dashboard/staff',
      label: 'Staff Management'
    },
    {
      href: '/dashboard/settings',
      label: 'Settings'
    }
  ]

  return (
    <nav className="border-b bg-card">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="flex items-center space-x-2">
            {logo ? (
              <Image
                src={logo}
                alt="Company Logo"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No Logo</span>
              </div>
            )}
            <span className="text-lg font-semibold text-primary">
              Agri Staff
            </span>
          </Link>
          <div className="flex items-center space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-md transition-colors hover:bg-muted",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <Button
            onClick={handleSignOut}
            variant="outline"
          >
            Sign out
          </Button>
        </div>
      </div>
    </nav>
  )
} 