/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        primary: {
          DEFAULT: '#111111',
          50: '#F5F5F5',
          100: '#E8E8E8',
          200: '#D0D0D0',
          300: '#B0B0B0',
          400: '#888888',
          500: '#555555',
          600: '#333333',
          700: '#222222',
          800: '#1A1A1A',
          900: '#111111',
        },
        secondary: {
          DEFAULT: '#1A1A1A',
          50: '#F5F5F5',
          100: '#E8E8E8',
          200: '#D0D0D0',
          300: '#B0B0B0',
          400: '#888888',
          500: '#555555',
          600: '#333333',
          700: '#222222',
          800: '#1A1A1A',
          900: '#111111',
        },
        accent: {
          DEFAULT: '#D4AF37',
          50: '#FBF6E3',
          100: '#F5E9B5',
          200: '#EDD870',
          300: '#E5CA40',
          400: '#DCC030',
          500: '#D4AF37',
          600: '#B8941A',
          700: '#9C7B0E',
          800: '#7D6008',
          900: '#5E4804',
        },
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      maxHeight: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
    },
  },
  plugins: [],
}