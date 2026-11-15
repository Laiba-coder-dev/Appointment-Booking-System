/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ---- Appointify · Burgundy & Ivory ---- */
        burgundy: {
          DEFAULT: '#641E32',
          50: '#FBF2F5',
          100: '#F7E4EA',
          200: '#EEC7D2',
          300: '#DD9FAF',
          400: '#C67A8C',
          500: '#A65D6B',
          600: '#8B3D51',
          700: '#641E32',
          800: '#481421',
          900: '#330E17',
          950: '#1F080E'
        },
        rosewood: '#A65D6B',
        softrose: '#D6A6A9',
        ivory: '#FFF9F0',
        cream: '#F8EFE6',
        lightbg: '#FCF8F4',
        charcoal: '#2A2A2A',
        muted: '#756B68',
        edge: '#E9DDD7',
        gold: {
          DEFAULT: '#C9A96A',
          100: '#F5EBDD',
          200: '#EBD7BC',
          300: '#DFC39B',
          400: '#D4B183',
          500: '#C9A96A',
          600: '#B39355',
          700: '#927743'
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'Manrope', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(72,20,33,0.06), 0 12px 28px -12px rgba(72,20,33,0.10)',
        card: '0 1px 2px rgba(72,20,33,0.04), 0 8px 24px -8px rgba(72,20,33,0.10)',
        lift: '0 4px 10px -3px rgba(72,20,33,0.10), 0 24px 48px -20px rgba(72,20,33,0.28)',
        glow: '0 0 0 1px rgba(100,30,50,0.06), 0 18px 40px -18px rgba(100,30,50,0.45)',
        glass: 'inset 0 1px 0 rgba(255,255,255,0.55), 0 10px 30px -12px rgba(72,20,33,0.22)'
      },
      backgroundImage: {
        'ivory-gradient': 'linear-gradient(180deg, #FFF9F0 0%, #F8EFE6 100%)',
        'burgundy-gradient': 'linear-gradient(135deg, #481421 0%, #641E32 55%, #8B3D51 100%)',
        'rose-gradient': 'linear-gradient(135deg, #A65D6B 0%, #D6A6A9 100%)',
        'gold-gradient': 'linear-gradient(135deg, #E8D3B0 0%, #C9A96A 50%, #E8D3B0 100%)'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' }
        }
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite'
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
        300: '300ms',
        400: '400ms',
        500: '500ms',
        600: '600ms',
        700: '700ms',
        900: '900ms'
      },
      transitionTimingFunction: {
        elegant: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
};
