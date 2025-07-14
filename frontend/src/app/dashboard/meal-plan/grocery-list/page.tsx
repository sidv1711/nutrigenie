'use client'

import { useAuth } from '@/components/AuthProvider';
import { useEffect, useState } from 'react';
import { groceryService } from '@/services/groceryService';
import { GroceryItem } from '@/types/grocery';
import StoreSelector from '@/components/StoreSelector';
import { useSearchParams, useRouter } from 'next/navigation';

export default function GroceryListPage() {
  const { user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const planId = params?.get('plan_id') ?? (typeof window !== 'undefined' ? localStorage.getItem('currentMealPlanId') : null);

  const [items, setItems] = useState<GroceryItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [availableStores, setAvailableStores] = useState<{ place_id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchList() {
      if (!user?.id || !planId) return;
      setLoading(true);
      try {
        const list = await groceryService.getGroceryList(planId);
        setItems(list.items);
        setTotal(list.total_cost ?? null);
      } catch (e: any) {
        setError(e.message || 'Failed to load grocery list');
      } finally {
        setLoading(false);
      }
    }
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

  if (!planId) return <div className="p-6">No meal plan selected.</div>;
  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Grocery List</h1>
      {availableStores.length > 0 && (
        <StoreSelector stores={availableStores} selected={selectedStores} onChange={setSelectedStores} />
      )}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Item</th>
            <th className="text-right py-2">Qty</th>
            <th className="text-right py-2">Unit</th>
            <th className="text-right py-2">Price/unit</th>
            <th className="text-right py-2">Cost</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const hasPrice = typeof it.price_per_unit === 'number';
            return (
              <tr key={`${it.name}-${it.unit}`} className="border-b hover:bg-gray-50">
                <td className="py-1">{it.name}</td>
                <td className="py-1 text-right">{it.quantity.toFixed(2)}</td>
                <td className="py-1 text-right">{it.unit}</td>
                <td className="py-1 text-right">{hasPrice ? `$${it.price_per_unit!.toFixed(2)}` : '—'}</td>
                <td className="py-1 text-right">{hasPrice ? `$${(it.cost ?? 0).toFixed(2)}` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-4 text-right font-semibold text-lg">
        Total: {total !== null ? `$${total.toFixed(2)}` : '—'}
      </div>

      {planId && (
        <button
          className="mt-6 bg-green-600 text-white px-4 py-2 rounded"
          onClick={async () => {
            try {
              const url = await groceryService.exportCart(planId);
              window.open(url, '_blank');
            } catch (err: any) {
              alert(err.message || 'Failed to create cart');
            }
          }}
        >
          Add to Instacart
        </button>
      )}
    </div>
  );
} 