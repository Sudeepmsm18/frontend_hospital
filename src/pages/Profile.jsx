import { useState } from 'react'
import { api } from '../api'

export default function Profile({ user, setUser }) {
  const [form, setForm] = useState(user)
  const [msg, setMsg] = useState(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    try {
      const updated = await api('/auth/me', { method: 'PUT', body: form })
      setUser(updated)
      setForm(updated)
      setMsg({ ok: true, text: form.newPassword ? 'Saved — password changed' : 'Profile saved' })
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  return (
    <form className="card narrow" onSubmit={save}>
      <h3>{user.role === 'patient' ? 'Personal details' : 'My profile'}</h3>
      {user.role !== 'patient' && (
        <div className="row">
          <label>Email<input value={user.email} disabled /></label>
          <label>Role<input value={user.role} disabled /></label>
        </div>
      )}
      <label>Name<input value={form.name || ''} onChange={set('name')} /></label>
      <label>Mobile<input type="tel" value={form.phone || ''} onChange={set('phone')} /></label>
      {user.role === 'patient' && (
        <div className="row">
          <label>Age<input type="number" value={form.age || ''} onChange={set('age')} /></label>
          <label>Gender
            <select value={form.gender || ''} onChange={set('gender')}>
              <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </label>
        </div>
      )}
      {user.role === 'doctor' && (
        <>
          <label>Specialization<input value={form.specialization || ''} onChange={set('specialization')} placeholder="e.g. Cardiology" /></label>
          <div className="row">
            <label>Available from<input type="time" value={form.startTime} onChange={set('startTime')} /></label>
            <label>Available until<input type="time" value={form.endTime} onChange={set('endTime')} /></label>
            <label>Slot (minutes)
              <select value={form.slotMinutes} onChange={set('slotMinutes')}>
                {[10, 15, 20, 30, 45, 60].map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
      <label>New password (leave blank to keep current)
        <input type="password" value={form.newPassword || ''} onChange={set('newPassword')} minLength={6} />
      </label>
      <button className="primary">Save</button>
      {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
    </form>
  )
}
