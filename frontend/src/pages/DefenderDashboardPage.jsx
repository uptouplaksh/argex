import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import IncidentCard from '../components/IncidentCard'
import Input from '../components/Input'
import RiskProfilePanel from '../components/RiskProfilePanel'
import {
  blockUser,
  getIncidents,
  getUserRiskProfile,
  resolveIncident,
  unblockUser,
} from '../services/defenderService'
import { formatReadableDateTime } from '../utils/dateTime'

function severityTone(severity) {
  if (severity === 'high') {
    return 'bg-red-100 text-red-700'
  }

  if (severity === 'medium') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-emerald-100 text-emerald-700'
}

function IncidentDetailsPanel({ incident, isActionLoading, onBlockUser, onResolveIncident, onUnblockUser, profile }) {
  if (!incident) {
    return (
      <Card>
        <p className="text-sm font-semibold text-slate-500">Select an incident to inspect signal details.</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-violet-700">Incident details</p>
          <h2 className="mt-1 text-xl font-black text-app-text">#{incident.id} · {incident.incident_type}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${severityTone(incident.severity)}`}>
          {incident.severity}
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <p className="text-sm leading-7 text-slate-700">{incident.description}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Risk score</p>
          <p className="mt-1 text-2xl font-black text-app-text">{incident.risk_score}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
          <p className="mt-1 text-lg font-black capitalize text-app-text">{incident.status}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">User</p>
          <p className="mt-1 text-lg font-black text-app-text">#{incident.user_id}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Auction</p>
          <p className="mt-1 text-lg font-black text-app-text">{incident.auction_id ? `#${incident.auction_id}` : 'N/A'}</p>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-500">
        Created {formatReadableDateTime(incident.created_at)}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Button
          variant="accent"
          disabled={isActionLoading || incident.status === 'resolved'}
          onClick={() => onResolveIncident(incident.id)}
        >
          Resolve
        </Button>
        <Button
          variant="secondary"
          disabled={isActionLoading || profile?.is_blocked}
          onClick={() => onBlockUser(incident.user_id)}
        >
          Block user
        </Button>
        <Button
          variant="ghost"
          disabled={isActionLoading || !profile?.is_blocked}
          onClick={() => onUnblockUser(incident.user_id)}
        >
          Unblock
        </Button>
      </div>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-2xl bg-white/80 shadow-soft" />
      ))}
    </div>
  )
}

function DefenderDashboardPage() {
  const [incidents, setIncidents] = useState([])
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [riskProfile, setRiskProfile] = useState(null)
  const [filters, setFilters] = useState({ severity: '', status: 'open', user_id: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadIncidents = useCallback(async () => {
    setError('')

    try {
      const data = await getIncidents(filters)
      setIncidents(data)
      setSelectedIncident((current) => {
        if (!current) {
          return data[0] || null
        }

        return data.find((incident) => incident.id === current.id) || data[0] || null
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const timeout = setTimeout(loadIncidents, 0)
    return () => clearTimeout(timeout)
  }, [loadIncidents])

  useEffect(() => {
    if (!selectedIncident?.user_id) {
      const timeout = setTimeout(() => setRiskProfile(null), 0)
      return () => clearTimeout(timeout)
    }

    let isMounted = true
    const timeout = setTimeout(async () => {
      setIsProfileLoading(true)

      try {
        const profile = await getUserRiskProfile(selectedIncident.user_id)

        if (isMounted) {
          setRiskProfile(profile)
        }
      } catch (profileError) {
        if (isMounted) {
          setNotice(profileError.message)
        }
      } finally {
        if (isMounted) {
          setIsProfileLoading(false)
        }
      }
    }, 0)

    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [selectedIncident?.user_id])

  const metrics = useMemo(() => {
    const open = incidents.filter((incident) => incident.status === 'open').length
    const high = incidents.filter((incident) => incident.severity === 'high').length
    const avgRisk = incidents.length
      ? (incidents.reduce((sum, incident) => sum + Number(incident.risk_score || 0), 0) / incidents.length).toFixed(1)
      : '0.0'

    return { open, high, avgRisk }
  }, [incidents])

  const updateFilter = (name, value) => {
    setIsLoading(true)
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const refreshProfile = async (userId) => {
    const profile = await getUserRiskProfile(userId)
    setRiskProfile(profile)
  }

  const handleResolveIncident = async (incidentId) => {
    setIsActionLoading(true)
    setNotice('')

    try {
      const updatedIncident = await resolveIncident(incidentId)
      setSelectedIncident(updatedIncident)
      setIncidents((current) => current.map((incident) => (incident.id === incidentId ? updatedIncident : incident)))
      setNotice('Incident resolved.')
    } catch (actionError) {
      setNotice(actionError.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleBlockUser = async (userId) => {
    setIsActionLoading(true)
    setNotice('')

    try {
      await blockUser(userId)
      await refreshProfile(userId)
      setNotice('User blocked.')
    } catch (actionError) {
      setNotice(actionError.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleUnblockUser = async (userId) => {
    setIsActionLoading(true)
    setNotice('')

    try {
      await unblockUser(userId)
      await refreshProfile(userId)
      setNotice('User unblocked.')
    } catch (actionError) {
      setNotice(actionError.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-end">
        <div>
          <div className="mb-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-emerald-200 shadow-sm">
            Defender monitoring
          </div>
          <h1 className="text-3xl font-black text-app-text sm:text-4xl">Security operations</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Review risk signals, investigate suspicious users, and take containment actions.
          </p>
        </div>
        <Card className="grid grid-cols-3 gap-3 bg-slate-900 text-white">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-300">Open</p>
            <p className="mt-1 text-3xl font-black">{metrics.open}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-300">High</p>
            <p className="mt-1 text-3xl font-black text-red-200">{metrics.high}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-300">Avg risk</p>
            <p className="mt-1 text-3xl font-black text-amber-200">{metrics.avgRisk}</p>
          </div>
        </Card>
      </section>

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text">Severity</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100"
              value={filters.severity}
              onChange={(event) => updateFilter('severity', event.target.value)}
            >
              <option value="">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-app-text">Status</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-violet-100"
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <Input
            label="User ID"
            name="defender-user-filter"
            type="number"
            placeholder="Filter by user"
            value={filters.user_id}
            onChange={(event) => updateFilter('user_id', event.target.value)}
          />
        </div>
      </Card>

      {notice ? (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <Card className="text-center">
          <h2 className="text-2xl font-black text-app-text">Defender data unavailable</h2>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <Button className="mt-6" variant="secondary" onClick={loadIncidents}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_25rem]">
          <section className="space-y-4">
            {isLoading ? (
              <DashboardSkeleton />
            ) : incidents.length ? (
              incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  isSelected={selectedIncident?.id === incident.id}
                  onSelect={setSelectedIncident}
                />
              ))
            ) : (
              <Card className="text-center">
                <div className="mx-auto mb-5 h-16 w-16 rounded-3xl bg-emerald-50" />
                <h2 className="text-2xl font-black text-app-text">No matching incidents</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">Adjust filters to inspect another signal group.</p>
              </Card>
            )}
          </section>

          <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <IncidentDetailsPanel
              incident={selectedIncident}
              isActionLoading={isActionLoading}
              onBlockUser={handleBlockUser}
              onResolveIncident={handleResolveIncident}
              onUnblockUser={handleUnblockUser}
              profile={riskProfile}
            />
            <RiskProfilePanel profile={riskProfile} isLoading={isProfileLoading} />
          </aside>
        </div>
      )}
    </div>
  )
}

export default DefenderDashboardPage
