'use client'

import { useState } from 'react';
import { groceryService } from '@/services/groceryService';

interface Props {
  planId: string;
}

export default function CartExport({ planId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async (retailer = 'instacart') => {
    setLoading(true);
    try {
      const url = await groceryService.exportCart(planId, retailer);
      window.open(url, '_blank');
    } catch (err: any) {
      alert(err.message || 'Failed to create cart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Export to Store</h3>
      <div className="flex gap-2">
        <button
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={() => handleExport('instacart')}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Add to Instacart'}
        </button>
      </div>
    </div>
  );
}