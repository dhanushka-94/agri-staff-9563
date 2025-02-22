'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface SystemLogoProps {
  width?: number
  height?: number
  className?: string
}

export function SystemLogo({ width = 64, height = 64, className = '' }: SystemLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadLogo() {
      try {
        const { data: settings } = await supabase
          .from('settings')
          .select('logo_url')
          .single()

        if (settings?.logo_url) {
          setLogoUrl(settings.logo_url)
        }
      } catch (error) {
        console.error('Error loading logo:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLogo()
  }, [])

  if (isLoading) {
    return (
      <div 
        style={{ width, height }}
        className={`flex items-center justify-center bg-muted/10 rounded-md ${className}`}
      >
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!logoUrl) {
    return (
      <div 
        style={{ width, height }}
        className={`flex items-center justify-center bg-muted/10 rounded-md ${className}`}
      >
        <span className="text-sm text-muted-foreground">No Logo</span>
      </div>
    )
  }

  return (
    <Image
      src={logoUrl}
      alt="System Logo"
      width={width}
      height={height}
      className={className}
      priority
      unoptimized={logoUrl.endsWith('.svg')}
    />
  )
} 