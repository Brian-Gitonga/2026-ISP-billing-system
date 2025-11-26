import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#10b981',
        secondary: '#f59e0b',
        // Custom theme colors using CSS variables
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-secondary': 'var(--color-surface-secondary)',
        border: 'var(--color-border)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        hover: 'var(--color-hover)',
        // Marketplace theme specific colors
        marketplace: {
          bg: 'var(--marketplace-bg)',
          sidebar: 'var(--marketplace-sidebar)',
          card: 'var(--marketplace-card)',
          border: 'var(--marketplace-border)',
          text: 'var(--marketplace-text)',
          'text-muted': 'var(--marketplace-text-muted)',
          hover: 'var(--marketplace-hover)',
        }
      },
      backgroundColor: {
        'marketplace-bg': 'var(--marketplace-bg)',
        'marketplace-sidebar': 'var(--marketplace-sidebar)',
        'marketplace-card': 'var(--marketplace-card)',
        'marketplace-hover': 'var(--marketplace-hover)',
      },
      borderColor: {
        'marketplace-border': 'var(--marketplace-border)',
      },
      textColor: {
        'marketplace-text': 'var(--marketplace-text)',
        'marketplace-text-muted': 'var(--marketplace-text-muted)',
      }
    },
  },
  plugins: [],
}
export default config
