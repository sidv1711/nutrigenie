"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { supabase } from '@/lib/supabase';

const GenerateMealPlanOptions: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [goals, setGoals] = useState<null | {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    weekly_budget: number;
    dietary_restrictions: string[];
  }>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGoals() {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('nutrition_requirements')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (!error && data) {
        // Fetch dietary restrictions from profile as well
        const { data: profileData } = await supabase
          .from('profiles')
          .select('dietary_restrictions')
          .eq('id', user.id)
          .single();

        setGoals({
          calories: data.calories,
          protein: data.protein_grams,
          carbs: data.carbs_grams,
          fat: data.fat_grams,
          weekly_budget: data.weekly_budget ?? 100,
          dietary_restrictions: profileData?.dietary_restrictions ?? [],
        });
      } else {
        if (error?.code === 'PGRST116') {
          setError('You have not set your nutrition goals yet.');
        } else {
          setError('Could not fetch your nutrition goals.');
        }
      }
      setLoading(false);
    }
    fetchGoals();
  }, [user?.id]);

  const handleUseCurrentGoals = () => {
    if (!goals) return;
    const params = new URLSearchParams({
      calories: String(goals.calories),
      protein: String(goals.protein),
      carbs: String(goals.carbs),
      fat: String(goals.fat),
      weekly_budget: String(goals.weekly_budget),
    });
    if (goals.dietary_restrictions.length) {
      params.append('restrictions', goals.dietary_restrictions.join(','));
    }
    router.push(`/dashboard/meal-plan/new?${params.toString()}`);
  };

  const handleChangeGoals = () => {
    router.push('/dashboard/nutrition-goals');
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>How would you like to generate your meal plan?</h2>
      {loading ? (
        <div>Loading your nutrition goals...</div>
      ) : error ? (
        <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>
      ) : goals ? (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Current Nutrition Goals:</div>
            <ul style={{ fontSize: 16, margin: 0, paddingLeft: 18 }}>
              <li>Calories: {goals.calories} kcal</li>
              <li>Protein: {goals.protein} g</li>
              <li>Carbs: {goals.carbs} g</li>
              <li>Fat: {goals.fat} g</li>
              <li>Weekly Budget: ${goals.weekly_budget}</li>
            </ul>
          </div>
          <button
            style={{ width: '100%', padding: 12, fontWeight: 700, fontSize: 16, background: '#3182ce', color: '#fff', border: 'none', borderRadius: 4, marginBottom: 16, cursor: 'pointer' }}
            onClick={handleUseCurrentGoals}
          >
            Use Current Nutrition Goals
          </button>
        </>
      ) : null}
      <button
        style={{ width: '100%', padding: 12, fontWeight: 700, fontSize: 16, background: '#e2e8f0', color: '#2d3748', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        onClick={handleChangeGoals}
      >
        Change Nutrition Goals
      </button>
    </div>
  );
};

export default GenerateMealPlanOptions; 