'use client'

import { useEffect, useState } from 'react';

interface StoreOption {
  place_id: string;
  name: string;
}

interface Props {
  stores: StoreOption[];
  selected: string[];
  onChange: (val: string[]) => void;
  loading?: boolean;
}

export default function StoreSelector({ stores, selected, onChange, loading = false }: Props) {
  const toggle = (pid: string) => {
    if (loading) return;
    if (selected.includes(pid)) {
      onChange(selected.filter((s) => s !== pid));
    } else {
      onChange([...selected, pid]);
    }
  };

  if (loading) {
    return (
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Loading stores...</div>
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-gray-100 rounded animate-pulse">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <div className="w-20 h-4 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Select stores for pricing ({selected.length} selected):
      </div>
      <div className="flex flex-wrap gap-2">
        {stores.map((s) => (
          <label 
            key={s.place_id} 
            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
              selected.includes(s.place_id) 
                ? 'bg-blue-50 border-blue-200 text-blue-800' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              checked={selected.includes(s.place_id)}
              onChange={() => toggle(s.place_id)}
            />
            <span className="text-sm font-medium">{s.name}</span>
          </label>
        ))}
      </div>
      {stores.length === 0 && (
        <div className="text-sm text-gray-500 italic">No stores found for this location.</div>
      )}
    </div>
  );
}

