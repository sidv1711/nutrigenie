'use client'

import { useAuth } from '@/components/AuthProvider'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const { user } = useAuth()
  const [goals, setGoals] = useState<null | {
    calories: number
    protein_grams: number
    carbs_grams: number
    fat_grams: number
  }>(null)
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [mealPlanCount, setMealPlanCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetchGoals() {
      if (!user?.id) return
      setLoadingGoals(true)
      const { data, error } = await supabase
        .from('nutrition_requirements')
        .select('calories, protein_grams, carbs_grams, fat_grams')
        .eq('user_id', user.id)
        .single()
      if (!error && data) setGoals(data)
      setLoadingGoals(false)
    }
    fetchGoals()
  }, [user?.id])

  useEffect(() => {
    async function fetchMealPlanCount() {
      if (!user?.id) return
      const { count, error } = await supabase
        .from('meal_plans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (!error) setMealPlanCount(count ?? 0)
    }
    fetchMealPlanCount()
  }, [user?.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Track your nutrition, plan your meals, and achieve your health goals.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Meal Plans
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {mealPlanCount === null ? '…' : mealPlanCount}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a
                href="/dashboard/meal-plan/options"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Create new plan
              </a>
              {mealPlanCount && mealPlanCount > 0 && (
                <>
                  <span className="mx-2 text-gray-400">|</span>
                  <a
                    href="/dashboard/meal-plans"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    View existing
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Profile Completion
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">20%</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Complete your profile
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Nutrition Goals
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {loadingGoals ? '...' : goals ? (
                        <>
                          {goals.calories} kcal
                        </>
                      ) : (
                        'Not Set'
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a
                href="/dashboard/nutrition-goals"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                {goals ? 'Edit goals' : 'Set your goals'}
              </a>
              {goals && (
                <div className="mt-2 text-xs text-gray-700">
                  Protein: <span className="font-mono">{goals.protein_grams}g</span> &nbsp;
                  Carbs: <span className="font-mono">{goals.carbs_grams}g</span> &nbsp;
                  Fat: <span className="font-mono">{goals.fat_grams}g</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 