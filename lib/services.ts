export type ServiceCategory = 'barber' | 'tan' | 'wax' | 'lashes';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  description: string;
  requiresWaiver: boolean;
  isAddon?: boolean;
  /** Physical goods (e.g. disposable undies) — taxed GST + PST, unlike
   * services which are GST-only. See lib/tax.ts. */
  isProduct?: boolean;
}

export interface ServiceGroup {
  name: string;
  note?: string;
  services: Service[];
}

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
    durationMinutes: 30,
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
    durationMinutes: 45,
    price: 25,
    description: 'Stay crispy. Must be within 2 weeks of last visit.',
    requiresWaiver: false,
  },
  {
    id: 'freshen-up-haircut-beard',
    name: 'Freshen Up — Haircut + Beard',
    category: 'barber',
    durationMinutes: 60,
    price: 40,
    description: 'Stay crispy. Must be within 2 weeks of last visit.',
    requiresWaiver: false,
  },
  {
    id: 'kids-cut',
    name: 'Kids Cut',
    category: 'barber',
    durationMinutes: 45,
    price: 30,
    description: 'Ages 10 and under.',
    requiresWaiver: false,
  },
  {
    id: 'senior-cut',
    name: 'Senior Cut',
    category: 'barber',
    durationMinutes: 45,
    price: 30,
    description: 'Ages 65+.',
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
    description: 'Personalised colour analysis, skin/hair/nail barriers, shimmering finishing powder. Develops in 8–12 hours.',
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
  { id: 'addon-bra',       name: 'Disposable Bra',    category: 'tan', durationMinutes: 0,  price: 5,  description: 'Bandeau style.',                                                          requiresWaiver: false, isAddon: true, isProduct: true },
  { id: 'addon-undies',    name: 'Disposable Undies', category: 'tan', durationMinutes: 0,  price: 5,  description: '',                                                                        requiresWaiver: false, isAddon: true, isProduct: true },
  { id: 'addon-prep-lock', name: 'Prep + Lock',       category: 'tan', durationMinutes: 20, price: 20, description: 'Two-step longevity treatment — pH-balance prep + post-tan barrier lock.', requiresWaiver: false, isAddon: true },
];

// Niamh's lash & brow menu. Prices are exact; DURATIONS ARE ESTIMATES —
// adjust them (and add/remove services) in the admin Services editor.
export const LASH_SERVICES: Service[] = [
  { id: 'lash-classic-set',  name: 'Classic Full Set',  category: 'lashes', durationMinutes: 120, price: 150, description: 'One extension per natural lash — a natural, mascara-like finish.', requiresWaiver: true },
  { id: 'lash-classic-fill', name: 'Classic Fill',      category: 'lashes', durationMinutes: 60,  price: 80,  description: 'Must have minimum 50% retention.',                                requiresWaiver: true },
  { id: 'lash-hybrid-set',   name: 'Hybrid Full Set',   category: 'lashes', durationMinutes: 135, price: 180, description: 'A mix of classic and volume for texture and fullness.',          requiresWaiver: true },
  { id: 'lash-hybrid-fill',  name: 'Hybrid Fill',       category: 'lashes', durationMinutes: 75,  price: 95,  description: 'Must have minimum 50% retention.',                                requiresWaiver: true },
  { id: 'lash-volume-set',   name: 'Volume Full Set',   category: 'lashes', durationMinutes: 150, price: 220, description: 'Multiple lightweight extensions per lash for a fuller look.',     requiresWaiver: true },
  { id: 'lash-volume-fill',  name: 'Volume Fill',       category: 'lashes', durationMinutes: 80,  price: 110, description: 'Must have minimum 50% retention.',                                requiresWaiver: true },
  { id: 'lash-mega-set',     name: 'Mega Volume Set',   category: 'lashes', durationMinutes: 165, price: 245, description: 'Maximum density for a dramatic, full finish.',                    requiresWaiver: true },
  { id: 'lash-mega-fill',    name: 'Mega Volume Fill',  category: 'lashes', durationMinutes: 90,  price: 125, description: 'Must have minimum 50% retention.',                                requiresWaiver: true },
  { id: 'lash-removal',      name: 'Lash Removal',      category: 'lashes', durationMinutes: 15,  price: 30,  description: 'Safe, gentle removal of existing extensions.',                    requiresWaiver: false },
  { id: 'lash-lift-tint',    name: 'Lash Lift and Tint', category: 'lashes', durationMinutes: 60, price: 100, description: 'Lifts and tints your natural lashes — no extensions.',            requiresWaiver: true },
  { id: 'lash-lift',         name: 'Lash Lift',         category: 'lashes', durationMinutes: 30,  price: 90,  description: 'Lifts and curls your natural lashes.',                            requiresWaiver: true },
  { id: 'lash-brow-lam-tint', name: 'Brow Lamination and Tint', category: 'lashes', durationMinutes: 60, price: 120, description: 'Smooths, sets and tints brows for a fuller shape.',           requiresWaiver: true },
  { id: 'lash-brow-tint',    name: 'Brow Tint',         category: 'lashes', durationMinutes: 30,  price: 75,  description: 'Define and deepen the brows.',                                    requiresWaiver: true },
  { id: 'lash-bundle-brow-lash', name: 'Bundle — Brow Lamination and Tint + Lash Lift and Tint', category: 'lashes', durationMinutes: 105, price: 210, description: 'Brow lamination & tint paired with a lash lift & tint.', requiresWaiver: true },
];

