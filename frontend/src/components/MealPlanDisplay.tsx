'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MealPlan } from '../types/mealPlan';
import { mealPlanService } from '@/services/mealPlanService';

const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

export const MealPlanDisplay: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mealPlan, setMealPlan] = React.useState<MealPlan | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    const redirectPath = '/dashboard/meal-plan/new';

    useEffect(() => {
        const storedMealPlan = localStorage.getItem('currentMealPlan');
        if (storedMealPlan) {
            const parsed = JSON.parse(storedMealPlan) as MealPlan;
            // If the cached copy has no stores, refetch from backend to get latest shape
            if (!parsed.stores?.length) {
                const planIdCached = localStorage.getItem('currentMealPlanId');
                if (planIdCached) {
                    mealPlanService.getMealPlan(planIdCached)
                        .then((fresh) => {
                            setMealPlan(fresh);
                            localStorage.setItem('currentMealPlan', JSON.stringify(fresh));
                        })
                        .catch(() => setMealPlan(parsed));
                } else {
                    setMealPlan(parsed);
                }
            } else {
                setMealPlan(parsed);
            }
            return;
        }

        const planId = searchParams?.get('plan_id') || localStorage.getItem('currentMealPlanId');
        if (planId) {
            mealPlanService.getMealPlan(planId)
                .then((plan) => {
                    setMealPlan(plan);
                    localStorage.setItem('currentMealPlan', JSON.stringify(plan));
                })
                .catch(() => {
                    setError('Failed to fetch meal plan.');
                    setTimeout(() => router.push(redirectPath), 2000);
                });
        } else {
            setError('No Meal Plan Found. Please generate a meal plan first.');
            setTimeout(() => router.push(redirectPath), 2000);
        }
    }, [router, searchParams]);

    if (error) {
        return <div style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</div>;
    }
    if (!mealPlan) {
        return null;
    }

    return (
        <div style={{ maxWidth: 900, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Your Meal Plan</h1>
                    <div style={{ color: '#4a5568', fontSize: 16 }}>
                        {new Date(mealPlan.start_date).toLocaleDateString()} - {new Date(mealPlan.end_date).toLocaleDateString()}
                    </div>
                </div>
                <button
                    style={{ padding: '10px 18px', background: '#38a169', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => router.push(redirectPath)}
                    >
                        Generate New Plan
                </button>
            </div>

            {mealPlan.stores && mealPlan.stores.length > 0 && (
                <div style={{ fontSize: 16, marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>Stores assumed:</span>{' '}
                    {mealPlan.stores.map((s) => s.name).join(', ')}
                </div>
            )}

            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
                Total Cost: ${mealPlan.total_cost.toFixed(2)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {mealPlan.days.map((day) => (
                    <div key={day.day_of_week} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: 18, background: '#f9fafb' }}>
                        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{DAYS_OF_WEEK[day.day_of_week]}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {day.meals.map((meal, index) => (
                                <div key={index} style={{ marginBottom: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{meal.meal_type}</div>
                                        <div style={{ color: '#4a5568', fontSize: 14 }}>{meal.servings} servings</div>
                                    </div>
                                    <div style={{ border: '1px solid #cbd5e0', borderRadius: 4, padding: 12, background: '#fff' }}>
                                        <div style={{ fontWeight: 600, fontSize: 16 }}>{meal.recipe.name}</div>
                                                        {meal.recipe.description && (
                                            <div style={{ color: '#4a5568', fontSize: 14, marginBottom: 4 }}>{meal.recipe.description}</div>
                                                        )}
                                        <div style={{ display: 'flex', gap: 8, margin: '6px 0' }}>
                                                            {meal.recipe.dietary_tags?.map((tag) => (
                                                <span key={tag} style={{ background: '#c6f6d5', color: '#22543d', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 500 }}>{tag}</span>
                                                            ))}
                                        </div>
                                        <div style={{ margin: '8px 0' }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>Nutrition per serving:</div>
                                            <div style={{ fontSize: 14 }}>
                                                {meal.recipe.calories_per_serving} calories • {meal.recipe.protein_per_serving}g protein • {meal.recipe.carbs_per_serving}g carbs • {meal.recipe.fat_per_serving}g fat
                                            </div>
                                        </div>
                                        <div style={{ margin: '8px 0' }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>Ingredients:</div>
                                            <ul style={{ fontSize: 14, margin: 0, paddingLeft: 18 }}>
                                                {meal.recipe.ingredients.map((ingredient, idx) => {
                                                    const cost = ingredient.price_per_unit !== undefined && ingredient.price_per_unit !== null
                                                        ? (ingredient.price_per_unit * ingredient.quantity)
                                                        : undefined;
                                                    return (
                                                        <li key={idx}>
                                                            {ingredient.quantity} {ingredient.unit} {ingredient.name}
                                                            {cost !== undefined && (
                                                                <> — $ {cost.toFixed(2)}{' '}<span style={{color:'#718096',fontSize:12}}>(@ ${ingredient.price_per_unit.toFixed(2)}/{ingredient.unit})</span></>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                        <div style={{ margin: '8px 0' }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>Instructions:</div>
                                            <ol style={{ fontSize: 14, margin: 0, paddingLeft: 18 }}>
                                                {meal.recipe.instructions.map((instruction, idx) => (
                                                    <li key={idx}>{idx + 1}. {instruction}</li>
                                                ))}
                                            </ol>
                                        </div>
                                        <div style={{ color: '#4a5568', fontSize: 13, marginTop: 6 }}>
                                            Prep time: {meal.recipe.prep_time_minutes} min • Cook time: {meal.recipe.cook_time_minutes} min
                                        </div>
                                    </div>
                                </div>
                                    ))}
                        </div>
                    </div>
                    ))}
            </div>
        </div>
    );
}; 