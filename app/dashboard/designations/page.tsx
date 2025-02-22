'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@radix-ui/react-icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Designation, DesignationTreeNode } from '@/types/designations'
import { DesignationTree } from '@/components/designations/designation-tree'
import { DesignationForm } from '@/components/designations/designation-form'

export default function DesignationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [designations, setDesignations] = useState<Designation[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadDesignations()
  }, [])

  const loadDesignations = async () => {
    try {
      setLoading(true)
      setError(null)

      // First, check if the table exists
      const { error: tableError } = await supabase
        .from('designations')
        .select('count')
        .single()

      if (tableError?.code === 'PGRST116') {
        throw new Error('Designations table not found. Please run the database migrations first.')
      }

      // Fetch designations with parent information
      const { data, error } = await supabase
        .from('designations')
        .select(`
          id,
          name,
          parent_id,
          level,
          order,
          created_at,
          updated_at,
          parent:designations!parent_id(
            id,
            name
          )
        `)
        .order('level', { ascending: true })
        .order('order', { ascending: true })

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to load designations: ${error.message}`)
      }

      if (!data) {
        setDesignations([])
        return
      }

      // Process the data with proper typing
      const processedData: Designation[] = data.map(designation => ({
        id: designation.id,
        name: designation.name,
        parent_id: designation.parent_id,
        level: designation.level,
        order: designation.order,
        created_at: designation.created_at,
        updated_at: designation.updated_at,
        parent: designation.parent ? {
          id: designation.parent.id,
          name: designation.parent.name
        } : undefined
      }))

      setDesignations(processedData)
    } catch (error) {
      console.error('Error details:', error)
      setError(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while loading designations'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedDesignation(null)
    setIsFormOpen(true)
  }

  const handleEdit = (designation: Designation) => {
    setSelectedDesignation(designation)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      // Check for child designations
      const { count: childCount } = await supabase
        .from('designations')
        .select('*', { count: 'exact', head: true })
        .eq('parent_id', id)

      if (childCount && childCount > 0) {
        throw new Error('Cannot delete designation with child designations')
      }

      // Check for staff members using this designation
      const { count: staffCount } = await supabase
        .from('person_details')
        .select('*', { count: 'exact', head: true })
        .eq('designation_id', id)

      if (staffCount && staffCount > 0) {
        throw new Error('Cannot delete designation that is assigned to staff members')
      }

      const { error } = await supabase
        .from('designations')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadDesignations()
    } catch (error) {
      console.error('Error deleting designation:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
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
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Designations</h1>
          <p className="text-muted-foreground">
            Manage staff designations and their hierarchy
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Designation
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Designation Hierarchy</CardTitle>
          <CardDescription>
            View and manage the organizational hierarchy of designations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DesignationTree
            designations={designations}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <DesignationForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        designation={selectedDesignation}
        designations={designations}
        onSuccess={loadDesignations}
      />
    </div>
  )
} 