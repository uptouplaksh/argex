export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#A78BFA',
        secondary: '#7DD3FC',
        accent: '#6EE7B7',
        'app-bg': '#F8FAFC',
        'app-text': '#1F2937',
      },
      boxShadow: {
        soft: '0 18px 45px rgba(31, 41, 55, 0.10)',
        subtle: '0 10px 30px rgba(31, 41, 55, 0.08)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
