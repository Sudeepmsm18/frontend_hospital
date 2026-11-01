import { useEffect, useState } from 'react'
import { api, initials } from './api'
import Icon from './Icon'
import Login from './pages/Login'
import Profile from './pages/Profile'
import PatientApp from './pages/Patient'
import DoctorHome from './pages/Doctor'
import NurseHome from './pages/Nurse'
import PharmacyHome from './pages/Pharmacy'
import AdminApp from './pages/Admin'

const HOME = { doctor: DoctorHome, nurse: NurseHome, pharmacist: PharmacyHome }
const ROLE_LABEL = { doctor: 'Doctor', nurse: 'Nurse', pharmacist: 'Pharmacy', admin: 'Administrator', patient: 'Patient' }

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem('token'))
  const [tab, setTab] = useState('home')

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    api('/auth/me').then(setUser).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const onLogin = ({ token, user }) => {
    localStorage.setItem('token', token)
    setUser(user)
    setTab('home')
  }
  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  if (loading) return <p className="center">Loading…</p>
  if (!user) return <Login onLogin={onLogin} />

  // Patients get a mobile-first app, admins a sidebar console; other staff get the top-bar dashboard.
  if (user.role === 'patient') return <PatientApp user={user} setUser={setUser} logout={logout} />
  if (user.role === 'admin') return <AdminApp user={user} setUser={setUser} logout={logout} />

  const Home = HOME[user.role]
  const displayName = `${user.role === 'doctor' ? 'Dr. ' : ''}${user.name}`
  return (
    <>
      <header className="topbar">
        <div className="logo"><span className="logo-mark" />CarePoint</div>
        <nav>
          <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><Icon name="dashboard" size={18} />Dashboard</button>
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><Icon name="user" size={18} />My profile</button>
        </nav>
        <div className="me">
          <div className="me-text"><b>{displayName}</b><span>{ROLE_LABEL[user.role]}</span></div>
          <span className="avatar">{initials(user.name)}</span>
          <button className="ghost" onClick={logout} title="Logout"><Icon name="logout" size={18} /></button>
        </div>
      </header>
      <main className="staff">
        {tab === 'home' ? <Home user={user} setUser={setUser} /> : <Profile user={user} setUser={setUser} />}
      </main>
    </>
  )
}