export const WAX_GROUPS: ServiceGroup[] = [
  {
    name: 'Brows + Face',
    services: [
      { id: 'brow-wax',      name: 'Brow Wax & Shape',   category: 'wax', durationMinutes: 20, price: 25, description: 'Map, wax, tweeze, finish.',                                requiresWaiver: true },
      { id: 'brow-wax-tint', name: 'Brow Wax and Tint',  category: 'wax', durationMinutes: 30, price: 35, description: 'Shape and define in one visit.',                            requiresWaiver: true },
      { id: 'lash-tint',  name: 'Lash Tint',         category: 'wax', durationMinutes: 20, price: 25, description: 'No mascara required.',                                         requiresWaiver: true },
      { id: 'upper-lip',  name: 'Upper Lip',          category: 'wax', durationMinutes: 10, price: 10, description: '',                                                             requiresWaiver: true },
      { id: 'chin',       name: 'Chin',               category: 'wax', durationMinutes: 10, price: 15, description: '',                                                             requiresWaiver: true },
      { id: 'cheek',      name: 'Cheek',              category: 'wax', durationMinutes: 15, price: 15, description: 'An ultra-smooth base for makeup + skincare absorption.',       requiresWaiver: true },
    ],
  },
  {
    name: 'Body',
    services: [
      { id: 'underarm',   name: 'Underarm',   category: 'wax', durationMinutes: 15, price: 20,  description: 'Five minutes. Two weeks smooth.', requiresWaiver: true },
      { id: 'half-arm',   name: 'Half Arm',   category: 'wax', durationMinutes: 20, price: 25,  description: 'Upper or lower.',                 requiresWaiver: true },
      { id: 'full-arm',   name: 'Full Arm',   category: 'wax', durationMinutes: 30, price: 45,  description: '',                                requiresWaiver: true },
      { id: 'stomach',    name: 'Stomach',    category: 'wax', durationMinutes: 20, price: 25,  description: '',                                requiresWaiver: true },
      { id: 'tummy-trail', name: 'Tummy Trail', category: 'wax', durationMinutes: 10, price: 5, description: 'Quick add-on.',                   requiresWaiver: true },
      { id: 'chest',      name: 'Chest',      category: 'wax', durationMinutes: 25, price: 35,  description: '',                                requiresWaiver: true },
      { id: 'half-back',  name: 'Half Back',  category: 'wax', durationMinutes: 20, price: 30,  description: 'Upper or lower.',                 requiresWaiver: true },
      { id: 'full-back',  name: 'Full Back',  category: 'wax', durationMinutes: 35, price: 50,  description: '',                                requiresWaiver: true },
      { id: 'half-leg',   name: 'Half Leg',   category: 'wax', durationMinutes: 30, price: 35,  description: 'Upper or lower.',                 requiresWaiver: true },
      { id: 'full-leg',   name: 'Full Leg',   category: 'wax', durationMinutes: 50, price: 70,  description: '',                                requiresWaiver: true },
    ],
  },
  {
    name: 'Bikini',
    note: 'Female genitalia services only (V)',
    services: [
      { id: 'bikini',    name: 'Bikini',    category: 'wax', durationMinutes: 30, price: 35, description: 'Removes hair visible outside of underwear or bikini area.',  requiresWaiver: true },
      { id: 'french',    name: 'French',    category: 'wax', durationMinutes: 40, price: 45, description: 'Includes bikini area and between the cheeks, excludes labia.', requiresWaiver: true },
      { id: 'brazilian', name: 'Brazilian', category: 'wax', durationMinutes: 45, price: 50, description: 'All hair removed, including between the cheeks.',              requiresWaiver: true },
    ],
  },
];
