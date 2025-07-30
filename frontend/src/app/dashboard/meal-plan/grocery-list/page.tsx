'use client'

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { groceryService } from '@/services/groceryService';
import { GroceryItem } from '@/types/grocery';
import StoreSelector from '@/components/StoreSelector';
import { useSearchParams, useRouter } from 'next/navigation';
import { GroceryListSkeleton } from '@/components/SkeletonLoader';
import { InlineErrorMessage } from '@/components/ErrorBoundary';
import CartExport from '@/components/CartExport';
import PDFExport from '@/components/PDFExport';

export default function GroceryListPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const planId = params?.get('plan_id') ?? (typeof window !== 'undefined' ? localStorage.getItem('currentMealPlanId') : null);

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<{ place_id: string; name: string }[]>([]);

  const fetchList = async () => {
    if (!user?.id || !planId) return;
    setLoading(true);
    setError(null);
    
    try {
      const list = await groceryService.getGroceryList(planId);
      setItems(list.items);
      setTotal(list.total_cost ?? null);
    } catch (e: any) {
      setError(e.message || 'Failed to load grocery list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();

    // Load available stores from cached meal plan if present
    if (typeof window !== 'undefined') {
      const mpRaw = localStorage.getItem('currentMealPlan');
      if (mpRaw) {
        try {
          const mp = JSON.parse(mpRaw);
          if (mp.stores) {
            setAvailableStores(mp.stores);
            setSelectedStores(mp.stores.map((s: any) => s.place_id));
          }
        } catch {}
      }
    }
  }, [user?.id, planId]);

  if (!planId) {
    return (
      <div className="p-6">
        <InlineErrorMessage 
          error="No meal plan selected. Please generate a meal plan first."
          onRetry={() => router.push('/dashboard/meal-plan/new')}
        />
      </div>
    );
  }

  if (loading) {
    return <GroceryListSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <InlineErrorMessage 
          error={error} 
          onRetry={fetchList}
          className="mb-4"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Grocery List</h1>
        <PDFExport 
          type="grocery-list" 
          data={{ plan_id: planId, items, total_cost: total }}
          variant="button"
          className="text-sm"
        />
      </div>
      
      {availableStores.length > 0 && (
        <StoreSelector stores={availableStores} selected={selectedStores} onChange={setSelectedStores} />
      )}
      
      {/* Mobile view - Card layout */}
      <div className="sm:hidden space-y-3">
        {items.map((it) => {
          const hasPrice = typeof it.price_per_unit === 'number';
          return (
            <div key={`${it.name}-${it.unit}`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{it.name}</h3>
                <div className="text-right">
                  {hasPrice ? (
                    <div className="font-semibold text-lg">${(it.price_per_unit * it.total_quantity).toFixed(2)}</div>
                  ) : (
                    <div className="text-gray-400">—</div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>{it.total_quantity.toFixed(2)} {it.unit}</span>
                <span>{hasPrice ? `$${it.price_per_unit!.toFixed(2)}/${it.unit}` : 'Price unknown'}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Desktop view - Table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-semibold text-gray-900">Item</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Qty</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Unit</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Price/unit</th>
              <th className="text-right py-3 px-2 font-semibold text-gray-900">Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const hasPrice = typeof it.price_per_unit === 'number';
              return (
                <tr key={`${it.name}-${it.unit}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium text-gray-900">{it.name}</td>
                  <td className="py-3 px-2 text-right text-gray-700">{it.total_quantity.toFixed(2)}</td>
                  <td className="py-3 px-2 text-right text-gray-700">{it.unit}</td>
                  <td className="py-3 px-2 text-right text-gray-700">{hasPrice ? `$${it.price_per_unit!.toFixed(2)}` : '—'}</td>
                  <td className="py-3 px-2 text-right font-semibold text-gray-900">{hasPrice ? `$${(it.price_per_unit * it.total_quantity).toFixed(2)}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-xl sm:text-2xl font-bold text-gray-900">
          Total: {total !== null ? `$${total.toFixed(2)}` : '—'}
        </div>
      </div>

      {planId && (
        <div className="mt-8 border-t border-gray-200 pt-6">
          <CartExport planId={planId} />
        </div>
      )}
    </div>
  );
} 