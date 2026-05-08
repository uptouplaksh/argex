import { createContext, useCallback, useMemo, useState } from 'react'

const ToastContext = createContext(null)

const styles = {
  success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  error: 'border-red-100 bg-red-50 text-red-700',
  warning: 'border-amber-100 bg-amber-50 text-amber-700',
  info: 'border-sky-100 bg-sky-50 text-sky-700',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, type }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3500)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 grid max-w-sm gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-soft transition duration-200 ${
              styles[toast.type] || styles.info
            }`}
          >
            <div className="flex items-start gap-3">
              <span>{toast.message}</span>
              <button type="button" className="font-black" onClick={() => dismissToast(toast.id)}>
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastContext
