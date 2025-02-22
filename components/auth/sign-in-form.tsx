'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgotDialog, setShowForgotDialog] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data?.session) {
        // Get the redirect path from URL or default to dashboard
        const redirectTo = searchParams.get('redirectedFrom') || '/dashboard'
        router.push(redirectTo)
        router.refresh()
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError(error instanceof Error ? error.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto space-y-8">
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-input px-3 py-2"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-input px-3 py-2"
            />
          </div>
          <div className="text-sm text-right">
            <button
              type="button"
              onClick={() => setShowForgotDialog(true)}
              className="text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          {error && (
            <div className="p-3 text-sm bg-red-50 text-red-600 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>

      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Need Help?</DialogTitle>
          </DialogHeader>
          <Alert className="bg-muted/50">
            <InfoCircledIcon className="h-4 w-4" />
            <AlertDescription>
              For password resets or any technical assistance, please contact the Web Administrator
            </AlertDescription>
          </Alert>
          <div className="mt-4 space-y-2 text-sm">
            <div className="font-semibold">Contact Information:</div>
            <div>Television and Farmers Broadcasting Service</div>
            <div>Department of Agriculture, Sri Lanka</div>
            <div>Tel: 0812388388</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 