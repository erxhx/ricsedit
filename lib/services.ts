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
  { id: 'addon-bra',       name: 'Disposable Bra',    category: 'tan', durationMinutes: 0,  price: 5,  description: 'Bandeau style.',                                                          requiresWaiver: false, isAddon: true },
  { id: 'addon-undies',    name: 'Disposable Undies', category: 'tan', durationMinutes: 0,  price: 5,  description: '',                                                                        requiresWaiver: false, isAddon: true },
  { id: 'addon-prep-lock', name: 'Prep + Lock',       category: 'tan', durationMinutes: 20, price: 20, description: 'Two-step longevity treatment — pH-balance prep + post-tan barrier lock.', requiresWaiver: false, isAddon: true },
];

// NOTE: Starter lash menu — durations are reasonable defaults but PRICES ARE
// PLACEHOLDERS. Adjust them (and add/remove services) in the admin Services editor.
export const LASH_SERVICES: Service[] = [
  { id: 'lash-classic-set', name: 'Classic Full Set', category: 'lashes', durationMinutes: 120, price: 100, description: 'One extension per natural lash — a natural, mascara-like finish.', requiresWaiver: true },
  { id: 'lash-hybrid-set',  name: 'Hybrid Full Set',  category: 'lashes', durationMinutes: 135, price: 120, description: 'A mix of classic and volume for texture and fullness.',          requiresWaiver: true },
  { id: 'lash-volume-set',  name: 'Volume Full Set',  category: 'lashes', durationMinutes: 150, price: 140, description: 'Multiple lightweight extensions per lash for a dramatic look.',  requiresWaiver: true },
  { id: 'lash-fill-2wk',    name: 'Fill — 2 Week',    category: 'lashes', durationMinutes: 60,  price: 55,  description: 'Top-up within 2 weeks of your last appointment.',                requiresWaiver: true },
  { id: 'lash-fill-3wk',    name: 'Fill — 3 Week',    category: 'lashes', durationMinutes: 75,  price: 70,  description: 'Top-up within 3 weeks of your last appointment.',                requiresWaiver: true },
  { id: 'lash-removal',     name: 'Lash Removal',     category: 'lashes', durationMinutes: 30,  price: 20,  description: 'Safe, gentle removal of existing extensions.',                   requiresWaiver: false },
];

export const WAX_GROUPS: ServiceGroup[] = [
  {
    name: 'Brows + Face',
    services: [
      { id: 'brow-wax',   name: 'Brow Wax & Shape', category: 'wax', durationMinutes: 20, price: 25, description: 'Map, wax, tweeze, finish.',                                    requiresWaiver: true },
      { id: 'brow-tint',  name: 'Brow Tint',         category: 'wax', durationMinutes: 15, price: 15, description: 'Define and deepen.',                                           requiresWaiver: true },
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
