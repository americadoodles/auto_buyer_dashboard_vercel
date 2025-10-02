/** @type {import('tailwindcss').Config} */
module.exports = { 
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], 
  theme: { 
    extend: {
      gridTemplateColumns: {
        '14': 'repeat(14, minmax(0, 1fr))',
        '16': 'repeat(16, minmax(0, 1fr))',
        '17': 'repeat(17, minmax(0, 1fr))',
      }
    } 
  }, 
  plugins: [] 
};
