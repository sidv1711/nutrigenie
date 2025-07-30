import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const onboardingSchema = z.object({
  age: z.number().min(13, 'Must be at least 13 years old').max(120, 'Invalid age'),
  weight: z.number().min(30, 'Weight must be at least 30kg').max(300, 'Weight must be less than 300kg'),
  height: z.number().min(100, 'Height must be at least 100cm').max(250, 'Height must be less than 250cm'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active', 'extra_active'] as const),
  dietaryRestrictions: z.array(z.string()),
  budget: z.number().min(0, 'Budget must be positive'),
  locationZip: z.string().min(5, 'ZIP code must be at least 5 characters')
})

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
    
    // Verify the authenticated user (contacts Supabase Auth server)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('Auth error:', userError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Retrieve the session only to obtain a valid access token (do NOT trust session.user)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.error('Session error:', sessionError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Raw request body:', JSON.stringify(body, null, 2))
    
    const validatedData = onboardingSchema.parse(body)
    console.log('Validated data:', JSON.stringify(validatedData, null, 2))

    // Create profile via backend API (which handles all validation)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const profileData = {
      age: Number(validatedData.age),
      weight_kg: Number(validatedData.weight),
      height_cm: Number(validatedData.height),
      activity_level: validatedData.activityLevel,
      fitness_goal: 'maintain', // default fitness goal
      weekly_budget: Number(validatedData.budget),
      dietary_restrictions: validatedData.dietaryRestrictions,
      location_zip: validatedData.locationZip
    }

    console.log('Sending profile data to backend:', JSON.stringify(profileData, null, 2))
    console.log('Original form data:', JSON.stringify(validatedData, null, 2))

    const profileRes = await fetch(`${apiUrl}/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(profileData),
    })

    if (!profileRes.ok) {
      const errJson = await profileRes.json()
      console.error('Profile creation error:', {
        status: profileRes.status,
        statusText: profileRes.statusText,
        error: errJson,
        sentData: profileData,
        headers: Object.fromEntries(profileRes.headers.entries())
      })
      
      let errorMessage = 'Failed to create profile'
      if (profileRes.status === 422) {
        errorMessage = 'Validation error: ' + (errJson.detail || 'Invalid data format')
        if (errJson.detail && typeof errJson.detail === 'object') {
          errorMessage += '. Check: ' + JSON.stringify(errJson.detail)
        }
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errJson, debugData: profileData },
        { status: profileRes.status }
      )
    }

    const profile = await profileRes.json()

    // Don't mark registration as complete yet - wait for meal plan
    return NextResponse.json({ 
      success: true, 
      profile,
      message: 'Profile created successfully',
      next_step: 'meal_plan'
    })
  } catch (error) {
    console.error('Error processing request:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 