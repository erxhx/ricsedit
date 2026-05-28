export type ServiceCategory = 'barber' | 'tan' | 'wax';

export type BookingStep =
  | 'category'
  | 'service'
  | 'datetime'
  | 'client'
  | 'waiver'
  | 'confirm'
  | 'done';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number; // estimates — update when confirmed with staff
  price: number; // dollars
  description: string;
  requiresWaiver: boolean;
  isAddon?: boolean;
}

export interface ServiceGroup {
  name: string;
  note?: string;
  services: Service[];
}

export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
}

export interface BookingState {
  category: ServiceCategory | null;
  selectedServices: Service[];
  date: Date | null;
  timeSlot: string | null; // "HH:MM"
  client: ClientInfo;
  waiverAccepted: boolean;
}

export const INITIAL_BOOKING_STATE: BookingState = {
  category: null,
  selectedServices: [],
  date: null,
  timeSlot: null,
  client: { name: '', email: '', phone: '' },
  waiverAccepted: false,
};

export const CATEGORY_META: Record<
  ServiceCategory,
  { label: string; num: string; hint: string; accent: string }
> = {
  barber: {
    label: 'Barbering',
    num: '01',
    hint: 'Cuts · shaves · beard work',
    accent: 'oklch(0.42 0.12 25)',
  },
  tan: {
    label: 'Sunless',
    num: '02',
    hint: 'Custom-blended spray tans',
    accent: 'oklch(0.68 0.14 65)',
  },
  wax: {
    label: 'Waxing',
    num: '03',
    hint: 'Brow · body · ritual',
    accent: 'oklch(0.62 0.12 18)',
  },
};

export const BARBER_SERVICES: Service[] = [
  {
    id: 'haircut',
    name: 'Haircut',
    category: 'barber',
    durationMinutes: 45,
    price: 40,
    description: 'Signature cut and style.',
    requiresWaiver: false,
  },
  {
    id: 'beard-trim',
    name: 'Beard Trim',
    category: 'barber',
    durationMinutes: 25,
    price: 25,
    description: 'Trim, shape, line, oil.',
    requiresWaiver: false,
  },
  {
    id: 'haircut-beard',
    name: 'Haircut + Beard',
    category: 'barber',
    durationMinutes: 60,
    price: 60,
    description: 'The whole package.',
    requiresWaiver: false,
  },
  {
    id: 'freshen-up-haircut',
    name: 'Freshen Up — Haircut',
    category: 'barber',
    durationMinutes: 25,
    price: 25,
    description: 'Stay crispy. Must be within 2 weeks of last visit.',
    requiresWaiver: false,
  },
  {
    id: 'freshen-up-haircut-beard',
    name: 'Freshen Up — Haircut + Beard',
    category: 'barber',
    durationMinutes: 35,
    price: 40,
    description: 'Stay crispy. Must be within 2 weeks of last visit.',
    requiresWaiver: false,
  },
  {
    id: 'kids-senior-cut',
    name: 'Kids + Senior Cut',
    category: 'barber',
    durationMinutes: 30,
    price: 30,
    description: 'Ages 10 and under or 65+.',
    requiresWaiver: false,
  },
];

export const TAN_SERVICES: Service[] = [
  {
    id: 'classic-full-body-tan',
    name: 'Classic Full Body',
    category: 'tan',
    durationMinutes: 60,
    price: 60,
    description:
      'Personalised colour analysis, skin/hair/nail barriers, shimmering finishing powder. Develops in 8–12 hours.',
    requiresWaiver: true,
  },
  {
    id: 'rapid-full-body-tan',
    name: 'Rapid Full Body',
    category: 'tan',
    durationMinutes: 45,
    price: 70,
    description: 'Develops in 1–5 hours — perfect on the go.',
    requiresWaiver: true,
  },
  {
    id: 'face-tan',
    name: 'Face Tan',
    category: 'tan',
    durationMinutes: 20,
    price: 15,
    description: 'Face and neck. Skincare-grade glow.',
    requiresWaiver: true,
  },
];

export const TAN_ADDONS: Service[] = [
  {
    id: 'addon-bra',
    name: 'Disposable Bra',
    category: 'tan',
    durationMinutes: 0,
    price: 5,
    description: 'Bandeau style.',
    requiresWaiver: false,
    isAddon: true,
  },
  {
    id: 'addon-undies',
    name: 'Disposable Undies',
    category: 'tan',
    durationMinutes: 0,
    price: 5,
    description: '',
    requiresWaiver: false,
    isAddon: true,
  },
  {
    id: 'addon-prep-lock',
    name: 'Prep + Lock',
    category: 'tan',
    durationMinutes: 20,
    price: 20,
    description: 'Two-step longevity treatment — pH-balance prep + post-tan barrier lock.',
    requiresWaiver: false,
    isAddon: true,
  },
];

