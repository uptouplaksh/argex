function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3l18 18" strokeLinecap="round" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" />
        <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7a12.2 12.2 0 0 1-2.2 3.3" strokeLinecap="round" />
        <path d="M6.2 6.8A12.5 12.5 0 0 0 2.5 12c1 2.5 4.5 7 9.5 7a9.7 9.7 0 0 0 4.1-.9" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function PasswordToggle({ isVisible, onToggle }) {
  return (
    <button
      type="button"
      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-violet-200"
      aria-label={isVisible ? 'Hide password' : 'Show password'}
      aria-pressed={isVisible}
      onClick={onToggle}
    >
      <EyeIcon hidden={isVisible} />
    </button>
  )
}

export default PasswordToggle
