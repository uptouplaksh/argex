import Card from './Card'

function RiskBar({ label, value, total, colorClass }) {
  const percent = total ? Math.round((value / total) * 100) : 0
  const widthClass =
    percent >= 90
      ? 'w-full'
      : percent >= 75
        ? 'w-3/4'
        : percent >= 50
          ? 'w-1/2'
          : percent >= 25
            ? 'w-1/4'
            : percent > 0
              ? 'w-2'
              : 'w-0'

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
        <span className="capitalize">{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-300 ${colorClass} ${widthClass}`} />
      </div>
    </div>
  )
}

function RiskProfilePanel({ profile, isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <div className="h-6 w-36 animate-pulse rounded-xl bg-slate-100" />
        <div className="mt-5 h-40 animate-pulse rounded-2xl bg-slate-100" />
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card>
        <p className="text-sm font-semibold text-slate-500">Select an incident to inspect the involved user.</p>
      </Card>
    )
  }

  const severityTotal =
    profile.incidents_by_severity.low +
    profile.incidents_by_severity.medium +
    profile.incidents_by_severity.high

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-700">Risk profile</p>
          <h2 className="mt-1 text-xl font-black text-app-text">{profile.username}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {profile.username ? `@${profile.username}` : `Account ${profile.user_id}`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            profile.is_blocked
              ? 'bg-red-100 text-red-700'
              : profile.is_suspected
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {profile.is_blocked ? 'Blocked' : profile.is_suspected ? 'Suspected' : 'Clear'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Cumulative risk</p>
          <p className="mt-1 text-2xl font-black text-app-text">{profile.cumulative_risk_score}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Avg risk</p>
          <p className="mt-1 text-2xl font-black text-app-text">{profile.average_risk_score}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <RiskBar label="low" value={profile.incidents_by_severity.low} total={severityTotal} colorClass="bg-emerald-400" />
        <RiskBar label="medium" value={profile.incidents_by_severity.medium} total={severityTotal} colorClass="bg-amber-400" />
        <RiskBar label="high" value={profile.incidents_by_severity.high} total={severityTotal} colorClass="bg-red-400" />
      </div>

      <div className="mt-5">
        <p className="text-sm font-black text-app-text">Recent suspicious activity</p>
        <div className="mt-3 space-y-2">
          {profile.latest_incidents.slice(0, 4).map((incident) => (
            <div key={incident.id} className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-black text-app-text">{incident.incident_type}</p>
              <p className="mt-1 text-xs font-semibold capitalize text-slate-500">
                {incident.severity} severity · risk {incident.risk_score}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

export default RiskProfilePanel
