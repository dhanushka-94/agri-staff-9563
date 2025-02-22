'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon, ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Designation, DesignationFormData, DesignationErrors } from '@/types/designations'

interface DesignationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designation: Designation | null
  designations: Designation[]
  onSuccess: () => void
}

export function DesignationForm({
  open,
  onOpenChange,
  designation,
  designations,
  onSuccess
}: DesignationFormProps) {
  const [formData, setFormData] = useState<DesignationFormData>({
    name: '',
    parent_id: null,
    order: 0
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<DesignationErrors>({})
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (designation) {
      setFormData({
        name: designation.name,
        parent_id: designation.parent_id,
        order: designation.order
      })
      // Expand parent nodes in the tree
      let currentId = designation.parent_id
      const newExpandedNodes = new Set<string>()
      while (currentId) {
        newExpandedNodes.add(currentId)
        const parent = designations.find(d => d.id === currentId)
        currentId = parent?.parent_id || null
      }
      setExpandedNodes(newExpandedNodes)
    } else {
      // For new designations, automatically set the next available order number
      setFormData({
        name: '',
        parent_id: null,
        order: getNextOrderNumber(null)
      })
      setExpandedNodes(new Set())
    }
    setErrors({})
  }, [designation, designations])

  const getNextOrderNumber = (parentId: string | null) => {
    const siblings = designations.filter(d => d.parent_id === parentId && 
      (!designation || d.id !== designation.id))
    if (siblings.length === 0) return 1
    
    const usedOrders = siblings.map(d => d.order)
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

  const validateForm = (): boolean => {
    const newErrors: DesignationErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (formData.order <= 0) {
      newErrors.order = 'Order must be a positive number'
    }

    // Check if order number is already in use by a sibling
    const siblings = designations.filter(
      d => d.parent_id === formData.parent_id && 
          (!designation || d.id !== designation.id)
    )
    
    if (siblings.some(s => s.order === formData.order)) {
      newErrors.order = 'This order number is already in use at this level'
    }

    // Check for circular reference
    if (designation && formData.parent_id) {
      let currentParentId = formData.parent_id
      const visited = new Set<string>()
      
      while (currentParentId) {
        if (visited.has(currentParentId)) {
          newErrors.parent_id = 'Cannot create circular reference in hierarchy'
          break
        }
        if (currentParentId === designation.id) {
          newErrors.parent_id = 'Cannot set a descendant as parent'
          break
        }
        visited.add(currentParentId)
        const parent = designations.find(d => d.id === currentParentId)
        currentParentId = parent?.parent_id || null
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (!validateForm()) return
      
      setLoading(true)
      setErrors({})

      if (designation) {
        // Update
        const { error } = await supabase
          .from('designations')
          .update({
            name: formData.name.trim(),
            parent_id: formData.parent_id,
            order: formData.order
          })
          .eq('id', designation.id)

        if (error) throw error
      } else {
        // Create with automatic order number
        const { error } = await supabase
          .from('designations')
          .insert([{
            name: formData.name.trim(),
            parent_id: formData.parent_id,
            order: formData.order
          }])

        if (error) throw error
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving designation:', error)
      setErrors({
        general: error instanceof Error ? error.message : 'An error occurred'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  // Get available parent options (exclude self and descendants)
  const getAvailableParents = () => {
    if (!designation) return designations

    const isDescendant = (parentId: string | null): boolean => {
      if (!parentId) return false
      if (parentId === designation.id) return true
      const parent = designations.find(d => d.id === parentId)
      return parent ? isDescendant(parent.parent_id) : false
    }

    return designations.filter(d => !isDescendant(d.id))
  }

  const renderDesignationNode = (node: Designation, level: number = 0) => {
    const hasChildren = designations.some(d => d.parent_id === node.id)
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = formData.parent_id === node.id
    const isDisabled = designation?.id === node.id || 
      (designation && designations.some(d => d.parent_id === node.id && d.id === designation.id))
    const children = designations.filter(d => d.parent_id === node.id)
      .sort((a, b) => a.order - b.order)

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md transition-all duration-200",
            level > 0 && "ml-6",
            isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/80",
            isSelected && "bg-primary/10 hover:bg-primary/20"
          )}
          onClick={() => {
            if (!isDisabled) {
              if (hasChildren) {
                toggleNode(node.id)
              }
              if (formData.parent_id === node.id) {
                // When deselecting a parent, set order for top level
                setFormData(prev => ({ 
                  ...prev, 
                  parent_id: null,
                  order: getNextOrderNumber(null)
                }))
              } else {
                // When selecting a parent, set order for that level
                setFormData(prev => ({ 
                  ...prev, 
                  parent_id: node.id,
                  order: getNextOrderNumber(node.id)
                }))
              }
            }
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <div className="w-4 h-4 flex items-center justify-center">
                {isExpanded ? (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                )}
              </div>
            ) : (
              <div className="w-4" />
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium",
                  isSelected && "text-primary"
                )}>
                  {node.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  Level {node.level} • #{node.order.toString().padStart(2, '0')}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className={cn(
            "border-l-2 ml-4 pl-4 my-1",
            "border-muted transition-all duration-500 ease-in-out"
          )}>
            {children.map(child => renderDesignationNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const rootDesignations = designations
    .filter(d => !d.parent_id)
    .sort((a, b) => a.order - b.order)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {designation ? 'Edit Designation' : 'Add Designation'}
          </DialogTitle>
          <DialogDescription>
            {designation
              ? 'Update the designation details below'
              : 'Enter the details for the new designation'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter designation name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Reports To</Label>
              <div className={cn(
                "rounded-md border",
                errors.parent_id ? 'border-red-500' : ''
              )}>
                <ScrollArea className="h-[300px]">
                  <div className="p-4 space-y-2">
                    {rootDesignations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No designations found
                      </div>
                    ) : (
                      rootDesignations.map(node => renderDesignationNode(node))
                    )}
                  </div>
                </ScrollArea>
              </div>
              {errors.parent_id && (
                <p className="text-sm text-red-500">{errors.parent_id}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {formData.parent_id
                  ? `Selected parent: ${designations.find(d => d.id === formData.parent_id)?.name}`
                  : 'No parent selected (top level)'}
              </p>
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
                placeholder={`Next available: ${getNextOrderNumber(formData.parent_id)}`}
                className={errors.order ? 'border-red-500' : ''}
              />
              {errors.order && (
                <p className="text-sm text-red-500">{errors.order}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Order number is automatically set to the next available position. You can change it if needed.
              </p>
            </div>
          </div>

          {errors.general && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : designation ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 