'use client'

import { useAuth } from '../../components/AuthProvider'
import { useEffect, useState } from 'react'
import { userService } from '../../services/userService'
import { mealPlanService } from '../../services/mealPlanService'
import { UserProfile } from '../../types/user'
import { Button } from '../../components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [recentMealPlans, setRecentMealPlans] = useState([])
  const [stats, setStats] = useState({
    totalMealPlans: 0,
    totalSaved: 0,
    weeklyBudget: 0,
    currentStreak: 0
  })

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return
      
      try {
        console.log('Fetching dashboard data...')
        
        // Fetch user profile
        console.log('Fetching user profile...')
        const userProfile = await userService.getProfile()
        console.log('User profile received:', userProfile)
        setProfile(userProfile)

        // Fetch meal plans to calculate stats
        console.log('Fetching meal plans...')
        try {
          const mealPlans = await mealPlanService.getAllMealPlans()
          console.log('Meal plans received:', mealPlans)
          console.log('Meal plans array length:', mealPlans ? mealPlans.length : 'null/undefined')
          console.log('Meal plans type:', typeof mealPlans)
          console.log('Is meal plans array?', Array.isArray(mealPlans))
          
          const safeMealPlans = Array.isArray(mealPlans) ? mealPlans : []
          setRecentMealPlans(safeMealPlans.slice(0, 3)) // Show 3 most recent

          // Calculate stats
          const calculatedStats = {
            totalMealPlans: safeMealPlans.length,
            totalSaved: safeMealPlans.reduce((acc, plan) => acc + (plan.estimated_cost || 0), 0) * 0.15, // Estimate 15% savings
            weeklyBudget: userProfile.weekly_budget || 0,
            currentStreak: Math.min(safeMealPlans.length, 7) // Simple streak calculation
          }
          console.log('Calculated stats:', calculatedStats)
          setStats(calculatedStats)
        } catch (mealPlanError) {
          console.error('Specific error fetching meal plans:', mealPlanError)
          // Set default stats if meal plan fetch fails
          const defaultStats = {
            totalMealPlans: 0,
            totalSaved: 0,
            weeklyBudget: userProfile.weekly_budget || 0,
            currentStreak: 0
          }
          setStats(defaultStats)
          setRecentMealPlans([])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
      } finally {
        setLoadingProfile(false)
      }
    }
    
    fetchDashboardData()
  }, [user?.id])

  const calculateBMR = (profile: UserProfile) => {
    // Mifflin-St Jeor Equation
    const bmr = profile.fitness_goal === 'lose_weight' ? 
      (10 * profile.weight_kg + 6.25 * profile.height - 5 * profile.age + 5) * 0.9 :
      profile.fitness_goal === 'gain_muscle' ?
      (10 * profile.weight_kg + 6.25 * profile.height - 5 * profile.age + 5) * 1.1 :
      (10 * profile.weight_kg + 6.25 * profile.height - 5 * profile.age + 5)
    
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    }
    
    return Math.round(bmr * activityMultipliers[profile.activity_level])
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}!
        </h1>
        <p className="text-xl text-gray-600">
          Ready to plan some amazing meals? Let's create your personalized nutrition journey.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/meal-plan/new" className="group">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group-hover:border-green-200 hover:-translate-y-1">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-xl">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600">New Meal Plan</h3>
                <p className="text-sm text-gray-500">AI-powered planning</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/meal-plans" className="group">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group-hover:border-green-200 hover:-translate-y-1">
            <div className="flex items-center">
              <div className="bg-gray-100 p-3 rounded-xl">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600">My Plans</h3>
                <p className="text-sm text-gray-500">{stats.totalMealPlans} plan{stats.totalMealPlans !== 1 ? 's' : ''} created</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/profile" className="group">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group-hover:border-green-200 hover:-translate-y-1">
            <div className="flex items-center">
              <div className="bg-gray-100 p-3 rounded-xl">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600">Profile</h3>
                <p className="text-sm text-gray-500">Update preferences</p>
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-xl">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Budget</h3>
              <p className="text-sm text-gray-500">${stats.weeklyBudget}/week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Nutrition Summary */}
      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nutrition Goals Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Your Nutrition Goals</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                  <div className="text-3xl font-bold text-green-600">
                    {profile ? calculateBMR(profile) : '---'}
                  </div>
                  <div className="text-sm font-medium text-gray-600">Daily Calories</div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="text-3xl font-bold text-gray-700">
                    ${stats.weeklyBudget}
                  </div>
                  <div className="text-sm font-medium text-gray-600">Weekly Budget</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">Daily Macronutrient Targets</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((profile ? calculateBMR(profile) : 0) * 0.3 / 4)}g
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Protein</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">
                      {Math.round((profile ? calculateBMR(profile) : 0) * 0.45 / 4)}g
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Carbs</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">
                      {Math.round((profile ? calculateBMR(profile) : 0) * 0.25 / 9)}g
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Fat</div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>

          {/* Profile Summary */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center mb-6">
              <div className="bg-gray-700 rounded-full p-3 mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Your Profile</h3>
                <p className="text-sm text-gray-500">{profile.name}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex items-center">
                  <div className="bg-gray-600 rounded-lg p-2 mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{profile.age}</div>
                    <div className="text-xs text-gray-600">Years Old</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <div className="flex items-center">
                  <div className="bg-green-600 rounded-lg p-2 mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-700">{profile.zip_code}</div>
                    <div className="text-xs text-green-600">Location</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Fitness Goal</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    {profile.fitness_goal.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Activity Level</span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                    {profile.activity_level.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Physical Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(profile.weight_kg)}kg</div>
                    <div className="text-xs text-gray-500">Weight</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(profile.height)}cm</div>
                    <div className="text-xs text-gray-500">Height</div>
                  </div>
                </div>
              </div>

              {profile.dietary_restrictions && profile.dietary_restrictions.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-sm font-medium text-gray-700 mb-3">Dietary Preferences</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.dietary_restrictions.map((restriction) => (
                      <span key={restriction} className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        {restriction}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Meal Plans Section */}
      {recentMealPlans.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-full p-3 mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Recent Meal Plans</h3>
                <p className="text-sm text-gray-500">{stats.totalMealPlans} total plans created</p>
              </div>
            </div>
            <Link href="/dashboard/meal-plans" className="text-green-600 hover:text-green-700 font-medium text-sm">
              View All →
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentMealPlans.map((plan: any, index: number) => (
              <div key={plan.id} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-gray-500">
                    {new Date(plan.created_at).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    ${plan.total_cost?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">
                    {plan.start_date} - {plan.end_date}
                  </div>
                  <div className="text-gray-600 text-xs">
                    Plan #{index + 1}
                  </div>
                </div>
                <div className="mt-3">
                  <Link href={`/dashboard/meal-plan/${plan.id}`} className="text-green-600 hover:text-green-700 text-xs font-medium">
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Get Started Section - Only show if no meal plans */}
      {stats.totalMealPlans === 0 && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-12 text-white">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Your Meal Planning Journey?</h2>
            <p className="text-green-100 mb-8 text-lg">
              Our AI-powered system will create personalized meal plans based on your goals, 
              dietary preferences, and budget. Get real-time grocery prices and export your 
              shopping list directly to your favorite stores.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Link href="/dashboard/meal-plan/new">
                <Button className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 text-lg">
                  Create Your First Meal Plan
                </Button>
              </Link>
              <Link href="/dashboard/meal-plan/stores">
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-green-600 px-8 py-4 text-lg">
                  Find Nearby Stores
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 