import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
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
        { 
          authenticated: false,
          registration_completed: false,
          next_step: 'login'
        }
      )
    }

    const registrationCompleted = user.user_metadata?.registration_completed === true
    
    // If registration not completed, check profile status
    let hasProfile = false
    if (!registrationCompleted) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        hasProfile = response.ok
      } catch (error) {
        hasProfile = false
      }
    }

    let nextStep = 'dashboard'
    if (!registrationCompleted) {
      nextStep = hasProfile ? 'meal_plan' : 'onboarding'
    }

    return NextResponse.json({ 
      authenticated: true,
      registration_completed: registrationCompleted,
      has_profile: hasProfile,
      next_step: nextStep
    })
  } catch (error) {
    console.error('Error checking registration status:', error)
    return NextResponse.json(
      { 
        authenticated: false,
        registration_completed: false,
        next_step: 'login'
      }
    )
  }
}