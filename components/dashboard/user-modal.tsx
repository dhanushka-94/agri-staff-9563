import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { supabase } from '@/lib/supabase'
import { getErrorMessage } from '@/lib/error-handling'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  onSuccess: () => void
}

interface UserFormData {
  full_name: string
  email: string
  role: string
  department: string
  password?: string
}

export function UserModal({ isOpen, onClose, userId, onSuccess }: UserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    role: 'staff',
    department: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUser = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (data) {
        setFormData({
          full_name: data.full_name,
          email: data.email,
          role: data.role || 'staff',
          department: data.department || '',
        })
      }
    } catch (error) {
      console.error('Error loading user:', error)
      setError(getErrorMessage(error))
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      loadUser()
    } else {
      setFormData({
        full_name: '',
        email: '',
        role: 'staff',
        department: '',
      })
    }
  }, [userId, loadUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (userId) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            department: formData.department,
          })
          .eq('id', userId)

        if (error) throw error
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password!,
          options: {
            data: {
              full_name: formData.full_name,
            },
          },
        })

        if (authError) throw authError

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user?.id,
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            department: formData.department,
            status: 'active',
          }])

        if (profileError) throw profileError
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
      setError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{userId ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          {!userId && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full rounded-md border border-input px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full rounded-md border border-input px-3 py-2"
                  minLength={6}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full rounded-md border border-input px-3 py-2"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full rounded-md border border-input px-3 py-2"
            >
              <option value="">Select Department</option>
              <option value="crops">Crops</option>
              <option value="livestock">Livestock</option>
              <option value="research">Research</option>
              <option value="operations">Operations</option>
            </select>
          </div>

          {error && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : userId ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 