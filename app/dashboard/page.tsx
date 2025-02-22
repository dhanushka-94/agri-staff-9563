'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { PlusIcon, Pencil2Icon, TrashIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons'
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

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        throw new Error(`Authentication failed: ${userError.message}`)
      }

      if (!user) {
        throw new Error('No user found in session')
      }

      console.log('Current user:', user)

      // Try to get the user's profile with detailed error logging
      const profileResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Raw profile result:', profileResult)

      if (profileResult.error) {
        // Log detailed error information
        console.error('Profile fetch error details:', {
          error: profileResult.error,
          status: profileResult.status,
          statusText: profileResult.statusText,
          body: profileResult.data
        })

        // Check if table doesn't exist
        if (profileResult.error.message?.includes('relation "profiles" does not exist')) {
          throw new Error('The profiles table does not exist. Please run the database setup SQL.')
        }

        // If profile not found, create one
        if (profileResult.error.code === 'PGRST116') {
          console.log('Profile not found, creating new profile...')

          // Check if this is the first user
          const countResult = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })

          console.log('Count result:', countResult)

          if (countResult.error) {
            console.error('Count error:', countResult.error)
            throw new Error(`Failed to check existing profiles: ${countResult.error.message}`)
          }

          const count = countResult.count || 0
          console.log('Current profile count:', count)

          const newProfileData = {
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            email: user.email,
            role: count === 0 ? 'admin' : 'staff',
            status: 'active'
          }

          console.log('Creating new profile:', newProfileData)

          const createResult = await supabase
            .from('profiles')
            .insert([newProfileData])
            .select()
            .single()

          console.log('Create profile result:', createResult)

          if (createResult.error) {
            console.error('Profile creation error:', createResult.error)
            throw new Error(`Failed to create profile: ${createResult.error.message}`)
          }

          setProfile(createResult.data)
          setIsAdmin(count === 0)
          return
        }

        // For other errors, throw with detailed message
        throw new Error(`Failed to load profile: ${profileResult.error.message || 'Unknown error'}`)
      }

      if (!profileResult.data) {
        throw new Error('No profile data returned')
      }

      console.log('Profile loaded successfully:', profileResult.data)

      setProfile(profileResult.data)
      setIsAdmin(profileResult.data.role === 'admin')

      // Load all users if admin
      if (profileResult.data.role === 'admin') {
        console.log('Loading all users for admin...')
        
        const usersResult = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        console.log('Users fetch result:', usersResult)

        if (usersResult.error) {
          console.error('Users fetch error:', usersResult.error)
          throw new Error(`Failed to load staff members: ${usersResult.error.message}`)
        }

        console.log('All users loaded:', usersResult.data?.length || 0, 'users')
        setUsers(usersResult.data || [])
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      const errorWithDetails = error as ErrorWithDetails
      const errorMessage = errorWithDetails.message || 'An unexpected error occurred'
      const additionalInfo = errorWithDetails.details || errorWithDetails.hint || errorWithDetails.code
      setError(additionalInfo ? `${errorMessage} (${additionalInfo})` : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Users fetch error:', usersError)
        throw new Error('Failed to load staff members')
      }

      setUsers(allUsers || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users: ' + getErrorMessage(error))
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'inactive' })
        .eq('id', userId)

      if (error) throw error

      // Refresh users list
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, status: 'inactive' }
          : user
      ))
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user: ' + getErrorMessage(error))
    }
  }

  const handleModalSuccess = () => {
    loadUsers()
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
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Agri Staff Dashboard</h1>
        {isAdmin && (
          <Button onClick={handleCreateUser} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* User Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-lg">{profile?.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{profile?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="text-lg capitalize">{profile?.role || 'Staff'}</p>
              </div>
              {profile?.department && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p className="text-lg capitalize">{profile.department}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Staff List */}
        {isAdmin && (
          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Staff Members</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-4">Name</th>
                      <th className="text-left pb-4">Email</th>
                      <th className="text-left pb-4">Role</th>
                      <th className="text-left pb-4">Department</th>
                      <th className="text-left pb-4">Status</th>
                      <th className="text-right pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="py-4">{user.full_name}</td>
                        <td className="py-4">{user.email}</td>
                        <td className="py-4 capitalize">{user.role || 'Staff'}</td>
                        <td className="py-4 capitalize">{user.department || '-'}</td>
                        <td className="py-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            user.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user.id)}
                            >
                              <Pencil2Icon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={selectedUserId}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
} 