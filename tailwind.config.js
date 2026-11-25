export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#101417',
          900: '#0C0E11',
          800: '#101417',
          700: '#15191C'
        },
        graphite: {
          DEFAULT: '#191D20',
          800: '#191D20',
          700: '#1F2428'
        },
        slateCard: {
          DEFAULT: '#22272B',
          hover: '#2A3035',
          border: '#2E363D'
        },
        amberAccent: {
          DEFAULT: '#F5A623',
          light: '#F8B84E',
          dark: '#D98A0E'
        },
        copper: {
          DEFAULT: '#C87942',
          light: '#D98A52',
          dark: '#A65D2E'
        },
        champagne: {
          DEFAULT: '#E8C18A',
          light: '#F0D4AA'
        },
        warmWhite: '#F5F2ED',
        mutedGrey: '#A8A8A3',
        emeraldAccent: '#10B981',
        dangerAccent: '#EF4444',
        cyanAccent: '#06B6D4'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif']
      },
      boxShadow: {
        'amber-glow': '0 0 25px -5px rgba(245, 166, 35, 0.25)',
        'copper-glow': '0 0 25px -5px rgba(200, 121, 66, 0.25)',
        'cyan-glow': '0 0 25px -5px rgba(6, 182, 212, 0.25)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
      }
    }
  },
  plugins: []
};
