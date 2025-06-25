"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  age: number
  gender: 'male' | 'female'
  weight: number // kg
  height: number // cm
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'
}

type Goal = 'gain' | 'lose' | 'maintain'

const activityFactors: Record<Profile['activity_level'], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
}

function calculateMacros(profile: Profile, goal: Goal) {
  // 1. Calculate BMR
  const { weight, height, age, gender } = profile
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161

  // 2. TDEE
  const tdee = bmr * activityFactors[profile.activity_level]

  // 3. Adjust calories for goal
  let calories = tdee
  if (goal === 'lose') calories = tdee * 0.8
  if (goal === 'gain') calories = tdee * 1.1

  // 4. Macros
  // Use 1g/lb = 2.2g/kg for protein (1.2g/lb for fat loss)
  const weightLbs = weight * 2.20462
  let protein = goal === 'lose' ? 1.2 * weightLbs : 1.0 * weightLbs // grams
  let fat = (goal === 'gain' ? 0.4 : 0.3) * weightLbs // grams
  if (goal === 'maintain') fat = 0.35 * weightLbs

  // Calories from protein and fat
  const proteinCals = protein * 4
  const fatCals = fat * 9
  // Carbs = remaining calories
  const carbs = (calories - proteinCals - fatCals) / 4

  return {
    calories: Math.round(calories),
    protein_grams: Math.round(protein),
    fat_grams: Math.round(fat),
    carbs_grams: Math.round(carbs),
  }
}

export default function SetGoalsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [macros, setMacros] = useState<ReturnType<typeof calculateMacros> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [targetWeight, setTargetWeight] = useState<number>(0)
  const [targetDate, setTargetDate] = useState<string>('')
  const [weightChangePerWeek, setWeightChangePerWeek] = useState<number>(0)
  const [showWeightChangeForm, setShowWeightChangeForm] = useState<boolean>(false)
  const router = useRouter()

  // Fetch user profile on mount
  useEffect(() => {
    async function fetchProfile() {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, age, gender, weight, height, activity_level')
        .eq('id', session.user.id)
        .single()
      if (error || !data) {
        setError('Failed to load profile')
        setLoading(false)
        return
      }
      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  // Calculate macros and calories when goal, weight change, or target weight/date changes
  useEffect(() => {
    if (!profile || !goal) return;
    let tdeeMacros = calculateMacros(profile, goal);
    let newWeightChangePerWeek = weightChangePerWeek;
    // If target weight and date are set, auto-calculate weight change per week
    if (targetWeight && targetDate) {
      const currentWeight = profile.weight;
      const targetWeightValue = parseFloat(targetWeight.toString());
      const targetDateValue = new Date(targetDate);
      const today = new Date();
      const daysToTarget = Math.ceil((targetDateValue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysToTarget > 0) {
        newWeightChangePerWeek = (targetWeightValue - currentWeight) / (daysToTarget / 7);
        setWeightChangePerWeek(Number(newWeightChangePerWeek.toFixed(2)));
      }
    }
    // Calculate adjusted calories
    const adjustedCalories = Math.round(tdeeMacros.calories + (newWeightChangePerWeek * 1100));
    // Adjust macros proportionally
    const macrosRatio = adjustedCalories / tdeeMacros.calories;
    setMacros({
      calories: adjustedCalories,
      protein_grams: Math.round(tdeeMacros.protein_grams * macrosRatio),
      fat_grams: Math.round(tdeeMacros.fat_grams * macrosRatio),
      carbs_grams: Math.round(tdeeMacros.carbs_grams * macrosRatio),
    });
    setShowWeightChangeForm(true);
  }, [profile, goal, targetWeight, targetDate, weightChangePerWeek]);

  // Handle submit
  async function handleSubmit() {
    if (!profile || !macros) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Use weightChangePerWeek for calculation
    const currentWeight = profile.weight
    const targetWeightValue = isNaN(targetWeight) ? currentWeight : parseFloat(targetWeight.toString())
    const targetDateValue = targetDate ? new Date(targetDate) : new Date()

    // Upsert nutrition_requirements
    const { error: upsertError } = await supabase
      .from('nutrition_requirements')
      .upsert(
        {
          user_id: profile.id,
          target_weight: targetWeightValue,
          target_date: targetDateValue.toISOString(),
          weight_change_per_week: weightChangePerWeek,
          calories: macros.calories,
          protein_grams: macros.protein_grams,
          carbs_grams: macros.carbs_grams,
          fat_grams: macros.fat_grams,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
    setLoading(false)
    if (upsertError) {
      console.error('Upsert error:', upsertError)
      setError('Failed to save goals')
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Set Your Nutrition Goals</h2>
        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-600">{error}</p>}
        {!loading && profile && (
          <>
            <div className="mb-4">
              <label className="block font-medium mb-2">What is your primary goal?</label>
              <div className="flex flex-col gap-2">
                <button
                  className={`py-2 px-4 rounded border ${goal === 'gain' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => setGoal('gain')}
                >
                  Gain Muscle
                </button>
                <button
                  className={`py-2 px-4 rounded border ${goal === 'lose' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => setGoal('lose')}
                >
                  Lose Fat
                </button>
                <button
                  className={`py-2 px-4 rounded border ${goal === 'maintain' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
                  onClick={() => setGoal('maintain')}
                >
                  Maintain Body Composition
                </button>
              </div>
            </div>
            {showWeightChangeForm && (
              <div className="mb-4">
                <label className="block font-medium mb-2">Set your target weight and date:</label>
                <input
                  type="number"
                  placeholder="Target Weight (kg)"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(parseFloat(e.target.value))}
                  className="w-full p-2 border rounded mb-2"
                />
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                />
                <label className="block font-medium mb-2">Or set your weight change per week (kg):</label>
                <input
                  type="number"
                  placeholder="Weight Change per Week (kg)"
                  value={weightChangePerWeek}
                  onChange={(e) => setWeightChangePerWeek(Number(e.target.value))}
                  className="w-full p-2 border rounded mb-2"
                  min={-10}
                />
                <p className="text-xs text-gray-500">(Negative for weight loss, positive for weight gain)</p>
              </div>
            )}
            {macros && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Your Calculated Goals:</h3>
                <ul className="space-y-1">
                  <li>Calories: <span className="font-mono">{macros.calories}</span> kcal/day</li>
                  <li>Protein: <span className="font-mono">{macros.protein_grams}</span> g/day</li>
                  <li>Carbs: <span className="font-mono">{macros.carbs_grams}</span> g/day</li>
                  <li>Fat: <span className="font-mono">{macros.fat_grams}</span> g/day</li>
                </ul>
              </div>
            )}
            <button
              className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={!macros || loading}
              onClick={handleSubmit}
            >
              Save Goals
            </button>
            {success && <p className="text-green-600 text-center mt-2">Goals saved! Redirecting...</p>}
          </>
        )}
      </div>
    </div>
  )
} 