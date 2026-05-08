import api from './api'

export async function getIncidents(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
  const { data } = await api.get('/defender/incidents', { params })
  return data
}

export async function getIncident(incidentId) {
  const { data } = await api.get(`/defender/incidents/${incidentId}`)
  return data
}

export async function resolveIncident(incidentId) {
  const { data } = await api.patch(`/defender/incidents/${incidentId}/resolve`)
  return data
}

export async function blockUser(userId) {
  const { data } = await api.post(`/defender/users/${userId}/block`)
  return data
}

export async function unblockUser(userId) {
  const { data } = await api.post(`/defender/users/${userId}/unblock`)
  return data
}

export async function getUserRiskProfile(userId) {
  const { data } = await api.get(`/defender/users/${userId}/risk-profile`)
  return data
}
