import { useEffect, useRef, useState } from 'react'
import { api, usePoll, dayOffset, prettyDate, initials } from '../api'
import Icon from '../Icon'
import Profile from './Profile'
import { SYMPTOM_GROUPS, ALL_SYMPTOMS, NOT_SURE, matchDoctors, plain } from '../symptoms'
import { DURATIONS, pick, typingDelay, onDay, understand, matchOption, findDoctorNamed, nearest, slotsFor, parseTime, parseDurationAnswer } from '../chatbrain'
import { classify } from '../intents'

const EMERGENCY = 'This could be serious. If it is severe or sudden, call an ambulance (108 / 112) or go to the hospital Emergency department right now. Do not wait for an appointment.'
// Shortcuts shown on Home: the most common concerns plus two serious ones, with short tile names.
const QUICK_SYMPTOMS = ['Fever', 'Cold', 'Cough', 'Headache', 'Stomach', 'Skin', 'Joint', 'Tooth', 'Chest pain', 'Breathing'].map((w) => ({
  ...ALL_SYMPTOMS.find((s) => s.label.includes(w)),
  short: { Joint: 'Joint pain', Tooth: 'Toothache' }[w] || w,
}))

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
  const [intent, setIntent] = useState(null) // symptom tapped on Home → handed to the chatbot
  const startWith = (symptom) => {
    setIntent({ symptom, at: Date.now() })
    setTab('chat')
  }
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
        {tab === 'home' && <HomeTab upcoming={upcoming} rx={rx || []} go={setTab} startWith={startWith} />}
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
          <Chatbot user={user} onBooked={reloadAppts} intent={intent} />
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

