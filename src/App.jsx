import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { setUnauthorizedHandler } from './api/client'
import { AuthLocaleProvider } from './context/AuthLocaleContext'
import AppRoutes from './routes/AppRoutes'
import './styles/app.css'
import './styles/neon-dashboard.css'
import './styles/portal-light.css'
import './styles/merchant-ui.css'
import './styles/notifications.css'
import './styles/account.css'

function App() {
  useEffect(() => {
    // Applied before MainLayout mounts so the auth screens match the stored theme.
    document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark')
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      toast.error('Session expired. Please sign in again.')
      window.location.assign('/login')
    })
  }, [])

  return (
    <BrowserRouter>
      <AuthLocaleProvider>
        <AppRoutes />
      </AuthLocaleProvider>
      <ToastContainer position="top-right" autoClose={2500} newestOnTop />
    </BrowserRouter>
  )
}

export default App
