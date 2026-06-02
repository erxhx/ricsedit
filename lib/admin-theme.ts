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
  },
  dark: {
    '--admin-bg':                '#0d0c0a',
    '--admin-card':              '#161513',
    '--admin-sheet':             '#1c1b18',
    '--admin-border':            '#2a2926',
    '--admin-border-sub':        '#232220',
    '--admin-border-faint':      '#1e1d1a',
    '--admin-text':              '#ece9e2',
    '--admin-text2':             '#b8b3a8',
    '--admin-text3':             '#a09a90',
    '--admin-muted':             '#8a8480', // #6a6560 was ~3.8:1 on dark bg; #8a8480 = ~5.5:1
    '--admin-btn':               '#252320',
    '--admin-btn-border':        '#3a3834',
    '--admin-btn-primary-bg':    '#ece9e2',
    '--admin-btn-primary-fg':    '#0d0c0a',
    '--admin-blocked':           '#1a1917',
    '--admin-blocked-border':    '#2a2926',
    '--admin-today':             '#0f1a0c',
    '--admin-today-card':        '#1a2218',
    '--admin-today-card-border': '#2a4028',
    '--admin-nav-active':        '#1a2010',
    '--admin-note':              '#1c1a14',
    '--admin-note-border':       '#2a2618',
    '--admin-call-bg':           '#0d1a10',
    '--admin-call-border':       '#1a3a20',
    '--admin-call-text':         '#5a9a68',
    '--admin-sms-bg':            '#0d1420',
    '--admin-sms-border':        '#1a2a40',
    '--admin-sms-text':          '#5a80a0',
    '--admin-danger-bg':         '#200d0d',
    '--admin-danger-border':     '#3a1a1a',
    '--admin-danger-text':       '#d06060',
    '--admin-error':             '#d06060',
    '--admin-link':              '#6a9abb',
    '--admin-text-tint':         '#ece9e20f',
    '--admin-glass-bg':          'rgba(28,26,22,0.72)',
    '--admin-glass-border':      'rgba(255,255,255,0.10)',
    '--admin-glass-highlight':   'rgba(255,255,255,0.08)',
    '--admin-glass-shadow':      '0 2px 20px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
    '--admin-glass-dark-bg':     'rgba(16,14,12,0.82)',
    '--admin-glass-dark-border': 'rgba(255,255,255,0.14)',
    '--admin-glass-dark-shadow': '0 4px 28px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
  },
};
