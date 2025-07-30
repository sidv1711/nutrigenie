'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storeService } from '@/services/storeService';
import { StoreSummary } from '@/types/store';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { StoreSelectorSkeleton } from '@/components/SkeletonLoader';
import { InlineErrorMessage } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';

/**
 * This page is the third step in the wizard: the user chooses one or more
 * grocery stores that will be used later for price look-ups and ingredient
 * availability. It fetches nearby stores based on the ZIP code (either passed
 * as a query-param or pulled from the user profile).
 */
const SelectStoresPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [zip, setZip] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve ZIP: first from query string, otherwise from profile
  useEffect(() => {
    const qZip = searchParams?.get('zip');
    if (qZip) {
      setZip(qZip);
    } else if (user?.id) {
      (async () => {
        const { data } = await supabase
          .from('profiles')
          .select('zip_code')
          .eq('id', user.id)
          .single();
        if (data?.zip_code) setZip(String(data.zip_code));
      })();
    }
  }, [searchParams, user?.id]);

  const fetchStores = async () => {
    if (!zip) return;
    setLoading(true);
    setError(null);
    
    try {
      const res = await storeService.fetchNearbyStores(zip);
      setStores(res.stores);
      // Auto-select top 3 if user hasn't interacted yet
      if (selected.length === 0 && res.stores.length) {
        setSelected(res.stores.slice(0, 3).map((s) => s.place_id));
      }
    } catch (err) {
      setError('Could not load nearby stores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch nearby stores whenever we have a ZIP code
  useEffect(() => {
    fetchStores();
  }, [zip]);

  const toggleSelect = (placeId: string) => {
    if (generating) return;
    setSelected((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  const handleNext = async () => {
    if (!selected.length || generating) return;
    setGenerating(true);
    setError(null);
    
    try {
      // Retrieve the pending meal-plan request from previous step
      const reqStr = localStorage.getItem('pendingMealPlanRequest');
      if (!reqStr) throw new Error('Missing meal plan data from previous step.');
      const request = JSON.parse(reqStr);
      request.store_place_ids = selected;

      const { plan_id, plan } = await (await import('@/services/mealPlanService')).mealPlanService.generateMealPlan(request);

      // Complete user registration after first successful meal plan
      try {
        await fetch('/api/complete-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      } catch (regError) {
        console.error('Error completing registration:', regError)
        // Don't block the user flow if registration completion fails
      }

      if (plan) {
        localStorage.setItem('currentMealPlan', JSON.stringify(plan));
      }
      localStorage.setItem('currentMealPlanId', plan_id);

      router.push(`/dashboard/meal-plan/waiting?plan_id=${encodeURIComponent(plan_id)}`);
    } catch (err) {
      console.error(err);
      setError('Failed to generate meal plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (!zip) {
    return (
      <div style={{ maxWidth: 500, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
        <InlineErrorMessage 
          error="ZIP code is missing – please go back and enter it."
          onRetry={() => router.push('/dashboard/meal-plan/new')}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto my-4 sm:my-8 p-4 sm:p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">Select your preferred grocery stores</h2>
        <StoreSelectorSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-4 sm:my-8 p-4 sm:p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Select your preferred grocery stores</h2>

      {error && (
        <InlineErrorMessage 
          error={error}
          onRetry={fetchStores}
          className="mb-4"
        />
      )}

      {!error && stores.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No stores found within 5 km of {zip}.</p>
          <p className="text-sm text-gray-500 mt-2">Try going back to enter a different ZIP code.</p>
        </div>
      )}

      {/* Store list */}
      {stores.length > 0 && (
        <>
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              We found {stores.length} stores near {zip}. Select the ones you&apos;d like to use for pricing:
            </p>
            <div className="space-y-3">
              {stores.map((store) => (
                <label 
                  key={store.place_id}
                  className={`
                    flex items-center p-4 rounded-lg border-2 transition-colors cursor-pointer
                    ${selected.includes(store.place_id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    ${generating ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(store.place_id)}
                    onChange={() => toggleSelect(store.place_id)}
                    disabled={generating}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{store.name}</div>
                    <div className="text-sm text-gray-500">{store.distance_km.toFixed(2)} km away</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleNext}
            disabled={!selected.length || generating}
            className={`
              w-full py-3 px-4 rounded-lg font-semibold text-white
              flex items-center justify-center gap-2
              transition-colors duration-200
              ${(selected.length && !generating) 
                ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' 
                : 'bg-gray-300 cursor-not-allowed'
              }
            `}
          >
            {generating && <LoadingSpinner size="small" color="#fff" />}
            {generating ? 'Generating Meal Plan...' : `Generate Plan (${selected.length} stores)`}
          </button>
        </>
      )}
    </div>
  );
};

export default SelectStoresPage; 