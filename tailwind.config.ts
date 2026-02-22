import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream:    { 50: '#FFFDF7', 100: '#FFF9E8', 200: '#FFF3D1' },
        rose:     { 50: '#FFF5F5', 100: '#FFE8E8', 200: '#FFCCD2', 400: '#F4A0A8', 600: '#D16B77' },
        sage:     { 50: '#F4F8F4', 100: '#E0ECE0', 200: '#C4D9C4', 400: '#8CB88C', 600: '#5A8A5A' },
        sky:      { 50: '#F0F7FF', 100: '#DCEEFF', 200: '#BAD9FF', 400: '#7BB4E8', 600: '#4A8BC4' },
        lavender: { 50: '#F8F4FF', 100: '#EDE4FF', 200: '#D9C8FF', 400: '#B08CE0', 600: '#7E5AB5' },
        warm:     { 50: '#FEFCF8', 100: '#FBF6EE', 200: '#F5ECDB', 400: '#D9C4A0', 600: '#A89060', 800: '#6B5B3E' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        accent: ['Caveat', 'cursive'],
        handwriting: ['Dancing Script', 'cursive'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
export default config
