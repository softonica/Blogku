import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

function customColors(cssVar) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${cssVar}), ${opacityValue})`
    }
    return `rgb(var(${cssVar}))`
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
    },
    extend: {
      colors: {
        primary: {
          50: customColors('--c-primary-50'),
          100: customColors('--c-primary-100'),
          200: customColors('--c-primary-200'),
          300: customColors('--c-primary-300'),
          400: customColors('--c-primary-400'),
          500: customColors('--c-primary-500'),
          600: customColors('--c-primary-600'),
          700: customColors('--c-primary-700'),
          800: customColors('--c-primary-800'),
          900: customColors('--c-primary-900'),
          950: customColors('--c-primary-950'),
        },
        secondary: {
          50: customColors('--c-secondary-50'),
          100: customColors('--c-secondary-100'),
          200: customColors('--c-secondary-200'),
          300: customColors('--c-secondary-300'),
          400: customColors('--c-secondary-400'),
          500: customColors('--c-secondary-500'),
          600: customColors('--c-secondary-600'),
          700: customColors('--c-secondary-700'),
          800: customColors('--c-secondary-800'),
          900: customColors('--c-secondary-900'),
          950: customColors('--c-secondary-950'),
        },
        neutral: {
          50: customColors('--c-neutral-50'),
          100: customColors('--c-neutral-100'),
          200: customColors('--c-neutral-200'),
          300: customColors('--c-neutral-300'),
          400: customColors('--c-neutral-400'),
          500: customColors('--c-neutral-500'),
          600: customColors('--c-neutral-600'),
          700: customColors('--c-neutral-700'),
          800: customColors('--c-neutral-800'),
          900: customColors('--c-neutral-900'),
          950: 'rgb(10 12 18)',
        },
      },
      fontFamily: {
        sans: [
          'Poppins',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 24px 60px -32px rgba(15, 23, 42, 0.35)',
        float: '0 16px 40px -20px rgba(15, 23, 42, 0.35)',
      },
      maxWidth: {
        '8xl': '90rem',
      },
    },
  },
  plugins: [typography, forms],
}
