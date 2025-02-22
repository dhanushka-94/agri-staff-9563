'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface DesignationFieldProps {
  value?: string
  onChange: (value: string | undefined) => void
}

interface Designation {
  id: string
  name: string
}

export function DesignationField({ value, onChange }: DesignationFieldProps) {
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadDesignations()
  }, [])

  async function loadDesignations() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('designations')
        .select('id, name')
        .order('name')

      if (error) throw error
      setDesignations(data || [])
    } catch (error) {
      console.error('Error loading designations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading designations...</div>
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="designation">Designation</Label>
      <Select
        value={value}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select designation" />
        </SelectTrigger>
        <SelectContent>
          {designations.map((designation) => (
            <SelectItem key={designation.id} value={designation.id}>
              {designation.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
} 