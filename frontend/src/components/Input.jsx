function Input({ label, id, className = '', helperText, error = false, trailingElement, ...props }) {
  const inputId = id || props.name
  const hasError = error || props['aria-invalid']

  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-app-text dark:text-slate-100">{label}</span>
      ) : null}
      <span className="relative block">
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-app-text shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:ring-4 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 ${
            trailingElement ? 'pr-12' : ''
          } ${
            hasError
              ? 'border-red-200 focus:border-red-300 focus:ring-red-100'
              : 'border-slate-200 focus:border-primary focus:ring-violet-100 dark:border-slate-700 dark:focus:ring-violet-950'
          } ${className}`}
          {...props}
        />
        {trailingElement ? <span className="absolute inset-y-0 right-3 flex items-center">{trailingElement}</span> : null}
      </span>
      {helperText ? (
        <span className={`mt-2 block text-xs ${hasError ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
          {helperText}
        </span>
      ) : null}
    </label>
  )
}

export default Input
