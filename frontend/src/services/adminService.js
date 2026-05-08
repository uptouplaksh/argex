import api from './api'

export async function getUsers() {
  const { data } = await api.get('/admin/users')
  return data
}

export async function updateUserRole(userId, role) {
  const { data } = await api.patch(`/admin/users/${userId}/role`, { role })
  return data
}

export async function getSellerRequests() {
  const { data } = await api.get('/admin/seller-requests')
  return data
}

export async function approveSellerRequest(requestId) {
  const { data } = await api.post(`/admin/seller-requests/${requestId}/approve`)
  return data
}

export async function rejectSellerRequest(requestId) {
  const { data } = await api.post(`/admin/seller-requests/${requestId}/reject`)
  return data
}

export async function requestSellerAccess() {
  const { data } = await api.post('/roles/request-seller')
  return data
}

export async function createCategory(name) {
  const { data } = await api.post('/categories/', { name })
  return data
}

export async function updateCategory(categoryId, name) {
  const { data } = await api.patch(`/categories/${categoryId}`, { name })
  return data
}

export async function deleteCategory(categoryId) {
  await api.delete(`/categories/${categoryId}`)
}
