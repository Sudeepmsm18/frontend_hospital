import { useState } from 'react'
import { api, usePoll, initials } from '../api'
import Icon from '../Icon'
import NurseHome from './Nurse'
import PharmacyHome from './Pharmacy'
import Profile from './Profile'

const ROLES = [
  ['doctor', 'Doctors'],
  ['nurse', 'Nurses'],
  ['pharmacist', 'Pharmacists'],
  ['patient', 'Patients'],
  ['admin', 'Admins'],
]
const EMPTY = { name: '', email: '', phone: '', password: '', specialization: '', startTime: '09:00', endTime: '17:00', slotMinutes: 30, age: '', gender: '' }

// Sidebar modules, grouped. `count` reads a number from /users/stats for the little badge.
const MODULES = [
  { group: 'Main', items: [
    { key: 'overview', label: 'Dashboard', icon: 'dashboard' },
  ] },
  { group: 'User management', items: [
    { key: 'doctor', label: 'Doctors', icon: 'doctor', count: (s) => s.users.doctor },
    { key: 'nurse', label: 'Nurses', icon: 'heart', count: (s) => s.users.nurse },
    { key: 'pharmacist', label: 'Pharmacists', icon: 'pill', count: (s) => s.users.pharmacist },
    { key: 'patient', label: 'Patients', icon: 'users', count: (s) => s.users.patient },
    { key: 'admin', label: 'Admins', icon: 'shield', count: (s) => s.users.admin },
  ] },
  { group: 'Operations', items: [
    { key: 'frontdesk', label: 'Front desk', icon: 'calendar', count: (s) => s.today.booked },
    { key: 'pharmacy', label: 'Pharmacy', icon: 'clipboard', count: (s) => s.prescriptions.pending, warn: true },
  ] },
  { group: 'Account', items: [
    { key: 'profile', label: 'My profile', icon: 'user' },
  ] },
]

