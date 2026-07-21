/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00D9FF',      // Cyan Elektrik
        secondary: '#17C9D8',    // Cyan Muted/Secondary
        background: '#071426',   // Gelap Deep Blue
        surface: '#0D2039',      // Box / Card
        borderCustom: '#1E6EA7', // Warna border biru tech [catatan: pakai borderCustom agar tidak bentrok dengan class bawaan border Tailwind]
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'], // Khusus Heading
        sans: ['Poppins', 'sans-serif'],     // Body teks
      }
    },
  },
  plugins: [],
}