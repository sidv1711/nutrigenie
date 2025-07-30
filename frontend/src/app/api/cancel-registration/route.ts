import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()

    // Create server-side Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.delete(name)
          },
        },
      }
    )
    
    // Verify the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if registration is already completed
    const registrationCompleted = user.user_metadata?.registration_completed
    if (registrationCompleted) {
      return NextResponse.json(
        { error: 'Registration already completed' },
        { status: 400 }
      )
    }

    // Clean up any backend profile data
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      // Ignore backend cleanup errors - profile might not exist
      console.warn('Backend profile cleanup failed:', error)
    }

    // Sign out the user (effectively canceling their registration)
    await supabase.auth.signOut()

    return NextResponse.json({ 
      success: true,
      message: 'Registration canceled successfully' 
    })
  } catch (error) {
    console.error('Error canceling registration:', error)
    return NextResponse.json(
      { error: 'Failed to cancel registration' },
      { status: 500 }
    )
  }
}