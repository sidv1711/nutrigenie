'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../components/AuthProvider'
import { userService } from '../../../../services/userService'
import { storeService } from '../../../../services/storeService'
import { mealPlanService } from '../../../../services/mealPlanService'
import { UserProfile } from '../../../../types/user'
import { MealPlanRequest } from '../../../../types/mealPlan'
import { StoreSummary } from '../../../../types/store'
import { Button } from '../../../../components/ui/button'
import { supabase } from '../../../../lib/supabase'

export default function NewMealPlanPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<StoreSummary[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  
  const [mealPlanData, setMealPlanData] = useState({
    duration: 7,
    start_date: new Date().toISOString().split('T')[0],
    customCalories: false,
    calories_per_day: 2000,
    protein_per_day: 150,
    carbs_per_day: 250,
    fat_per_day: 67,
  })

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userProfile = await userService.getProfile()
        setProfile(userProfile)
        
        // Check if this is a first-time user (incomplete registration)
        const { data: { session } } = await supabase.auth.getSession()
        const registrationCompleted = session?.user?.user_metadata?.registration_completed
        setIsFirstTimeUser(!registrationCompleted)
        
        // Auto-calculate nutrition goals based on profile
        const bmr = calculateBMR(userProfile)
        const protein = Math.round(bmr * 0.3 / 4)
        const carbs = Math.round(bmr * 0.45 / 4) 
        const fat = Math.round(bmr * 0.25 / 9)
        
        setMealPlanData(prev => ({
          ...prev,
          calories_per_day: bmr,
          protein_per_day: protein,
          carbs_per_day: carbs,
          fat_per_day: fat
        }))
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }

    if (user) {
      fetchProfile()
    }
  }, [user])

  const calculateBMR = (profile: UserProfile) => {
    // Mifflin-St Jeor Equation
    const baseBMR = profile.gender === 'female'
      ? 10 * profile.weight_kg + 6.25 * profile.height - 5 * profile.age - 161
      : 10 * profile.weight_kg + 6.25 * profile.height - 5 * profile.age + 5
    
    // Adjust for fitness goal
    const goalMultiplier = profile.fitness_goal === 'lose_weight' ? 0.9 :
      profile.fitness_goal === 'gain_muscle' ? 1.1 : 1.0
    
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    }
    
    return Math.round(baseBMR * activityMultipliers[profile.activity_level] * goalMultiplier)
  }

  const handleFindStores = async () => {
    if (!profile) return
    
    setLoading(true)
    try {
      const response = await storeService.fetchNearbyStores(profile.zip_code)
      setStores(response.stores)
      setStep(2)
    } catch (error) {
      console.error('Error fetching stores:', error)
      alert('Failed to find nearby stores. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMealPlan = async () => {
    if (!profile) return

    const endDate = new Date(mealPlanData.start_date)
    endDate.setDate(endDate.getDate() + mealPlanData.duration - 1)

    const request: MealPlanRequest = {
      start_date: mealPlanData.start_date,
      end_date: endDate.toISOString().split('T')[0],
      calories_per_day: mealPlanData.calories_per_day,
      protein_per_day: mealPlanData.protein_per_day,
      carbs_per_day: mealPlanData.carbs_per_day,
      fat_per_day: mealPlanData.fat_per_day,
      weekly_budget: profile.weekly_budget,
      location_zip: profile.zip_code,
      dietary_restrictions: profile.dietary_restrictions,
      store_place_ids: selectedStores
    }

    setLoading(true)
    
    try {
      console.log('Starting meal plan generation with request:', request)
      
      // Clear any existing cached meal plan data to ensure we generate a fresh plan
      localStorage.removeItem('currentMealPlan')
      localStorage.removeItem('currentMealPlanId')
      
      // Complete user registration for first-time users before generation
      if (isFirstTimeUser) {
        try {
          await fetch('/api/complete-registration', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          console.log('Registration completed for first-time user')
        } catch (regError) {
          console.error('Error completing registration:', regError)
          // Don't block the user flow if registration completion fails
        }
      }
      
      // Generate a temporary plan ID and set it first
      const tempPlanId = `temp_${Date.now()}`
      localStorage.setItem('currentMealPlanId', tempPlanId)
      
      // Start meal plan generation in background and immediately redirect
      mealPlanService.generateMealPlan(request).then(response => {
        console.log('Meal plan generation completed:', response)
        // Update localStorage with the real plan data
        localStorage.setItem('currentMealPlanId', response.plan_id)
        localStorage.setItem('currentMealPlan', JSON.stringify(response.plan))
      }).catch(error => {
        console.error('Background meal plan generation failed:', error)
        // The loading page will handle this by showing an error after timeout
      })
      
      console.log('Redirecting to loading page with temp plan ID:', tempPlanId)
      router.push(`/dashboard/meal-plan/waiting?plan_id=${tempPlanId}`)
    } catch (error) {
      console.error('Error starting meal plan generation:', error)
      alert(`Failed to start meal plan generation: ${error.message || error}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRegistration = async () => {
    setLoading(true)
    try {
      await fetch('/api/cancel-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      // This will sign out the user and redirect to home
      router.push('/')
    } catch (error) {
      console.error('Error canceling registration:', error)
      alert('Failed to cancel registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isFirstTimeUser ? 'Complete Your Registration' : 'Create New Meal Plan'}
              </h1>
              <p className="text-gray-600">
                {isFirstTimeUser 
                  ? 'Create your first meal plan to get started with NutriGenie'
                  : 'AI-powered meal planning tailored to your goals'
                }
              </p>
            </div>
            {isFirstTimeUser && (
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={loading}
              >
                Cancel Registration
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Step {step} of 3</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Plan Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Duration
                </label>
                <select
                  value={mealPlanData.duration}
                  onChange={(e) => setMealPlanData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="input w-full"
                >
                  <option value={3}>3 Days</option>
                  <option value={7}>1 Week</option>
                  <option value={14}>2 Weeks</option>
                  <option value={30}>1 Month</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={mealPlanData.start_date}
                  onChange={(e) => setMealPlanData(prev => ({ ...prev, start_date: e.target.value }))}
                  className="input w-full"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Nutrition Goals */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="customCalories"
                  checked={mealPlanData.customCalories}
                  onChange={(e) => setMealPlanData(prev => ({ ...prev, customCalories: e.target.checked }))}
                  className="rounded text-primary-500"
                />
                <label htmlFor="customCalories" className="text-sm font-medium text-gray-700">
                  Customize nutrition targets
                </label>
              </div>

              {mealPlanData.customCalories ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      value={mealPlanData.calories_per_day}
                      onChange={(e) => setMealPlanData(prev => ({ ...prev, calories_per_day: parseInt(e.target.value) }))}
                      className="input w-full"
                      min="1200"
                      max="5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      value={mealPlanData.protein_per_day}
                      onChange={(e) => setMealPlanData(prev => ({ ...prev, protein_per_day: parseInt(e.target.value) }))}
                      className="input w-full"
                      min="30"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      value={mealPlanData.carbs_per_day}
                      onChange={(e) => setMealPlanData(prev => ({ ...prev, carbs_per_day: parseInt(e.target.value) }))}
                      className="input w-full"
                      min="50"
                      max="500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      value={mealPlanData.fat_per_day}
                      onChange={(e) => setMealPlanData(prev => ({ ...prev, fat_per_day: parseInt(e.target.value) }))}
                      className="input w-full"
                      min="20"
                      max="200"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="text-sm text-primary-800">
                    <strong>Recommended targets based on your profile:</strong>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-semibold text-primary-900">{mealPlanData.calories_per_day}</span>
                      <span className="text-primary-700"> cal</span>
                    </div>
                    <div>
                      <span className="font-semibold text-primary-900">{mealPlanData.protein_per_day}</span>
                      <span className="text-primary-700">g protein</span>
                    </div>
                    <div>
                      <span className="font-semibold text-primary-900">{mealPlanData.carbs_per_day}</span>
                      <span className="text-primary-700">g carbs</span>
                    </div>
                    <div>
                      <span className="font-semibold text-primary-900">{mealPlanData.fat_per_day}</span>
                      <span className="text-primary-700">g fat</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6">
              <Button 
                onClick={handleFindStores} 
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Finding Stores...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Find Nearby Stores
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Select Grocery Stores</h2>
            <p className="text-gray-600">
              Choose stores for pricing and availability. We&apos;ll optimize your shopping list accordingly.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store) => (
                <div
                  key={store.place_id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedStores.includes(store.place_id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedStores(prev =>
                      prev.includes(store.place_id)
                        ? prev.filter(id => id !== store.place_id)
                        : [...prev, store.place_id]
                    )
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{store.name}</h3>
                      <p className="text-sm text-gray-500">{store.distance_km} km away</p>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedStores.includes(store.place_id) && (
                        <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                Continue to Review
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Review & Generate</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Plan Details</h3>
                  <div className="space-y-1 text-sm">
                    <div>Duration: <span className="font-medium">{mealPlanData.duration} days</span></div>
                    <div>Start: <span className="font-medium">{mealPlanData.start_date}</span></div>
                    <div>Budget: <span className="font-medium">${profile.weekly_budget}/week</span></div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Daily Nutrition</h3>
                  <div className="space-y-1 text-sm">
                    <div>Calories: <span className="font-medium">{mealPlanData.calories_per_day}</span></div>
                    <div>Protein: <span className="font-medium">{mealPlanData.protein_per_day}g</span></div>
                    <div>Carbs: <span className="font-medium">{mealPlanData.carbs_per_day}g</span></div>
                    <div>Fat: <span className="font-medium">{mealPlanData.fat_per_day}g</span></div>
                  </div>
                </div>
              </div>

              {selectedStores.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Selected Stores</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedStores.map((storeId) => {
                      const store = stores.find(s => s.place_id === storeId)
                      return store ? (
                        <span key={storeId} className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm">
                          {store.name}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {profile.dietary_restrictions.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Dietary Restrictions</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.dietary_restrictions.map((restriction) => (
                      <span key={restriction} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm capitalize">
                        {restriction}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-6">
              <Button 
                variant="outline" 
                onClick={() => setStep(2)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Back
              </Button>
              <Button 
                onClick={handleCreateMealPlan} 
                disabled={loading} 
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Generating Plan...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Meal Plan
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Registration Confirmation Dialog */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-mx-auto mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Registration?</h3>
            <p className="text-gray-600 mb-6">
              This will delete your account and profile information. You'll need to sign up again if you want to use NutriGenie later.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
                className="flex-1"
              >
                Keep Account
              </Button>
              <Button
                onClick={handleCancelRegistration}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? 'Canceling...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 