/** @type {import('tailwindcss').Config} */
module.exports = { 
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], 
  darkMode: 'class',
  safelist: [
    'grid-cols-17', // Ensure this class is never purged
    'grid-cols-20', // Ensure this class is never purged
  ],
  theme: { 
    extend: {
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
        '17': 'repeat(17, minmax(0, 1fr))',
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      fontFamily: {
        sans: ["var(--font-lato)", "system-ui", "sans-serif"],
        heading: ["var(--font-cinzel)", "system-ui", "serif"],
      },
      colors: {
        brand: {
          primary: '#325833',
        },
        primary: {
          dark: "#325833",
          DEFAULT: "#364E2F",
          medium: "#516D48",
          light: "#E4DED4",
          bright: "#efebe5",
        },
        // Claude-inspired warm palette
        // Light surfaces sit on a warm cream; dark surfaces use a warm charcoal.
        // The "claude" accent is the coral/terracotta used across Anthropic surfaces.
        claude: {
          // Cream surfaces (light mode)
          cream: "#FAF9F5",       // page background
          surface: "#FFFFFF",     // cards / panels
          sand: "#F4F0E8",        // muted surface, hovers
          border: "#E8E2D5",      // hairlines
          divider: "#D8D0BE",
          // Warm text scale (light mode)
          ink: "#1F1E1D",
          text: "#2B2A28",
          muted: "#6B6760",
          subtle: "#9A958A",
          // Accent (coral / Claude orange)
          accent: "#CC785C",
          accentHover: "#B7654B",
          accentSoft: "#F4E4DC",
          accentRing: "rgba(204,120,92,0.30)",
          // Status (warm-tinted so they harmonize with cream)
          success: "#6B8E5A",
          successSoft: "#E6EBDC",
          warning: "#C9A961",
          warningSoft: "#F4ECD8",
          danger: "#C5634C",
          dangerSoft: "#F4DDD5",
          info: "#5E7BA8",
          infoSoft: "#E0E6F0",
        },
        // Dark mode warm-charcoal scale
        coal: {
          950: "#171614",        // deepest background
          900: "#1F1E1D",        // page background
          850: "#26241F",        // panel
          800: "#2D2A24",        // card
          700: "#3A362E",        // hover / elevated
          600: "#4A4539",        // border
          500: "#5E574A",        // strong border
          400: "#8A8170",        // muted text
          300: "#B5AC98",        // body text
          200: "#D9D2C0",        // primary text
          100: "#F0EAD9",        // headings
        },
      }
    } 
  }, 
  plugins: [] 
};
