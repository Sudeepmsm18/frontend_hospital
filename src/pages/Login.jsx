import { useState } from 'react'
import { api } from '../api'
import Icon from '../Icon'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      onLogin(await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: form }))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <aside className="auth-hero">
        <div className="logo"><span className="logo-mark" />CarePoint Hospital</div>
        <div>
          <h1>Care that starts with a simple conversation.</h1>
          <ul>
            <li><Icon name="chat" /> Book appointments with our assistant in seconds</li>
            <li><Icon name="bell" /> Doctors are notified of their next patient instantly</li>
            <li><Icon name="pill" /> Prescriptions go straight to the pharmacy</li>
          </ul>
        </div>
        <span className="muted" style={{ color: 'rgb(255 255 255 / 0.7)' }}>© CarePoint Hospital</span>
      </aside>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="logo"><span className="logo-mark" />CarePoint</div>
          <div>
            <h2>{mode === 'login' ? 'Welcome back 👋' : 'Create your account'}</h2>
            <p className="muted">{mode === 'login' ? 'Log in to continue to CarePoint.' : 'Sign up as a patient to book appointments.'}</p>
          </div>
          {mode === 'register' && (
            <>
              <label>Full name<input value={form.name || ''} onChange={set('name')} required /></label>
              <label>Mobile number<input type="tel" value={form.phone || ''} onChange={set('phone')} /></label>
              <div className="row">
                <label>Age<input type="number" value={form.age || ''} onChange={set('age')} /></label>
                <label>Gender
                  <select value={form.gender || ''} onChange={set('gender')}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </label>
              </div>
            </>
          )}
          <label>Email<input type="email" autoComplete="email" value={form.email} onChange={set('email')} required /></label>
          <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={set('password')} required /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
          <button type="button" className="link" style={{ justifyContent: 'center' }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'New patient? Create an account' : 'Already have an account? Log in'}
          </button>
          <p className="muted" style={{ textAlign: 'center' }}>Staff: use the account created for you by the hospital admin.</p>
        </form>
      </div>
    </div>
  )
}
