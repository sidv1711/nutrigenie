export interface User {
  id: string
  email: string
  full_name: string
  created_at: string
}

export interface UserProfile {
  user_id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  weight_kg: number // Always stored in kg, but can be input in different units
  height: number // Always stored in cm, but can be input in different units
  activity_level: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active'
  fitness_goal: 'lose_weight' | 'maintain' | 'gain_muscle'
  weekly_budget: number
  dietary_restrictions: string[]
  zip_code: string
}

export interface MacroTargets {
  calories: number
  protein_g: number
  carbs_g: number
  fats_g: number
}