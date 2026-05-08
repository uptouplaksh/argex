import useTheme from '../hooks/useTheme'

function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-app-text shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-violet-700 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-primary dark:hover:text-violet-300 ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
    >
      {isDark ? 'L' : 'D'}
    </button>
  )
}

export default ThemeToggle
