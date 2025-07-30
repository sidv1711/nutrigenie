import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mealPlanService } from '../services/mealPlanService';
import { MealPlanRequest } from '../types/mealPlan';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';
import axios from 'axios';

const dietaryRestrictions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Nut-Free',
    'Low-Carb',
    'Keto',
    'Paleo',
];

const MealPlanForm: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<MealPlanRequest>({
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        calories_per_day: 2000,
        protein_per_day: 150,
        carbs_per_day: 200,
        fat_per_day: 70,
        weekly_budget: 100,
        location_zip: '',
        dietary_restrictions: [],
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!searchParams) return;
        // If query params are present, use them to pre-fill the form (except address)
        const calories = searchParams.get ? searchParams.get('calories') : null;
        const protein = searchParams.get ? searchParams.get('protein') : null;
        const carbs = searchParams.get ? searchParams.get('carbs') : null;
        const fat = searchParams.get ? searchParams.get('fat') : null;
        const weekly_budget = searchParams.get ? searchParams.get('weekly_budget') : null;
        const restrictions = searchParams.get ? searchParams.get('restrictions') : null;
        if (calories || protein || carbs || fat || weekly_budget || restrictions) {
            setFormData(prev => ({
                ...prev,
                calories_per_day: calories ? Number(calories) : prev.calories_per_day,
                protein_per_day: protein ? Number(protein) : prev.protein_per_day,
                carbs_per_day: carbs ? Number(carbs) : prev.carbs_per_day,
                fat_per_day: fat ? Number(fat) : prev.fat_per_day,
                weekly_budget: weekly_budget ? Number(weekly_budget) : prev.weekly_budget,
                location_zip: '', // always leave address empty
                dietary_restrictions: restrictions ? restrictions.split(',').map(r => r.toLowerCase()) : prev.dietary_restrictions,
            }));
        }
    }, [searchParams]);

    useEffect(() => {
        // prefill zip from profile
        async function fetchProfile() {
            if (!user?.id) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('zip_code, dietary_restrictions')
                .eq('id', user.id)
                .single();
            if (!error && data) {
                setFormData(prev => {
                    const updated: Partial<MealPlanRequest> = {};
                    if (data.zip_code && !prev.location_zip) {
                        updated.location_zip = String(data.zip_code);
                    }
                    if (
                        Array.isArray(data.dietary_restrictions) &&
                        (prev.dietary_restrictions?.length ?? 0) === 0
                    ) {
                        updated.dietary_restrictions = data.dietary_restrictions as string[];
                    }
                    return { ...prev, ...updated };
                });
            }
        }
        fetchProfile();
    }, [user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            // update profile zip code
            if (user?.id) {
                await supabase
                    .from('profiles')
                    .update({ zip_code: formData.location_zip })
                    .eq('id', user.id);
            }
            // Store form data for the next wizard step
            localStorage.setItem('pendingMealPlanRequest', JSON.stringify(formData));
            router.push(`/dashboard/meal-plan/stores?zip=${encodeURIComponent(formData.location_zip)}`);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const msgData = err.response?.data;
                const msg = typeof msgData === 'string' ? msgData : JSON.stringify(msgData);
                setError(`Failed to generate meal plan: ${msg}`);
            } else {
                setError('Failed to generate meal plan. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let numVal = Number(value);
        // Auto-cap carbs at 500 g (backend upper bound)
        if (name === 'carbs_per_day' && numVal > 500) {
            numVal = 500;
        }
        setFormData(prev => ({
            ...prev,
            [name]: numVal,
        }));
    };

    const handleDietaryRestrictionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const val = value.toLowerCase();
            const restrictions = (prev.dietary_restrictions || []).map(r => r.toLowerCase());
            if (checked) {
                if (!restrictions.includes(val)) {
                    return { ...prev, dietary_restrictions: [...restrictions, val] };
                }
                return prev;
            } else {
                return { ...prev, dietary_restrictions: restrictions.filter(r => r !== val) };
            }
        });
    };

    return (
        <div className="max-w-md mx-auto my-4 sm:my-8 p-4 sm:p-6 bg-white rounded-lg shadow-sm">
            <h1 className="text-xl sm:text-2xl font-bold mb-6 text-center">Generate Your Meal Plan</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="start_date" className="block text-sm font-semibold text-gray-700 mb-1">Start Date*</label>
                    <input
                        type="date"
                        name="start_date"
                        id="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                
                <div>
                    <label htmlFor="end_date" className="block text-sm font-semibold text-gray-700 mb-1">End Date*</label>
                    <input
                        type="date"
                        name="end_date"
                        id="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="calories_per_day" className="block text-sm font-semibold text-gray-700 mb-1">Daily Calories*</label>
                        <input
                            type="number"
                            name="calories_per_day"
                            id="calories_per_day"
                            value={formData.calories_per_day}
                            onChange={handleNumberChange}
                            min={1200}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="weekly_budget" className="block text-sm font-semibold text-gray-700 mb-1">Weekly Budget ($)*</label>
                        <input
                            type="number"
                            name="weekly_budget"
                            id="weekly_budget"
                            value={formData.weekly_budget}
                            onChange={handleNumberChange}
                            min={0}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="protein_per_day" className="block text-sm font-semibold text-gray-700 mb-1">Protein (g)*</label>
                        <input
                            type="number"
                            name="protein_per_day"
                            id="protein_per_day"
                            value={formData.protein_per_day}
                            onChange={handleNumberChange}
                            min={30}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="carbs_per_day" className="block text-sm font-semibold text-gray-700 mb-1">Carbs (g)*</label>
                        <input
                            type="number"
                            name="carbs_per_day"
                            id="carbs_per_day"
                            value={formData.carbs_per_day}
                            onChange={handleNumberChange}
                            min={50}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="fat_per_day" className="block text-sm font-semibold text-gray-700 mb-1">Fat (g)*</label>
                        <input
                            type="number"
                            name="fat_per_day"
                            id="fat_per_day"
                            value={formData.fat_per_day}
                            onChange={handleNumberChange}
                            min={20}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                
                <div>
                    <label htmlFor="location_zip" className="block text-sm font-semibold text-gray-700 mb-1">ZIP Code*</label>
                    <input
                        type="text"
                        name="location_zip"
                        id="location_zip"
                        value={formData.location_zip}
                        onChange={handleInputChange}
                        pattern="[0-9]{5}"
                        placeholder="Enter your ZIP code"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dietary Restrictions</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {dietaryRestrictions.map((restriction) => (
                            <label key={restriction} className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    value={restriction}
                                    checked={formData.dietary_restrictions?.some(r => r.toLowerCase() === restriction.toLowerCase()) || false}
                                    onChange={handleDietaryRestrictionsChange}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-gray-700">{restriction}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                        {error}
                    </div>
                )}
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors duration-200 flex items-center justify-center gap-2 ${
                        isLoading 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    }`}
                >
                    {isLoading && (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {isLoading ? 'Generating...' : 'Generate Meal Plan'}
                </button>
            </form>
        </div>
    );
};

export default MealPlanForm; 