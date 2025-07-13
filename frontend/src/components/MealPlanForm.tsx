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
        <div style={{ maxWidth: 400, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>Generate Your Meal Plan</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="start_date" style={{ fontWeight: 700 }}>Start Date*</label>
                    <input
                                type="date"
                                name="start_date"
                        id="start_date"
                                value={formData.start_date}
                                onChange={handleInputChange}
                                min={new Date().toISOString().split('T')[0]}
                        required
                        style={{ width: '100%', padding: 8, marginTop: 4, color:'#1a202c', fontWeight:500 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="end_date" style={{ fontWeight: 700 }}>End Date*</label>
                    <input
                                type="date"
                                name="end_date"
                        id="end_date"
                                value={formData.end_date}
                                onChange={handleInputChange}
                                min={new Date().toISOString().split('T')[0]}
                        required
                        style={{ width: '100%', padding: 8, marginTop: 4, color:'#1a202c', fontWeight:500 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="calories_per_day" style={{ fontWeight: 700 }}>Daily Calories*</label>
                    <input
                        type="number"
                        name="calories_per_day"
                        id="calories_per_day"
                        value={formData.calories_per_day}
                        onChange={handleNumberChange}
                        min={1200}
                        style={{ width: '100%', padding: 8, marginTop: 4, color: '#1a202c', fontWeight: 500 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="protein_per_day" style={{ fontWeight: 700 }}>Daily Protein (g)*</label>
                    <input
                        type="number"
                        name="protein_per_day"
                        id="protein_per_day"
                        value={formData.protein_per_day}
                        onChange={handleNumberChange}
                        min={30}
                        style={{ width: '100%', padding: 8, marginTop: 4, color: '#1a202c', fontWeight: 500 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="carbs_per_day" style={{ fontWeight: 700 }}>Daily Carbs (g)*</label>
                    <input
                        type="number"
                        name="carbs_per_day"
                        id="carbs_per_day"
                        value={formData.carbs_per_day}
                        onChange={handleNumberChange}
                        min={50}
                        style={{ width: '100%', padding: 8, marginTop: 4, color: '#1a202c', fontWeight: 500 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="fat_per_day" style={{ fontWeight: 700 }}>Daily Fat (g)*</label>
                    <input
                        type="number"
                        name="fat_per_day"
                        id="fat_per_day"
                        value={formData.fat_per_day}
                        onChange={handleNumberChange}
                        min={20}
                        style={{ width: '100%', padding: 8, marginTop: 4, color: '#1a202c', fontWeight: 500 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="weekly_budget" style={{ fontWeight: 700 }}>Weekly Budget ($)*</label>
                    <input
                        type="number"
                        name="weekly_budget"
                        id="weekly_budget"
                        value={formData.weekly_budget}
                        onChange={handleNumberChange}
                        min={0}
                        required
                        style={{ width: '100%', padding: 8, marginTop: 4, color: '#1a202c', fontWeight: 500 }}
                    />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label htmlFor="location_zip" style={{ fontWeight: 700 }}>ZIP Code*</label>
                    <input
                                type="text"
                                name="location_zip"
                        id="location_zip"
                                value={formData.location_zip}
                                onChange={handleInputChange}
                                pattern="[0-9]{5}"
                                placeholder="Enter your ZIP code"
                        required
                        style={{ width: '100%', padding: 8, marginTop: 4, color:'#1a202c', fontWeight:500 }}
                            />
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontWeight: 700 }}>Dietary Restrictions</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        {dietaryRestrictions.map((restriction) => (
                            <label key={restriction} style={{ fontWeight: 400 }}>
                                <input
                                    type="checkbox"
                                    value={restriction}
                                    checked={formData.dietary_restrictions?.some(r => r.toLowerCase() === restriction.toLowerCase()) || false}
                                    onChange={handleDietaryRestrictionsChange}
                                    style={{ marginRight: 8 }}
                                />
                                            {restriction}
                            </label>
                                    ))}
                    </div>
                </div>
                {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
                <button
                            type="submit"
                    disabled={isLoading}
                    style={{ width: '100%', padding: 12, fontWeight: 700, fontSize: 16, background: '#3182ce', color: '#fff', border: 'none', borderRadius: 4, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                    {isLoading ? 'Generating...' : 'Generate Meal Plan'}
                </button>
            </form>
        </div>
    );
};

export default MealPlanForm; 