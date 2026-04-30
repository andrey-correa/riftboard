import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0e17',
          elevated: '#111725',
          card: '#161d2e',
          hover: '#1c2438',
        },
        border: {
          DEFAULT: '#222b42',
          strong: '#2d3854',
        },
        accent: {
          DEFAULT: '#c8aa6e',
          bright: '#f0e6d2',
          dim: '#785a28',
        },
        win: '#2563eb',
        loss: '#dc2626',
        text: {
          primary: '#f0e6d2',
          secondary: '#a09b8c',
          muted: '#5b5a56',
        },
        rank: {
          iron: '#74614c',
          bronze: '#965b3a',
          silver: '#a4adb1',
          gold: '#cd9f44',
          platinum: '#3eb1a9',
          emerald: '#1e9a6c',
          diamond: '#5d8ff5',
          master: '#9b51e0',
          grandmaster: '#cd1c2f',
          challenger: '#f4c874',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        sans: ['"Spiegel"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
