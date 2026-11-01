import { useEffect, useState } from 'react'
import { api, usePoll, dayOffset, prettyDate, initials } from '../api'
import Icon from '../Icon'

export default function NurseHome() {
  const [date, setDate] = useState(dayOffset(0))
  const [appts, reloadAppts] = usePoll(`/appointments?date=${date}`, 5000)
  const [doctors, reloadDoctors] = usePoll('/doctors', 10000)

  const cancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return
    await api(`/appointments/${id}/cancel`, { method: 'PATCH' })
    reloadAppts()
  }
  const setStatus = async (id, status) => {
    await api(`/doctors/${id}/status`, { method: 'PATCH', body: { status } })
    reloadDoctors()
  }

  const waiting = (appts || []).filter((a) => a.status === 'booked').length
  return (
    <>
      <div className="page-head">
        <div>
          <h2>Front desk</h2>
          <p>Book walk-in patients, manage today's appointments and doctor availability.</p>
        </div>
      </div>
      <div className="grid">
        <WalkInBooking doctors={doctors || []} onBooked={reloadAppts} />
        <section className="card">
          <div className="card-head"><h3>Doctors</h3><span className="muted">{doctors?.filter((d) => d.status === 'available').length ?? 0} available</span></div>
          <div className="table-wrap">
            <table>
              <tbody>
                {doctors?.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="avatar">{initials(d.name)}</span>
                        <div>Dr. {d.name}<div className="muted">{d.specialization} · {d.startTime}–{d.endTime}</div></div>
                      </div>
                    </td>
                    <td style={{ width: 140 }}>
                      <select value={d.status} onChange={(e) => setStatus(d._id, e.target.value)} className={d.status}>
                        <option value="available">Available</option><option value="break">Break</option><option value="leave">Leave</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section className="card">
        <div className="card-head">
          <h3>Appointments · {prettyDate(date)} <span className="muted">({waiting} waiting)</span></h3>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 180 }} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Source</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {appts?.map((a) => (
                <tr key={a._id}>
                  <td><b>{a.time}</b></td>
                  <td>{a.patient.name}<div className="muted">{a.patient.phone}</div></td>
                  <td>Dr. {a.doctor.name}<div className="muted">{a.doctor.specialization}</div></td>
                  <td><span className="badge">{a.source}</span></td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td className="actions">{a.status === 'booked' && <button className="sm danger" onClick={() => cancel(a._id)}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {appts?.length === 0 && <p className="empty">No appointments on {prettyDate(date)}.</p>}
      </section>
    </>
  )
}

function WalkInBooking({ doctors, onBooked }) {
  const [patients, setPatients] = useState([])
  const [isNew, setIsNew] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', age: '', gender: '' })
  const [form, setForm] = useState({ patientId: '', doctorId: '', date: dayOffset(0), time: '', reason: '' })
  const [slots, setSlots] = useState([])
  const [msg, setMsg] = useState(null)

  useEffect(() => { api('/patients').then(setPatients) }, [])
  useEffect(() => {
    if (!form.doctorId) return
    api(`/doctors/${form.doctorId}/slots?date=${form.date}`).then((r) => setSlots(r.slots))
  }, [form.doctorId, form.date])

  const freeSlots = form.doctorId ? slots : []

  // Changing doctor or day invalidates the chosen slot.
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value, ...((k === 'doctorId' || k === 'date') && { time: '' }) })
  const setNP = (k) => (e) => setNewPatient({ ...newPatient, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      let patientId = form.patientId
      if (isNew) {
        const p = await api('/patients', { method: 'POST', body: newPatient })
        setPatients([...patients, p])
        patientId = p._id
      }
      const a = await api('/appointments', { method: 'POST', body: { ...form, patientId } })
      setMsg({ ok: true, text: `Booked ${a.patient.name} with Dr. ${a.doctor.name} at ${a.time} (${prettyDate(a.date)})` })
      setForm({ ...form, patientId: '', time: '', reason: '' })
      setNewPatient({ name: '', phone: '', age: '', gender: '' })
      setIsNew(false)
      onBooked()
      setSlots((s) => s.filter((t) => t !== a.time))
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head"><h3>Book for walk-in patient</h3><Icon name="plus" style={{ color: 'var(--primary)' }} /></div>
      <div className="seg">
        <button type="button" className={!isNew ? 'active' : ''} onClick={() => setIsNew(false)}>Existing patient</button>
        <button type="button" className={isNew ? 'active' : ''} onClick={() => setIsNew(true)}>New patient</button>
      </div>
      {isNew ? (
        <>
          <div className="row">
            <label>Full name<input value={newPatient.name} onChange={setNP('name')} required /></label>
            <label>Mobile<input type="tel" value={newPatient.phone} onChange={setNP('phone')} required /></label>
          </div>
          <div className="row">
            <label>Age<input type="number" value={newPatient.age} onChange={setNP('age')} /></label>
            <label>Gender
              <select value={newPatient.gender} onChange={setNP('gender')}>
                <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
              </select>
            </label>
          </div>
          <p className="muted">They can log in later with &lt;mobile digits&gt;@walkin.carepoint and password <code>password123</code>.</p>
        </>
      ) : (
        <label>Patient
          <select value={form.patientId} onChange={set('patientId')} required>
            <option value="">Select patient</option>
            {patients.map((p) => <option key={p._id} value={p._id}>{p.name} · {p.phone}</option>)}
          </select>
        </label>
      )}
      <label>Doctor
        <select value={form.doctorId} onChange={set('doctorId')} required>
          <option value="">Select doctor</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id} disabled={d.status !== 'available'}>
              Dr. {d.name} — {d.specialization}{d.status !== 'available' ? ` (${d.status})` : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <label>Day
          <select value={form.date} onChange={set('date')}>
            {[0, 1, 2].map((n) => <option key={n} value={dayOffset(n)}>{prettyDate(dayOffset(n))}</option>)}
          </select>
        </label>
        <label>Slot
          <select value={form.time} onChange={set('time')} required>
            <option value="">{form.doctorId ? (freeSlots.length ? 'Select slot' : 'No free slots') : 'Pick doctor first'}</option>
            {freeSlots.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>
      <label>Reason (optional)<input value={form.reason} onChange={set('reason')} /></label>
      <button className="primary">Book appointment</button>
      {msg && <p className={msg.ok ? 'success' : 'error'}>{msg.text}</p>}
    </form>
  )
}
