'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { activityLevels, type ActivityLevel } from '@/lib/utils'
import { useRouter } from 'next/navigation'

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

type OnboardingFormData = z.infer<typeof onboardingSchema>

const defaultValues = {
  dietaryRestrictions: [] as string[],
  gender: 'male' as const,
  activityLevel: 'moderate' as const
}

export default function OnboardingForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  const { register, handleSubmit, formState: { errors, isSubmitting: formIsSubmitting } } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues,
    mode: 'onChange'
  })

  const onSubmit = async (data: OnboardingFormData) => {
    if (isSubmitting) return // Prevent double submission
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit form')
      }

      await response.json() // Wait for the response to be processed
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false) // Reset submission state on error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {step === 1 && (
        <>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <div className="mt-1">
              <input
                {...register('name')}
                type="text"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">
              Age
            </label>
            <div className="mt-1">
              <input
                {...register('age', { valueAsNumber: true })}
                type="number"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.age && (
                <p className="mt-2 text-sm text-red-600">{errors.age.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <div className="mt-1 space-y-2">
              <div className="flex items-center">
                <input
                  {...register('gender')}
                  type="radio"
                  value="male"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="gender-male" className="ml-3 block text-sm text-gray-700">
                  Male
                </label>
              </div>
              <div className="flex items-center">
                <input
                  {...register('gender')}
                  type="radio"
                  value="female"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="gender-female" className="ml-3 block text-sm text-gray-700">
                  Female
                </label>
              </div>
            </div>
            {errors.gender && (
              <p className="mt-2 text-sm text-red-600">{errors.gender.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">
              Weight (kg)
            </label>
            <div className="mt-1">
              <input
                {...register('weight', { valueAsNumber: true })}
                type="number"
                step="0.1"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.weight && (
                <p className="mt-2 text-sm text-red-600">{errors.weight.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="height" className="block text-sm font-medium text-gray-700">
              Height (cm)
            </label>
            <div className="mt-1">
              <input
                {...register('height', { valueAsNumber: true })}
                type="number"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.height && (
                <p className="mt-2 text-sm text-red-600">{errors.height.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="activityLevel" className="block text-sm font-medium text-gray-700">
              Activity Level
            </label>
            <select
              {...register('activityLevel')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Select an activity level</option>
              {(Object.keys(activityLevels) as ActivityLevel[]).map((level) => (
                <option key={level} value={level}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </option>
              ))}
            </select>
            {errors.activityLevel && (
              <p className="mt-2 text-sm text-red-600">{errors.activityLevel.message}</p>
            )}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div>
            <label htmlFor="dietaryRestrictions" className="block text-sm font-medium text-gray-700">
              Dietary Restrictions
            </label>
            <div className="mt-1 space-y-2">
              {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'].map((restriction) => (
                <div key={restriction} className="flex items-center">
                  <input
                    type="checkbox"
                    value={restriction}
                    {...register('dietaryRestrictions')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-3 block text-sm text-gray-700">
                    {restriction.charAt(0).toUpperCase() + restriction.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
              Weekly Budget ($)
            </label>
            <div className="mt-1">
              <input
                {...register('budget', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {errors.budget && (
                <p className="mt-2 text-sm text-red-600">{errors.budget.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={isSubmitting || formIsSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formIsSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}
        </>
      )}
    </form>
  )
} 