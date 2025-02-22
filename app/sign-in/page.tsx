'use client'

import { Suspense } from 'react'
import { SystemLogo } from '@/components/system-logo'
import { SignInForm } from '@/components/auth/sign-in-form'

function SignInContent() {
  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <SystemLogo width={48} height={48} className="mr-2" />
          Agri Staff Directory
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              Department of Agriculture, Sri Lanka
            </p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <SystemLogo width={64} height={64} className="mx-auto mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
          </div>
          <SignInForm />
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
} 