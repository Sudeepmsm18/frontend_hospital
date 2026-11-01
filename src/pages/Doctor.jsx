import { useEffect, useRef, useState } from 'react'
import { api, usePoll, prettyDate, dayOffset, initials } from '../api'
import Icon from '../Icon'

const STATUSES = [
  ['available', '🟢 Available'],
  ['break', '☕ On break'],
  ['leave', '🏖 On leave'],
]

export default function DoctorHome({ user, setUser }) {
  const [next] = usePoll('/appointments/next', 5000)
  const [appts, reload] = usePoll('/appointments', 5000)
  const [toast, setToast] = useState('')
  const [finishing, setFinishing] = useState(null)
  const lastCount = useRef(null)

  // Notify when a new booking shows up.
  useEffect(() => {
    if (!next) return
    if (lastCount.current !== null && next.totalUpcoming > lastCount.current) {
      const msg = `New appointment booked. Next: ${next.next.patient.name} at ${next.next.time} (${prettyDate(next.next.date)})`
      setToast(msg)
      if (window.Notification?.permission === 'granted') new Notification('CarePoint', { body: msg })
      setTimeout(() => setToast(''), 6000)
    }
    lastCount.current = next.totalUpcoming
  }, [next])

  useEffect(() => {
    if (window.Notification?.permission === 'default') Notification.requestPermission()
  }, [])

  const setStatus = async (status) => setUser(await api('/doctors/me/status', { method: 'PATCH', body: { status } }))

  const booked = (appts || []).filter((a) => a.status === 'booked').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const finishedToday = (appts || []).filter((a) => a.status === 'finished' && a.date === dayOffset(0))
  const todayCount = booked.filter((a) => a.date === dayOffset(0)).length

  return (
    <>
      {toast && <div className="toast"><Icon name="bell" />{toast}</div>}

      <div className="page-head">
        <div>
          <h2>Hello, Dr. {user.name.split(' ')[0]}</h2>
          <p>{todayCount} patient{todayCount === 1 ? '' : 's'} waiting today · {finishedToday.length} seen</p>
        </div>
        <div className="seg">
          {STATUSES.map(([s, label]) => (
            <button key={s} className={user.status === s ? `active ${s}` : ''} onClick={() => setStatus(s)}>{label}</button>
          ))}
        </div>
      </div>
      {user.status !== 'available' && (
        <p className="error" style={{ marginBottom: 20 }}>You are on {user.status}. The assistant and nurses can't book new patients with you.</p>
      )}

      <section className="card next-card">
        <span className="icon-bubble"><Icon name="bell" size={26} /></span>
        {next?.next ? (
          <div style={{ flex: 1 }}>
            <span className="muted">Next patient</span>
            <div className="big">{next.next.patient.name} · {next.next.time}</div>
            <span className="muted">{prettyDate(next.next.date)}{next.next.reason && ` · ${next.next.reason}`}</span>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            <span className="muted">Next patient</span>
            <div className="big">No upcoming patients</div>
          </div>
        )}
        {next?.waiting > 0 && <span className="badge">{next.waiting} waiting now</span>}
        {next?.next && <button onClick={() => setFinishing(next.next)} style={{ background: '#fff', color: 'var(--primary-dark)', border: 'none' }}>Mark finished</button>}
      </section>

      <section className="card">
        <div className="card-head"><h3>Upcoming appointments</h3><span className="muted">{booked.length} total</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Patient</th><th>Reason</th><th>Source</th><th></th></tr></thead>
            <tbody>
              {booked.map((a) => (
                <tr key={a._id}>
                  <td><b>{a.time}</b><div className="muted">{prettyDate(a.date)}</div></td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="avatar">{initials(a.patient.name)}</span>
                      <div>{a.patient.name}<div className="muted">{[a.patient.age && `${a.patient.age} yrs`, a.patient.gender, a.patient.phone].filter(Boolean).join(' · ')}</div></div>
                    </div>
                  </td>
                  <td>{a.reason || '—'}</td>
                  <td><span className="badge">{a.source}</span></td>
                  <td className="actions"><button className="primary sm" onClick={() => setFinishing(a)}>Mark finished</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {booked.length === 0 && <p className="empty">Nothing booked.</p>}
      </section>

      <section className="card">
        <div className="card-head"><h3>Finished today</h3><span className="muted">{finishedToday.length}</span></div>
        {finishedToday.length === 0 && <p className="empty">No patients seen yet today.</p>}
        {finishedToday.map((a) => (
          <div key={a._id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="badge finished">done</span><b>{a.time}</b> {a.patient.name}
          </div>
        ))}
      </section>

      {finishing && <FinishDialog appt={finishing} onClose={() => setFinishing(null)} onDone={() => { setFinishing(null); reload() }} />}
    </>
  )
}

function FinishDialog({ appt, onClose, onDone }) {
  const [meds, setMeds] = useState([{ name: '', dosage: '1-0-1', days: '5' }])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const update = (i, k, v) => setMeds(meds.map((m, j) => (j === i ? { ...m, [k]: v } : m)))

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api(`/appointments/${appt._id}/finish`, { method: 'PATCH', body: { medicines: meds, notes } })
      onDone()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="card dialog" onSubmit={submit}>
        <div className="card-head">
          <h3>Finish visit — {appt.patient.name}</h3>
          <button type="button" className="ghost" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <p className="muted">Medicines are sent to the pharmacy immediately. Leave empty if none.</p>
        {meds.map((m, i) => (
          <div className="row" key={i}>
            <label style={{ flex: 2 }}>Medicine<input placeholder="e.g. Paracetamol 500mg" value={m.name} onChange={(e) => update(i, 'name', e.target.value)} /></label>
            <label>Dosage<input placeholder="1-0-1" value={m.dosage} onChange={(e) => update(i, 'dosage', e.target.value)} /></label>
            <label>Days<input value={m.days} onChange={(e) => update(i, 'days', e.target.value)} /></label>
          </div>
        ))}
        <button type="button" className="link" onClick={() => setMeds([...meds, { name: '', dosage: '1-0-1', days: '5' }])}><Icon name="plus" size={16} />Add medicine</button>
        <label>Notes<textarea placeholder="Notes for patient / pharmacy" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="primary">Finish & send prescription</button>
        </div>
      </form>
    </div>
  )
}
