import './App.css'
import AdminDashboard from './AdminDashboard'
import PublicSite from './PublicSite'

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <AdminDashboard /> : <PublicSite />
}
