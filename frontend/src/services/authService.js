import api from './api'

export async function loginUser(credentials) {
  const { data } = await api.post('/auth/login', credentials)
  return data
}

export async function loginWithPin(credentials) {
  const { data } = await api.post('/auth/login/pin', credentials)
  return data
}

export async function verifyLoginOtp(payload) {
  const { data } = await api.post('/auth/login/verify-otp', payload)
  return data
}

export async function resendLoginOtp(payload) {
  const { data } = await api.post('/auth/login/resend-otp', payload)
  return data
}

export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload)
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function updateCurrencyPreference(preferredCurrency) {
  const { data } = await api.patch('/auth/me/currency', { preferred_currency: preferredCurrency })
  return data
}

export async function createSecurityPin(pin) {
  const { data } = await api.post('/auth/me/pin', { pin })
  return data
}

export async function requestPinChangeOtp() {
  const { data } = await api.post('/auth/me/pin/change-otp')
  return data
}

export async function changeSecurityPin(payload) {
  const { data } = await api.patch('/auth/me/pin', payload)
  return data
}
