function Card({ children, className = '', as = 'section' }) {
  const Component = as

  return (
    <Component
      className={`rounded-2xl border border-white/80 bg-white/90 p-5 shadow-soft backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-subtle dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-100 sm:p-6 ${className}`}
    >
      {children}
    </Component>
  )
}

export default Card
