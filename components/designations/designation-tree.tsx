'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon, Cross2Icon, Pencil2Icon, TrashIcon } from '@radix-ui/react-icons'
import { Users, Clock, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Designation, DesignationTreeNode } from '@/types/designations'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'

interface DesignationTreeProps {
  designations: Designation[]
  onEdit: (designation: Designation) => void
  onDelete: (id: string) => void
}

interface DesignationWithChildren extends Designation {
  children: DesignationWithChildren[]
  parent?: {
    id: string
    name: string
  }
}

export function DesignationTree({ designations, onEdit, onDelete }: DesignationTreeProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({})
  const [sortOrder, setSortOrder] = useState<'order' | 'name' | 'staff' | 'updated'>('order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadStaffCounts()
  }, [designations])

  const loadStaffCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('person_details')
        .select('designation_id')

      if (error) throw error

      const counts: Record<string, number> = {}
      data?.forEach(person => {
        if (person.designation_id) {
          counts[person.designation_id] = (counts[person.designation_id] || 0) + 1
        }
      })
      setStaffCounts(counts)
    } catch (error) {
      console.error('Error loading staff counts:', error)
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

  const expandAll = () => {
    const allNodeIds = new Set<string>()
    const addNodeIds = (nodes: DesignationTreeNode[]) => {
      nodes.forEach(node => {
        allNodeIds.add(node.id)
        if (node.children) {
          addNodeIds(node.children)
        }
      })
    }
    addNodeIds(treeData)
    setExpandedNodes(allNodeIds)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  const handleSort = (type: 'order' | 'name' | 'staff' | 'updated') => {
    if (sortOrder === type) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortOrder(type)
      setSortDirection('asc')
    }
  }

  const sortNodes = (nodes: DesignationWithChildren[]): DesignationWithChildren[] => {
    return [...nodes].sort((a, b) => {
      let comparison = 0
      switch (sortOrder) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'staff':
          comparison = (staffCounts[a.id] || 0) - (staffCounts[b.id] || 0)
          break
        case 'updated':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          break
        default: // order
          comparison = a.order - b.order
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const treeData = useMemo(() => {
    const designationMap = new Map<string, DesignationWithChildren>()
    const rootDesignations: DesignationWithChildren[] = []

    // First pass: Create all nodes
    designations.forEach(designation => {
      const parentDesignation = designation.parent_id 
        ? designations.find(d => d.id === designation.parent_id)
        : undefined

      designationMap.set(designation.id, {
        ...designation,
        children: [],
        parent: parentDesignation 
          ? { id: parentDesignation.id, name: parentDesignation.name }
          : undefined
      })
    })

    // Second pass: Build tree structure
    designations.forEach(designation => {
      const node = designationMap.get(designation.id)!
      if (designation.parent_id) {
        const parent = designationMap.get(designation.parent_id)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        rootDesignations.push(node)
      }
    })

    return rootDesignations
  }, [designations])

  const filteredTreeData = useMemo(() => {
    if (!searchTerm) return treeData

    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (node: DesignationWithChildren): boolean => {
      const nameMatches = node.name.toLowerCase().includes(searchLower)
      const childMatches = node.children.some(matchesSearch)
      return nameMatches || childMatches
    }

    const filterTree = (nodes: DesignationWithChildren[]): DesignationWithChildren[] => {
      return nodes
        .map(node => {
          if (node.children.length === 0) {
            return matchesSearch(node) ? node : null
          }

          const filteredChildren = filterTree(node.children)
          if (filteredChildren.length > 0 || matchesSearch(node)) {
            return {
              ...node,
              children: filteredChildren
            }
          }
          return null
        })
        .filter((node): node is DesignationWithChildren => node !== null)
    }

    return filterTree(treeData)
  }, [treeData, searchTerm])

  const renderNode = (node: DesignationWithChildren, level: number = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const staffCount = staffCounts[node.id] || 0
    const lastUpdated = format(new Date(node.updated_at), 'MMM d, yyyy')
    const children = sortNodes(node.children)

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-4 py-3 px-4 rounded-md transition-all duration-200",
            "hover:bg-muted/80 hover:shadow-sm",
            "border border-transparent hover:border-muted-foreground/20",
            level > 0 && "ml-6"
          )}
        >
          <div 
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => hasChildren && toggleNode(node.id)}
          >
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

            <div className="flex flex-col min-w-[200px]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{node.name}</span>
                <Badge variant="outline" className="text-xs">
                  Level {node.level} • #{node.order.toString().padStart(2, '0')}
                </Badge>
              </div>
              {node.parent && (
                <span className="text-xs text-muted-foreground">
                  Reports to: {node.parent.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-6 ml-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{staffCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {staffCount} staff member{staffCount !== 1 ? 's' : ''} with this designation
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{lastUpdated}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Created: {format(new Date(node.created_at), 'MMM d, yyyy')}</p>
                  <p>Last Updated: {lastUpdated}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(node)}
              className="h-8 w-8"
            >
              <Pencil2Icon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(node.id)}
              className="h-8 w-8"
              disabled={hasChildren || staffCount > 0}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className={cn(
            "border-l-2 ml-4 pl-4 my-1",
            "border-muted transition-all duration-500 ease-in-out"
          )}>
            {children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card/50 overflow-hidden">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search designations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setSearchTerm('')}
                  >
                    <Cross2Icon className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                >
                  Expand All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                >
                  Collapse All
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">Sort by:</span>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  sortOrder === 'order' && "text-primary"
                )}
                onClick={() => handleSort('order')}
              >
                Order
                {sortOrder === 'order' && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  sortOrder === 'name' && "text-primary"
                )}
                onClick={() => handleSort('name')}
              >
                Name
                {sortOrder === 'name' && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  sortOrder === 'staff' && "text-primary"
                )}
                onClick={() => handleSort('staff')}
              >
                Staff Count
                {sortOrder === 'staff' && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2",
                  sortOrder === 'updated' && "text-primary"
                )}
                onClick={() => handleSort('updated')}
              >
                Last Updated
                {sortOrder === 'updated' && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[600px] overflow-auto">
          {filteredTreeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
              {searchTerm ? 'No results found' : 'No designations found. Add your first designation to get started.'}
            </div>
          ) : (
            sortNodes(filteredTreeData).map(node => renderNode(node))
          )}
        </div>
      </div>
    </TooltipProvider>
  )
} 