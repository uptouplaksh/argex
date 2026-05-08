import Card from './Card'

function EmptyState({ title, message, children }) {
  return (
    <Card className="text-center">
      <div className="mx-auto mb-5 h-16 w-16 rounded-3xl bg-gradient-to-br from-violet-100 via-sky-100 to-emerald-100" />
      <h2 className="text-2xl font-black text-app-text">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </Card>
  )
}

export default EmptyState
