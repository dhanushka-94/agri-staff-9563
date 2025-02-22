import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single supabase client for interacting with your database
export const createServerClient = () => 
  createClient<Database>(supabaseUrl, supabaseAnonKey)

export const createBrowserClient = () => 
  createClientComponentClient<Database>()

// Export a default client for convenience
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient()
  : createServerClient() 