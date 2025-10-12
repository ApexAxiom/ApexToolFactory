import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          from: 'var(--brand-primary-from)',
          to: 'var(--brand-primary-to)',
          accent: 'var(--brand-accent)'
        }
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(59, 130, 246, 0.25)'
      }
    }
  },
  plugins: []
};

export default config;
