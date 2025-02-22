'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { Building2, Network, GitBranch, Grid3X3 } from 'lucide-react'
import Link from 'next/link'
import { OrganizationTree } from '@/components/organization/organization-tree'

interface Stats {
  departments: number
  institutes: number
  subdivisions: number
  units: number
}

export default function OrganizationPage() {
  const [stats, setStats] = useState<Stats>({
    departments: 0,
    institutes: 0,
    subdivisions: 0,
    units: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkPermissionsAndLoadStats()
  }, [])

  const checkPermissionsAndLoadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check admin status
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single()

      if (profileError) throw profileError

      setIsAdmin(profile?.role === 'admin')

      if (profile?.role !== 'admin') {
        throw new Error('Only administrators can access organization management')
      }

      // Load statistics
      const [
        { count: departmentsCount },
        { count: institutesCount },
        { count: subdivisionsCount },
        { count: unitsCount },
      ] = await Promise.all([
        supabase.from('departments').select('*', { count: 'exact', head: true }),
        supabase.from('institutes').select('*', { count: 'exact', head: true }),
        supabase.from('subdivisions').select('*', { count: 'exact', head: true }),
        supabase.from('units').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        departments: departmentsCount || 0,
        institutes: institutesCount || 0,
        subdivisions: subdivisionsCount || 0,
        units: unitsCount || 0,
      })
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-lg font-medium">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const sections = [
    {
      title: 'Departments',
      description: 'Manage top-level departments',
      href: '/dashboard/organization/departments',
      icon: Building2,
      count: stats.departments,
    },
    {
      title: 'Institutes',
      description: 'Manage institutes under departments',
      href: '/dashboard/organization/institutes',
      icon: Network,
      count: stats.institutes,
    },
    {
      title: 'Subdivisions',
      description: 'Manage subdivisions and regional offices',
      href: '/dashboard/organization/subdivisions',
      icon: GitBranch,
      count: stats.subdivisions,
    },
    {
      title: 'Units',
      description: 'Manage units under subdivisions',
      href: '/dashboard/organization/units',
      icon: Grid3X3,
      count: stats.units,
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
        <p className="text-muted-foreground">
          Manage your organizational structure and hierarchy
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {section.title}
                    <span className="text-2xl font-bold">{section.count}</span>
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Tree</CardTitle>
          <CardDescription>Visual representation of your organizational structure</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationTree />
        </CardContent>
      </Card>
    </div>
  )
} 