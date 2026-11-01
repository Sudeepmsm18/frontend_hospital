import { useEffect, useRef, useState } from 'react'
import { api, usePoll, dayOffset, prettyDate, initials } from '../api'
import Icon from '../Icon'
import Profile from './Profile'

const TABS = [
  ['home', 'Home', 'home'],
  ['visits', 'Visits', 'calendar'],
  ['chat', 'Book', 'chat'],
  ['meds', 'Medicines', 'pill'],
  ['profile', 'Profile', 'user'],
]

const countdown = (date, time) => {
  const mins = Math.round((new Date(`${date}T${time}`) - new Date()) / 60000)
  if (mins <= 0) return 'Now'
  if (mins < 60) return `in ${mins} min`
  if (mins < 24 * 60) return `in ${Math.floor(mins / 60)}h ${mins % 60}m`
  return `in ${Math.round(mins / 1440)} days`
}
const dayNum = (d) => new Date(d + 'T00:00').getDate()
const monthShort = (d) => new Date(d + 'T00:00').toLocaleDateString(undefined, { month: 'short' })
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function PatientApp({ user, setUser, logout }) {
  const [tab, setTab] = useState('home')
  const [appts, reloadAppts] = usePoll('/appointments', 10000)
  const [rx] = usePoll('/prescriptions', 10000)
  const upcoming = (appts || []).filter((a) => a.status === 'booked').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const history = (appts || []).filter((a) => a.status !== 'booked')

  const cancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return
    await api(`/appointments/${id}/cancel`, { method: 'PATCH' })
    reloadAppts()
  }

  const titles = { home: null, visits: 'My visits', chat: null, meds: 'Medicines', profile: 'Profile' }

  return (
    <div className={`papp ${tab === 'chat' ? 'chat-mode' : ''}`}>
      {tab !== 'chat' && (
        <div className="papp-top">
          {tab === 'home' ? (
            <div>
              <span className="muted">{greeting()},</span>
              <h1>{user.name.split(' ')[0]} 👋</h1>
            </div>
          ) : <h1>{titles[tab]}</h1>}
          <span className="avatar">{initials(user.name)}</span>
        </div>
      )}

      <div className="papp-body">
        {tab === 'home' && <HomeTab upcoming={upcoming} rx={rx || []} go={setTab} />}
        {tab === 'visits' && <VisitsTab upcoming={upcoming} history={history} cancel={cancel} go={setTab} />}
        {tab === 'meds' && <MedsTab rx={rx || []} />}
        {tab === 'profile' && (
          <>
            <div className="profile-head">
              <span className="avatar lg">{initials(user.name)}</span>
              <h2>{user.name}</h2>
              <span className="muted">{user.email}</span>
            </div>
            <Profile user={user} setUser={setUser} />
            <button className="danger" onClick={logout}><Icon name="logout" size={18} />Log out</button>
          </>
        )}
        {/* Kept mounted so the conversation survives tab switches. */}
        <div className="chat-screen" style={{ display: tab === 'chat' ? 'flex' : 'none' }}>
          <Chatbot user={user} onBooked={reloadAppts} />
        </div>
      </div>

      <nav className="tabbar">
        {TABS.map(([key, label, icon]) => (
          <button key={key} className={`${tab === key ? 'active' : ''} ${key === 'chat' ? 'tab-fab' : ''}`} onClick={() => setTab(key)}>
            {key === 'chat' ? <span className="fab"><Icon name="plus" size={24} /></span> : <Icon name={icon} size={22} />}
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function HomeTab({ upcoming, rx, go }) {
  const next = upcoming[0]
  const pendingRx = rx.filter((p) => p.status === 'pending').length
  return (
    <>
      {next ? (
        <div className="hero-appt">
          <span className="label">Your next appointment</span>
          <div className="doc">
            <span className="avatar">{initials(next.doctor.name)}</span>
            <div>
              <h3>Dr. {next.doctor.name}</h3>
              <span style={{ opacity: 0.85, fontSize: '0.85rem' }}>{next.doctor.specialization}</span>
            </div>
          </div>
          <div className="when">
            <span className="chip"><Icon name="calendar" size={16} />{prettyDate(next.date)}</span>
            <span className="chip"><Icon name="clock" size={16} />{next.time}</span>
            <span className="chip">{countdown(next.date, next.time)}</span>
            {next.doctor.status !== 'available' && <span className="chip warn-chip">Doctor on {next.doctor.status}</span>}
          </div>
        </div>
      ) : (
        <div className="hero-appt hero-empty">
          <span className="label">No upcoming appointment</span>
          <h3 style={{ marginTop: 10, fontSize: '1.2rem' }}>Feeling unwell? Book a visit in under a minute.</h3>
          <button onClick={() => go('chat')}><Icon name="chat" size={18} />Chat with assistant</button>
        </div>
      )}

      <div className="quick">
        <button onClick={() => go('chat')}>
          <span className="ic"><Icon name="plus" /></span>
          Book appointment<small>Via our assistant</small>
        </button>
        <button onClick={() => go('visits')}>
          <span className="ic"><Icon name="calendar" /></span>
          My visits<small>{upcoming.length} upcoming</small>
        </button>
        <button onClick={() => go('meds')}>
          <span className="ic"><Icon name="pill" /></span>
          Medicines<small>{pendingRx ? `${pendingRx} ready at pharmacy` : 'Prescriptions'}</small>
        </button>
        <button onClick={() => go('profile')}>
          <span className="ic"><Icon name="user" /></span>
          Profile<small>Your details</small>
        </button>
      </div>

      {upcoming.length > 1 && (
        <>
          <div className="section-title"><h3>Also coming up</h3></div>
          {upcoming.slice(1, 3).map((a) => <ApptItem key={a._id} a={a} />)}
        </>
      )}
    </>
  )
}

function ApptItem({ a, action }) {
  const past = a.status !== 'booked'
  return (
    <div className="list-item">
      <div className={`date-box ${past ? 'past' : ''}`}><b>{dayNum(a.date)}</b><span>{monthShort(a.date)}</span></div>
      <div className="grow">
        <div className="title">Dr. {a.doctor.name}</div>
        <div className="muted">{a.doctor.specialization} · {a.time}</div>
        {!past && a.doctor.status !== 'available' && <span className="badge warn" style={{ marginTop: 6 }}>Doctor on {a.doctor.status}</span>}
      </div>
      {action || <span className={`badge ${a.status}`}>{a.status === 'booked' ? prettyDate(a.date) : a.status}</span>}
    </div>
  )
}

function VisitsTab({ upcoming, history, cancel, go }) {
  return (
    <>
      <div className="section-title"><h3>Upcoming</h3></div>
      {upcoming.length === 0 && (
        <div className="card empty">
          No upcoming visits.
          <button className="primary" onClick={() => go('chat')}>Book an appointment</button>
        </div>
      )}
      {upcoming.map((a) => (
        <ApptItem key={a._id} a={a} action={<button className="sm danger" onClick={() => cancel(a._id)}>Cancel</button>} />
      ))}
      <div className="section-title"><h3>History</h3></div>
      {history.length === 0 && <p className="empty">No past visits yet.</p>}
      {history.map((a) => <ApptItem key={a._id} a={a} />)}
    </>
  )
}

function MedsTab({ rx }) {
  if (!rx.length) return <div className="card empty">No prescriptions yet. They appear here after your doctor's visit.</div>
  return rx.map((p) => (
    <div key={p._id} className="card">
      <div className="card-head">
        <div>
          <div style={{ fontWeight: 700 }}>Dr. {p.doctor.name}</div>
          <span className="muted">{new Date(p.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <span className={`badge ${p.status}`}>{p.status === 'pending' ? 'Ready to collect' : 'Collected'}</span>
      </div>
      <div>
        {p.medicines.map((m, i) => (
          <div key={i} className="med">
            <Icon name="pill" size={18} style={{ color: 'var(--primary)' }} />
            <div>{m.name}<div className="muted">{m.days} days</div></div>
            <span className="dose">{m.dosage}</span>
          </div>
        ))}
      </div>
      {p.notes && <div className="note">📝 {p.notes}</div>}
    </div>
  ))
}

// A scripted (rule-based) assistant — no AI model; every reply is hardcoded below.
function Chatbot({ user, onBooked }) {
  const [messages, setMessages] = useState([])
  const [options, setOptions] = useState([])
  const [typing, setTyping] = useState(0)
  const [text, setText] = useState('')
  const endRef = useRef(null)

  const say = (from, msg) => setMessages((m) => [...m, { from, msg }])
  // Bot replies after a short "typing…" pause so the conversation feels natural.
  const bot = (msg, opts) => {
    setTyping((t) => t + 1)
    setOptions([])
    setTimeout(() => {
      setTyping((t) => t - 1)
      say('bot', msg)
      if (opts) setOptions(opts)
    }, 450)
  }

  const menu = (msg = 'What would you like to do?') =>
    bot(msg, [
      { label: '📅 Book an appointment', run: startBooking },
      { label: '🕒 My allotted time', run: showMine },
      { label: '❓ Help', run: help },
    ])

  const help = () =>
    menu('I can book a slot with a doctor and tell you your allotted time. If you have visited before, I book you with the same doctor again. Type "book" or "my slot", or use the buttons.')

  const showMine = async () => {
    const upcoming = (await api('/appointments')).filter((a) => a.status === 'booked')
    if (!upcoming.length) return menu("You don't have any upcoming appointments.")
    menu('Your upcoming appointments:\n' + upcoming.map((a) => `• ${prettyDate(a.date)} at ${a.time} with Dr. ${a.doctor.name}`).join('\n'))
  }

  const startBooking = async () => {
    const [prev, doctors] = await Promise.all([api('/appointments/previous-doctor'), api('/doctors')])
    const available = doctors.filter((d) => d.status === 'available')
    if (prev && prev.status === 'available') {
      bot(`Welcome back! You consulted Dr. ${prev.name} (${prev.specialization}) last time, so I'll book you with Dr. ${prev.name} again.`)
      return askDate(prev)
    }
    if (!available.length) return menu('Sorry, no doctors are available right now. Please try again later.')
    const intro = prev
      ? `Your previous doctor, Dr. ${prev.name}, is on ${prev.status} right now. Please choose another doctor:`
      : 'Which department do you need?'
    bot(intro, [
      ...available.map((d) => ({ label: `${d.specialization} — Dr. ${d.name}`, run: () => askDate(d) })),
      { label: '↩ Back', run: () => menu() },
    ])
  }

  const askDate = (doc) =>
    bot(`Which day would you like to see Dr. ${doc.name}?`, [
      ...[0, 1, 2].map((n) => ({ label: prettyDate(dayOffset(n)), run: () => askSlot(doc, dayOffset(n)) })),
      { label: '↩ Back', run: () => menu() },
    ])

  const askSlot = async (doc, date) => {
    const { slots, status } = await api(`/doctors/${doc._id}/slots?date=${date}`)
    if (status !== 'available') return menu(`Sorry, Dr. ${doc.name} just went on ${status}. Please try again later.`)
    if (!slots.length) {
      bot(`Dr. ${doc.name} has no free slots on ${prettyDate(date)}. Pick another day:`)
      return askDate(doc)
    }
    bot(`Free slots on ${prettyDate(date)}:`, [
      ...slots.slice(0, 12).map((t) => ({ label: t, run: () => confirmSlot(doc, date, t) })),
      { label: '↩ Other day', run: () => askDate(doc) },
    ])
  }

  const confirmSlot = (doc, date, time) =>
    bot(`Book Dr. ${doc.name} on ${prettyDate(date)} at ${time}?`, [
      { label: '✅ Yes, book it', run: () => book(doc, date, time) },
      { label: '✖ No', run: () => menu('No problem.') },
    ])

  const book = async (doc, date, time) => {
    try {
      await api('/appointments', { method: 'POST', body: { doctorId: doc._id, date, time } })
      onBooked()
      menu(`🎉 Booked! Your allotted time is ${prettyDate(date)} at ${time} with Dr. ${doc.name}. Please arrive 10 minutes early.`)
    } catch (err) {
      bot(`Sorry: ${err.message}.`)
      askSlot(doc, date)
    }
  }

  const choose = (opt) => {
    say('me', opt.label)
    setOptions([])
    opt.run()
  }

  const send = (e) => {
    e.preventDefault()
    const t = text.trim().toLowerCase()
    if (!t) return
    say('me', text)
    setText('')
    if (/book|appoint|doctor|consult/.test(t)) startBooking()
    else if (/my|slot|time|when|status/.test(t)) showMine()
    else if (/hi|hello|hey/.test(t)) menu(`Hello ${user.name}! 👋`)
    else if (/help/.test(t)) help()
    else if (/cancel/.test(t)) menu('You can cancel from the Visits tab.')
    else if (/thank/.test(t)) menu("You're welcome! Get well soon.")
    else menu("Sorry, I didn't get that. I'm a simple assistant — please pick an option.")
  }

  const greeted = useRef(false)
  useEffect(() => {
    if (greeted.current) return
    greeted.current = true
    menu(`Hi ${user.name.split(' ')[0]}! I'm the CarePoint assistant. I can book your appointment.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, options, typing])

  return (
    <>
      <div className="papp-top chat-head">
        <span className="avatar"><Icon name="heart" size={20} /></span>
        <div>
          <h3>CarePoint Assistant</h3>
          <span className="online">Online · books in seconds</span>
        </div>
      </div>
      <div className="messages">
        {messages.map((m, i) => <div key={i} className={`bubble ${m.from}`}>{m.msg}</div>)}
        {typing > 0 && <div className="typing"><i /><i /><i /></div>}
        <div className="options">
          {options.map((o) => <button key={o.label} onClick={() => choose(o)}>{o.label}</button>)}
        </div>
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="composer">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
        <button className="primary" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </>
  )
}
