export interface Ingredient {
    name: string;
    category: string;
    unit: string;
    quantity: number;
    price_per_unit: number;
}

export interface Recipe {
    name: string;
    description?: string;
    instructions: string[];
    prep_time_minutes: number;
    cook_time_minutes: number;
    servings: number;
    calories_per_serving: number;
    protein_per_serving: number;
    carbs_per_serving: number;
    fat_per_serving: number;
    ingredients: Ingredient[];
    dietary_tags?: string[];
}

export interface Meal {
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipe: Recipe;
    servings: number;
}

export interface DayPlan {
    day_of_week: number;
    meals: Meal[];
}

export interface StoreSummary {
    place_id: string;
    name: string;
}

export interface MealPlan {
    start_date: string;
    end_date: string;
    days: DayPlan[];
    total_cost: number;
    stores?: StoreSummary[];
}

export interface MealPlanRequest {
    start_date: string;
    end_date: string;
    calories_per_day: number;
    protein_per_day: number;
    carbs_per_day: number;
    fat_per_day: number;
    weekly_budget: number;
    location_zip: string;
    dietary_restrictions?: string[];
}

export interface GenerateMealPlanResponse {
    plan_id: string;
    plan: MealPlan;
} 