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

  const handleView = async (plan: PlanRow) => {
    try {
      const { mealPlanService } = await import('@/services/mealPlanService');
      const fullPlan: MealPlan = await mealPlanService.getMealPlan(plan.id);
      if (fullPlan) {
        localStorage.setItem('currentMealPlan', JSON.stringify(fullPlan));
        localStorage.setItem('currentMealPlanId', plan.id);
        router.push('/dashboard/meal-plan');
      }
    } catch {
      router.push(`/dashboard/meal-plan/waiting?plan_id=${plan.id}`);
    }
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

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your Meal Plans</h1>
      {plans.length === 0 ? (
        <p>No meal plans yet.</p>
      ) : (
        <ul className="space-y-4">
          {plans.map((p) => (
            <li key={p.id} className="border rounded p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {new Date(p.start_date).toLocaleDateString()} – {new Date(p.end_date).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-600">Total cost: ${p.total_cost.toFixed(2)}</div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => handleView(p)}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 