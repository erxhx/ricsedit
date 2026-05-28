'use client';

import { CATEGORY_META, ServiceCategory } from '@/lib/services';

interface Props {
  onSelect: (category: ServiceCategory) => void;
}

export default function StepCategory({ onSelect }: Props) {
  const categories = Object.entries(CATEGORY_META) as [
    ServiceCategory,
    (typeof CATEGORY_META)[ServiceCategory],
  ][];

  return (
    <div className="flex flex-col gap-3">
      <div className="mb-2">
        <p className="text-sm tracking-widest uppercase opacity-50">Book</p>
        <h1 className="text-2xl font-medium mt-1">Choose a service</h1>
      </div>

      {categories.map(([key, meta]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className="group flex items-center justify-between w-full rounded-2xl p-5 text-left transition-all active:scale-[0.98]"
          style={{
            backgroundColor: meta.accent,
            color: '#f6f4ef',
          }}
        >
          <div>
            <span className="text-xs opacity-60 tracking-widest">{meta.num}</span>
            <p className="text-xl font-medium mt-0.5">{meta.label}</p>
            <p className="text-sm opacity-70 mt-0.5">{meta.hint}</p>
          </div>
          <span className="text-2xl opacity-40 group-hover:opacity-70 transition-opacity">→</span>
        </button>
      ))}
    </div>
  );
}
