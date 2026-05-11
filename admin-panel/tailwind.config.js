/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#eef0f9',100:'#dde0f3',500:'#1a237e',600:'#161e6b',700:'#111757' },
      },
      fontFamily: { sans: ['Inter','system-ui','-apple-system','sans-serif'] },
    },
  },
  plugins: [],
};
