'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import Image from 'next/image'

// Add custom error type
interface CustomError {
  message: string;
}

export default function SettingsPage() {
  const [logo, setLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    loadLogo()
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

      if (profileError) throw profileError

      setIsAdmin(profile?.role === 'admin')
    } catch (error) {
      console.error('Error checking admin status:', error)
      setError('Failed to verify permissions')
    }
  }

  const loadLogo = async () => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('logo_url')
        .single()

      if (settingsError) {
        console.error('Error loading settings:', settingsError)
        return
      }

      if (settings?.logo_url) {
        setLogo(settings.logo_url)
      }
    } catch (error) {
      console.error('Error loading logo:', error)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null)
      setLoading(true)
      
      // Check admin status first
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('Authentication failed')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        throw new Error('Failed to verify permissions')
      }

      if (profile?.role !== 'admin') {
        throw new Error('Only administrators can upload logos')
      }

      const file = event.target.files?.[0]
      if (!file) {
        throw new Error('No file selected')
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('File size should be less than 2MB')
      }

      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size
      })

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`

      console.log('Attempting storage upload with filename:', fileName)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('Upload successful:', uploadData)

      // Get public URL - Fix the type error by removing error handling
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName)

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file')
      }

      console.log('Generated public URL:', publicUrl)

      // Update settings table
      const { error: updateError } = await supabase
        .from('settings')
        .upsert({ 
          id: 1,
          logo_url: publicUrl,
          updated_at: new Date().toISOString()
        })

      if (updateError) {
        // If settings update fails, clean up the uploaded file
        await supabase.storage
          .from('logos')
          .remove([fileName])
        console.error('Settings update error:', updateError)
        throw new Error(`Failed to update settings: ${updateError.message}`)
      }

      console.log('Settings updated successfully')
      setLogo(publicUrl)
      
    } catch (error: unknown) {
      console.error('Logo upload error:', error)
      if (error instanceof Error) {
        setError(error.message)
      } else if (typeof error === 'object' && error && 'message' in error) {
        setError((error as CustomError).message)
      } else {
        setError('Failed to upload logo')
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      <div className="bg-card rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Logo Settings</h2>
        
        <div className="space-y-4">
          {/* Current Logo */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Logo</h3>
            <div className="w-32 h-32 border rounded-lg flex items-center justify-center bg-muted/50">
              {logo ? (
                <Image
                  src={logo}
                  alt="Company Logo"
                  width={100}
                  height={100}
                  className="object-contain"
                />
              ) : (
                <span className="text-sm text-muted-foreground">No logo uploaded</span>
              )}
            </div>
          </div>

          {/* Upload New Logo */}
          {isAdmin ? (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Upload New Logo</h3>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-primary file:text-primary-foreground
                    hover:file:cursor-pointer hover:file:bg-primary/90"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, max 2MB, PNG or JPG
                </p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Only administrators can change the logo settings.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
} 