export default function AdminApp({ user, setUser, logout }) {
  const [view, setView] = useState('overview')
  const [open, setOpen] = useState(false) // mobile drawer
  const [stats] = usePoll('/users/stats', 15000)

  const go = (key) => {
    setView(key)
    setOpen(false)
  }

  let content
  if (view === 'overview') content = <><PageHead title="Hospital overview" sub="Live snapshot of today, refreshed every few seconds." /><Overview /></>
  else if (view === 'frontdesk') content = <NurseHome />
  else if (view === 'pharmacy') content = <PharmacyHome />
  else if (view === 'profile') content = <Profile user={user} setUser={setUser} />
  else content = <UserManagement key={view} role={view} user={user} />

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo"><span className="logo-mark" />CarePoint</div>
          <span className="sidebar-tag">Admin</span>
        </div>
        <nav>
          {MODULES.map(({ group, items }) => (
            <div key={group} className="side-group">
              <span className="side-label">{group}</span>
              {items.map((m) => {
                const n = stats && m.count ? m.count(stats) : null
                return (
                  <button key={m.key} className={`side-item ${view === m.key ? 'active' : ''}`} onClick={() => go(m.key)}>
                    <Icon name={m.icon} size={18} />
                    <span>{m.label}</span>
                    {n > 0 && <span className={`side-count ${m.warn ? 'warn' : ''}`}>{n}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="side-user">
          <span className="avatar">{initials(user.name)}</span>
          <div className="grow">
            <b>{user.name}</b>
            <span>{user.email}</span>
          </div>
          <button className="ghost" onClick={logout} title="Logout"><Icon name="logout" size={18} /></button>
        </div>
      </aside>
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <header className="admin-mobilebar">
          <button className="ghost" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="logo"><span className="logo-mark" />CarePoint</div>
          <span className="avatar">{initials(user.name)}</span>
        </header>
        <main className="staff">{content}</main>
      </div>
    </div>
  )
}

function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h2>{title}</h2><p>{sub}</p></div>
      {children}
    </div>
  )
}

function Overview() {
  const [s] = usePoll('/users/stats', 10000)
  if (!s) return <p className="muted">Loading…</p>
  const maxWeek = Math.max(1, ...s.weekly.map((w) => w.count))

  return (
    <>
      <div className="tiles">
        <Tile icon="doctor" label="Doctors" value={s.users.doctor} sub={`${s.doctorStatus.available} available · ${s.doctorStatus.break} break · ${s.doctorStatus.leave} leave`} />
        <Tile icon="heart" label="Nurses" value={s.users.nurse} />
        <Tile icon="pill" label="Pharmacists" value={s.users.pharmacist} />
        <Tile icon="users" label="Patients" value={s.users.patient} />
      </div>
      <div className="tiles">
        <Tile icon="calendar" label="Appointments today" value={s.today.total} sub={`${s.today.chatbot} chatbot · ${s.today.walkIn} walk-in`} />
        <Tile icon="clock" label="Waiting today" value={s.today.booked} sub={`${s.today.finished} finished · ${s.today.cancelled} cancelled`} />
        <Tile icon="bell" label="Upcoming bookings" value={s.upcoming} sub="today and later" />
        <Tile icon="pill" label="Pending prescriptions" value={s.prescriptions.pending} sub={`${s.prescriptions.dispensedToday} dispensed today`} warn={s.prescriptions.pending > 0} />
      </div>

      <div className="grid">
        <section className="card">
          <div className="card-head"><h3>Appointments — last 7 days</h3></div>
          <div className="bars">
            {s.weekly.map((w) => (
              <div key={w.date} className="bar-col" title={`${w.date}: ${w.count}`}>
                <span className="bar-val">{w.count}</span>
                <div className="bar" style={{ height: `${(w.count / maxWeek) * 100}%` }} />
                <span className="muted">{new Date(w.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h3>Doctors today</h3></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Doctor</th><th>Status</th><th>Waiting</th><th>Finished</th></tr></thead>
              <tbody>
                {s.doctorLoad.map((d) => (
                  <tr key={d._id}>
                    <td>Dr. {d.name}<div className="muted">{d.specialization}</div></td>
                    <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                    <td>{d.booked}</td>
                    <td>{d.finished}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h3>Today's appointments</h3><span className="muted">{s.todayAppointments.length}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Source</th><th>Status</th></tr></thead>
            <tbody>
              {s.todayAppointments.map((a) => (
                <tr key={a._id}>
                  <td><b>{a.time}</b></td>
                  <td>{a.patient?.name ?? '(deleted)'}</td>
                  <td>Dr. {a.doctor?.name ?? '(deleted)'}</td>
                  <td><span className="badge">{a.source}</span></td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {s.todayAppointments.length === 0 && <p className="empty">No appointments today.</p>}
      </section>
    </>
  )
}

function Tile({ icon, label, value, sub, warn }) {
  return (
    <div className={`card tile ${warn ? 'warn' : ''}`}>
      <div>
        <span className="muted">{label}</span>
        <b>{value}</b>
        {sub && <span className="muted">{sub}</span>}
      </div>
      <span className="tile-icon"><Icon name={icon} /></span>
    </div>
  )
}

function UserManagement({ role, user }) {
  const [users, reload] = usePoll(`/users?role=${role}`, 10000)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, user = edit
  const [q, setQ] = useState('')
  const shown = (users || []).filter((u) => [u.name, u.email, u.phone, u.specialization].join(' ').toLowerCase().includes(q.toLowerCase()))

  const remove = async (u) => {
    if (!confirm(`Delete ${u.name}?`)) return
    try {
      await api(`/users/${u._id}`, { method: 'DELETE' })
      reload()
    } catch (err) {
      alert(err.message)
    }
  }

  const label = ROLES.find(([r]) => r === role)[1]
  return (
    <>
      <PageHead title={label} sub={`Create, edit and remove ${label.toLowerCase()}.`}>
        <button className="primary" onClick={() => setEditing({})}><Icon name="plus" size={18} />Add {label.slice(0, -1).toLowerCase()}</button>
      </PageHead>

      <section className="card">
        <div className="card-head">
          <h3>All {label.toLowerCase()} <span className="muted">({users?.length ?? 0})</span></h3>
          <input placeholder={`Search ${label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Mobile</th>
                {role === 'doctor' && <><th>Specialization</th><th>Hours</th><th>Status</th></>}
                {role === 'patient' && <><th>Age</th><th>Gender</th></>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="avatar">{initials(u.name)}</span>
                      <b>{role === 'doctor' && 'Dr. '}{u.name}</b>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  {role === 'doctor' && <><td>{u.specialization || '—'}</td><td>{u.startTime}–{u.endTime}<div className="muted">{u.slotMinutes} min slots</div></td><td><span className={`badge ${u.status}`}>{u.status}</span></td></>}
                  {role === 'patient' && <><td>{u.age || '—'}</td><td>{u.gender || '—'}</td></>}
                  <td className="actions">
                    <button className="sm" onClick={() => setEditing(u)}>Edit</button>
                    {u._id !== user._id && <button className="sm danger" onClick={() => remove(u)}>Delete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users && shown.length === 0 && <p className="empty">{q ? 'No matches.' : `No ${label.toLowerCase()} yet.`}</p>}
      </section>

      {editing && <UserForm role={role} existing={editing._id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
    </>
  )
}

function UserForm({ role, existing, onClose, onSaved }) {
  const [form, setForm] = useState(existing ? { ...EMPTY, ...existing, password: '' } : { ...EMPTY, role })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api(existing ? `/users/${existing._id}` : '/users', { method: existing ? 'PUT' : 'POST', body: form })
      onSaved()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="card dialog" onSubmit={submit}>
        <div className="card-head">
          <h3>{existing ? `Edit ${existing.name}` : `New ${role}`}</h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div className="row">
          <label>Name<input value={form.name} onChange={set('name')} required /></label>
          <label>Mobile<input type="tel" value={form.phone || ''} onChange={set('phone')} /></label>
        </div>
        <div className="row">
          <label>Email (login)<input type="email" value={form.email} onChange={set('email')} required /></label>
          <label>{existing ? 'New password (blank = keep)' : 'Password (default password123)'}
            <input type="text" value={form.password} onChange={set('password')} minLength={6} />
          </label>
        </div>
        {role === 'doctor' && (
          <>
            <label>Specialization<input value={form.specialization || ''} onChange={set('specialization')} placeholder="e.g. Cardiology" required /></label>
            <div className="row">
              <label>From<input type="time" value={form.startTime} onChange={set('startTime')} /></label>
              <label>Until<input type="time" value={form.endTime} onChange={set('endTime')} /></label>
              <label>Slot (min)
                <select value={form.slotMinutes} onChange={set('slotMinutes')}>
                  {[10, 15, 20, 30, 45, 60].map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
            </div>
          </>
        )}
        {role === 'patient' && (
          <div className="row">
            <label>Age<input type="number" value={form.age || ''} onChange={set('age')} /></label>
            <label>Gender
              <select value={form.gender || ''} onChange={set('gender')}>
                <option value="">—</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </label>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary">Save</button>
        </div>
      </form>
    </div>
  )
}
