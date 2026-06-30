import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { setUnauthorizedHandler } from './api/client'
import AppRoutes from './routes/AppRoutes'
import './styles/app.css'
import './styles/neon-dashboard.css'
import './styles/portal-light.css'
import './styles/notifications.css'

function App() {
  useEffect(() => {
    setUnauthorizedHandler(() => {
      toast.error('Session expired. Please sign in again.')
      window.location.assign('/login')
    })
  }, [])

  return (
    <BrowserRouter>
      <AppRoutes />
      <ToastContainer position="top-right" autoClose={2500} newestOnTop />
    </BrowserRouter>
  )
}

export default App
