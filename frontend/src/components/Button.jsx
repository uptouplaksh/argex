const variants = {
  primary:
    'bg-primary text-white shadow-subtle hover:-translate-y-0.5 hover:bg-violet-400 focus-visible:outline-primary dark:bg-violet-500 dark:hover:bg-violet-400',
  secondary:
    'bg-white text-app-text border border-sky-100 shadow-sm hover:-translate-y-0.5 hover:border-secondary hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-secondary dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:hover:border-secondary dark:hover:bg-slate-700 dark:hover:text-sky-200',
  accent:
    'bg-accent text-emerald-950 shadow-subtle hover:-translate-y-0.5 hover:bg-emerald-300 focus-visible:outline-accent dark:bg-emerald-400',
  ghost:
    'bg-transparent text-app-text hover:bg-white/70 hover:text-violet-700 focus-visible:outline-primary dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-violet-300',
}

const sizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base',
}

function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  const elementProps = Component === 'button' ? { type, ...props } : props

  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...elementProps}
    />
  )
}

export default Button
