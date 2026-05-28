'use client';

import { CATEGORY_META, ServiceCategory } from '@/lib/services';

interface Props {
  category: ServiceCategory;
  accepted: boolean;
  onAccept: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

const WAIVER_CONTENT: Record<'tan' | 'wax', { title: string; body: string[] }> = {
  tan: {
    title: 'Sunless Tan Intake',
    body: [
      'By booking a spray tan service at Edit Studio, you confirm that you are not allergic to dihydroxyacetone (DHA) or any components of NUDA sunless solutions.',
      'You understand that results vary based on skin type, preparation, and aftercare. Edit Studio is not liable for variations in tan development due to failure to follow prep or aftercare instructions.',
      'You confirm that you are not pregnant or nursing, or that you accept any associated risks.',
      'You agree to follow the prep and aftercare guidelines provided by your artist.',
    ],
  },
  wax: {
    title: 'Waxing Intake',
    body: [
      'By booking a waxing service at Edit Studio, you confirm that you are not currently using Retin-A, Accutane, or similar skin-thinning medications on the area to be waxed.',
      'You confirm that the skin to be waxed is free from open wounds, sunburn, active breakouts, rashes, or irritation.',
      'You understand that waxing may cause temporary redness, sensitivity, or minor skin lifting in rare cases.',
      'You agree to inform your esthetician of any medications, skin conditions, or sensitivities before your appointment.',
    ],
  },
};

export default function StepWaiver({ category, accepted, onAccept, onNext, onBack }: Props) {
  const accent = CATEGORY_META[category].accent;
  const waiver = category === 'tan' || category === 'wax' ? WAIVER_CONTENT[category] : null;

  if (!waiver) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={onBack} className="text-sm opacity-50 hover:opacity-80 transition-opacity mb-3">
          ← Back
        </button>
        <h1 className="text-2xl font-medium">{waiver.title}</h1>
      </div>

      <div className="rounded-2xl border border-black/8 p-4 flex flex-col gap-3 max-h-72 overflow-y-auto">
        {waiver.body.map((para, i) => (
          <p key={i} className="text-sm leading-relaxed opacity-70">
            {para}
          </p>
        ))}
        <p className="text-xs opacity-40 pt-2 border-t border-black/8">
          This intake form is stored with your client profile. Returning clients will not need
          to complete it again unless the form version is updated.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-0.5">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => onAccept(e.target.checked)}
            className="sr-only"
          />
          <div
            className="w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0"
            style={
              accepted
                ? { backgroundColor: accent, borderColor: accent }
                : { borderColor: 'rgba(0,0,0,0.2)' }
            }
          >
            {accepted && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm leading-relaxed">
          I have read and understood the above, and confirm all information I provide is accurate.
        </span>
      </label>

      <button
        onClick={onNext}
        disabled={!accepted}
        className="w-full py-4 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ backgroundColor: accent, color: '#f6f4ef' }}
      >
        I agree — continue
      </button>
    </div>
  );
}
