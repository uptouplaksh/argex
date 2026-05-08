import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function ProfilePanel({ compact = false, onNavigate }) {
  const { user } = useAuth()

  return (
    <Link
      to="/profile"
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary dark:border-slate-800 dark:bg-slate-900 ${
        compact ? 'w-full justify-between' : ''
      }`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-100 text-xs font-black uppercase text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
        {user?.role?.slice(0, 1) || 'U'}
      </span>
      <span className="min-w-0 leading-none">
        <span className="block truncate text-xs font-black text-app-text dark:text-slate-100">
          {user?.username || 'Profile'}
        </span>
        <span className="mt-1 block truncate text-xs font-semibold capitalize text-violet-700 dark:text-violet-300">
          Account
        </span>
      </span>
    </Link>
  )
}

export default ProfilePanel
