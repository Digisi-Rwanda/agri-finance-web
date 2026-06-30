import axios from 'axios'
import { clearSession, getToken, isTokenExpired } from '../services/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

let onUnauthorized = null

export const setUnauthorizedHandler = (callback) => {
  onUnauthorized = callback
}

const handleUnauthorized = () => {
  clearSession()
  if (onUnauthorized) {
    onUnauthorized()
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      if (isTokenExpired(token)) {
        handleUnauthorized()
        return Promise.reject(new Error('Session expired'))
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      handleUnauthorized()
    }
    return Promise.reject(error)
  },
)