export const WAX_GROUPS: ServiceGroup[] = [
  {
    name: 'Brows + Face',
    services: [
      { id: 'brow-wax', name: 'Brow Wax & Shape', category: 'wax', durationMinutes: 20, price: 25, description: 'Map, wax, tweeze, finish.', requiresWaiver: true },
      { id: 'brow-tint', name: 'Brow Tint', category: 'wax', durationMinutes: 15, price: 15, description: 'Define and deepen.', requiresWaiver: true },
      { id: 'lash-tint', name: 'Lash Tint', category: 'wax', durationMinutes: 20, price: 25, description: 'No mascara required.', requiresWaiver: true },
      { id: 'upper-lip', name: 'Upper Lip', category: 'wax', durationMinutes: 10, price: 10, description: '', requiresWaiver: true },
      { id: 'chin', name: 'Chin', category: 'wax', durationMinutes: 10, price: 15, description: '', requiresWaiver: true },
      { id: 'cheek', name: 'Cheek', category: 'wax', durationMinutes: 15, price: 15, description: 'An ultra-smooth base for makeup + skincare absorption.', requiresWaiver: true },
    ],
  },
  {
    name: 'Body',
    services: [
      { id: 'underarm', name: 'Underarm', category: 'wax', durationMinutes: 15, price: 20, description: 'Five minutes. Two weeks smooth.', requiresWaiver: true },
      { id: 'half-arm', name: 'Half Arm', category: 'wax', durationMinutes: 20, price: 25, description: 'Upper or lower.', requiresWaiver: true },
      { id: 'full-arm', name: 'Full Arm', category: 'wax', durationMinutes: 30, price: 45, description: '', requiresWaiver: true },
      { id: 'stomach', name: 'Stomach', category: 'wax', durationMinutes: 20, price: 25, description: '', requiresWaiver: true },
      { id: 'chest', name: 'Chest', category: 'wax', durationMinutes: 25, price: 35, description: '', requiresWaiver: true },
      { id: 'half-back', name: 'Half Back', category: 'wax', durationMinutes: 20, price: 30, description: 'Upper or lower.', requiresWaiver: true },
      { id: 'full-back', name: 'Full Back', category: 'wax', durationMinutes: 35, price: 50, description: '', requiresWaiver: true },
      { id: 'half-leg', name: 'Half Leg', category: 'wax', durationMinutes: 30, price: 35, description: 'Upper or lower.', requiresWaiver: true },
      { id: 'full-leg', name: 'Full Leg', category: 'wax', durationMinutes: 50, price: 70, description: '', requiresWaiver: true },
    ],
  },
  {
    name: 'Bikini',
    note: 'Female genitalia services only (V)',
    services: [
      { id: 'bikini', name: 'Bikini', category: 'wax', durationMinutes: 30, price: 35, description: 'Removes hair visible outside of underwear or bikini area.', requiresWaiver: true },
      { id: 'french', name: 'French', category: 'wax', durationMinutes: 40, price: 45, description: 'Includes bikini area and between the cheeks, excludes labia.', requiresWaiver: true },
      { id: 'brazilian', name: 'Brazilian', category: 'wax', durationMinutes: 45, price: 50, description: 'All hair removed, including between the cheeks.', requiresWaiver: true },
    ],
  },
];

// Hours by JS day-of-week (0 = Sunday). null = closed. [open, close] in 24h.
export const STUDIO_HOURS: Record<number, [number, number] | null> = {
  0: [10, 18], // Sun
  1: null,     // Mon — closed
  2: null,     // Tue — closed
  3: [10, 18], // Wed
  4: [10, 18], // Thu
  5: [10, 18], // Fri
  6: [10, 18], // Sat
};

// Thursday barber late-night close
export const BARBER_THU_CLOSE = 21;

export function getTotalDuration(services: Service[]): number {
  return services.reduce((sum, s) => sum + s.durationMinutes, 0);
}

export function getTotalPrice(services: Service[]): number {
  return services.reduce((sum, s) => sum + s.price, 0);
}

export function requiresWaiver(services: Service[]): boolean {
  return services.some((s) => s.requiresWaiver);
}

export function getSteps(services: Service[]): BookingStep[] {
  const steps: BookingStep[] = ['category', 'service', 'datetime', 'client'];
  if (requiresWaiver(services)) steps.push('waiver');
  steps.push('confirm');
  return steps;
}

export function generateTimeSlots(
  date: Date,
  category: ServiceCategory,
  durationMinutes: number,
  weekHours?: Record<number, [number, number] | null>,
  barberThuClose?: number,
): string[] {
  const dow = date.getDay();
  const effectiveHours = weekHours ?? STUDIO_HOURS;
  const hours = effectiveHours[dow];
  if (!hours) return [];

  const [open, baseClose] = hours;
  const close =
    category === 'barber' && dow === 4
      ? (barberThuClose ?? BARBER_THU_CLOSE)
      : baseClose;

  const slots: string[] = [];
  for (let h = open; h < close; h++) {
    for (const m of [0, 30]) {
      const slotMinutes = h * 60 + m;
      const endMinutes = slotMinutes + durationMinutes;
      if (endMinutes <= close * 60) {
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
  }
  return slots;
}

export function formatTime(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
