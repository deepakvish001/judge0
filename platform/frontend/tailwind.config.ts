import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10',
        panel: '#15181d',
        border: '#252a31',
        text: '#e4e6eb',
        muted: '#9aa0a6',
        accent: '#22c55e',
        accentDim: '#16a34a',
        warn: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
} satisfies Config;
