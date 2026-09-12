/**
 * LUXORA design tokens.
 * The whole palette is a warm-neutral scale plus a single champagne accent, so nothing
 * on screen is ever pure black or pure white.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F4F1EA',
        surface: '#FBF9F5',
        sunk: '#EAE5DA',
        line: '#E0D9CB',
        'line-strong': '#C9BFAC',
        ink: { DEFAULT: '#15130F', 2: '#3D3830', 3: '#5C564C' },
        muted: { DEFAULT: '#7C7365', light: '#A29A8C' },
        accent: {
          DEFAULT: '#B08542',
          deep: '#8A6428',
          soft: '#EBDCC0',
          faint: '#F6EEDD',
        },
        success: { DEFAULT: '#2E6152', soft: '#E4EDE9' },
        danger: { DEFAULT: '#9C3B31', soft: '#F6E7E5' },
        info: { DEFAULT: '#31536B', soft: '#E5EBF0' },
        night: { DEFAULT: '#15130F', 2: '#1D1B16', 3: '#26231D', 4: '#322E27' },
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.18em' }],
        tiny: ['0.75rem', { lineHeight: '1.05rem' }],
        small: ['0.84375rem', { lineHeight: '1.35rem' }],
        lead: ['clamp(1.0625rem, 0.4vw + 0.95rem, 1.3125rem)', { lineHeight: '1.6' }],
        h3: ['clamp(1.375rem, 0.8vw + 1.1rem, 1.75rem)', { lineHeight: '1.2' }],
        h2: ['clamp(1.875rem, 2.4vw + 1rem, 2.875rem)', { lineHeight: '1.12' }],
        display: ['clamp(2.5rem, 5vw + 1rem, 4.25rem)', { lineHeight: '1.04' }],
        'display-xl': ['clamp(3.25rem, 7.4vw + 0.6rem, 6.5rem)', { lineHeight: '1.0' }],
      },
      borderRadius: { xs: '8px', sm: '12px', md: '16px', lg: '22px', xl: '28px', '2xl': '36px', pill: '999px' },
      // extend (not replace) the opacity scale so modifiers like white/45 are valid,
      // keeping the config free of one-off magic numbers.
      opacity: { 3: '0.03', 6: '0.06', 12: '0.12', 15: '0.15', 18: '0.18', 22: '0.22', 25: '0.25', 35: '0.35', 45: '0.45', 55: '0.55', 62: '0.62', 65: '0.65', 72: '0.72', 75: '0.75', 78: '0.78', 82: '0.82', 85: '0.85', 88: '0.88', 92: '0.92' },
      boxShadow: {
        rest: '0 1px 2px rgba(21,19,15,.04), 0 8px 24px -12px rgba(21,19,15,.10)',
        hover: '0 2px 4px rgba(21,19,15,.05), 0 22px 48px -20px rgba(21,19,15,.24)',
        lift: '0 40px 80px -32px rgba(21,19,15,.30)',
        overlay: '0 48px 96px -32px rgba(21,19,15,.42)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.55)',
        focus: '0 0 0 3px rgba(176,133,66,.32)',
      },
      transitionTimingFunction: {
        lux: 'cubic-bezier(0.22, 1, 0.36, 1)',
        luxIn: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      letterSpacing: { luxe: '0.22em', tightish: '-0.018em' },
      spacing: { section: 'clamp(4.5rem, 10vh, 10rem)', gutter: 'clamp(1.25rem, 4vw, 4.5rem)' },
      maxWidth: { shell: '86rem', prose: '44rem' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'ken-burns': {
          '0%': { transform: 'scale(1.04) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.16) translate3d(-1.2%, -1.4%, 0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-9px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(.85)', opacity: '0.55' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        'draw-check': { to: { 'stroke-dashoffset': '0' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'ken-burns': 'ken-burns 22s ease-in-out infinite alternate',
        float: 'float 7s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.4s cubic-bezier(0.22,1,0.36,1) forwards',
        'draw-check': 'draw-check .6s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-in': 'fade-in .5s cubic-bezier(0.22,1,0.36,1) both',
        'rise-in': 'rise-in .55s cubic-bezier(0.22,1,0.36,1) both',
        marquee: 'marquee 38s linear infinite',
      },
    },
  },
  plugins: [],
};
