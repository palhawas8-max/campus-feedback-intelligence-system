import axios from 'axios'

// Dynamically use VITE_API_URL in production (Render), fallback to '/api' (Vite proxy) in local dev
const apiBase = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401 (only for authenticated routes, NOT for login attempts)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login')
      const isOnAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      
      if (!isLoginRequest) {
        localStorage.removeItem('token')
        if (!isOnAuthPage) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
