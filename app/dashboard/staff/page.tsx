'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  PlusIcon,
  Pencil2Icon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  Cross2Icon
} from '@radix-ui/react-icons'
import { UserModal } from '@/components/dashboard/user-modal'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { getErrorMessage } from '@/lib/error-handling'

interface Profile {
  id: string
  full_name: string
  email: string
  role?: string
  department?: string
  status?: 'active' | 'inactive'
  created_at?: string
}

interface ErrorWithDetails extends Error {
  details?: string;
  hint?: string;
  code?: string;
}

export default function StaffManagementPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        throw new Error('Authentication failed: ' + userError.message)
      }

      if (!user) {
        throw new Error('No authenticated user found')
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        throw new Error(`Failed to fetch profile: ${profileError.message}`)
      }

      if (!currentProfile) {
        throw new Error('Profile not found for the current user')
      }

      if (currentProfile.role !== 'admin') {
        throw new Error('Access denied: Only administrators can access staff management')
      }

      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Users fetch error:', usersError)
        throw new Error(`Failed to load staff members: ${usersError.message}`)
      }

      setUsers(allUsers || [])
    } catch (error) {
      console.error('Staff management error:', error)
      const errorWithDetails = error as ErrorWithDetails
      setError(errorWithDetails.message || 'An unexpected error occurred while loading users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setSelectedUserId(undefined)
    setIsModalOpen(true)
  }

  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId)
    setIsModalOpen(true)
  }

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(member => 
        member.id === userId 
          ? { ...member, status: newStatus }
          : member
      ))
    } catch (error) {
      console.error('Error updating status:', error)
      setError('Failed to update status: ' + getErrorMessage(error))
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus
  })

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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search staff..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <Cross2Icon className="text-muted-foreground" />
            </button>
          )}
        </div>

        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="manager">Manager</option>
        </select>

        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All Departments</option>
          <option value="crops">Crops</option>
          <option value="livestock">Livestock</option>
          <option value="research">Research</option>
          <option value="operations">Operations</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* User List */}
      <div className="grid gap-4">
        {filteredUsers.map(user => (
          <div
            key={user.id}
            className="bg-card p-4 rounded-lg shadow-sm flex items-center justify-between"
          >
            <div>
              <h3 className="font-medium">{user.full_name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                {user.department} • {user.role}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditUser(user.id)}
              >
                <Pencil2Icon className="w-4 h-4" />
              </Button>
              <Button
                variant={user.status === 'active' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => handleStatusChange(
                  user.id,
                  user.status === 'active' ? 'inactive' : 'active'
                )}
              >
                {user.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={selectedUserId}
        onSuccess={() => {
          setIsModalOpen(false)
          loadUsers()
        }}
      />
    </div>
  )
} 