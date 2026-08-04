import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'maple-orange': '#FF6B00',
        'maple-red': '#E84D1E',
        'maple-dark': '#1A1A1A',
        'maple-gold': '#FFD700',
      },
      fontFamily: {
        'sans': ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config