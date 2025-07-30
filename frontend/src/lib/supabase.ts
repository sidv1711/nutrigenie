import { createBrowserClient } from '@supabase/ssr'

const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Create a single instance to be used throughout the app
export const supabase = createClient() 