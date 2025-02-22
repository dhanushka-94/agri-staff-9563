'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ImageIcon, X } from 'lucide-react'
import Image from 'next/image'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface ImageUploadProps {
  value?: string | null
  onChange: (value: string | null) => void
  onUploadStart?: () => void
  onUploadEnd?: () => void
}

export function ImageUpload({
  value,
  onChange,
  onUploadStart,
  onUploadEnd
}: ImageUploadProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  const handleUpload = useCallback(async (file: File) => {
    try {
      setLoading(true)
      onUploadStart?.()

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Image size should be less than 2MB')
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName)

      onChange(publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(error instanceof Error ? error.message : 'Error uploading image')
    } finally {
      setLoading(false)
      onUploadEnd?.()
    }
  }, [supabase, onChange, onUploadStart, onUploadEnd])

  const handleRemove = useCallback(async () => {
    try {
      if (!value) return

      // Extract filename from URL
      const fileName = value.split('/').pop()
      if (!fileName) return

      // Delete from storage
      const { error } = await supabase.storage
        .from('profile-pictures')
        .remove([fileName])

      if (error) throw error

      onChange(null)
    } catch (error) {
      console.error('Error removing image:', error)
      alert('Error removing image')
    }
  }, [value, supabase, onChange])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40 rounded-full overflow-hidden bg-muted border-2 border-muted hover:border-primary/50 transition-colors duration-200">
        {value ? (
          <div className="group relative w-full h-full">
            <Image
              src={value}
              alt="Profile picture"
              width={160}
              height={160}
              className="object-cover w-full h-full"
              priority
              unoptimized={value.endsWith('.svg')}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="image-upload"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
            e.target.value = ''
          }}
          disabled={loading}
        />
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => document.getElementById('image-upload')?.click()}
          className="min-w-[120px]"
        >
          {loading ? 'Uploading...' : value ? 'Change Image' : 'Upload Image'}
        </Button>
      </div>
    </div>
  )
} 