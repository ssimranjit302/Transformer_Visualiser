import axios from 'axios'

const API_BASE = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.reload()
    }
    return Promise.reject(error)
  }
)

export function saveAuth(token, user) {
  localStorage.setItem('access_token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function loadAuth() {
  const token = localStorage.getItem('access_token')
  const user = localStorage.getItem('user')
  if (token && user) {
    return { token, user: JSON.parse(user) }
  }
  return null
}

export function clearAuth() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user')
}

export default api
