/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#fafafa',
        'bg-card': '#ffffff',
        'bg-elevated': '#f3f4f6',
        'bg-input': '#f3f4f6',

        'violet': '#7c3aed',
        'violet-light': '#7c3aed',
        'violet-glow': 'rgba(124, 58, 237, 0.08)',
        'cyan': '#0ea5e9',
        'cyan-light': '#0ea5e9',
        'cyan-glow': 'rgba(14, 165, 233, 0.08)',
        'accent': '#7c3aed',
        'accent-hover': '#6d28d9',
        'accent-subtle': 'rgba(124, 58, 237, 0.06)',

        'text-primary': '#111111',
        'text-secondary': '#555555',
        'text-muted': '#999999',

        'border': '#e5e7eb',
        'border-hover': '#d1d5db',
        'border-cyan': '#e5e7eb',

        'danger': '#dc2626',
        'success': '#16a34a',
        'amber': '#d97706',
        'pink': '#db2777',
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'shimmer': 'skShimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        skShimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      }
    },
  },
  plugins: [],
}
