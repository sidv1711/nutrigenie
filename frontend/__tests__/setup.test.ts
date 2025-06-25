import { createClient } from '@supabase/supabase-js'

describe('Frontend Environment Setup', () => {
  test('required environment variables are set', () => {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    requiredVars.forEach(varName => {
      expect(process.env[varName]).toBeDefined()
      expect(process.env[varName]).not.toBe('')
    })
  })

  test('can initialize Supabase client', () => {
    expect(() => {
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }).not.toThrow()
  })
}) 