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
  requireAll?: boolean; // for checkbox_group — all options must be checked
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
  title: 'Waxing Intake + Consent',
  description: 'Please complete this form before your appointment. All information is kept confidential and used solely to ensure your safety and comfort.',
  fields: [
    { id: 'name',  type: 'text',  label: 'Name' },
    { id: 'email', type: 'email', label: 'Email', required: true },
    { id: 'phone', type: 'phone', label: 'Phone Number', required: true },
    { id: 'dob',   type: 'date',  label: 'Date of Birth' },

    { id: 'skin_conditions', type: 'checkbox_group', label: 'Skin Conditions — Check all that apply',
      options: ['Sensitive skin', 'Eczema', 'Psoriasis', 'Rosacea', 'Dermatitis', 'Acne (mild)', 'Acne (moderate)', 'Acne (severe)', 'Freshly healed scarring', 'Current sunburn', 'None of the above', 'Other'] },
    { id: 'skin_conditions_other', type: 'textarea', label: 'If "Other" was selected above, please describe' },

    { id: 'medications', type: 'checkbox_group', label: 'Current Medications — Check all that apply (including within the past 6 months)',
      options: ['Accutane / Isotretinoin', 'Retin-A / Tretinoin', 'Topical acne treatments', 'Antibiotics', 'Steroid creams', 'Alpha Hydroxy Acids (AHA)', 'Beta Hydroxy Acids (BHA)', 'Blood thinners', 'Hormonal medications', 'None'] },
    { id: 'medications_other', type: 'textarea', label: 'Other prescription medications (please specify)' },

    { id: 'exfoliant',          type: 'yes_no', label: 'Do you currently use a form of exfoliant on the area receiving treatment today?' },
    { id: 'recent_treatments',  type: 'yes_no', label: 'Have you recently had any cosmetic or dermatological treatments in the area to be waxed? (e.g. laser, chemical peel, microneedling, microdermabrasion, injectables)' },
    { id: 'pregnant',           type: 'yes_no', label: 'Are you pregnant or breastfeeding?' },
    { id: 'allergies',          type: 'yes_no', label: 'Do you have any known allergies?', required: true },
    { id: 'allergies_detail',   type: 'textarea', label: 'If yes, please describe your allergies' },

    { id: 'sti', type: 'checkbox_group', label: 'For Brazilian, French, Bikini, or Bum Cheeks only — Please select any that apply (current or past)',
      options: ['Genital herpes (active or non-active)', 'Genital warts / HPV', 'HIV/AIDS', 'Bacterial infections', 'Fungal infections (e.g. yeast infection, ringworm)', 'Other skin infections', 'None / Not applicable'] },

    { id: 'confirmations', type: 'checkbox_group', label: 'Please confirm all of the following', required: true, requireAll: true,
      options: [
        'I am not currently sunburned or experiencing active skin irritation.',
        'I have not used tanning beds within the past 48 hours.',
        'I have not had laser or chemical peel treatments in the past 7 days.',
        'I have not used Accutane in the past 6 months.',
        'I will notify my technician of any changes to my skin, health, or products used.',
      ] },

    { id: 'acknowledgements', type: 'checkbox_group', label: 'I acknowledge all of the following', required: true, requireAll: true,
      options: [
        'Waxing may cause temporary redness, irritation, sensitivity, or swelling for 24–48 hours.',
        'Certain medications and skincare products increase the risk of skin lifting.',
        'Ingrown hairs may occur depending on skin type and aftercare routine.',
        'I agree to follow all pre-care and aftercare instructions provided.',
        'Withholding information increases the risk of complications.',
        'Individual results will vary based on skin and hair characteristics.',
      ] },

    { id: 'signature', type: 'signature', required: true,
      label: 'I confirm the information I have provided is accurate and complete. I voluntarily consent to receive waxing services and understand the associated risks. — Type your full name to sign' },
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
