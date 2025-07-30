'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token)
      }
      
      // If user is logged in, check if they need onboarding
      if (session?.user) {
        console.log('User metadata:', session.user.user_metadata)
        const registrationCompleted = session.user.user_metadata?.registration_completed
        console.log('Registration completed:', registrationCompleted)
        
        // Always check if profile actually exists, regardless of metadata
        console.log('Checking if profile exists in database...')
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          console.log('Profile check response status:', response.status)
          
          if (response.status === 404) {
            // No profile found, redirect to onboarding
            console.log('No profile found, redirecting to onboarding')
            router.push('/onboarding')
            setLoading(false)
            return
          } else if (response.ok) {
            console.log('Profile exists, user can access dashboard')
          }
        } catch (error) {
          console.error('Error checking profile:', error)
          // If we can't check profile status, redirect to onboarding to be safe
          console.log('Error checking profile, redirecting to onboarding')
          router.push('/onboarding')
          setLoading(false)
          return
        }
      }
      
      setLoading(false)
    })

    // Listen for changes in auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token)
      } else {
        localStorage.removeItem('token')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Handle specific auth errors
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password')
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Please verify your email before signing in')
      }
      throw error
    }

    // Verify user exists and is confirmed
    if (!data?.user) {
      throw new Error('User not found')
    }
    if (!data.user.email_confirmed_at) {
      throw new Error('Please verify your email before signing in')
    }

    // Check if user has completed registration
    const registrationCompleted = data.user.user_metadata?.registration_completed
    if (!registrationCompleted) {
      // Check if user has a profile in backend
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles`, {
          headers: {
            'Authorization': `Bearer ${data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.status === 404) {
          // No profile found, redirect to onboarding
          if (data.session?.access_token) {
            localStorage.setItem('token', data.session.access_token)
          }
          router.push('/onboarding')
          return
        } else if (!response.ok) {
          throw new Error('Failed to check profile status')
        }
        
        // Profile exists but registration not complete, redirect to meal plan
        if (data.session?.access_token) {
          localStorage.setItem('token', data.session.access_token)
        }
        router.push('/dashboard/meal-plan/new')
        return
      } catch (error) {
        console.error('Error checking profile:', error)
        // If we can't check profile status, redirect to onboarding to be safe
        if (data.session?.access_token) {
          localStorage.setItem('token', data.session.access_token)
        }
        router.push('/onboarding')
        return
      }
    }

    if (data.session?.access_token) {
      localStorage.setItem('token', data.session.access_token)
    }
    router.push('/dashboard')
  }

  const signUp = async (email: string, password: string) => {
    // First clear any existing sessions
    await supabase.auth.signOut()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          registration_completed: false
        }
      },
    })
    
    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('User already registered')
      }
      throw error
    }
    
    if (!data.user) throw new Error('Failed to create user')

    // Immediately sign the user in after sign up
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) throw signInError

    // After sign in, redirect to onboarding page
    const { data: afterSession } = await supabase.auth.getSession()
    if (afterSession.session?.access_token) {
      localStorage.setItem('token', afterSession.session.access_token)
    }
    router.push('/onboarding')
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    localStorage.removeItem('token')
    router.push('/')
  }

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
      },
    });
    if (error) throw error;
    router.push('/auth/verify-email');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, signInWithMagicLink }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 