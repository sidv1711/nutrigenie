'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { mealPlanService } from '../../../../services/mealPlanService'
import { groceryService } from '../../../../services/groceryService'
import { MealPlan } from '../../../../types/mealPlan'
import { GroceryList, Retailer } from '../../../../types/grocery'
import { Button } from '../../../../components/ui/button'
import Link from 'next/link'

export default function MealPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const planId = params?.id as string
  
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [groceryList, setGroceryList] = useState<GroceryList | null>(null)
  const [retailers, setRetailers] = useState<Retailer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'recipes' | 'grocery' | 'export'>('overview')
  const [exportLoading, setExportLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchMealPlan = async () => {
      try {
        setLoading(true)
        const plan = await mealPlanService.getMealPlan(planId)
        setMealPlan(plan)
        
        // Fetch grocery list
        const grocery = await groceryService.getGroceryList(planId)
        setGroceryList(grocery)
        
        // Fetch available retailers
        const availableRetailers = await groceryService.getAvailableRetailers()
        setRetailers(availableRetailers)
      } catch (error) {
        console.error('Error fetching meal plan:', error)
        alert('Failed to load meal plan')
      } finally {
        setLoading(false)
      }
    }

    if (planId) {
      fetchMealPlan()
    }
  }, [planId])

  const handleExportCart = async (retailer: string) => {
    try {
      setExportLoading(retailer)
      const checkoutUrl = await groceryService.exportCart(planId, retailer)
      window.open(checkoutUrl, '_blank')
    } catch (error) {
      console.error('Error exporting cart:', error)
      alert('Failed to export cart. Please try again.')
    } finally {
      setExportLoading(null)
    }
  }

  const calculateTotalNutrition = (mealPlan: MealPlan) => {
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0

    mealPlan.days.forEach(day => {
      day.meals.forEach(meal => {
        const recipe = meal.recipe
        const servingMultiplier = meal.servings / recipe.servings
        
        totalCalories += recipe.calories_per_serving * servingMultiplier
        totalProtein += recipe.protein_per_serving * servingMultiplier
        totalCarbs += recipe.carbs_per_serving * servingMultiplier
        totalFat += recipe.fat_per_serving * servingMultiplier
      })
    })

    const days = mealPlan.days.length
    return {
      avgCalories: Math.round(totalCalories / days),
      avgProtein: Math.round(totalProtein / days),
      avgCarbs: Math.round(totalCarbs / days),
      avgFat: Math.round(totalFat / days)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return days[dayOfWeek]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Meal Plan Not Found</h2>
        <p className="text-gray-600 mt-2">The requested meal plan could not be found.</p>
        <Link href="/dashboard/meal-plans">
          <Button className="mt-4">Back to Meal Plans</Button>
        </Link>
      </div>
    )
  }

  const nutrition = calculateTotalNutrition(mealPlan)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Meal Plan: {formatDate(mealPlan.start_date)} - {formatDate(mealPlan.end_date)}
            </h1>
            <p className="text-gray-600">
              {mealPlan.days.length} days • Total cost: ${mealPlan.total_cost}
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/meal-plans')}
            >
              Back to Plans
            </Button>
            <Button
              onClick={() => mealPlanService.deleteMealPlan(planId)}
              variant="destructive"
            >
              Delete Plan
            </Button>
          </div>
        </div>

        {/* Nutrition Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-primary-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary-600">{nutrition.avgCalories}</div>
            <div className="text-sm text-gray-600">Avg Daily Calories</div>
          </div>
          <div className="bg-secondary-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-secondary-600">{nutrition.avgProtein}g</div>
            <div className="text-sm text-gray-600">Avg Daily Protein</div>
          </div>
          <div className="bg-accent-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-accent-600">{nutrition.avgCarbs}g</div>
            <div className="text-sm text-gray-600">Avg Daily Carbs</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{nutrition.avgFat}g</div>
            <div className="text-sm text-gray-600">Avg Daily Fat</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'recipes', label: 'Recipes' },
              { key: 'grocery', label: 'Grocery List' },
              { key: 'export', label: 'Cart Export' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Weekly Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mealPlan.days.map((day) => (
                  <div key={day.day_of_week} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">{getDayName(day.day_of_week)}</h4>
                    <div className="space-y-2">
                      {day.meals.map((meal, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="font-medium text-gray-800 capitalize">{meal.meal_type}</div>
                          <div className="text-gray-600">{meal.recipe.name}</div>
                          <div className="text-xs text-gray-500">
                            {Math.round(meal.recipe.calories_per_serving * meal.servings / meal.recipe.servings)} cal
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recipes Tab */}
          {activeTab === 'recipes' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">All Recipes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mealPlan.days.flatMap(day => 
                  day.meals.map(meal => meal.recipe)
                ).filter((recipe, index, self) => 
                  index === self.findIndex(r => r.name === recipe.name)
                ).map((recipe) => (
                  <div key={recipe.name} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{recipe.name}</h4>
                    {recipe.description && (
                      <p className="text-gray-600 text-sm mb-3">{recipe.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-500">Prep: </span>
                        <span className="font-medium">{recipe.prep_time_minutes} min</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cook: </span>
                        <span className="font-medium">{recipe.cook_time_minutes} min</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Servings: </span>
                        <span className="font-medium">{recipe.servings}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Calories: </span>
                        <span className="font-medium">{recipe.calories_per_serving}/serving</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Instructions:</div>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                        {recipe.instructions.map((instruction, idx) => (
                          <li key={idx}>{instruction}</li>
                        ))}
                      </ol>
                    </div>
                    {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {recipe.dietary_tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grocery List Tab */}
          {activeTab === 'grocery' && groceryList && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Shopping List</h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-600">
                    ${groceryList.items.reduce((sum, item) => sum + (item.price_per_unit * item.total_quantity), 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">Total Cost</div>
                </div>
              </div>

              {Object.entries(
                groceryList.items.reduce((acc, item) => {
                  if (!acc[item.category]) acc[item.category] = []
                  acc[item.category].push(item)
                  return acc
                }, {} as Record<string, typeof groceryList.items>)
              ).map(([category, items]) => (
                <div key={category} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3 capitalize">{category}</h4>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 ml-2">
                            {item.total_quantity} {item.unit}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            ${(item.price_per_unit * item.total_quantity).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${item.price_per_unit}/{item.unit}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Cart Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Export to Stores</h3>
              <p className="text-gray-600">
                Export your shopping list directly to your favorite grocery stores for convenient pickup or delivery.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {retailers.map((retailer) => (
                  <div
                    key={retailer.id}
                    className={`border rounded-lg p-4 ${
                      retailer.available
                        ? 'border-gray-200 hover:border-primary-300'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">{retailer.name}</h4>
                    {retailer.available ? (
                      <Button
                        onClick={() => handleExportCart(retailer.id)}
                        disabled={exportLoading === retailer.id}
                        className="w-full bg-primary-500 hover:bg-primary-600"
                      >
                        {exportLoading === retailer.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Exporting...
                          </>
                        ) : (
                          'Export to Cart'
                        )}
                      </Button>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Coming soon in your area
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {groceryList && (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="text-sm text-primary-800">
                    <strong>Export includes:</strong>
                  </div>
                  <ul className="mt-2 text-sm text-primary-700 space-y-1">
                    <li>• {groceryList.items.length} unique ingredients</li>
                    <li>• Optimized quantities for {mealPlan.days.length} days</li>
                    <li>• Real-time pricing from selected stores</li>
                    <li>• Automatic product matching</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}