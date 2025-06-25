'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { storeService } from '@/services/storeService';
import { StoreSummary } from '@/types/store';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

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

  // Fetch nearby stores whenever we have a ZIP code
  useEffect(() => {
    if (!zip) return;
    setLoading(true);
    setError(null);
    storeService
      .fetchNearbyStores(zip)
      .then((res) => {
        setStores(res.stores);
        // Auto-select top 3 if user hasn't interacted yet
        if (selected.length === 0 && res.stores.length) {
          setSelected(res.stores.slice(0, 3).map((s) => s.place_id));
        }
      })
      .catch(() => setError('Could not load nearby stores.'))
      .finally(() => setLoading(false));
  }, [zip]);

  const toggleSelect = (placeId: string) => {
    setSelected((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  const handleNext = async () => {
    if (!selected.length) return;
    setLoading(true);
    try {
      // Retrieve the pending meal-plan request from previous step
      const reqStr = localStorage.getItem('pendingMealPlanRequest');
      if (!reqStr) throw new Error('Missing meal plan data from previous step.');
      const request = JSON.parse(reqStr);
      request.store_place_ids = selected;

      const { plan_id, plan } = await (await import('@/services/mealPlanService')).mealPlanService.generateMealPlan(request);

      if (plan) {
        localStorage.setItem('currentMealPlan', JSON.stringify(plan));
      }
      localStorage.setItem('currentMealPlanId', plan_id);

      router.push(`/dashboard/meal-plan/waiting?plan_id=${encodeURIComponent(plan_id)}`);
    } catch (err) {
      console.error(err);
      setError('Failed to generate meal plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: 24, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Select your preferred grocery stores</h2>

      {/* ZIP status */}
      {!zip && <p style={{ color: '#e53e3e' }}>ZIP code is missing – please go back and enter it.</p>}

      {loading && <p>Loading nearby stores…</p>}
      {error && <p style={{ color: '#e53e3e' }}>{error}</p>}

      {!loading && !error && stores.length === 0 && (
        <p>No stores found within 5 km of {zip}. Try another ZIP.</p>
      )}

      {/* Store list */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {stores.map((store) => (
          <li key={store.place_id} style={{ marginBottom: 8 }}>
            <label style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.includes(store.place_id)}
                onChange={() => toggleSelect(store.place_id)}
                style={{ marginRight: 8 }}
              />
              {store.name} <span style={{ color: '#718096' }}>({store.distance_km.toFixed(2)} km)</span>
            </label>
          </li>
        ))}
      </ul>

      <button
        onClick={handleNext}
        disabled={!selected.length}
        style={{
          marginTop: 24,
          width: '100%',
          padding: 12,
          fontWeight: 700,
          fontSize: 16,
          background: selected.length ? '#3182ce' : '#cbd5e0',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: selected.length ? 'pointer' : 'not-allowed',
        }}
      >
        Next
      </button>
    </div>
  );
};

export default SelectStoresPage; 