function HomeTab({ upcoming, rx, go, startWith }) {
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

      <div className="section-title">
        <h3>What's troubling you?</h3>
        <button className="link" onClick={() => go('chat')}>See all</button>
      </div>
      <div className="symptom-grid">
        {QUICK_SYMPTOMS.map((s) => (
          <button key={s.label} className={s.level === 'emergency' ? 'serious' : ''} onClick={() => startWith(s)} title={plain(s.label)}>
            <span className="emoji">{s.label.split(' ')[0]}</span>
            {s.short}
          </button>
        ))}
      </div>

      <div className="section-title"><h3>Quick actions</h3></div>
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

// A scripted (rule-based) assistant — no AI service; every reply is hardcoded below.
// chatbrain.js pulls the symptom, day, time and doctor out of whatever the patient types, and intents.js
// (a small classifier trained on example messages) works out what they want.
function Chatbot({ user, onBooked, intent }) {
  const [messages, setMessages] = useState([])
  const [options, setOptions] = useState([])
  const [typing, setTyping] = useState(0)
  const [text, setText] = useState('')
  const endRef = useRef(null)
  const queue = useRef(0) // when the last queued bot message will appear
  // The booking in progress, so typed follow-ups like "make it Friday" or "any slot at 5pm?" fit in.
  const draft = useRef({})
  // The question on screen: how to read a typed answer to it (`handle`, `yes`, `no`) and how to re-ask it.
  const asking = useRef(null)
  const first = user.name.split(' ')[0]

  const say = (from, msg) => setMessages((m) => [...m, { from, msg }])
  // Bot replies after a "typing…" pause that grows with the message, in the order they were sent.
  // `ask` says how to understand a typed reply to this message instead of tapping an option.
  const bot = (msg, opts, ask) => {
    setTyping((t) => t + 1)
    setOptions([])
    if (opts) asking.current = ask ? { ...ask, opts } : null
    const at = Math.max(Date.now(), queue.current) + typingDelay(msg)
    queue.current = at
    setTimeout(() => {
      setTyping((t) => t - 1)
      say('bot', msg)
      if (opts) setOptions(opts)
    }, at - Date.now())
  }
  // A yes/no question: typed "yes", "haan", "sure" or "no", "nahi" work like the buttons.
  const confirm = (msg, yes, no, extra) =>
    bot(msg, [{ label: yes.label, run: yes.run }, { label: no.label, run: no.run }], { yes: yes.run, no: no.run, hint: 'Please answer yes or no.', ...extra })

  const back = { label: '↩ Main menu', run: () => menu() }

  const menu = (msg = pick('What would you like to do?', 'Anything else I can help with?', 'What can I do for you?')) => {
    draft.current = {}
    bot(msg, [
      { label: '📅 Book an appointment', run: startBooking },
      { label: '🕒 My allotted time', run: showMine },
      { label: '🔁 Reschedule', run: rescheduleFlow },
      { label: '❌ Cancel an appointment', run: cancelFlow },
      { label: '👨‍⚕️ Find a doctor', run: findDoctor },
      { label: '💊 My medicines', run: showMedicines },
      { label: '🚨 Emergency help', run: () => menu(`🚨 ${EMERGENCY}`) },
    ])
  }

  const help = () =>
    menu('Just tell me in your own words, e.g. "fever since 2 days, can I come tomorrow at 5pm?", "2 din se bukhar hai, kal subah", "move my appointment to Friday" or "book Dr. Rao on Monday morning". I will suggest the right doctor and show free slots. If you have visited before, I book you with the same doctor again when they can treat it.')

  const upcomingAppts = async () => (await api('/appointments')).filter((a) => a.status === 'booked' && a.doctor).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const apptLabel = (a) => `${prettyDate(a.date)} ${a.time} · Dr. ${a.doctor.name}`
  // Picking one of their appointments by typing its day or doctor ("the friday one", "Dr. Rao").
  const pickAppt = (list, then) => (h, typed) => {
    const t = typed.toLowerCase()
    const found = list.filter((a) => (h.date && a.date === h.date) || a.doctor.name.toLowerCase().split(' ').some((n) => n.length > 2 && t.includes(n)))
    if (found.length !== 1) return false
    then(found[0])
    return true
  }

  const showMine = async () => {
    const upcoming = await upcomingAppts()
    if (!upcoming.length) return menu(pick("You don't have any upcoming appointments. Want to book one?", "You're all clear, no upcoming appointments. Shall I book one?"))
    menu(pick('Your upcoming appointments:', "Here's what you have coming up:") + '\n' + upcoming.map((a) => `• ${prettyDate(a.date)} at ${a.time} with Dr. ${a.doctor.name}${a.reason ? ` (${a.reason})` : ''}`).join('\n'))
  }

  const cancelFlow = async () => {
    const upcoming = await upcomingAppts()
    if (!upcoming.length) return menu('You have no appointments to cancel.')
    const ask = (a) =>
      confirm(`Cancel your ${prettyDate(a.date)} ${a.time} appointment with Dr. ${a.doctor.name}?`,
        { label: '✅ Yes, cancel it', run: async () => {
          await api(`/appointments/${a._id}/cancel`, { method: 'PATCH' })
          onBooked()
          menu(pick('Your appointment has been cancelled.', 'Done, that appointment is cancelled.'))
        } },
        { label: '✖ Keep it', run: () => menu('Okay, I kept your appointment.') })
    if (upcoming.length === 1) return ask(upcoming[0])
    bot('Which appointment do you want to cancel?', [...upcoming.map((a) => ({ label: apptLabel(a), run: () => ask(a) })), back],
      { handle: pickAppt(upcoming, ask), hint: 'Tap the appointment, or tell me its day or doctor.' })
  }

  // Moving an appointment: pick the new day and time with the same doctor; the old one is cancelled once the new one is booked.
  const rescheduleFlow = async (wanted = {}) => {
    const upcoming = await upcomingAppts()
    if (!upcoming.length) return menu("You don't have any upcoming appointments to move. Want to book a new one?")
    const move = (a) => {
      draft.current = { replacing: a, planDate: wanted.date, want: wanted.want }
      bot(pick(`Sure, let's find a new time with Dr. ${a.doctor.name}.`, `No problem, I'll move your visit with Dr. ${a.doctor.name}.`))
      askDate(a.doctor, { reason: a.reason })
    }
    if (upcoming.length === 1) return move(upcoming[0])
    bot('Which appointment do you want to move?', [...upcoming.map((a) => ({ label: apptLabel(a), run: () => move(a) })), back],
      { handle: pickAppt(upcoming, move), hint: 'Tap the appointment, or tell me its day or doctor.' })
  }

  const showMedicines = async (typed = '') => {
    const rx = await api('/prescriptions')
    const pending = rx.filter((p) => p.status === 'pending')
    const advice = /\b(should|which|what)\b.*\b(take|medicine|tablet)/.test(typed) ? "\nI can't advise on medicines myself; please ask your doctor or the pharmacist." : ''
    if (!rx.length) return menu("You don't have any prescriptions yet. They show up here after a doctor's visit." + advice)
    if (!pending.length) return menu('All your prescriptions have been collected. You can see them in the Medicines tab.' + advice)
    menu(
      `${pending.length === 1 ? 'One prescription is' : `${pending.length} prescriptions are`} ready to collect at the pharmacy:\n` +
        pending.flatMap((p) => p.medicines.map((m) => `• ${m.name}, ${m.dosage}, ${m.days} days (Dr. ${p.doctor.name})`)).join('\n') + advice
    )
  }

  const findDoctor = async () => {
    const doctors = await api('/doctors')
    if (!doctors.length) return menu('No doctors have been added yet. Please check back later.')
    const icon = { available: '🟢', break: '☕', leave: '🏖' }
    const available = doctors.filter((d) => d.status === 'available')
    bot(
      'Our doctors:\n' + doctors.map((d) => `${icon[d.status]} Dr. ${d.name} — ${d.specialization || 'General'} · ${d.startTime}–${d.endTime}${d.status !== 'available' ? ` (on ${d.status})` : ''}`).join('\n'),
      [...available.map((d) => ({ label: `Book Dr. ${d.name}`, run: () => askDate(d, {}) })), back],
      { handle: pickDoctor(available, (d) => askDate(d, {})), hint: 'Tap a doctor, or type their name.' }
    )
  }
  // A doctor from the list on screen, typed with or without "Dr." ("Rao", "dr mehta").
  const pickDoctor = (list, then) => (h, typed) => {
    const words = typed.toLowerCase().match(/[a-z]{3,}/g) || []
    const doc = words.map((w) => findDoctorNamed(w, list)).find(Boolean)
    if (!doc) return false
    then(doc)
    return true
  }

  // A doctor asked for by name, e.g. "book Dr. Rao tomorrow".
  const bookNamed = async (name) => {
    const doc = findDoctorNamed(name, await api('/doctors'))
    if (!doc) {
      bot(`I couldn't find a Dr. ${name[0].toUpperCase() + name.slice(1)} here.`)
      return findDoctor()
    }
    if (doc.status !== 'available') {
      bot(`Dr. ${doc.name} is on ${doc.status} right now. Here's who else can see you:`)
      return findDoctor()
    }
    bot(pick(`Sure, let's book you with Dr. ${doc.name}.`, `Dr. ${doc.name}, got it.`))
    askDate(doc, {})
  }

  // Step 1: what's wrong — category, then the specific symptom.
  const symptomAsk = { hint: 'Tell me the problem in your own words (e.g. "fever", "back pain", "pet dard") or pick a category.' }
  const startBooking = () =>
    bot(
      draft.current.planDate || draft.current.want
        ? pick("Sure, I'll keep that time in mind. First, what's troubling you?", "Got it. Before I check slots, what's troubling you?")
        : pick("What's troubling you today? Pick a category or just describe it:", "Tell me what's bothering you, or pick a category:"),
      [
        ...SYMPTOM_GROUPS.map((g) => ({ label: g.label, run: () => askSymptom(g) })),
        { label: NOT_SURE.label, run: () => askDuration(NOT_SURE) },
        back,
      ],
      symptomAsk
    )

  const askSymptom = (group) =>
    bot('Which of these best describes it?', [
      ...group.items.map((s) => ({ label: s.label, run: () => pickSymptom(s) })),
      { label: '↩ Other category', run: startBooking },
    ], symptomAsk)

  const pickSymptom = (s) => {
    if (s.level === 'emergency') {
      return confirm(`🚨 ${EMERGENCY}`,
        { label: '📅 I understand, book a visit', run: () => askDuration(s) },
        { label: '↩ Main menu', run: () => menu() },
        { hint: 'If it is severe, please call 108 / 112 now. Otherwise say "book" and I will find a doctor.' })
    }
    if (s.level === 'urgent') bot(pick('⚠️ This should be checked soon. Please try to see a doctor today.', '⚠️ Please get this looked at today if you can.'))
    askDuration(s)
  }

  // Step 2: how long — skipped if they already said ("fever since 3 days").
  const askDuration = (symptom) => {
    if (draft.current.duration) return chooseDoctor({ symptom, duration: draft.current.duration })
    bot(
      pick('How long have you had this?', 'Since when has this been going on?', 'How long has it been bothering you?'),
      DURATIONS.map((d) => ({ label: d, run: () => chooseDoctor({ symptom, duration: d }) })),
      {
        hint: 'Roughly how long? e.g. "since yesterday", "4-5 days", "a week" or "2 din".',
        handle: (h, typed) => {
          const duration = h.duration || parseDurationAnswer(typed)
          if (!duration) return false
          draft.current.planDate ||= h.date
          draft.current.want ||= h.want
          chooseDoctor({ symptom, duration })
          return true
        },
      }
    )
  }

  // Step 3: the right doctor — one they asked for, else the previous one if they suit this problem.
  const chooseDoctor = async (visit) => {
    if (visit.duration === DURATIONS[3]) bot(pick("That's been a while, so it's good you're getting it checked.", 'Over two weeks is definitely worth a doctor looking at.'))
    const [prev, doctors] = await Promise.all([api('/appointments/previous-doctor'), api('/doctors')])
    const available = doctors.filter((d) => d.status === 'available')
    if (!available.length) return menu('Sorry, no doctors are available right now. Please try again later.')

    const named = draft.current.named && findDoctorNamed(draft.current.named, doctors)
    draft.current.named = null
    if (named?.status === 'available') {
      bot(`Sure, I'll book you with Dr. ${named.name}.`)
      return askDate(named, visit)
    }
    if (named) bot(`Dr. ${named.name} is on ${named.status} right now, so let me suggest someone else.`)

    const match = matchDoctors(visit.symptom, available)
    const prevAvailable = prev && available.find((d) => d._id === prev._id)
    if (prevAvailable && match.doctors.some((d) => d._id === prev._id)) {
      bot(`Welcome back! You consulted Dr. ${prev.name} (${prev.specialization}) before, and they can help with this, so I'll book you with Dr. ${prev.name} again.`)
      return askDate(prevAvailable, visit)
    }

    const wanted = visit.symptom.dept[0].name
    const intro = match.exact
      ? `These ${match.dept} doctors can help with ${plain(visit.symptom.label).toLowerCase()}:`
      : match.dept
        ? `We don't have a ${wanted} specialist available right now, but our ${match.dept} can see you first:`
        : `We don't have a ${wanted} specialist available right now. Any of these doctors can see you first:`
    const note = prev && !prevAvailable ? `\n(Your previous doctor, Dr. ${prev.name}, is on ${prev.status} right now.)` : ''
    const choices = [...match.doctors, ...(prevAvailable && !match.doctors.includes(prevAvailable) ? [prevAvailable] : [])]
    // Only one suitable doctor: no need to make them pick.
    if (choices.length === 1) {
      const only = choices[0]
      bot((match.exact ? `Dr. ${only.name} (${only.specialization}) can help with ${plain(visit.symptom.label).toLowerCase()}.` : intro.replace(/:$/, '') + `: Dr. ${only.name} (${only.specialization}).`) + note)
      return askDate(only, visit)
    }
    bot(intro + note, [
      ...match.doctors.map((d) => ({ label: `Dr. ${d.name} — ${d.specialization}`, run: () => askDate(d, visit) })),
      ...(prevAvailable && !match.doctors.includes(prevAvailable) ? [{ label: `My previous doctor, Dr. ${prev.name}`, run: () => askDate(prevAvailable, visit) }] : []),
      back,
    ], { handle: pickDoctor(choices, (d) => askDate(d, visit)), hint: 'Tap a doctor, or type their name.' })
  }

  // Step 4: day and slot — skipped or narrowed down if they already said when.
  const askDate = (doc, visit) => {
    const d = Object.assign(draft.current, { doc, visit })
    if (d.planDate) {
      const date = d.planDate
      d.planDate = null
      return askSlot(doc, date, visit)
    }
    bot(pick(`Which day would you like to see Dr. ${doc.name}?`, `When would you like to come in to see Dr. ${doc.name}?`), [
      ...[0, 1, 2, 3, 4].map((n) => ({ label: prettyDate(dayOffset(n)), run: () => askSlot(doc, dayOffset(n), visit) })),
      back,
    ], {
      hint: 'Which day suits you? e.g. "tomorrow", "Friday", "kal" or "the 15th".',
      handle: (h) => {
        if (!h.date) return false
        d.want = h.want
        askSlot(doc, h.date, visit)
        return true
      },
    })
  }

  const askSlot = async (doc, date, visit) => {
    const d = Object.assign(draft.current, { doc, visit, date })
    const want = d.want
    d.want = null
    const { slots, status } = await api(`/doctors/${doc._id}/slots?date=${date}`)
    if (status !== 'available') return menu(`Sorry, Dr. ${doc.name} just went on ${status}. Please try again later.`)
    if (!slots.length) {
      d.want = want // keep "at 5pm" for the next day they pick
      bot(`Dr. ${doc.name} has no free slots ${onDay(date)}. Pick another day:`)
      return askDate(doc, visit)
    }
    const times = (list) => list.map((t) => ({ label: t, run: () => confirmSlot(doc, date, t, visit) }))
    const others = [{ label: '🕒 Show all times', run: () => askSlot(doc, date, visit) }, { label: '↩ Other day', run: () => askDate(doc, visit) }]
    // Typed "10:30", "5pm", "after 4", "evening" or another day while the slots are showing.
    const ask = {
      hint: 'Which time? e.g. "10:30", "5pm", "after 4" or "evening". Or name another day.',
      handle: (h, typed) => {
        const next = h.want || parseTime(typed.toLowerCase(), true)
        if (!next && !h.date) return false
        d.want = next
        askSlot(doc, h.date || date, visit)
        return true
      },
    }

    if (want?.time) {
      if (slots.includes(want.time)) {
        bot(pick(`Good news, ${want.time} is free ${onDay(date)}.`, `${want.time} ${onDay(date)} is available.`))
        return confirmSlot(doc, date, want.time, visit)
      }
      return bot(`Sorry, ${want.time} isn't free ${onDay(date)}. The closest times are:`, [...times(nearest(slots, want.time, 4)), ...others], ask)
    }
    const fit = slotsFor(slots, want)
    if (fit?.length === 1 && (want.first || want.last)) {
      bot(`The ${want.first ? 'earliest' : 'latest'} free time ${onDay(date)} is ${fit[0]}.`)
      return confirmSlot(doc, date, fit[0], visit)
    }
    if (fit?.length) return bot(pick(`Here are the times that fit ${onDay(date)}:`, `These work ${onDay(date)}:`), [...times(fit.slice(0, 16)), ...others], ask)
    bot(
      fit ? `Dr. ${doc.name} has nothing free at that time ${onDay(date)}, but these are open:` : pick(`Free slots ${onDay(date)}:`, `Here's what's open ${onDay(date)}:`),
      [...times(slots.slice(0, 16)), others[1]],
      ask
    )
  }

  const reasonOf = (visit) => (visit.symptom ? `${plain(visit.symptom.label)} · ${visit.duration}` : visit.reason || '')

  const confirmSlot = (doc, date, time, visit) =>
    bot(`${pick('Please confirm:', 'Just to confirm:')}\n👨‍⚕️ Dr. ${doc.name} (${doc.specialization})\n📅 ${prettyDate(date)} at ${time}${reasonOf(visit) ? `\n🩺 ${reasonOf(visit)}` : ''}`, [
      { label: '✅ Yes, book it', run: () => book(doc, date, time, visit) },
      { label: '🕒 Pick another time', run: () => askSlot(doc, date, visit) },
      { label: '✖ Cancel', run: () => menu('No problem.') },
    ], {
      yes: () => book(doc, date, time, visit),
      no: () => menu('No problem, I have not booked it.'),
      hint: 'Shall I book it? Say yes or no, or tell me a different day or time.',
      handle: (h) => {
        if (!h.date && !h.want) return false
        draft.current.want = h.want
        askSlot(doc, h.date || date, visit)
        return true
      },
    })

  const book = async (doc, date, time, visit) => {
    const { replacing } = draft.current
    try {
      // The server allows one booking per doctor per day, so a same-day move frees the old slot first.
      if (replacing && replacing.date === date) await api(`/appointments/${replacing._id}/cancel`, { method: 'PATCH' })
      await api('/appointments', { method: 'POST', body: { doctorId: doc._id, date, time, reason: reasonOf(visit) } })
      if (replacing && replacing.date !== date) await api(`/appointments/${replacing._id}/cancel`, { method: 'PATCH' })
      onBooked()
      if (replacing) return menu(`🔁 Done! I moved your appointment with Dr. ${doc.name} to ${prettyDate(date)} at ${time}.`)
      menu(
        pick('🎉 Booked!', "🎉 You're all set!", '🎉 Done!') +
          ` Your allotted time is ${prettyDate(date)} at ${time} with Dr. ${doc.name}. Please arrive 10 minutes early.` +
          (visit.symptom ? pick(' Hope you feel better soon.', ' Take care until then.', '') : '')
      )
    } catch (err) {
      bot(`Sorry: ${err.message}.`)
      askSlot(doc, date, visit)
    }
  }

  const choose = (opt) => {
    say('me', opt.label)
    setOptions([])
    opt.run()
  }

  const send = (e) => {
    e.preventDefault()
    const typed = text.trim()
    if (!typed) return
    say('me', typed)
    setText('')
    const t = typed.toLowerCase()
    const heard = understand(typed)
    const meant = classify(typed)?.intent
    const ask = asking.current
    const d = draft.current
    const run = (fn) => {
      setOptions([])
      asking.current = null
      fn()
    }

    // A serious symptom comes before anything else.
    if (heard.symptom?.level === 'emergency' && heard.sure) return run(() => pickSymptom(heard.symptom))
    // Typed a button's text ("tomorrow", "10:30"), or answered the yes/no question on screen.
    const opt = matchOption(typed, options)
    if (opt) return run(opt.run)
    // An answer to the question on screen ("4 to 5 days", "Friday", "after 5", "Dr. Rao"). Checked before
    // yes/no so "no, make it Friday" moves the booking instead of dropping it.
    if (ask?.handle && !(heard.symptom && heard.sure && !d.doc)) {
      setOptions([])
      if (ask.handle(heard, typed)) return
    }
    if (ask?.yes && meant === 'affirm') return run(ask.yes)
    if (ask?.no && meant === 'deny') return run(ask.no)

    if (heard.symptom) {
      draft.current = { duration: heard.duration, planDate: heard.date, want: heard.want, named: heard.named }
      const name = plain(heard.symptom.label).toLowerCase()
      if (!heard.sure) {
        return confirm(pick(`Did you mean ${name}?`, `Just to check, is it ${name}?`),
          { label: '✅ Yes', run: () => pickSymptom(heard.symptom) },
          { label: '✖ No, something else', run: startBooking })
      }
      bot(pick(`I'm sorry to hear that. Let's get you seen for ${name}.`, `Got it, let's find the right doctor for ${name}.`, `Thanks for telling me. I'll help you get seen for ${name}.`))
      return pickSymptom(heard.symptom)
    }

    // Changing the day or time mid-booking, e.g. "make it Friday" or "anything in the evening?"
    if (d.doc && (heard.date || heard.want) && meant !== 'reschedule' && meant !== 'cancel') {
      d.want = heard.want
      const date = heard.date || d.date
      return date ? askSlot(d.doc, date, d.visit) : askDate(d.doc, d.visit)
    }
    if (heard.named && meant !== 'cancel' && meant !== 'reschedule') {
      draft.current = { planDate: heard.date, want: heard.want }
      return bookNamed(heard.named)
    }

    if (/\b(emergency|ambulance)\b/.test(t) || meant === 'emergency') return menu(`🚨 ${EMERGENCY}`)
    switch (meant) {
      case 'cancel': return cancelFlow()
      case 'reschedule': return rescheduleFlow({ date: heard.date, want: heard.want })
      case 'my_appointments': return showMine()
      case 'find_doctor': return findDoctor()
      case 'medicines': return showMedicines(t)
      case 'fees': return menu('Consultation fees are paid at the hospital reception, and they can help with insurance too. Shall I book a visit for you?')
      case 'worried': return menu("I understand, that's worrying. Tell me what you're feeling and I'll get you to the right doctor quickly. If it's severe or sudden, call 108 / 112.")
      case 'feeling_better': return menu(pick(`That's great to hear, ${first}! 😊`, 'Glad you are feeling better!') + ' If you no longer need your appointment, I can cancel it for you.')
      case 'how_are_you': return menu(pick("I'm doing well, thanks for asking! How are you feeling?", 'All good here, thanks! How can I help you today?'))
      case 'who_are_you': return menu("I'm CarePoint's virtual assistant, not a person, but I can book, move, check or cancel appointments for you any time.")
      case 'greeting': return menu(pick(`Hello ${first}! 👋 How can I help?`, `Hi ${first}! How are you feeling today?`))
      case 'help': return help()
      case 'thanks': return menu(pick("You're welcome! Get well soon.", 'Happy to help, take care!', `Anytime, ${first}. Feel better soon!`))
      case 'bye': return menu(pick(`Take care, ${first}! I'm here if you need anything.`, 'Bye for now, get well soon!'))
    }
    if (meant === 'book' || heard.date || heard.want) {
      draft.current = { planDate: heard.date, want: heard.want, duration: heard.duration }
      return startBooking()
    }
    if (meant === 'affirm' || meant === 'deny') return menu(pick('👍 Anything else I can help with?', 'Alright. Anything else?'))
    // Didn't understand: ask the same question again rather than jumping back to the menu.
    if (ask) return bot(pick("Sorry, I didn't quite get that. ", "Hmm, I'm not sure I understood. ") + ask.hint, ask.opts, ask)
    menu(pick(
      "Sorry, I didn't quite get that. You can tell me a symptom like \"fever for 2 days\", a doctor's name, or pick an option.",
      "Hmm, I'm not sure I understood. Try something like \"cough since yesterday, tomorrow evening\" or tap an option below."
    ))
  }

  const greeted = useRef(false)
  useEffect(() => {
    if (greeted.current) return
    greeted.current = true
    menu(`${greeting()}, ${first}! I'm the CarePoint assistant. Tell me what's bothering you and when you'd like to come in, and I'll book it.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A symptom tapped on the Home screen jumps straight into the booking flow.
  const handledIntent = useRef(null)
  useEffect(() => {
    if (!intent || handledIntent.current === intent.at) return
    handledIntent.current = intent.at
    say('me', intent.symptom.label)
    draft.current = {}
    pickSymptom(intent.symptom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

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
