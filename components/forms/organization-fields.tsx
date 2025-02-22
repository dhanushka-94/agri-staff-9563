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

interface OrganizationFieldsProps {
  departmentId?: string
  instituteId?: string
  subdivisionId?: string
  unitId?: string
  onDepartmentChange: (value: string | undefined) => void
  onInstituteChange: (value: string | undefined) => void
  onSubdivisionChange: (value: string | undefined) => void
  onUnitChange: (value: string | undefined) => void
}

interface Organization {
  id: string
  name: string
}

export function OrganizationFields({
  departmentId,
  instituteId,
  subdivisionId,
  unitId,
  onDepartmentChange,
  onInstituteChange,
  onSubdivisionChange,
  onUnitChange,
}: OrganizationFieldsProps) {
  const [departments, setDepartments] = useState<Organization[]>([])
  const [institutes, setInstitutes] = useState<Organization[]>([])
  const [subdivisions, setSubdivisions] = useState<Organization[]>([])
  const [units, setUnits] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadDepartments()
  }, [])

  useEffect(() => {
    if (departmentId) {
      loadInstitutes(departmentId)
    } else {
      setInstitutes([])
      onInstituteChange(undefined)
    }
  }, [departmentId])

  useEffect(() => {
    if (instituteId) {
      loadSubdivisions(instituteId)
    } else {
      setSubdivisions([])
      onSubdivisionChange(undefined)
    }
  }, [instituteId])

  useEffect(() => {
    if (subdivisionId) {
      loadUnits(subdivisionId)
    } else {
      setUnits([])
      onUnitChange(undefined)
    }
  }, [subdivisionId])

  async function loadDepartments() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error loading departments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadInstitutes(deptId: string) {
    try {
      const { data, error } = await supabase
        .from('institutes')
        .select('id, name')
        .eq('department_id', deptId)
        .order('name')

      if (error) throw error
      setInstitutes(data || [])
    } catch (error) {
      console.error('Error loading institutes:', error)
    }
  }

  async function loadSubdivisions(instId: string) {
    try {
      const { data, error } = await supabase
        .from('subdivisions')
        .select('id, name')
        .eq('institute_id', instId)
        .order('name')

      if (error) throw error
      setSubdivisions(data || [])
    } catch (error) {
      console.error('Error loading subdivisions:', error)
    }
  }

  async function loadUnits(subId: string) {
    try {
      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .eq('subdivision_id', subId)
        .order('name')

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error('Error loading units:', error)
    }
  }

  if (loading) {
    return <div>Loading organization data...</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Select
          value={departmentId}
          onValueChange={(value) => onDepartmentChange(value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="institute">Institute</Label>
        <Select
          value={instituteId}
          onValueChange={(value) => onInstituteChange(value)}
          disabled={!departmentId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select institute" />
          </SelectTrigger>
          <SelectContent>
            {institutes.map((inst) => (
              <SelectItem key={inst.id} value={inst.id}>
                {inst.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subdivision">Subdivision / Regional Office</Label>
        <Select
          value={subdivisionId}
          onValueChange={(value) => onSubdivisionChange(value)}
          disabled={!instituteId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select subdivision or regional office" />
          </SelectTrigger>
          <SelectContent>
            {subdivisions.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit">Unit</Label>
        <Select
          value={unitId}
          onValueChange={(value) => onUnitChange(value)}
          disabled={!subdivisionId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
} 