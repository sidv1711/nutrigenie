'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider'
import { userService } from '../../services/userService'
import { UserProfile } from '../../types/user'
import { Button } from '../../components/ui/button'

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    gender: 'male' as UserProfile['gender'],
    weight: 70, // Will store in kg, but allow user to input in lbs
    weight_unit: 'kg' as 'kg' | 'lbs',
    height: 170, // Will store in cm, but allow user to input in feet/inches
    height_unit: 'cm' as 'cm' | 'ft',
    height_feet: 5,
    height_inches: 7,
    activity_level: 'moderate' as UserProfile['activity_level'],
    fitness_goal: 'maintain' as UserProfile['fitness_goal'],
    weekly_budget: 100,
    dietary_restrictions: [] as string[],
    zip_code: ''
  })

  const convertHeightToCm = () => {
    if (formData.height_unit === 'ft') {
      return Math.round((formData.height_feet * 12 + formData.height_inches) * 2.54)
    }
    return formData.height
  }

  const convertWeightToKg = () => {
    if (formData.weight_unit === 'lbs') {
      return Math.round(formData.weight / 2.205 * 10) / 10 // Round to 1 decimal place
    }
    return formData.weight
  }

  const handleSubmit = async () => {
    if (!user) return
    
    // Only allow submission on step 3
    if (step !== 3) {
      return
    }

    // Validate required fields
    if (!formData.name || formData.name.trim().length === 0) {
      alert('Please enter your name')
      return
    }

    if (!formData.zip_code || formData.zip_code.length < 5) {
      alert('Please enter a valid ZIP code (at least 5 characters)')
      return
    }

    if (!formData.age || formData.age < 13 || formData.age > 100) {
      alert('Please enter a valid age (13-100)')
      return
    }

    if (!formData.weight || formData.weight <= 0) {
      alert('Please enter a valid weight')
      return
    }

    const heightInCm = convertHeightToCm()
    if (!heightInCm || heightInCm < 100 || heightInCm > 250) {
      alert('Please enter a valid height')
      return
    }

    setLoading(true)
    try {
      // Add user_id and convert height/weight to metric
      const profileData = {
        name: formData.name.trim(),
        age: formData.age,
        gender: formData.gender,
        weight_kg: convertWeightToKg(), // Always stored in kg
        height: heightInCm, // Always stored in cm
        activity_level: formData.activity_level,
        fitness_goal: formData.fitness_goal,
        weekly_budget: formData.weekly_budget,
        dietary_restrictions: formData.dietary_restrictions,
        zip_code: formData.zip_code,
        user_id: user.id
      }
      console.log('Onboarding page - sending formData:', JSON.stringify(profileData, null, 2))
      await userService.createProfile(profileData)
      
      // Mark registration as complete
      await fetch('/api/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      // Redirect to dashboard after successful profile creation
      router.push('/dashboard')
    } catch (error) {
      console.error('Error creating profile:', error)
      if (error.response?.data) {
        console.error('Backend error details:', JSON.stringify(error.response.data, null, 2))
        let errorMsg = 'Failed to create profile'
        if (Array.isArray(error.response.data.detail)) {
          const validationErrors = error.response.data.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ')
          errorMsg = `Validation error: ${validationErrors}`
        } else if (error.response.data.detail) {
          errorMsg = `Error: ${error.response.data.detail}`
        }
        alert(errorMsg)
      } else {
        alert('Failed to create profile. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 
    'paleo', 'low-carb', 'low-sodium', 'nut-free'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to NutriGenie!
            </h1>
            <p className="text-gray-600">
              Let's set up your nutrition profile to create personalized meal plans
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Step {step} of 3</span>
              <span className="text-sm text-gray-500">{Math.round((step / 3) * 100)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="input w-full"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="input w-full"
                      required
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Age
                      </label>
                      <input
                        type="number"
                        min="13"
                        max="100"
                        value={formData.age}
                        onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                        className="input w-full"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Weight
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleInputChange('weight_unit', 'kg')}
                            className={`px-3 py-1 rounded text-sm ${formData.weight_unit === 'kg' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            kg
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('weight_unit', 'lbs')}
                            className={`px-3 py-1 rounded text-sm ${formData.weight_unit === 'lbs' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            lbs
                          </button>
                        </div>
                        
                        <input
                          type="number"
                          min={formData.weight_unit === 'kg' ? "30" : "65"}
                          max={formData.weight_unit === 'kg' ? "300" : "660"}
                          step="0.1"
                          value={formData.weight}
                          onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                          className="input w-full"
                          placeholder={formData.weight_unit === 'kg' ? "70" : "155"}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleInputChange('height_unit', 'cm')}
                            className={`px-3 py-1 rounded text-sm ${formData.height_unit === 'cm' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            cm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('height_unit', 'ft')}
                            className={`px-3 py-1 rounded text-sm ${formData.height_unit === 'ft' ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                          >
                            ft/in
                          </button>
                        </div>
                        
                        {formData.height_unit === 'cm' ? (
                          <input
                            type="number"
                            min="100"
                            max="250"
                            value={formData.height}
                            onChange={(e) => handleInputChange('height', parseFloat(e.target.value))}
                            className="input w-full"
                            placeholder="170"
                            required
                          />
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="3"
                              max="8"
                              value={formData.height_feet}
                              onChange={(e) => handleInputChange('height_feet', parseInt(e.target.value))}
                              className="input w-full"
                              placeholder="5"
                              required
                            />
                            <span className="text-sm text-gray-500 flex items-center">ft</span>
                            <input
                              type="number"
                              min="0"
                              max="11"
                              value={formData.height_inches}
                              onChange={(e) => handleInputChange('height_inches', parseInt(e.target.value))}
                              className="input w-full"
                              placeholder="7"
                              required
                            />
                            <span className="text-sm text-gray-500 flex items-center">in</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        minLength={5}
                        maxLength={10}
                        value={formData.zip_code}
                        onChange={(e) => handleInputChange('zip_code', e.target.value)}
                        className={`input w-full ${formData.zip_code.length > 0 && formData.zip_code.length < 5 ? 'border-red-300 focus:border-red-500' : ''}`}
                        placeholder="12345"
                        required
                      />
                      {formData.zip_code.length > 0 && formData.zip_code.length < 5 && (
                        <p className="mt-1 text-sm text-red-600">ZIP code must be at least 5 characters</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Activity & Goals</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Activity Level
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'sedentary', label: 'Sedentary (desk job, no exercise)' },
                        { value: 'light', label: 'Light (desk job + light exercise 1-3 days/week)' },
                        { value: 'moderate', label: 'Moderate (moderate exercise 3-5 days/week)' },
                        { value: 'very_active', label: 'Very Active (hard exercise 6-7 days/week)' },
                        { value: 'extra_active', label: 'Extremely Active (physical job + exercise)' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center">
                          <input
                            type="radio"
                            name="activity_level"
                            value={option.value}
                            checked={formData.activity_level === option.value}
                            onChange={(e) => handleInputChange('activity_level', e.target.value)}
                            className="mr-3 text-primary-500"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Fitness Goal
                    </label>
                    <div className="space-y-2">
                      {[
                        { value: 'lose_weight', label: 'Lose Weight' },
                        { value: 'maintain', label: 'Maintain Current Weight' },
                        { value: 'gain_muscle', label: 'Gain Muscle' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center">
                          <input
                            type="radio"
                            name="fitness_goal"
                            value={option.value}
                            checked={formData.fitness_goal === option.value}
                            onChange={(e) => handleInputChange('fitness_goal', e.target.value)}
                            className="mr-3 text-primary-500"
                          />
                          <span className="text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weekly Budget ($)
                    </label>
                    <input
                      type="number"
                      min="20"
                      value={formData.weekly_budget}
                      onChange={(e) => handleInputChange('weekly_budget', parseFloat(e.target.value))}
                      className="input w-full"
                      required
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Dietary Preferences</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select any dietary restrictions or preferences:
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {dietaryOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.dietary_restrictions.includes(option)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleInputChange('dietary_restrictions', [...formData.dietary_restrictions, option])
                              } else {
                                handleInputChange('dietary_restrictions', formData.dietary_restrictions.filter(d => d !== option))
                              }
                            }}
                            className="mr-2 text-primary-500"
                          />
                          <span className="text-gray-700 capitalize">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                  >
                    Back
                  </Button>
                )}
                
                <div className="ml-auto">
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={() => setStep(step + 1)}
                      className="bg-primary-500 hover:bg-primary-600"
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={loading}
                      className="bg-primary-500 hover:bg-primary-600"
                      onClick={handleSubmit}
                    >
                      {loading ? 'Creating Profile...' : 'Complete Setup'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 