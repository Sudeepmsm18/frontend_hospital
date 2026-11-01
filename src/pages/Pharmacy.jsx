import { api, usePoll } from '../api'
import Icon from '../Icon'

export default function PharmacyHome() {
  const [rx, reload] = usePoll('/prescriptions', 3000)
  const pending = (rx || []).filter((p) => p.status === 'pending')
  const dispensed = (rx || []).filter((p) => p.status === 'dispensed')

  const dispense = async (id) => {
    await api(`/prescriptions/${id}/dispense`, { method: 'PATCH' })
    reload()
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Pharmacy</h2>
          <p>New prescriptions from doctors appear here automatically.</p>
        </div>
      </div>
      <div className="tiles">
        <div className="card tile warn"><div><span className="muted">Pending</span><b>{pending.length}</b></div><span className="tile-icon"><Icon name="pill" /></span></div>
        <div className="card tile"><div><span className="muted">Dispensed</span><b>{dispensed.length}</b></div><span className="tile-icon"><Icon name="heart" /></span></div>
      </div>

      <section className="card">
        <h3>Pending prescriptions</h3>
        {pending.length === 0 && <p className="empty">All caught up 🎉</p>}
        <div className="rx-grid">
          {pending.map((p) => (
            <div key={p._id} className="rx">
              <div className="card-head">
                <div>
                  <b>{p.patient.name}</b>
                  <div className="muted">{[p.patient.age && `${p.patient.age} yrs`, p.patient.phone].filter(Boolean).join(' · ')}</div>
                </div>
                <span className="badge pending">pending</span>
              </div>
              <div className="muted">Dr. {p.doctor.name} · {new Date(p.createdAt).toLocaleString()}</div>
              <table>
                <thead><tr><th>Medicine</th><th>Dosage</th><th>Days</th></tr></thead>
                <tbody>{p.medicines.map((m, i) => <tr key={i}><td>{m.name}</td><td>{m.dosage}</td><td>{m.days}</td></tr>)}</tbody>
              </table>
              {p.notes && <div className="note">📝 {p.notes}</div>}
              <button className="primary" onClick={() => dispense(p._id)}>Mark as dispensed</button>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>Dispensed</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Patient</th><th>Medicines</th><th>Doctor</th><th>Dispensed at</th></tr></thead>
            <tbody>
              {dispensed.map((p) => (
                <tr key={p._id}>
                  <td>{p.patient.name}</td>
                  <td>{p.medicines.map((m) => m.name).join(', ')}</td>
                  <td>Dr. {p.doctor.name}</td>
                  <td className="muted">{new Date(p.dispensedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dispensed.length === 0 && <p className="empty">Nothing dispensed yet.</p>}
      </section>
    </>
  )
}
