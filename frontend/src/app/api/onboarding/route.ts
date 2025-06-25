import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const onboardingSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().min(13, 'Must be at least 13 years old').max(120, 'Invalid age'),
  gender: z.enum(['male', 'female']),
  weight: z.number().min(30, 'Weight must be at least 30kg').max(300, 'Weight must be less than 300kg'),
  height: z.number().min(100, 'Height must be at least 100cm').max(250, 'Height must be less than 250cm'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'veryActive'] as const),
  dietaryRestrictions: z.array(z.string()),
  budget: z.number().min(0, 'Budget must be positive'),
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
    const validatedData = onboardingSchema.parse(body)

    // First, insert profile in Supabase (needed for FK constraints)
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          name: validatedData.name,
          age: validatedData.age,
          gender: validatedData.gender,
          weight: validatedData.weight,
          height: validatedData.height,
          activity_level: validatedData.activityLevel,
          dietary_restrictions: validatedData.dietaryRestrictions,
          weekly_budget: validatedData.budget,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error inserting profile:', error)
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      )
    }

    // Call backend /macros endpoint to compute and persist nutrition targets (after profile exists)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const macrosRes = await fetch(`${apiUrl}/macros/compute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        age: validatedData.age,
        gender: validatedData.gender,
        weight_kg: validatedData.weight,
        height_cm: validatedData.height,
        activity_level: validatedData.activityLevel,
        fitness_goal: 'maintain',
      }),
    })

    if (!macrosRes.ok) {
      const errJson = await macrosRes.json()
      console.error('Macro endpoint error:', errJson)
      return NextResponse.json(
        { error: 'Failed to calculate nutrition targets' },
        { status: 500 }
      )
    }

    const macros = await macrosRes.json()

    // Update user metadata to mark registration as complete
    await supabase.auth.updateUser({
      data: { registration_completed: true }
    })

    return NextResponse.json(data)
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