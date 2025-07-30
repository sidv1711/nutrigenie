'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/AuthProvider'
import { userService } from '../../../services/userService'
import { UserProfile } from '../../../types/user'
import { Button } from '../../../components/ui/button'

const dietaryOptions = [
  'vegetarian',
  'vegan', 
  'gluten-free',
  'dairy-free',
  'keto',
  'paleo',
  'low-carb',
  'low-sodium',
  'nut-free'
]

const fitnessGoalOptions = [
  'lose_weight',
  'gain_muscle', 
  'maintain',
]

const activityLevels = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9
}

type ActivityLevel = keyof typeof activityLevels

const calculateBMR = (weight: number, height: number, age: number, gender: string): number => {
  const bmr = gender === 'male'
    ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
  return Math.round(bmr)
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bmr, setBmr] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userProfile = await userService.getProfile()
        setProfile(userProfile)
        calculateBMRForProfile(userProfile)
      } catch (error) {
        console.error('Error loading profile:', error)
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const calculateBMRForProfile = (profile: UserProfile) => {
    if (profile.weight_kg && profile.height && profile.age && profile.gender) {
      const baseBMR = calculateBMR(profile.weight_kg, profile.height, profile.age, profile.gender)
      const activityMultiplier = activityLevels[profile.activity_level] || 1.2
      setBmr(Math.round(baseBMR * activityMultiplier))
    }
  }

  const handleInputChange = (field: keyof UserProfile, value: any) => {
    if (!profile) return
    const updatedProfile = { ...profile, [field]: value }
    setProfile(updatedProfile)
    
    // Recalculate BMR if relevant fields changed
    if (['weight_kg', 'height', 'age', 'gender', 'activity_level'].includes(field)) {
      calculateBMRForProfile(updatedProfile)
    }
  }

  const handleArrayChange = (field: keyof UserProfile, value: string, checked: boolean) => {
    if (!profile) return
    const currentArray = (profile[field] as string[]) || []
    const newArray = checked 
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value)
    console.log(`${field} changed: ${value} ${checked ? 'added' : 'removed'}`)
    console.log(`New array:`, newArray)
    handleInputChange(field, newArray)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    
    try {
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)
      
      const updatedProfile = await userService.updateProfile(profile)
      setProfile(updatedProfile)
      setSuccess('Profile updated successfully!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Profile Not Found</h2>
        <p className="text-gray-600 mt-2">Unable to load your profile information.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">
            Update your profile information and preferences to get personalized meal plans.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={profile.gender || ''}
                  onChange={(e) => handleInputChange('gender', e.target.value as any)}
                  className="input w-full"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={profile.age || ''}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                  className="input w-full"
                  min="13"
                  max="120"
                  required
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.weight_kg || ''}
                  onChange={(e) => handleInputChange('weight_kg', parseFloat(e.target.value) || 0)}
                  className="input w-full"
                  min="30"
                  max="300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={profile.height || ''}
                  onChange={(e) => handleInputChange('height', parseInt(e.target.value) || 0)}
                  className="input w-full"
                  min="100"
                  max="250"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Level
                </label>
                <select
                  value={profile.activity_level || ''}
                  onChange={(e) => handleInputChange('activity_level', e.target.value as any)}
                  className="input w-full"
                  required
                >
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary (little or no exercise)</option>
                  <option value="light">Light (exercise 1-3 days/week)</option>
                  <option value="moderate">Moderate (exercise 3-5 days/week)</option>
                  <option value="very_active">Very Active (exercise 6-7 days/week)</option>
                  <option value="extra_active">Extra Active (very hard exercise/sports & physical job)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekly Budget ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={profile.weekly_budget || ''}
                  onChange={(e) => handleInputChange('weekly_budget', parseFloat(e.target.value) || 0)}
                  className="input w-full"
                  min="20"
                  max="1000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={profile.zip_code || ''}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className="input w-full"
                  pattern="[0-9]{5}"
                  maxLength={10}
                  required
                />
              </div>
            </div>
          </div>

          {/* Fitness & Dietary Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fitness & Dietary Preferences</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fitness Goal
                </label>
                <select
                  value={profile.fitness_goal || ''}
                  onChange={(e) => handleInputChange('fitness_goal', e.target.value as any)}
                  className="input w-full"
                  required
                >
                  <option value="">Select your primary goal</option>
                  <option value="lose_weight">Lose Weight</option>
                  <option value="gain_muscle">Gain Muscle</option>
                  <option value="maintain">Maintain Weight</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary Restrictions
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dietaryOptions.map((option) => (
                    <div key={option} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`dietary-${option}`}
                        checked={(profile.dietary_restrictions || []).includes(option)}
                        onChange={(e) => handleArrayChange('dietary_restrictions', option, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={`dietary-${option}`} className="ml-2 text-sm text-gray-700 capitalize">
                        {option.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BMR Display */}
          {bmr && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="text-sm text-primary-800">
                <strong>Estimated Daily Calorie Needs:</strong>
              </div>
              <div className="text-2xl font-bold text-primary-600 mt-1">
                {bmr} calories/day
              </div>
              <div className="text-sm text-primary-700 mt-2">
                Based on your current profile to {profile.fitness_goal?.replace('_', ' ') || 'maintain weight'}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-sm text-red-800 font-medium">Error</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-800 font-medium">Success</div>
              <div className="text-sm text-green-700 mt-1">{success}</div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-primary-500 hover:bg-primary-600"
            >
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 