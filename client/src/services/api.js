import axios from 'axios'

/**
 * Central Axios instance for DCC CBT.
 * Base URL is read from Vite env (see .env.example) so it can differ
 * between development, staging, and production without code changes.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach auth token (if present) to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dcc_cbt_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Centralized response/error handling hook — extend as needed
// (e.g. redirect to /login on 401, toast on 5xx, etc.).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  },
)

export default api
