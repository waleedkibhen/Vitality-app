/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Whop 2026 Exact Token Set ────────────────────────
      colors: {
        whop: {
          bg:         '#000000',   // --color-page-background
          'bg-alt':   '#0B0B0B',   // alternate page bg
          surface:    '#111111',   // composer / raised surfaces
          'surface-2': '#151515',   // secondary surface
          border:     '#1A1A1A',   // post separator
          'border-2': '#222222',   // inner borders / inputs
          text:       '#FFFFFF',   // primary text
          muted:      '#555555',   // @handle, timestamps
          'muted-2':  '#888888',   // lighter muted
          blue:       '#2563EB',   // Whop Blue — CTAs
          'blue-hover':'#1D4ED8',  // blue hover
          'icon-blue': '#88B5FF',  // Whop icon light blue
          'hover-navy': '#0d1a2e', // Icon hover circle background
          vermilion:  '#FA4616',   // rating selection
        },
      },

      // ── Font Stacks ──────────────────────────────────────
      fontFamily: {
        inter: ['"Inter"', '"Inter Fallback"', 'system-ui', 'sans-serif'],
        mono:  ['"Geist Mono"', '"Geist Mono Fallback"', 'ui-monospace', 'monospace'],
      },

      // ── Letter Spacing (Whop frosted-ui vars) ────────────
      letterSpacing: {
        '0': '0em',          // --letter-spacing-0
        '1': '0.006em',      // --letter-spacing-1
        '2': '0.011em',      // --letter-spacing-2
        '3': '0.014em',      // --letter-spacing-3
        '4': '0.016em',      // --letter-spacing-4
        '5': '0.019em',      // --letter-spacing-5
        '6': '0.021em',      // --letter-spacing-6
        '7': '0.025em',      // --letter-spacing-7
        '8': '0.031em',      // --letter-spacing-8
        '9': '0.063em',      // --letter-spacing-9
      },

      // ── Border radius: minimal/none ───────────────────────
      borderRadius: {
        none: '0px',
        sm:   '3px',
        DEFAULT: '3px',
        md:   '6px',
        full: '9999px',
      },

      // ── No shadows ────────────────────────────────────────
      boxShadow: {
        none:    'none',
        DEFAULT: 'none',
        sm:      'none',
        md:      'none',
        lg:      'none',
      },

      // ── Animations ────────────────────────────────────────
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-bar': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.2s ease-out both',
        'progress':   'progress-bar 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
