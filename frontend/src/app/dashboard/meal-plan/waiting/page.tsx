'use client'

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mealPlanService } from '@/services/mealPlanService';

export default function MealPlanWaitingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const planIdFromQuery = searchParams?.get('plan_id');
    const planId = planIdFromQuery || localStorage.getItem('currentMealPlanId');

    if (!planId || planId === 'null') {
       setError('Plan could not be saved. Please generate again.');
       return;
    }

    const interval = setInterval(async () => {
      try {
        const plan = await mealPlanService.getMealPlan(planId);
        if (plan && plan.days && plan.days.length > 0) {
          // Persist and redirect
          localStorage.setItem('currentMealPlan', JSON.stringify(plan));
          clearInterval(interval);
          router.push('/dashboard/meal-plan');
        }
      } catch (e) {
        // Ignore 404 until plan is ready, surface other errors
        if ((e as any)?.response?.status !== 404) {
          setError('Failed while waiting for plan.');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-semibold mb-4">Generating your meal plan...</h1>
      <p className="text-gray-600">This may take a moment. Please wait.</p>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
} 