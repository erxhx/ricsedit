export type AdminTheme = 'light' | 'dark';

/**
 * Border-radius scale (not CSS vars — just the intended values):
 *   6px  — chips, badges, small inline buttons (Today pill)
 *   12px — cards, stat boxes, action buttons, nav arrows
 *   9999px — FAB / tab bar pill
 * Keep new UI elements on this 3-step scale.
 */

/**
 * CSS custom-property values for each theme.
 * Spread onto the root wrapper div via AdminThemeProvider so every
 * child component can reference var(--admin-*) in its inline styles.
 */
export const THEME_VARS: Record<AdminTheme, Record<string, string>> = {
  light: {
    '--admin-bg':                '#f0ebe0',
    '--admin-card':              '#faf6ee',
    '--admin-sheet':             '#f5f0e8',
    '--admin-border':            '#d4cfc6',
    '--admin-border-sub':        '#e0dbd2',
    '--admin-border-faint':      '#ebe6dd',
    '--admin-text':              '#141210',
    '--admin-text2':             '#4a4540',
    '--admin-text3':             '#6a6560',
    '--admin-muted':             '#6b6762', // was #9a9590 (2.5:1); #6b6762 = 4.6:1 on beige bg
    '--admin-btn':               '#e0dbd2',
    '--admin-btn-border':        '#c4bdb4',
    '--admin-btn-primary-bg':    '#141210',
    '--admin-btn-primary-fg':    '#efeae0',
    '--admin-blocked':           '#ebebeb',
    '--admin-blocked-border':    '#d0ccc5',
    '--admin-today':             '#f0f7e8',
    '--admin-today-card':        '#eef7e8',
    '--admin-today-card-border': '#b5d4b0',
    '--admin-nav-active':        '#edf6e4',
    '--admin-note':              '#fdf3e8',
    '--admin-note-border':       '#e8d4b0',
    '--admin-call-bg':           '#e8f4ec',
    '--admin-call-border':       '#b5d4c0',
    '--admin-call-text':         '#2a6a48',
    '--admin-sms-bg':            '#e8f0f8',
    '--admin-sms-border':        '#b0c4d8',
    '--admin-sms-text':          '#2a5a80',
    '--admin-danger-bg':         '#faeaea',
    '--admin-danger-border':     '#e0b0b0',
    '--admin-danger-text':       '#a04040',
    '--admin-error':             '#a04040',
    '--admin-link':              '#4a7a9b',
    '--admin-text-tint':         '#14121012',
    '--admin-glass-bg':          'rgba(242,237,228,0.72)',
    '--admin-glass-border':      'rgba(255,255,255,0.62)',
    '--admin-glass-highlight':   'rgba(255,255,255,0.75)',
    '--admin-glass-shadow':      '0 2px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.75)',
    '--admin-glass-dark-bg':     'rgba(16,14,12,0.82)',
    '--admin-glass-dark-border': 'rgba(255,255,255,0.14)',
    '--admin-glass-dark-shadow': '0 4px 28px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
    // ── Liquid Glass tokens (see .lg utilities in globals.css) ──────────────
    '--lg-bg':          'rgba(245,240,231,0.55)',
    '--lg-sheet-bg':    'rgba(246,241,233,0.68)',
    '--lg-sheen':       'rgba(255,255,255,0.55)',
    // Specular rim: bright top edge, softer sides/bottom — the "light catch"
    '--lg-rim':         'inset 0 1.5px 1px rgba(255,255,255,0.85), inset 1px 0 1px rgba(255,255,255,0.30), inset -1px 0 1px rgba(255,255,255,0.30), inset 0 -1px 1px rgba(255,255,255,0.18)',
    '--lg-shadow':      '0 8px 24px rgba(20,18,16,0.10), 0 1px 3px rgba(20,18,16,0.07)',
    '--lg-shadow-lg':   '0 -12px 48px rgba(20,18,16,0.14), 0 2px 8px rgba(20,18,16,0.08)',
    '--lg-active-pill': 'rgba(20,18,16,0.09)',
  },
  dark: {
    '--admin-bg':                '#0d0c0a',
    '--admin-card':              '#201e1a', // was #161513 — lifted so cards read as surfaces
    '--admin-sheet':             '#272420', // was #1c1b18
    '--admin-border':            '#3a3632', // was #2a2926 — more visible card outlines
    '--admin-border-sub':        '#2e2b27', // was #232220
    '--admin-border-faint':      '#252320', // was #1e1d1a
    '--admin-text':              '#ece9e2',
    '--admin-text2':             '#cec9be', // was #b8b3a8 — lighter for readability
    '--admin-text3':             '#b5afa4', // was #a09a90
    '--admin-muted':             '#908b85', // was #8a8480 — little more lift for captions
    '--admin-btn':               '#2e2b27', // was #252320
    '--admin-btn-border':        '#454038',
    '--admin-btn-primary-bg':    '#ece9e2',
    '--admin-btn-primary-fg':    '#0d0c0a',
    '--admin-blocked':           '#252220',
    '--admin-blocked-border':    '#3a3632',
    '--admin-today':             '#141f10',
    '--admin-today-card':        '#1e2a1a',
    '--admin-today-card-border': '#334830',
    '--admin-nav-active':        '#1e2814',
    '--admin-note':              '#231f14',
    '--admin-note-border':       '#38321e',
    '--admin-call-bg':           '#122018',
    '--admin-call-border':       '#224830',
    '--admin-call-text':         '#6ab87a',  // was #5a9a68 — brighter green
    '--admin-sms-bg':            '#121a2a',
    '--admin-sms-border':        '#203050',
    '--admin-sms-text':          '#6a9ac0',  // was #5a80a0
    '--admin-danger-bg':         '#2a1010',
    '--admin-danger-border':     '#4a2020',
    '--admin-danger-text':       '#e07070',  // was #d06060
    '--admin-error':             '#e07070',
    '--admin-link':              '#7aaad0',  // was #6a9abb — more visible
    '--admin-text-tint':         '#ece9e214',
    '--admin-glass-bg':          'rgba(36,33,28,0.80)', // was 0.72 — more opaque for readability
    '--admin-glass-border':      'rgba(255,255,255,0.14)', // was 0.10
    '--admin-glass-highlight':   'rgba(255,255,255,0.10)',
    '--admin-glass-shadow':      '0 2px 20px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)',
    '--admin-glass-dark-bg':     'rgba(16,14,12,0.88)',
    '--admin-glass-dark-border': 'rgba(255,255,255,0.18)',
    '--admin-glass-dark-shadow': '0 4px 28px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
    // ── Liquid Glass tokens (see .lg utilities in globals.css) ──────────────
    '--lg-bg':          'rgba(38,35,30,0.60)',
    '--lg-sheet-bg':    'rgba(34,31,27,0.74)',
    '--lg-sheen':       'rgba(255,255,255,0.09)',
    '--lg-rim':         'inset 0 1.5px 1px rgba(255,255,255,0.22), inset 1px 0 1px rgba(255,255,255,0.08), inset -1px 0 1px rgba(255,255,255,0.08), inset 0 -1px 1px rgba(255,255,255,0.05)',
    '--lg-shadow':      '0 10px 30px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.35)',
    '--lg-shadow-lg':   '0 -14px 56px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.40)',
    '--lg-active-pill': 'rgba(236,233,226,0.12)',
  },
};
