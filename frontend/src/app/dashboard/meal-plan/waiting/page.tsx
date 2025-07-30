'use client'

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { mealPlanService } from '../../../../services/mealPlanService';

const loadingSteps = [
  { text: "Analyzing your profile and preferences...", duration: 2000 },
  { text: "Finding recipes that match your dietary restrictions...", duration: 3000 },
  { text: "Calculating optimal nutrition balance...", duration: 2500 },
  { text: "Checking ingredient availability at nearby stores...", duration: 3500 },
  { text: "Optimizing meal combinations for variety...", duration: 2000 },
  { text: "Generating your personalized grocery list...", duration: 2500 },
  { text: "Finalizing your meal plan...", duration: 1500 }
]

export default function MealPlanWaitingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    const planIdFromQuery = searchParams?.get('plan_id');
    const planId = planIdFromQuery || localStorage.getItem('currentMealPlanId');

    if (!planId || planId === 'null') {
       setError('Plan could not be saved. Please generate again.');
       return;
    }

    // Start the loading animation
    let stepIndex = 0
    let progressInterval: NodeJS.Timeout
    let stepTimeout: NodeJS.Timeout
    let timeInterval: NodeJS.Timeout

    const totalDuration = loadingSteps.reduce((sum, step) => sum + step.duration, 0)
    let elapsed = 0

    // Update elapsed time display
    timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)

    const updateProgress = () => {
      elapsed += 100
      const newProgress = Math.min((elapsed / totalDuration) * 100, 90) // Cap at 90% until completion
      setProgress(newProgress)
    }

    const nextStep = () => {
      if (stepIndex < loadingSteps.length - 1) {
        stepIndex++
        setCurrentStep(stepIndex)
        stepTimeout = setTimeout(nextStep, loadingSteps[stepIndex].duration)
      }
    }

    // Start progress and step animations
    progressInterval = setInterval(updateProgress, 100)
    stepTimeout = setTimeout(nextStep, loadingSteps[0].duration)

    // Check if meal plan is already complete in localStorage first
    const checkForCompletePlan = () => {
      const storedPlan = localStorage.getItem('currentMealPlan')
      const storedPlanId = localStorage.getItem('currentMealPlanId')
      
      // Only use cached plan if we have a real plan ID (not a temp one) and the plan data
      if (storedPlan && storedPlanId && !storedPlanId.startsWith('temp_')) {
        try {
          const plan = JSON.parse(storedPlan)
          if (plan && plan.days && plan.days.length > 0) {
            // Plan is already complete
            setProgress(100)
            clearInterval(pollInterval)
            clearInterval(progressInterval)
            clearTimeout(stepTimeout)
            clearInterval(timeInterval)
            
            setTimeout(() => {
              router.push('/dashboard/meal-plan')
            }, 500)
            return true
          }
        } catch (e) {
          console.error('Error parsing stored meal plan:', e)
        }
      }
      return false
    }

    // Poll for meal plan completion (both localStorage and API)
    const pollInterval = setInterval(async () => {
      // First check localStorage for immediate completion
      if (checkForCompletePlan()) {
        return
      }

      // If not in localStorage and not a temp ID, try API
      if (!planId.startsWith('temp_')) {
        try {
          const plan = await mealPlanService.getMealPlan(planId)
          if (plan && plan.days && plan.days.length > 0) {
            // Complete the progress bar
            setProgress(100)
            clearInterval(pollInterval)
            clearInterval(progressInterval)
            clearTimeout(stepTimeout)
            clearInterval(timeInterval)
            
            // Persist and redirect after a brief delay
            localStorage.setItem('currentMealPlan', JSON.stringify(plan))
            setTimeout(() => {
              router.push('/dashboard/meal-plan')
            }, 500)
          }
        } catch (e) {
          // Ignore 404 until plan is ready, surface other errors
          if ((e as any)?.response?.status !== 404) {
            setError('Failed while waiting for plan.')
            clearInterval(pollInterval)
            clearInterval(progressInterval)
            clearTimeout(stepTimeout)
            clearInterval(timeInterval)
          }
        }
      }
    }, 1000) // Poll more frequently

    return () => {
      clearInterval(pollInterval)
      clearInterval(progressInterval)
      clearTimeout(stepTimeout)
      clearInterval(timeInterval)
    }
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generation Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard/meal-plan/new')}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Creating Your Meal Plan</h1>
          <p className="text-gray-600">Our AI is working hard to create the perfect meal plan just for you!</p>
          <div className="text-sm text-gray-500 mt-2">Elapsed time: {elapsedTime}s</div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-green-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white bg-opacity-30 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Current Step */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-green-50 px-4 py-3 rounded-full">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-800 font-medium">{loadingSteps[currentStep]?.text}</span>
          </div>
        </div>

        {/* Fun Facts */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Did you know?</h3>
          <div className="text-blue-800 text-sm space-y-2">
            <p>• Our AI considers over 10,000 recipes to find the perfect match for your preferences</p>
            <p>• We optimize for nutrition, taste, and budget simultaneously</p>
            <p>• Your meal plan is unique - no two users get exactly the same plan!</p>
            <p>• We check real-time pricing from your selected grocery stores</p>
          </div>
        </div>

        <div className="text-center mt-6 text-sm text-gray-500">
          Please keep this page open while we work on your plan.
        </div>
      </div>
    </div>
  );
} 