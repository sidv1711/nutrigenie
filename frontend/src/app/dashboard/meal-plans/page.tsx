'use client'

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { MealPlan } from '@/types/mealPlan';

interface PlanRow {
  id: string;
  start_date: string;
  end_date: string;
  total_cost: number;
}

export default function MealPlansListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('meal_plans')
        .select('id, start_date, end_date, total_cost')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setPlans(data as PlanRow[]);
      } else {
        setError(error?.message || 'Failed to load meal plans');
      }
      setLoading(false);
    }
    fetchPlans();
  }, [user?.id]);

  const handleView = (plan: PlanRow) => {
    // Store the plan ID and navigate directly - let the meal plan page handle loading
    localStorage.setItem('currentMealPlanId', plan.id);
    router.push(`/dashboard/meal-plan?plan_id=${plan.id}`);
  };

  const handleDelete = async (plan: PlanRow) => {
    const ok = confirm('Delete this meal plan permanently?');
    if (!ok) return;
    try {
      const { mealPlanService } = await import('@/services/mealPlanService');
      await mealPlanService.deleteMealPlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      alert('Meal plan deleted');
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Meal Plans</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Meal Plans</h1>
            <p className="text-xl text-gray-600">
              {plans.length === 0 
                ? 'No meal plans yet. Create your first one to get started!'
                : `${plans.length} meal plan${plans.length === 1 ? '' : 's'} created`
              }
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard/meal-plan/new')}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Create New Plan
            </button>
          </div>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No Meal Plans Yet</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Get started by creating your first AI-powered meal plan. We'll help you plan nutritious, 
            budget-friendly meals tailored to your preferences.
          </p>
          <button
            onClick={() => router.push('/dashboard/meal-plan/new')}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Create Your First Meal Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const startDate = new Date(plan.start_date);
            const endDate = new Date(plan.end_date);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            return (
              <div key={plan.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-2">
                        <svg className="w-8 h-8 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-lg font-semibold text-blue-500">{diffDays} days</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <svg className="w-8 h-8 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="text-lg font-semibold text-green-600">{plan.total_cost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleView(plan)}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-4 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Plan
                    </button>
                    <button
                      onClick={() => handleDelete(plan)}
                      className="bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 