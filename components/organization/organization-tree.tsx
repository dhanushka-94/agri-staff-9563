'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon, Cross2Icon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Building2, Network, GitBranch, Grid3X3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface TreeNode {
  id: string
  name: string
  type: 'department' | 'institute' | 'subdivision' | 'unit'
  order: number
  children?: TreeNode[]
  isExpanded?: boolean
  parentName?: string
  createdAt: string
  updatedAt: string
}

interface OrganizationTreeProps {
  className?: string
}

export function OrganizationTree({ className }: OrganizationTreeProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadOrganizationData()
  }, [])

  const loadOrganizationData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load all data in parallel
      const [
        { data: departments, error: deptError },
        { data: institutes, error: instError },
        { data: subdivisions, error: subdivError },
        { data: units, error: unitError }
      ] = await Promise.all([
        supabase.from('departments').select('*').order('order', { ascending: true }),
        supabase.from('institutes').select('*').order('order', { ascending: true }),
        supabase.from('subdivisions').select('*').order('order', { ascending: true }),
        supabase.from('units').select('*').order('order', { ascending: true })
      ])

      if (deptError) throw deptError
      if (instError) throw instError
      if (subdivError) throw subdivError
      if (unitError) throw unitError

      // Build tree structure
      const tree = (departments || []).map(dept => ({
        id: dept.id,
        name: dept.name,
        type: 'department' as const,
        order: dept.order,
        createdAt: dept.created_at,
        updatedAt: dept.updated_at,
        children: (institutes || [])
          .filter(inst => inst.department_id === dept.id)
          .map(inst => ({
            id: inst.id,
            name: inst.name,
            type: 'institute' as const,
            order: inst.order,
            parentName: dept.name,
            createdAt: inst.created_at,
            updatedAt: inst.updated_at,
            children: (subdivisions || [])
              .filter(sub => sub.institute_id === inst.id)
              .map(sub => ({
                id: sub.id,
                name: sub.name,
                type: 'subdivision' as const,
                order: sub.order,
                parentName: inst.name,
                createdAt: sub.created_at,
                updatedAt: sub.updated_at,
                children: (units || [])
                  .filter(unit => unit.subdivision_id === sub.id)
                  .map(unit => ({
                    id: unit.id,
                    name: unit.name,
                    type: 'unit' as const,
                    order: unit.order,
                    parentName: sub.name,
                    createdAt: unit.created_at,
                    updatedAt: unit.updated_at,
                  }))
              }))
          }))
      }))

      setTreeData(tree)
    } catch (error) {
      console.error('Error loading organization data:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
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

  const expandAll = () => {
    const allNodeIds = new Set<string>()
    const addNodeIds = (nodes: TreeNode[]) => {
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

  const getNodeColor = (type: TreeNode['type']) => {
    switch (type) {
      case 'department':
        return 'text-blue-600 dark:text-blue-400'
      case 'institute':
        return 'text-emerald-600 dark:text-emerald-400'
      case 'subdivision':
        return 'text-purple-600 dark:text-purple-400'
      case 'unit':
        return 'text-orange-600 dark:text-orange-400'
    }
  }

  const renderIcon = (type: TreeNode['type']) => {
    const iconClass = cn("h-4 w-4 shrink-0", getNodeColor(type))
    switch (type) {
      case 'department':
        return <Building2 className={iconClass} />
      case 'institute':
        return <Network className={iconClass} />
      case 'subdivision':
        return <GitBranch className={iconClass} />
      case 'unit':
        return <Grid3X3 className={iconClass} />
    }
  }

  const filteredTreeData = useMemo(() => {
    if (!searchTerm) return treeData

    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = (node: TreeNode): boolean => {
      const nameMatches = node.name.toLowerCase().includes(searchLower)
      const childMatches = node.children?.some(matchesSearch) ?? false
      return nameMatches || childMatches
    }

    const filterTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map(node => {
          if (!node.children) {
            return matchesSearch(node) ? node : null
          }

          const filteredChildren = filterTree(node.children)
          if (filteredChildren.length > 0 || matchesSearch(node)) {
            return {
              ...node,
              children: filteredChildren,
              isExpanded: true
            }
          }
          return null
        })
        .filter((node): node is TreeNode => node !== null)
    }

    return filterTree(treeData)
  }, [treeData, searchTerm])

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const nodeColor = getNodeColor(node.type)
    const lastUpdated = new Date(node.updatedAt).toLocaleDateString()

    return (
      <div key={node.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md transition-all duration-200",
            "hover:bg-muted/80 hover:shadow-sm",
            "border border-transparent hover:border-muted-foreground/20",
            level > 0 && "ml-6",
            hasChildren && "cursor-pointer"
          )}
          onClick={() => hasChildren && toggleNode(node.id)}
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
            {renderIcon(node.type)}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-medium transition-colors duration-200",
                  nodeColor
                )}>
                  {node.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  #{node.order.toString().padStart(2, '0')}
                </Badge>
              </div>
              {node.parentName && (
                <span className="text-xs text-muted-foreground">
                  Under: {node.parentName}
                </span>
              )}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground">
                Updated: {lastUpdated}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Created: {new Date(node.createdAt).toLocaleDateString()}</p>
              <p>Last Updated: {new Date(node.updatedAt).toLocaleDateString()}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        {hasChildren && isExpanded && (
          <div className={cn(
            "border-l-2 ml-4 pl-4 my-1",
            "transition-all duration-500 ease-in-out",
            nodeColor.replace('text-', 'border-').replace('600', '200').replace('400', '800')
          )}>
            {node.children?.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted/30 rounded-lg animate-pulse">
        <div className="text-lg font-medium text-muted-foreground">
          Loading organization structure...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-destructive/10 rounded-lg border border-destructive/20">
        <div className="text-lg font-medium text-destructive flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5" />
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn(
        "rounded-lg border bg-card/50 overflow-hidden",
        className
      )}>
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search organization..."
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
        </div>
        <div className="p-4 space-y-2 max-h-[600px] overflow-auto">
          {filteredTreeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
              {searchTerm ? 'No results found' : 'No organization structure found. Add departments to get started.'}
            </div>
          ) : (
            filteredTreeData.map(node => renderNode(node))
          )}
        </div>
      </div>
    </TooltipProvider>
  )
} 