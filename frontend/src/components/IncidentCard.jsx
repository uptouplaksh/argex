import { formatReadableDateTime } from '../utils/dateTime'

const severityStyles = {
  low: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  medium: 'border-amber-100 bg-amber-50 text-amber-700',
  high: 'border-red-100 bg-red-50 text-red-700',
}

function IncidentCard({ incident, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`w-full rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-subtle ${
        isSelected ? 'border-violet-200 bg-violet-50' : 'border-white/80 bg-white/90'
      }`}
      onClick={() => onSelect(incident)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Incident #{incident.id}</p>
          <h3 className="mt-1 text-base font-black text-app-text">{incident.incident_type}</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black capitalize ${
            severityStyles[incident.severity] || severityStyles.low
          }`}
        >
          {incident.severity}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{incident.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-xs font-semibold text-slate-500">Risk</p>
          <p className="mt-1 text-sm font-black text-app-text">{incident.risk_score}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-xs font-semibold text-slate-500">User</p>
          <p className="mt-1 text-sm font-black text-app-text">#{incident.user_id}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-xs font-semibold text-slate-500">Status</p>
          <p className="mt-1 text-sm font-black capitalize text-app-text">{incident.status}</p>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-500">
        {formatReadableDateTime(incident.created_at)}
      </p>
    </button>
  )
}

export default IncidentCard
