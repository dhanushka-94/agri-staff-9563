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
  order: number
  created_at: string
  updated_at: string
  department?: Department
}

interface Subdivision {
  id: string
  name: string
  institute_id: string
}

export default function InstitutesPage() {
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    order: 0
  })
  const supabase = createClientComponentClient()

  // Add state for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    institute: Institute | null;
    subdivisions: Subdivision[];
    isOpen: boolean;
  }>({
    institute: null,
    subdivisions: [],
    isOpen: false
  });

  // Add state for order confirmation
  const [orderConfirmation, setOrderConfirmation] = useState<{
    isOpen: boolean;
    existingInstitute: Institute | null;
    newOrder: number;
    departmentId: string;
  }>({
    isOpen: false,
    existingInstitute: null,
    newOrder: 0,
    departmentId: ''
  });

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load departments first
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name')

      if (deptError) throw deptError
      setDepartments(deptData || [])

      // Then load institutes with their department details
      const { data: instData, error: instError } = await supabase
        .from('institutes')
        .select('*, department:departments(name)')
        .order('department_id')
        .order('order', { ascending: true })
        .order('name')

      if (instError) throw instError
      setInstitutes(instData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Add function to get next available order number
  const getNextOrderNumber = (departmentId: string) => {
    const departmentInstitutes = institutes.filter(i => i.department_id === departmentId)
    if (departmentInstitutes.length === 0) return 1
    
    const usedOrders = departmentInstitutes.map(i => i.order)
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

  // Update handleAdd to include next order number
  const handleAdd = () => {
    setSelectedInstitute(null)
    setFormData({ 
      name: '', 
      department_id: '',
      order: 0
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (institute: Institute) => {
    setSelectedInstitute(institute)
    setFormData({
      name: institute.name,
      department_id: institute.department_id,
      order: institute.order
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      const institute = institutes.find(i => i.id === id)
      if (!institute) return

      // First, get all subdivisions for this institute
      const { data: subdivisions, error: subdivError } = await supabase
        .from('subdivisions')
        .select('id, name')
        .eq('institute_id', id)
        .order('name')

      if (subdivError) throw subdivError

      if (subdivisions && subdivisions.length > 0) {
        // Show confirmation dialog with subdivisions
        setDeleteConfirmation({
          institute,
          subdivisions,
          isOpen: true
        })
        return
      }

      // If no subdivisions, show simple confirmation dialog
      if (!confirm('Are you sure you want to delete this institute? This action cannot be undone.')) {
        return
      }

      await deleteInstitute(id)
    } catch (error) {
      console.error('Error checking institute:', error)
      setError(error instanceof Error ? error.message : 'An error occurred while checking the institute')
    }
  }

  const deleteInstitute = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('institutes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Update local state
      setInstitutes(institutes.filter(inst => inst.id !== id))
      setDeleteConfirmation({ institute: null, subdivisions: [], isOpen: false })
    } catch (error) {
      console.error('Error deleting institute:', error)
      setError(error instanceof Error ? error.message : 'An error occurred while deleting the institute')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError(null)

      if (!formData.name.trim()) {
        throw new Error('Institute name is required')
      }

      if (!formData.department_id) {
        throw new Error('Department is required')
      }

      // Check if order number is already in use
      const existingInstitute = institutes.find(
        i => i.department_id === formData.department_id && 
            i.order === formData.order && 
            (!selectedInstitute || i.id !== selectedInstitute.id)
      )

      if (existingInstitute) {
        setOrderConfirmation({
          isOpen: true,
          existingInstitute,
          newOrder: formData.order,
          departmentId: formData.department_id
        });
        return;
      }

      await saveInstitute();
    } catch (error) {
      console.error('Error saving institute:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const saveInstitute = async () => {
    try {
      if (selectedInstitute) {
        // Update
        const { error } = await supabase
          .from('institutes')
          .update({
            name: formData.name.trim(),
            department_id: formData.department_id,
            order: formData.order || 1
          })
          .eq('id', selectedInstitute.id)

        if (error) throw error

        // Update local state
        const department = departments.find(d => d.id === formData.department_id)
        setInstitutes(institutes.map(inst =>
          inst.id === selectedInstitute.id
            ? {
                ...inst,
                name: formData.name.trim(),
                department_id: formData.department_id,
                order: formData.order || 1,
                department: department ? { id: department.id, name: department.name } : undefined,
              }
            : inst
        ))
      } else {
        // Create new
        const { data, error } = await supabase
          .from('institutes')
          .insert([{
            name: formData.name.trim(),
            department_id: formData.department_id,
            order: formData.order || getNextOrderNumber(formData.department_id)
          }])
          .select('*, department:departments(name)')
          .single()

        if (error) throw error

        // Sort and update local state
        const newInstitutes = [...institutes, data].sort((a, b) => {
          if (a.department_id !== b.department_id) {
            return a.department_id.localeCompare(b.department_id)
          }
          return a.order - b.order
        })
        setInstitutes(newInstitutes)
      }

      setIsDialogOpen(false)
      setOrderConfirmation({
        isOpen: false,
        existingInstitute: null,
        newOrder: 0,
        departmentId: ''
      });
    } catch (error) {
      console.error('Error saving institute:', error)
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
          <h2 className="text-3xl font-bold tracking-tight">Institutes</h2>
          <p className="text-muted-foreground">
            Manage institutes under departments
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Institute
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
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {institutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No institutes found. Create your first institute to get started.
                </TableCell>
              </TableRow>
            ) : (
              institutes.map((institute) => (
                <TableRow key={institute.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    #{institute.order.toString().padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-medium">{institute.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {institute.department?.name || 'Unknown Department'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(institute.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(institute.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(institute)}
                        title="Edit"
                      >
                        <Pencil2Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(institute.id)}
                        title="Delete"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedInstitute ? 'Edit Institute' : 'Add Institute'}
            </DialogTitle>
            <DialogDescription>
              {selectedInstitute
                ? 'Update the institute details below'
                : 'Enter the details for the new institute'}
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
                  placeholder="Enter institute name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => {
                    const nextOrder = selectedInstitute ? formData.order : getNextOrderNumber(value)
                    setFormData({ 
                      ...formData, 
                      department_id: value,
                      order: nextOrder
                    })
                  }}
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
                    formData.department_id 
                      ? `Next available: ${getNextOrderNumber(formData.department_id)}`
                      : "Select a department first"
                  }
                />
                <p className="text-sm text-muted-foreground">
                  {formData.department_id
                    ? `Enter a number to set the institute's position within its department. Current range: 1-${
                        institutes.filter(i => i.department_id === formData.department_id).length + 1
                      }`
                    : "Select a department to see available order numbers"}
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
                {selectedInstitute ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={deleteConfirmation.isOpen} 
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmation({ institute: null, subdivisions: [], isOpen: false })
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Delete Institute</DialogTitle>
            <DialogDescription>
              This institute cannot be deleted because it has the following subdivision(s):
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              {deleteConfirmation.subdivisions.map((subdivision) => (
                <div
                  key={subdivision.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                >
                  <Badge variant="secondary">
                    {subdivision.name}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              To delete this institute, you must first delete or reassign all its subdivisions.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmation({ institute: null, subdivisions: [], isOpen: false })}
            >
              Close
            </Button>
            <Button
              variant="default"
              onClick={() => {
                // Navigate to subdivisions page
                window.location.href = '/dashboard/organization/subdivisions'
              }}
            >
              View Subdivisions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={orderConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setOrderConfirmation({
              isOpen: false,
              existingInstitute: null,
              newOrder: 0,
              departmentId: ''
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Number Already in Use</DialogTitle>
            <DialogDescription>
              The order number {orderConfirmation.newOrder} is already used by institute "{orderConfirmation.existingInstitute?.name}".
              Please choose a different order number.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Each institute must have a unique order number within its department.
              Available order numbers: {getNextOrderNumber(orderConfirmation.departmentId)}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOrderConfirmation({
                  isOpen: false,
                  existingInstitute: null,
                  newOrder: 0,
                  departmentId: ''
                });
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 