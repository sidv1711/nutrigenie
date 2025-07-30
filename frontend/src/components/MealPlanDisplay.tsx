'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MealPlan } from '../types/mealPlan';
import { mealPlanService } from '@/services/mealPlanService';
import { MealPlanSkeleton } from './SkeletonLoader';
import { InlineErrorMessage } from './ErrorBoundary';
import PDFExport from './PDFExport';

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
    const [isLoading, setIsLoading] = React.useState(true);

    const redirectPath = '/dashboard/meal-plan/new';

    const loadMealPlan = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const storedMealPlan = localStorage.getItem('currentMealPlan');
            if (storedMealPlan) {
                const parsed = JSON.parse(storedMealPlan) as MealPlan;
                // If the cached copy has no stores, refetch from backend to get latest shape
                if (!parsed.stores?.length) {
                    const planIdCached = localStorage.getItem('currentMealPlanId');
                    if (planIdCached && !planIdCached.startsWith('temp_')) {
                        try {
                            const fresh = await mealPlanService.getMealPlan(planIdCached);
                            setMealPlan(fresh);
                            localStorage.setItem('currentMealPlan', JSON.stringify(fresh));
                        } catch {
                            setMealPlan(parsed);
                        }
                    } else {
                        setMealPlan(parsed);
                    }
                } else {
                    setMealPlan(parsed);
                }
                return;
            }

            const planId = searchParams?.get('plan_id') || localStorage.getItem('currentMealPlanId');
            if (planId && !planId.startsWith('temp_')) {
                const plan = await mealPlanService.getMealPlan(planId);
                setMealPlan(plan);
                localStorage.setItem('currentMealPlan', JSON.stringify(plan));
            } else if (planId && planId.startsWith('temp_')) {
                // If we have a temp plan ID, the plan is still being generated
                setError('Your meal plan is still being generated. Please wait...');
                setTimeout(() => router.push('/dashboard/meal-plan/waiting?plan_id=' + planId), 2000);
            } else {
                setError('No Meal Plan Found. Please generate a meal plan first.');
                setTimeout(() => router.push(redirectPath), 2000);
            }
        } catch (err) {
            setError('Failed to fetch meal plan. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMealPlan();
    }, [router, searchParams]);

    if (isLoading) {
        return <MealPlanSkeleton />;
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <InlineErrorMessage 
                    error={error} 
                    onRetry={loadMealPlan}
                    className="mb-4"
                />
            </div>
        );
    }

    if (!mealPlan) {
        return null;
    }

    return (
        <div id="meal-plan-display" className="space-y-8">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-8 border border-green-200">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold text-gray-900 mb-3">Your Meal Plan</h1>
                        <p className="text-xl text-gray-600">
                            {new Date(mealPlan.start_date).toLocaleDateString()} - {new Date(mealPlan.end_date).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <PDFExport 
                            type="meal-plan" 
                            data={mealPlan}
                            variant="button"
                            className="bg-white text-green-600 hover:bg-gray-50 border-2 border-green-200 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-md hover:border-green-300 flex items-center justify-center"
                        />
                        <button
                            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                            onClick={() => router.push(redirectPath)}
                        >
                            Generate New Plan
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-green-100 p-3 rounded-xl">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="font-semibold text-gray-900">Total Cost</h3>
                            <p className="text-2xl font-bold text-green-600">${mealPlan.total_cost.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <div className="flex items-center">
                        <div className="bg-blue-100 p-3 rounded-xl">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="font-semibold text-gray-900">Duration</h3>
                            <p className="text-lg font-medium text-gray-600">
                                {(() => {
                                    const startDate = new Date(mealPlan.start_date);
                                    const endDate = new Date(mealPlan.end_date);
                                    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                    return `${diffDays} days`;
                                })()}
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl hover:border-blue-200 transition-all duration-200 group text-left"
                    onClick={() => router.push(`/dashboard/meal-plan/grocery-list?plan_id=${mealPlan.plan_id || localStorage.getItem('currentMealPlanId')}`)}
                >
                    <div className="flex items-center">
                        <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0L17 18m0 0v2a2 2 0 11-4 0v-2m4 0H9.5" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">Grocery List</h3>
                            <p className="text-sm text-gray-500">View shopping list</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* Stores Information */}
            {mealPlan.stores && mealPlan.stores.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Selected Stores</h3>
                    <div className="flex flex-wrap gap-2">
                        {mealPlan.stores.map((store) => (
                            <span key={store.place_id} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                {store.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Daily Meal Plans */}
            <div className="space-y-8">
                {mealPlan.days.map((day) => (
                    <div key={day.day_of_week} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6">
                            <h2 className="text-2xl font-bold text-white">{DAYS_OF_WEEK[day.day_of_week]}</h2>
                        </div>
                        <div className="p-8 space-y-8">
                            {day.meals.map((meal, index) => (
                                <div key={index} className="print-avoid-break">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="bg-blue-100 p-3 rounded-xl">
                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl capitalize text-gray-900">{meal.meal_type}</h3>
                                            <p className="text-gray-600">{meal.servings} servings</p>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 rounded-2xl p-6 space-y-6">
                                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                                            <div className="flex-1">
                                                <h4 className="font-bold text-2xl text-gray-900 mb-2">{meal.recipe.name}</h4>
                                                {meal.recipe.description && (
                                                    <p className="text-gray-600 mb-4">{meal.recipe.description}</p>
                                                )}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {meal.recipe.dietary_tags?.map((tag) => (
                                                        <span key={tag} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                                <div className="text-sm font-medium text-gray-700 mb-2">Nutrition per serving</div>
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div className="text-center">
                                                        <div className="font-bold text-lg text-gray-900">{meal.recipe.calories_per_serving}</div>
                                                        <div className="text-gray-500">calories</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-bold text-lg text-blue-600">{meal.recipe.protein_per_serving}g</div>
                                                        <div className="text-gray-500">protein</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-bold text-lg text-green-600">{meal.recipe.carbs_per_serving}g</div>
                                                        <div className="text-gray-500">carbs</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="font-bold text-lg text-purple-600">{meal.recipe.fat_per_serving}g</div>
                                                        <div className="text-gray-500">fat</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                                <h5 className="font-bold text-gray-900 mb-4 flex items-center">
                                                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m5 0h2a2 2 0 002-2V7a2 2 0 00-2-2h-2m-5 4h6m-6 4h6m-7-7h8" />
                                                    </svg>
                                                    Ingredients
                                                </h5>
                                                <ul className="space-y-2">
                                                    {meal.recipe.ingredients.map((ingredient, idx) => {
                                                        const hasPrice = typeof ingredient.price_per_unit === 'number' && !isNaN(ingredient.price_per_unit);
                                                        const cost = hasPrice ? ingredient.price_per_unit * ingredient.quantity : undefined;
                                                        return (
                                                            <li key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                                                <span className="text-gray-900">{ingredient.quantity} {ingredient.unit} {ingredient.name}</span>
                                                                {cost !== undefined ? (
                                                                    <span className="text-green-600 font-medium text-sm">
                                                                        ${cost.toFixed(2)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-400 text-sm">price unknown</span>
                                                                )}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                            
                                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                                <h5 className="font-bold text-gray-900 mb-4 flex items-center">
                                                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                    </svg>
                                                    Instructions
                                                </h5>
                                                <ol className="space-y-3">
                                                    {meal.recipe.instructions.map((instruction, idx) => (
                                                        <li key={idx} className="flex items-start">
                                                            <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">
                                                                {idx + 1}
                                                            </span>
                                                            <span className="text-gray-700 leading-relaxed">{instruction}</span>
                                                        </li>
                                                    ))}
                                                </ol>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-center bg-white p-4 rounded-xl shadow-sm">
                                            <div className="flex items-center text-gray-600 text-sm">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="mr-4">Prep: {meal.recipe.prep_time_minutes} min</span>
                                                <span>Cook: {meal.recipe.cook_time_minutes} min</span>
                                            </div>
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