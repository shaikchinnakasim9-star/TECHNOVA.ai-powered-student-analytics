import axios from 'axios'

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const baseURL = configuredApiUrl
  ? /^https?:\/\//i.test(configuredApiUrl)
    ? configuredApiUrl
    : `https://${configuredApiUrl.replace(/\/+$/, '')}/api`
  : 'http://localhost:5000/api'

const api = axios.create({
  baseURL
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campuspulse-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
