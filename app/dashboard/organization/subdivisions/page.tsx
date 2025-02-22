'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { PlusIcon, Pencil2Icon, TrashIcon } from '@radix-ui/react-icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Department {
  id: string
  name: string
}

interface Institute {
  id: string
  name: string
  department_id: string
  department?: Department
}

interface Subdivision {
  id: string
  name: string
  institute_id: string
  order: number
  created_at: string
  updated_at: string
  institute?: Institute
}

export default function SubdivisionsPage() {
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSubdivision, setSelectedSubdivision] = useState<Subdivision | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    institute_id: '',
    order: 0
  })
  const [orderConfirmation, setOrderConfirmation] = useState<{
    isOpen: boolean;
    existingSubdivision: Subdivision | null;
    newOrder: number;
    instituteId: string;
  }>({
    isOpen: false,
    existingSubdivision: null,
    newOrder: 0,
    instituteId: ''
  })
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all required data
      const [
        { data: deptData, error: deptError },
        { data: instData, error: instError },
        { data: subdivData, error: subdivError }
      ] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('institutes').select('*, department:departments(name)').order('name'),
        supabase.from('subdivisions').select('*, institute:institutes(*, department:departments(name))').order('name')
      ])

      if (deptError) throw deptError
      if (instError) throw instError
      if (subdivError) throw subdivError

      setDepartments(deptData || [])
      setInstitutes(instData || [])
      setSubdivisions(subdivData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getNextOrderNumber = (instituteId: string) => {
    const instituteSubdivisions = subdivisions.filter(s => s.institute_id === instituteId)
    if (instituteSubdivisions.length === 0) return 1
    
    const usedOrders = instituteSubdivisions.map(s => s.order)
    usedOrders.sort((a, b) => a - b)
    
    // Find first gap
    for (let i = 0; i < usedOrders.length; i++) {
      if (usedOrders[i] !== i + 1) {
        return i + 1
      }
    }
    // If no gaps, return next number
    return usedOrders.length + 1
  }

  const handleAdd = () => {
    setSelectedSubdivision(null)
    setFormData({ 
      name: '', 
      department_id: '', 
      institute_id: '',
      order: 0
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (subdivision: Subdivision) => {
    setSelectedSubdivision(subdivision)
    setFormData({
      name: subdivision.name,
      department_id: subdivision.institute?.department_id || '',
      institute_id: subdivision.institute_id,
      order: subdivision.order
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subdivision?')) return

    try {
      setError(null)

      // Check if subdivision has any units
      const { count: unitCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('subdivision_id', id)

      if (unitCount && unitCount > 0) {
        throw new Error('Cannot delete subdivision with existing units')
      }

      const { error } = await supabase
        .from('subdivisions')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSubdivisions(subdivisions.filter(sub => sub.id !== id))
    } catch (error) {
      console.error('Error deleting subdivision:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError(null)

      if (!formData.name.trim()) {
        throw new Error('Subdivision name is required')
      }

      if (!formData.department_id) {
        throw new Error('Department is required')
      }

      if (!formData.institute_id) {
        throw new Error('Institute is required')
      }

      // Verify institute belongs to selected department
      const institute = institutes.find(i => i.id === formData.institute_id)
      if (institute?.department_id !== formData.department_id) {
        throw new Error('Selected institute does not belong to the selected department')
      }

      // Check if order number is already in use
      const existingSubdivision = subdivisions.find(
        s => s.institute_id === formData.institute_id && 
            s.order === formData.order && 
            (!selectedSubdivision || s.id !== selectedSubdivision.id)
      )

      if (existingSubdivision) {
        setOrderConfirmation({
          isOpen: true,
          existingSubdivision,
          newOrder: formData.order,
          instituteId: formData.institute_id
        });
        return;
      }

      await saveSubdivision();
    } catch (error) {
      console.error('Error saving subdivision:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const saveSubdivision = async () => {
    try {
      if (selectedSubdivision) {
        // Update
        const { error } = await supabase
          .from('subdivisions')
          .update({
            name: formData.name.trim(),
            institute_id: formData.institute_id,
            order: formData.order || 1
          })
          .eq('id', selectedSubdivision.id)

        if (error) throw error

        // Update local state
        const institute = institutes.find(i => i.id === formData.institute_id)
        setSubdivisions(subdivisions.map(sub =>
          sub.id === selectedSubdivision.id
            ? {
                ...sub,
                name: formData.name.trim(),
                institute_id: formData.institute_id,
                order: formData.order || 1,
                institute: institute,
              }
            : sub
        ))
      } else {
        // Create
        const { data, error } = await supabase
          .from('subdivisions')
          .insert([{
            name: formData.name.trim(),
            institute_id: formData.institute_id,
            order: formData.order || getNextOrderNumber(formData.institute_id)
          }])
          .select('*, institute:institutes(*, department:departments(name))')
          .single()

        if (error) throw error

        // Sort and update local state
        const newSubdivisions = [...subdivisions, data].sort((a, b) => {
          if (a.institute_id !== b.institute_id) {
            return a.institute_id.localeCompare(b.institute_id)
          }
          return a.order - b.order
        })
        setSubdivisions(newSubdivisions)
      }

      setIsDialogOpen(false)
      setOrderConfirmation({
        isOpen: false,
        existingSubdivision: null,
        newOrder: 0,
        instituteId: ''
      });
    } catch (error) {
      console.error('Error saving subdivision:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  // Filter institutes based on selected department
  const filteredInstitutes = institutes.filter(
    inst => !formData.department_id || inst.department_id === formData.department_id
  )

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
          <h2 className="text-3xl font-bold tracking-tight">Subdivisions</h2>
          <p className="text-muted-foreground">
            Manage subdivisions and regional offices
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Subdivision
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Institute</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subdivisions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No subdivisions found. Create your first subdivision to get started.
                </TableCell>
              </TableRow>
            ) : (
              subdivisions.map((subdivision) => (
                <TableRow key={subdivision.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    #{subdivision.order.toString().padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-medium">{subdivision.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {subdivision.institute?.department?.name || 'Unknown Department'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {subdivision.institute?.name || 'Unknown Institute'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(subdivision.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(subdivision.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(subdivision)}
                      >
                        <Pencil2Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(subdivision.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={orderConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setOrderConfirmation({
              isOpen: false,
              existingSubdivision: null,
              newOrder: 0,
              instituteId: ''
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Number Already in Use</DialogTitle>
            <DialogDescription>
              The order number {orderConfirmation.newOrder} is already used by subdivision "{orderConfirmation.existingSubdivision?.name}".
              Please choose a different order number.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Each subdivision must have a unique order number within its institute.
              Available order numbers: {getNextOrderNumber(orderConfirmation.instituteId)}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOrderConfirmation({
                  isOpen: false,
                  existingSubdivision: null,
                  newOrder: 0,
                  instituteId: ''
                });
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedSubdivision ? 'Edit Subdivision' : 'Add Subdivision'}
            </DialogTitle>
            <DialogDescription>
              {selectedSubdivision
                ? 'Update the subdivision details below'
                : 'Enter the details for the new subdivision'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter subdivision name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value, institute_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="institute">Institute</Label>
                <Select
                  value={formData.institute_id}
                  onValueChange={(value) => setFormData({ ...formData, institute_id: value })}
                  disabled={!formData.department_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      formData.department_id
                        ? "Select an institute"
                        : "Select a department first"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInstitutes.map((institute) => (
                      <SelectItem key={institute.id} value={institute.id}>
                        {institute.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Order Number</Label>
                <Input
                  id="order"
                  type="number"
                  min={1}
                  value={formData.order === 0 ? '' : formData.order}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                    if (typeof value !== 'number') return
                    setFormData({ ...formData, order: value })
                  }}
                  placeholder={
                    formData.institute_id 
                      ? `Next available: ${getNextOrderNumber(formData.institute_id)}`
                      : "Select an institute first"
                  }
                />
                <p className="text-sm text-muted-foreground">
                  {formData.institute_id
                    ? `Enter a number to set the subdivision's position within its institute. Current range: 1-${
                        subdivisions.filter(s => s.institute_id === formData.institute_id).length + 1
                      }`
                    : "Select an institute to see available order numbers"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedSubdivision ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 