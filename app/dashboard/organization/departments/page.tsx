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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Department {
  id: string
  name: string
  order: number
  created_at: string
  updated_at: string
}

interface OrderChangeConfirmation {
  department: Department
  newOrder: number
  affectedDepartments: Department[]
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ 
    name: '',
    order: 0
  })
  const [orderChangeConfirmation, setOrderChangeConfirmation] = useState<OrderChangeConfirmation | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      setDepartments(data || [])
    } catch (error) {
      console.error('Error loading departments:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedDepartment(null)
    setFormData({ name: '', order: 0 })
    setIsDialogOpen(true)
  }

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department)
    setFormData({ 
      name: department.name,
      order: department.order
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return

    try {
      setError(null)

      // Check if department has any institutes
      const { count: instituteCount } = await supabase
        .from('institutes')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', id)

      if (instituteCount && instituteCount > 0) {
        throw new Error('Cannot delete department with existing institutes')
      }

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

      if (error) throw error

      setDepartments(departments.filter(dept => dept.id !== id))
    } catch (error) {
      console.error('Error deleting department:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleOrderChange = async (newOrder: number) => {
    if (!selectedDepartment) return

    // Check if order number is already taken
    const existingDepartment = departments.find(d => d.order === newOrder)
    if (existingDepartment) {
      // Find all departments that will be affected
      const affectedDepartments = departments
        .filter(d => d.order >= newOrder && d.id !== selectedDepartment.id)
        .sort((a, b) => a.order - b.order)

      setOrderChangeConfirmation({
        department: selectedDepartment,
        newOrder,
        affectedDepartments
      })
      return
    }

    // If order is not taken, proceed with the update
    await updateDepartmentOrder(selectedDepartment, newOrder)
  }

  const updateDepartmentOrder = async (department: Department, newOrder: number) => {
    try {
      setError(null)

      // Get affected departments
      const affectedDepartments = departments
        .filter(d => 
          d.id !== department.id && 
          ((newOrder > department.order && d.order <= newOrder) ||
           (newOrder < department.order && d.order >= newOrder))
        )
        .sort((a, b) => a.order - b.order)

      // Prepare all updates
      const updates = []

      // Update the target department
      updates.push(
        supabase
          .from('departments')
          .update({ order: newOrder })
          .eq('id', department.id)
      )

      // Update affected departments
      if (newOrder > department.order) {
        // Moving down: decrease order of departments in between
        affectedDepartments.forEach(dept => {
          updates.push(
            supabase
              .from('departments')
              .update({ order: dept.order - 1 })
              .eq('id', dept.id)
          )
        })
      } else {
        // Moving up: increase order of departments in between
        affectedDepartments.forEach(dept => {
          updates.push(
            supabase
              .from('departments')
              .update({ order: dept.order + 1 })
              .eq('id', dept.id)
          )
        })
      }

      // Execute all updates
      const results = await Promise.all(updates)
      const errors = results.map(r => r.error).filter(Boolean)
      
      if (errors.length > 0) {
        throw new Error('Failed to update department orders')
      }

      // Reload departments to get updated order
      await loadDepartments()
    } catch (error) {
      console.error('Error updating department order:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleOrderChangeConfirm = async () => {
    if (!orderChangeConfirmation) return

    await updateDepartmentOrder(
      orderChangeConfirmation.department,
      orderChangeConfirmation.newOrder
    )
    setOrderChangeConfirmation(null)
  }

  const handleOrderChangeCancel = () => {
    if (!orderChangeConfirmation || !selectedDepartment) return
    
    // Reset form data to original order
    setFormData({
      ...formData,
      order: selectedDepartment.order
    })
    setOrderChangeConfirmation(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError(null)

      if (!formData.name.trim()) {
        throw new Error('Department name is required')
      }

      if (selectedDepartment) {
        // Update
        const { error } = await supabase
          .from('departments')
          .update({ 
            name: formData.name.trim(),
            order: formData.order
          })
          .eq('id', selectedDepartment.id)

        if (error) throw error

        // Reload departments to ensure correct ordering
        await loadDepartments()
      } else {
        // Find the next available order number
        let nextOrder = 1
        if (departments.length > 0) {
          // Get all used order numbers
          const usedOrders = departments.map(d => d.order)
          // Sort them to find gaps
          usedOrders.sort((a, b) => a - b)
          
          // Find the first gap or use the next number after the highest
          for (let i = 0; i < usedOrders.length; i++) {
            if (usedOrders[i] !== i + 1) {
              nextOrder = i + 1
              break
            }
          }
          // If no gaps found, use next number
          if (nextOrder === 1) {
            nextOrder = usedOrders.length + 1
          }
        }

        // Create with next available order number
        const { data, error } = await supabase
          .from('departments')
          .insert([{ 
            name: formData.name.trim(),
            order: nextOrder
          }])
          .select()
          .single()

        if (error) throw error

        // Sort and update local state
        const newDepartments = [...departments, data].sort((a, b) => a.order - b.order)
        setDepartments(newDepartments)
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error saving department:', error)
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
          <h2 className="text-3xl font-bold tracking-tight">Departments</h2>
          <p className="text-muted-foreground">
            Manage your organization's departments
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Department
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
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[150px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No departments found. Create your first department to get started.
                </TableCell>
              </TableRow>
            ) : (
              departments.map((department, index) => (
                <TableRow key={department.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    #{department.order.toString().padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>{new Date(department.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(department.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(department)}
                        title="Edit"
                      >
                        <Pencil2Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(department.id)}
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
              {selectedDepartment ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
            <DialogDescription>
              {selectedDepartment
                ? 'Update the department details below'
                : 'Enter the details for the new department'}
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
                  placeholder="Enter department name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Order Number</Label>
                <Input
                  id="order"
                  type="number"
                  min={1}
                  max={departments.length + (selectedDepartment ? 0 : 1)}
                  value={formData.order === 0 ? '' : formData.order}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value)
                    if (typeof value !== 'number') return

                    const newOrder = Math.max(1, Math.min(value, departments.length + (selectedDepartment ? 0 : 1)))
                    setFormData({ ...formData, order: value === 0 ? 0 : newOrder })
                    
                    if (selectedDepartment && value !== 0) {
                      handleOrderChange(newOrder)
                    }
                  }}
                  placeholder={`Enter order number (current max: ${Math.max(...departments.map(d => d.order), 0)})`}
                />
                <p className="text-sm text-muted-foreground">
                  Enter a number to set the department's position in the list. 
                  {departments.length > 0 && ` Current range: 1-${departments.length + (selectedDepartment ? 0 : 1)}`}
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
                {selectedDepartment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!orderChangeConfirmation} onOpenChange={() => orderChangeConfirmation && handleOrderChangeCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Order Change</DialogTitle>
            <DialogDescription>
              Moving "{orderChangeConfirmation?.department.name}" to position #{orderChangeConfirmation?.newOrder} will affect the following departments:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-[200px] overflow-auto rounded-md border bg-muted/50 p-4">
              {orderChangeConfirmation?.affectedDepartments.map((dept, index) => (
                <div key={dept.id} className="flex items-center gap-2 py-1">
                  <span className="font-mono text-muted-foreground">
                    #{dept.order} → #{orderChangeConfirmation.newOrder > orderChangeConfirmation.department.order 
                      ? dept.order - 1 
                      : dept.order + 1}
                  </span>
                  <span className="font-medium">{dept.name}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleOrderChangeCancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleOrderChangeConfirm}
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 