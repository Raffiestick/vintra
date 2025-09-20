// tailwind.config.cjs
const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}',
    './src/app/(site)/**/*.{ts,tsx,js,jsx,mdx}',
    './src/app/(app)/**/*.{ts,tsx,js,jsx,mdx}',
    './src/components/**/*.{ts,tsx,js,jsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 0.25rem)',
        '2xl': 'calc(var(--radius) + 0.5rem)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      fontFamily: { sans: ['Inter', ...fontFamily.sans] },
    },
  },
  safelist: [
    'animate-[vintra-shimmer_5s_infinite]',
    'animate-[vintra-pulse_4s_infinite]',
    'animate-[vintra-pulse_6s_ease-in-out_infinite]',
    'animate-[vintra-grid_20s_linear_infinite]',
    'animate-[vintra-border-shimmer_3s_linear_infinite]',
    'bg-[length:300%_100%]',
    'bg-[size:3rem_3rem]',
    'bg-[radial-gradient(40%_120%_at_50%_0%,#fff2,transparent)]',
    'bg-[radial-gradient(closest-side,rgba(99,102,241,0.6),transparent)]',
    'bg-[radial-gradient(circle_at_50%_120%,rgba(99,102,241,0.4),transparent_40%)]',
    'bg-[linear-gradient(90deg,transparent_45%,#e2e8f0_50%,transparent_55%)]',
    'bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)]',
  ],
  plugins: [require('tailwindcss-animate')],
};
