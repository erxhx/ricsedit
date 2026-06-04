import { db } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'textarea'
  | 'yes_no'
  | 'checkbox_group'
  | 'signature';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  options?: string[]; // for checkbox_group
}

export interface IntakeFormConfig {
  title: string;
  description: string;
  fields: FormField[];
}

export type FormCategory = 'tan' | 'wax' | 'barber';

function key(cat: FormCategory) { return `intake_form_${cat}`; }

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_TAN: IntakeFormConfig = {
  title: 'Spray Tan Consent + Skin Analysis',
  description: 'Please fill out this form prior to your appointment so I can provide you with the most comfortable appointment.',
  fields: [
    { id: 'name',           type: 'text',           label: 'Name' },
    { id: 'email',          type: 'email',          label: 'Email',        required: true },
    { id: 'phone',          type: 'phone',          label: 'Phone Number', required: true },
    { id: 'dob',            type: 'date',           label: 'Date of Birth' },
    { id: 'skin_type',      type: 'checkbox_group', label: 'Skin Type: Select Those That Apply',
      options: ['Very Fair', 'Fair', 'Medium', 'Dark', 'Very Dark', 'Sensitive', 'Acne Prone', 'Oily', 'Dry', 'Normal'] },
    { id: 'allergies',      type: 'textarea',       label: 'Allergies' },
    { id: 'medication',     type: 'textarea',       label: 'Are you taking any medication / being treated for a skin condition?' },
    { id: 'had_tan',        type: 'yes_no',         label: 'Have you ever had a spray tan before?' },
    { id: 'pregnant',       type: 'yes_no',         label: 'Are you pregnant or nursing?' },
    { id: 'shaved',         type: 'yes_no',         label: 'Have you shaved or waxed in the last 24 hours?' },
    { id: 'burns',          type: 'yes_no',         label: 'Does your skin burn easily in the sun?' },
    { id: 'tans',           type: 'yes_no',         label: 'Does your skin tan easily in the sun?' },
    { id: 'exfoliated',     type: 'yes_no',         label: 'Have you properly exfoliated within the past 3 days?' },
    { id: 'self_tanner',    type: 'yes_no',         label: 'Do you often use home self tanning products?' },
    { id: 'removed_products', type: 'yes_no',       label: 'Have you removed all make up, deodorant, lotion and perfume?' },
    { id: 'open_wounds',    type: 'yes_no',         label: 'Do you have any open wounds or unhealed tattoos?' },
    { id: 'bleached_hair',  type: 'yes_no',         label: 'Do you have bleached hair?' },
    { id: 'special_occasion', type: 'yes_no',       label: 'Is your tan for any special occasion?' },
    { id: 'tan_goals',      type: 'textarea',       label: 'What are your tan goals for this tan?' },
    { id: 'over_18',        type: 'yes_no',         label: 'Are you over 18 years old?', required: true },
    { id: 'signature',      type: 'signature',      label: 'Signature (Type name or parent/guardian if under 18)', required: true },
  ],
};

const DEFAULT_WAX: IntakeFormConfig = {
  title: 'Waxing Consent Form',
  description: 'Please complete this form before your waxing appointment.',
  fields: [
    { id: 'name',       type: 'text',     label: 'Name' },
    { id: 'email',      type: 'email',    label: 'Email',        required: true },
    { id: 'phone',      type: 'phone',    label: 'Phone Number', required: true },
    { id: 'dob',        type: 'date',     label: 'Date of Birth' },
    { id: 'allergies',  type: 'textarea', label: 'Allergies or skin sensitivities' },
    { id: 'retinol',    type: 'yes_no',   label: 'Have you used retinol, AHAs, or BHAs in the last 72 hours?' },
    { id: 'sun',        type: 'yes_no',   label: 'Have you had sun exposure or used a tanning bed in the last 24 hours?' },
    { id: 'pregnant',   type: 'yes_no',   label: 'Are you pregnant or nursing?' },
    { id: 'medication', type: 'textarea', label: 'Are you taking any medications that affect skin sensitivity (e.g. Accutane, blood thinners)?' },
    { id: 'over_18',    type: 'yes_no',   label: 'Are you over 18 years old?', required: true },
    { id: 'signature',  type: 'signature', label: 'Signature (Type name or parent/guardian if under 18)', required: true },
  ],
};

const DEFAULT_BARBER: IntakeFormConfig = {
  title: 'Barbering Intake Form',
  description: '',
  fields: [
    { id: 'name',  type: 'text',  label: 'Name' },
    { id: 'email', type: 'email', label: 'Email' },
    { id: 'phone', type: 'phone', label: 'Phone Number' },
    { id: 'notes', type: 'textarea', label: 'Anything I should know before your appointment?' },
  ],
};

const DEFAULTS: Record<FormCategory, IntakeFormConfig> = {
  tan:   DEFAULT_TAN,
  wax:   DEFAULT_WAX,
  barber: DEFAULT_BARBER,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export async function getIntakeForm(cat: FormCategory): Promise<IntakeFormConfig> {
  try {
    const { data } = await db.from('settings').select('value').eq('key', key(cat)).maybeSingle();
    if (data?.value) return data.value as IntakeFormConfig;
  } catch { /* fall through */ }
  return structuredClone(DEFAULTS[cat]);
}

export async function saveIntakeForm(cat: FormCategory, config: IntakeFormConfig): Promise<boolean> {
  try {
    const { error } = await db.from('settings').upsert({
      key: key(cat),
      value: config,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch { return false; }
}
