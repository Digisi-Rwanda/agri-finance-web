import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import UnauthorizedHandler from './components/UnauthorizedHandler'
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

  return (
    <BrowserRouter>
      <AuthLocaleProvider>
        <UnauthorizedHandler />
        <AppRoutes />
      </AuthLocaleProvider>
      <ToastContainer position="top-right" autoClose={2500} newestOnTop />
    </BrowserRouter>
  )
}

export default App
