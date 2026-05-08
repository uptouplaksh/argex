import api from './api'

export async function getNotifications() {
  const { data } = await api.get('/notifications/')
  return data
}

export async function markNotificationRead(notificationId) {
  const { data } = await api.patch(`/notifications/${notificationId}/read`)
  return data
}
