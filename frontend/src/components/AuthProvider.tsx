'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token)
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

    // Check if user has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      throw new Error('Profile not found. Please complete the registration process.')
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