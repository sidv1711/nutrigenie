'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/components/AuthProvider'
import { calculateBMR, type ActivityLevel, activityLevels } from '@/lib/utils'
import { getProfile, updateProfile } from '@/lib/services/profile'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().int().min(13, 'Must be at least 13 years old').max(120, 'Invalid age'),
  gender: z.enum(['male', 'female']),
  weight: z.number().positive('Weight must be positive'),
  height: z.number().positive('Height must be positive'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'veryActive'] as const),
  dietaryPreferences: z.array(z.string()),
  healthGoals: z.array(z.string()),
  allergies: z.array(z.string()),
  weeklyBudget: z.number().positive('Budget must be positive'),
})

type ProfileFormData = z.infer<typeof profileSchema>

const dietaryOptions = [
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Gluten-free',
  'Dairy-free',
  'Keto',
  'Paleo',
]

const healthGoalOptions = [
  'Weight Loss',
  'Muscle Gain',
  'Maintenance',
  'Better Energy',
  'Improved Health',
]

const allergyOptions = [
  'Nuts',
  'Dairy',
  'Eggs',
  'Soy',
  'Wheat',
  'Fish',
  'Shellfish',
]

export default function ProfilePage() {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bmr, setBmr] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      dietaryPreferences: [],
      healthGoals: [],
      allergies: [],
      weeklyBudget: 100,
    },
  })

  // Load existing profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      const profile = await getProfile(user.id)
      if (profile) {
        reset({
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          weight: profile.weight,
          height: profile.height,
          activityLevel: profile.activity_level,
          dietaryPreferences: profile.dietary_preferences,
          healthGoals: profile.health_goals,
          allergies: profile.allergies,
          weeklyBudget: profile.weekly_budget,
        })
      }
    }
    loadProfile()
  }, [user?.id, reset])

  // Watch form values for BMR calculation
  const weight = watch('weight')
  const height = watch('height')
  const age = watch('age')
  const gender = watch('gender')
  const activityLevel = watch('activityLevel')

  // Calculate BMR when relevant fields change
  useEffect(() => {
    if (weight && height && age && gender) {
      const baseBMR = calculateBMR(weight, height, age, gender)
      const activityMultiplier = activityLevels[activityLevel as ActivityLevel] || 1
      setBmr(Math.round(baseBMR * activityMultiplier))
    }
  }, [weight, height, age, gender, activityLevel])

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) return
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      const profile = await updateProfile({
        id: user.id,
        name: data.name,
        age: data.age,
        gender: data.gender,
        weight: data.weight,
        height: data.height,
        activity_level: data.activityLevel,
        dietary_preferences: data.dietaryPreferences,
        health_goals: data.healthGoals,
        allergies: data.allergies,
        weekly_budget: data.weeklyBudget,
      })
      
      if (!profile) {
        throw new Error('Failed to update profile')
      }
      
      // Show success message or redirect
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update your profile information and preferences.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    {...register('name')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Age
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register('age', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.age && (
                    <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <div className="mt-1">
                  <select
                    {...register('gender')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {errors.gender && (
                    <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Weight (kg)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.1"
                    {...register('weight', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.weight && (
                    <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Height (cm)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    {...register('height', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.height && (
                    <p className="mt-1 text-sm text-red-600">{errors.height.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Activity Level
                </label>
                <div className="mt-1">
                  <select
                    {...register('activityLevel')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select activity level</option>
                    <option value="sedentary">Sedentary (little or no exercise)</option>
                    <option value="light">Light (exercise 1-3 days/week)</option>
                    <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                    <option value="active">Active (exercise 6-7 days/week)</option>
                    <option value="veryActive">Very Active (hard exercise/sports & physical job)</option>
                  </select>
                  {errors.activityLevel && (
                    <p className="mt-1 text-sm text-red-600">{errors.activityLevel.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Weekly Budget ($)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    {...register('weeklyBudget', { valueAsNumber: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {errors.weeklyBudget && (
                    <p className="mt-1 text-sm text-red-600">{errors.weeklyBudget.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dietary Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Dietary Preferences
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {dietaryOptions.map((option) => (
                  <div key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('dietaryPreferences')}
                      value={option}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Health Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Health Goals
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {healthGoalOptions.map((option) => (
                  <div key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('healthGoals')}
                      value={option}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Allergies
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {allergyOptions.map((option) => (
                  <div key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('allergies')}
                      value={option}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label className="ml-2 text-sm text-gray-700">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* BMR Display */}
            {bmr && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Estimated Daily Calorie Needs
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      Based on your profile, you need approximately {bmr} calories per day to maintain your current weight.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 