/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          bg: "var(--color-game-bg, #0B1020)",
          card: "var(--color-game-card, #141B34)",
          primary: "var(--color-game-primary, #5B8CFF)",
          secondary: "var(--color-game-secondary, #8B5CF6)",
          success: "var(--color-game-success, #22C55E)",
          warning: "var(--color-game-warning, #F59E0B)",
          danger: "var(--color-game-danger, #EF4444)",
          text: "var(--color-game-text, #FFFFFF)",
          muted: "var(--color-game-muted, #94A3B8)"
        }
      },
      borderRadius: {
        'lg': 'var(--theme-border-radius, 16px)',
        'xl': 'var(--theme-border-radius, 16px)',
        '2xl': 'calc(var(--theme-border-radius, 16px) * 1.5)',
        'md': 'calc(var(--theme-border-radius, 16px) * 0.75)',
        'sm': 'calc(var(--theme-border-radius, 16px) * 0.5)',
      },
      boxShadow: {
        'neon-primary': '0 0 15px rgba(var(--color-game-primary-rgb, 91, 140, 255), 0.4)',
        'neon-secondary': '0 0 15px rgba(var(--color-game-secondary-rgb, 139, 92, 246), 0.4)',
        'neon-success': '0 0 15px rgba(34, 197, 94, 0.4)',
        'neon-danger': '0 0 15px rgba(239, 68, 68, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-gradient': 'linear-gradient(135deg, var(--color-game-bg, #0B1020) 0%, var(--color-game-card, #141B34) 100%)',
        'neon-gradient': 'linear-gradient(90deg, var(--color-game-primary, #5B8CFF) 0%, var(--color-game-secondary, #8B5CF6) 100%)'
      }
    },
  },
  plugins: [],
}
