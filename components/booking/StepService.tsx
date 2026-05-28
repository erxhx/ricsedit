'use client';

import {
  BARBER_SERVICES,
  CATEGORY_META,
  Service,
  ServiceCategory,
  ServiceGroup,
  TAN_ADDONS,
  TAN_SERVICES,
  WAX_GROUPS,
  getTotalPrice,
} from '@/lib/services';
import type { ServicesData } from '@/lib/services-store';

interface Props {
  category: ServiceCategory;
  selectedServices: Service[];
  onChange: (services: Service[]) => void;
  onNext: () => void;
  onBack: () => void;
  servicesData?: ServicesData;
}

export default function StepService({
  category,
  selectedServices,
  onChange,
  onNext,
  onBack,
  servicesData,
}: Props) {
  const meta = CATEGORY_META[category];
  const accent = meta.accent;

  // Use editable store data if provided, fall back to static imports
  const barberServices = servicesData?.barberServices ?? BARBER_SERVICES;
  const tanServices    = servicesData?.tanServices    ?? TAN_SERVICES;
  const tanAddons      = servicesData?.tanAddons      ?? TAN_ADDONS;
  const waxGroups      = servicesData?.waxGroups      ?? WAX_GROUPS;

  const isSelected = (id: string) => selectedServices.some((s) => s.id === id);

  // Barber: single select
  function handleBarberSelect(service: Service) {
    onChange([service]);
    onNext();
  }

  // Tan: single primary, optional addons
  const tanPrimary = selectedServices.find((s) => !s.isAddon) ?? null;

  function handleTanPrimary(service: Service) {
    const addons = selectedServices.filter((s) => s.isAddon);
    onChange([service, ...addons]);
  }

  function handleTanAddon(addon: Service) {
    if (isSelected(addon.id)) {
      onChange(selectedServices.filter((s) => s.id !== addon.id));
    } else {
      onChange([...selectedServices, addon]);
    }
  }

  // Wax: multi-select
  function handleWaxToggle(service: Service) {
    if (isSelected(service.id)) {
      onChange(selectedServices.filter((s) => s.id !== service.id));
    } else {
      onChange([...selectedServices, service]);
    }
  }

  const canContinue = selectedServices.filter((s) => !s.isAddon).length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1">
        <button onClick={onBack} className="text-sm opacity-50 hover:opacity-80 transition-opacity mb-3">
          ← Back
        </button>
        <div className="flex items-baseline gap-2">
          <span className="text-xs tracking-widest uppercase opacity-40">{meta.num}</span>
          <h1 className="text-2xl font-medium">{meta.label}</h1>
        </div>
        {category === 'wax' && (
          <p className="text-sm opacity-50 mt-1">Select all services for this appointment.</p>
        )}
      </div>

      {category === 'barber' && (
        <ServiceList
          services={barberServices}
          selectedIds={selectedServices.map((s) => s.id)}
          accent={accent}
          mode="single"
          onSelect={handleBarberSelect}
        />
      )}

      {category === 'tan' && (
        <>
          <ServiceList
            services={tanServices}
            selectedIds={tanPrimary ? [tanPrimary.id] : []}
            accent={accent}
            mode="single"
            onSelect={handleTanPrimary}
          />
          {tanPrimary && (
            <div>
              <p className="text-xs uppercase tracking-widest opacity-40 mb-2">Add-ons</p>
              <ServiceList
                services={tanAddons}
                selectedIds={selectedServices.filter((s) => s.isAddon).map((s) => s.id)}
                accent={accent}
                mode="multi"
                onSelect={handleTanAddon}
              />
            </div>
          )}
          {tanPrimary && (
            <ContinueBar
              accent={accent}
              total={getTotalPrice(selectedServices)}
              onNext={onNext}
            />
          )}
        </>
      )}

      {category === 'wax' && (
        <>
          {waxGroups.map((group) => (
            <WaxGroup
              key={group.name}
              group={group}
              selectedIds={selectedServices.map((s) => s.id)}
              accent={accent}
              onToggle={handleWaxToggle}
            />
          ))}
          {canContinue && (
            <ContinueBar
              accent={accent}
              total={getTotalPrice(selectedServices)}
              onNext={onNext}
            />
          )}
        </>
      )}
    </div>
  );
}

function ServiceList({
  services,
  selectedIds,
  accent,
  mode,
  onSelect,
}: {
  services: Service[];
  selectedIds: string[];
  accent: string;
  mode: 'single' | 'multi';
  onSelect: (s: Service) => void;
}) {
  return (
    <div className="divide-y divide-black/8 rounded-2xl overflow-hidden border border-black/8">
      {services.map((service) => {
        const selected = selectedIds.includes(service.id);
        return (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="flex items-center justify-between w-full px-4 py-3.5 text-left transition-colors hover:bg-black/3 active:bg-black/6"
            style={selected ? { backgroundColor: `color-mix(in oklch, ${accent} 12%, transparent)` } : {}}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                style={
                  selected
                    ? { borderColor: accent, backgroundColor: accent }
                    : { borderColor: 'rgba(0,0,0,0.2)' }
                }
              >
                {selected && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    {mode === 'multi' ? (
                      <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <circle cx="4" cy="4" r="2" fill="white" />
                    )}
                  </svg>
                )}
              </span>
              <div>
                <p className="text-sm font-medium">{service.name}</p>
                {service.description && (
                  <p className="text-xs opacity-50 mt-0.5">{service.description}</p>
                )}
              </div>
            </div>
            <div className="text-right ml-4 flex-shrink-0">
              <p className="text-sm font-medium">${service.price}</p>
              {service.durationMinutes > 0 && (
                <p className="text-xs opacity-40">{service.durationMinutes} min</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WaxGroup({
  group,
  selectedIds,
  accent,
  onToggle,
}: {
  group: ServiceGroup;
  selectedIds: string[];
  accent: string;
  onToggle: (s: Service) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2 px-1">
        <p className="text-xs uppercase tracking-widest opacity-40">{group.name}</p>
        {group.note && <p className="text-xs opacity-30">· {group.note}</p>}
      </div>
      <ServiceList
        services={group.services}
        selectedIds={selectedIds}
        accent={accent}
        mode="multi"
        onSelect={onToggle}
      />
    </div>
  );
}

function ContinueBar({
  accent,
  total,
  onNext,
}: {
  accent: string;
  total: number;
  onNext: () => void;
}) {
  return (
    <div className="sticky bottom-4 mt-2">
      <button
        onClick={onNext}
        className="w-full py-4 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98]"
        style={{ backgroundColor: accent, color: '#f6f4ef' }}
      >
        Continue · ${total}
      </button>
    </div>
  );
}
