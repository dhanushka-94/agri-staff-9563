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
import { Separator } from '@/components/ui/separator'

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
  institute?: Institute
}

interface Unit {
  id: string
  name: string
  subdivision_id: string
  order: number
  created_at: string
  updated_at: string
  subdivision?: Subdivision
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    institute_id: '',
    subdivision_id: '',
    order: 0
  })

  // Add state for order confirmation
  const [orderConfirmation, setOrderConfirmation] = useState<{
    isOpen: boolean;
    existingUnit: Unit | null;
    newOrder: number;
    subdivisionId: string;
  }>({
    isOpen: false,
    existingUnit: null,
    newOrder: 0,
    subdivisionId: ''
  });

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all required data in parallel
      const [
        { data: deptData, error: deptError },
        { data: instData, error: instError },
        { data: subdivData, error: subdivError },
        { data: unitData, error: unitError }
      ] = await Promise.all([
        supabase.from('departments').select('*').order('name'),
        supabase.from('institutes').select('*, department:departments(name)').order('name'),
        supabase.from('subdivisions').select('*, institute:institutes(*, department:departments(name))').order('name'),
        supabase.from('units').select('*, subdivision:subdivisions(*, institute:institutes(*, department:departments(name)))').order('name')
      ])

      if (deptError) throw deptError
      if (instError) throw instError
      if (subdivError) throw subdivError
      if (unitError) throw unitError

      setDepartments(deptData || [])
      setInstitutes(instData || [])
      setSubdivisions(subdivData || [])
      setUnits(unitData || [])
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Add function to get next available order number
  const getNextOrderNumber = (subdivisionId: string) => {
    const subdivisionUnits = units.filter(u => u.subdivision_id === subdivisionId)
    if (subdivisionUnits.length === 0) return 1
    
    const usedOrders = subdivisionUnits.map(u => u.order)
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
    setSelectedUnit(null)
    setFormData({
      name: '',
      department_id: '',
      institute_id: '',
      subdivision_id: '',
      order: 0
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (unit: Unit) => {
    setSelectedUnit(unit)
    setFormData({
      name: unit.name,
      department_id: unit.subdivision?.institute?.department_id || '',
      institute_id: unit.subdivision?.institute_id || '',
      subdivision_id: unit.subdivision_id,
      order: unit.order
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return

    try {
      setError(null)

      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id)

      if (error) throw error

      setUnits(units.filter(unit => unit.id !== id))
    } catch (error) {
      console.error('Error deleting unit:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setError(null)

      if (!formData.name.trim()) {
        throw new Error('Unit name is required')
      }

      if (!formData.department_id) {
        throw new Error('Department is required')
      }

      if (!formData.institute_id) {
        throw new Error('Institute is required')
      }

      if (!formData.subdivision_id) {
        throw new Error('Subdivision is required')
      }

      // Verify relationships
      const subdivision = subdivisions.find(s => s.id === formData.subdivision_id)
      if (!subdivision) {
        throw new Error('Selected subdivision not found')
      }

      const institute = institutes.find(i => i.id === formData.institute_id)
      if (!institute || institute.id !== subdivision.institute_id) {
        throw new Error('Selected subdivision does not belong to the selected institute')
      }

      if (institute.department_id !== formData.department_id) {
        throw new Error('Selected institute does not belong to the selected department')
      }

      // Check if order number is already in use
      const existingUnit = units.find(
        u => u.subdivision_id === formData.subdivision_id && 
            u.order === formData.order && 
            (!selectedUnit || u.id !== selectedUnit.id)
      )

      if (existingUnit) {
        setOrderConfirmation({
          isOpen: true,
          existingUnit,
          newOrder: formData.order,
          subdivisionId: formData.subdivision_id
        });
        return;
      }

      await saveUnit();
    } catch (error) {
      console.error('Error saving unit:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const saveUnit = async () => {
    try {
      if (selectedUnit) {
        // Update
        const { error } = await supabase
          .from('units')
          .update({
            name: formData.name.trim(),
            subdivision_id: formData.subdivision_id,
            order: formData.order || 1
          })
          .eq('id', selectedUnit.id)

        if (error) throw error

        // Update local state
        const subdivision = subdivisions.find(s => s.id === formData.subdivision_id)
        setUnits(units.map(unit =>
          unit.id === selectedUnit.id
            ? {
                ...unit,
                name: formData.name.trim(),
                subdivision_id: formData.subdivision_id,
                order: formData.order || 1,
                subdivision: subdivision,
              }
            : unit
        ))
      } else {
        // Create
        const { data, error } = await supabase
          .from('units')
          .insert([{
            name: formData.name.trim(),
            subdivision_id: formData.subdivision_id,
            order: formData.order || getNextOrderNumber(formData.subdivision_id)
          }])
          .select('*, subdivision:subdivisions(*, institute:institutes(*, department:departments(name)))')
          .single()

        if (error) throw error

        // Sort and update local state
        const newUnits = [...units, data].sort((a, b) => {
          if (a.subdivision_id !== b.subdivision_id) {
            return a.subdivision_id.localeCompare(b.subdivision_id)
          }
          return a.order - b.order
        })
        setUnits(newUnits)
      }

      setIsDialogOpen(false)
      setOrderConfirmation({
        isOpen: false,
        existingUnit: null,
        newOrder: 0,
        subdivisionId: ''
      });
    } catch (error) {
      console.error('Error saving unit:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  // Filter based on selections
  const filteredInstitutes = institutes.filter(
    inst => !formData.department_id || inst.department_id === formData.department_id
  )

  const filteredSubdivisions = subdivisions.filter(
    sub => !formData.institute_id || sub.institute_id === formData.institute_id
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
          <h2 className="text-3xl font-bold tracking-tight">Units</h2>
          <p className="text-muted-foreground">
            Manage units under subdivisions
          </p>
        </div>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Unit
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
              <TableHead>Subdivision</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No units found. Create your first unit to get started.
                </TableCell>
              </TableRow>
            ) : (
              units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    #{unit.order.toString().padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {unit.subdivision?.institute?.department?.name || 'Unknown Department'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {unit.subdivision?.institute?.name || 'Unknown Institute'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>
                      {unit.subdivision?.name || 'Unknown Subdivision'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(unit.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(unit.updated_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(unit)}
                      >
                        <Pencil2Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(unit.id)}
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
              existingUnit: null,
              newOrder: 0,
              subdivisionId: ''
            });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order Number Already in Use</DialogTitle>
            <DialogDescription>
              The order number {orderConfirmation.newOrder} is already used by unit "{orderConfirmation.existingUnit?.name}".
              Please choose a different order number.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Each unit must have a unique order number within its subdivision.
              Available order numbers: {getNextOrderNumber(orderConfirmation.subdivisionId)}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOrderConfirmation({
                  isOpen: false,
                  existingUnit: null,
                  newOrder: 0,
                  subdivisionId: ''
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
              {selectedUnit ? 'Edit Unit' : 'Add Unit'}
            </DialogTitle>
            <DialogDescription>
              {selectedUnit
                ? 'Update the unit details below'
                : 'Enter the details for the new unit'}
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
                  placeholder="Enter unit name"
                />
              </div>

              <Separator className="my-4" />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.department_id}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      department_id: value,
                      institute_id: '',
                      subdivision_id: '',
                    })}
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
                    onValueChange={(value) => setFormData({
                      ...formData,
                      institute_id: value,
                      subdivision_id: '',
                    })}
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
                  <Label htmlFor="subdivision">Subdivision</Label>
                  <Select
                    value={formData.subdivision_id}
                    onValueChange={(value) => setFormData({ ...formData, subdivision_id: value })}
                    disabled={!formData.institute_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.department_id
                          ? "Select a department first"
                          : !formData.institute_id
                          ? "Select an institute first"
                          : "Select a subdivision"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubdivisions.map((subdivision) => (
                        <SelectItem key={subdivision.id} value={subdivision.id}>
                          {subdivision.name}
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
                      formData.subdivision_id 
                        ? `Next available: ${getNextOrderNumber(formData.subdivision_id)}`
                        : "Select a subdivision first"
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.subdivision_id
                      ? `Enter a number to set the unit's position within its subdivision. Current range: 1-${
                          units.filter(u => u.subdivision_id === formData.subdivision_id).length + 1
                        }`
                      : "Select a subdivision to see available order numbers"}
                  </p>
                </div>
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
                {selectedUnit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 