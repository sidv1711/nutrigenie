import { api } from './api';
import { MealPlanRequest, GenerateMealPlanResponse, MealPlan } from '../types/mealPlan';

export const mealPlanService = {
    // Kick off generation and receive the plan + id synchronously
    generateMealPlan: async (request: MealPlanRequest): Promise<GenerateMealPlanResponse> => {
        const response = await api.post<GenerateMealPlanResponse>('/meal-plans/generate', request);
        return response.data;
    },

    // Fetch a meal plan by id (used while polling)
    getMealPlan: async (planId: string): Promise<MealPlan> => {
        const response = await api.get<MealPlan>(`/meal-plans/${planId}`);
        return response.data;
    },

    deleteMealPlan: async (planId: string): Promise<void> => {
        await api.delete(`/meal-plans/${planId}`);
    },
}; 