import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'snaps-primary': 'var(--snaps-primary, #6366f1)',
        'snaps-primary-hover': 'var(--snaps-primary-hover, #4f46e5)',
        'snaps-bg': 'var(--snaps-bg, #ffffff)',
        'snaps-bg-secondary': 'var(--snaps-bg-secondary, #f9fafb)',
        'snaps-text': 'var(--snaps-text, #1f2937)',
        'snaps-text-secondary': 'var(--snaps-text-secondary, #6b7280)',
        'snaps-border': 'var(--snaps-border, #e5e7eb)',
        'snaps-success': 'var(--snaps-success, #10b981)',
        'snaps-warning': 'var(--snaps-warning, #f59e0b)',
        'snaps-error': 'var(--snaps-error, #ef4444)',
        'snaps-critical': 'var(--snaps-critical, #dc2626)',
      },
      fontFamily: {
        snaps: ['var(--snaps-font, Inter, system-ui, sans-serif)'],
      },
      borderRadius: {
        snaps: 'var(--snaps-radius, 8px)',
      },
    },
  },
  plugins: [typography],
} satisfies Config;
