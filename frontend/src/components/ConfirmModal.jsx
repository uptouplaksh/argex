import Button from './Button'

function ConfirmModal({ title, message, confirmLabel = 'Confirm', tone = 'primary', isLoading, onCancel, onConfirm }) {
  if (!title) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-white/80 bg-white p-6 shadow-soft">
        <div className="mb-5 h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-100 via-sky-100 to-emerald-100" />
        <h2 className="text-2xl font-black text-app-text">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" disabled={isLoading} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={tone} disabled={isLoading} onClick={onConfirm}>
            {isLoading ? 'Working...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmModal
