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
}

export default function StoreSelector({ stores, selected, onChange }: Props) {
  const toggle = (pid: string) => {
    if (selected.includes(pid)) {
      onChange(selected.filter((s) => s !== pid));
    } else {
      onChange([...selected, pid]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {stores.map((s) => (
        <label key={s.place_id} className="flex items-center gap-1">
          <input
            type="checkbox"
            className="checkbox"
            checked={selected.includes(s.place_id)}
            onChange={() => toggle(s.place_id)}
          />
          {s.name}
        </label>
      ))}
    </div>
  );
}

