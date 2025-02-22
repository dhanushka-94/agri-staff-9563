'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function DynamicFavicon() {
  useEffect(() => {
    async function updateFavicon() {
      try {
        const { data: settings } = await supabase
          .from('settings')
          .select('logo_url')
          .single()

        // Get all existing favicon links
        const existingFavicons = document.querySelectorAll('link[rel*="icon"]')
        existingFavicons.forEach(favicon => favicon.remove())

        // Create new favicon link
        const link = document.createElement('link')
        link.rel = 'icon'
        link.href = settings?.logo_url || '/agri-staff-logo.svg'
        document.head.appendChild(link)
      } catch (error) {
        console.error('Error updating favicon:', error)
      }
    }

    updateFavicon()
  }, [])

  return null
} 