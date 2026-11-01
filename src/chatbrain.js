// Free-text understanding for the scripted assistant — no AI model, just small parsers that pull
// a symptom, how long, which day, what time and which doctor out of whatever the patient types.
import { ALL_SYMPTOMS, findSymptom } from './symptoms'
import { dayOffset, prettyDate } from './api'

export const DURATIONS = ['Since today', '2–3 days', 'About a week', 'More than 2 weeks']

// One of several phrasings, so the bot doesn't repeat itself word for word.
export const pick = (...lines) => lines[Math.floor(Math.random() * lines.length)]

// Typing pause that grows with the reply, like a person typing (0.5–1.6 s).
export const typingDelay = (msg = '') => Math.min(1600, 450 + msg.length * 8)

// "today" / "tomorrow" / "on Fri, 6 Nov" — reads naturally mid-sentence.
export const onDay = (date) => {
  const p = prettyDate(date)
  return p === 'Today' || p === 'Tomorrow' ? p.toLowerCase() : `on ${p}`
}

// Edit distance, for catching typos such as "feever" or "hedache".
const distance = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = cur
    }
  }
  return row[b.length]
}
// Keywords can be word starts ("diarr"), so also compare against the same-length start of the word.
const near = (word, k) => Math.min(distance(word, k), distance(word.slice(0, k.length), k)) <= (k.length >= 8 ? 2 : 1)
// Everyday words that sit one typo away from a symptom keyword ("fewer" → fever).
const COMMON = new Set(['fewer', 'never', 'tried', 'where', 'there', 'these', 'those', 'three', 'store', 'shine', 'bread', 'steep', 'sheep', 'couch', 'token'])
const BY_SEVERITY = [...ALL_SYMPTOMS].sort((a, b) => (b.level === 'emergency') - (a.level === 'emergency'))

// An exact keyword match is `sure`; a typo match is not, so the bot asks "did you mean…?" first.
export const guessSymptom = (text) => {
  const exact = findSymptom(text)
  if (exact) return { symptom: exact, sure: true }
  const words = (text.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length >= 5 && !COMMON.has(w))
  for (const s of BY_SEVERITY)
    for (const k of s.keywords)
      if (!k.includes(' ') && k.length >= 5 && words.some((w) => w[0] === k[0] && near(w, k))) return { symptom: s, sure: false }
  return null
}

const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, few: 3, several: 4, 'couple of': 2 }
const num = (w) => NUM[w] ?? Number(w)
const COUNT = '(\\d+|an?|one|two|three|four|five|six|seven|ten|few|several|couple of)'
const WEEKDAYS = [/\bsunday\b/, /\bmon(day)?\b/, /\btue(s|sday)?\b/, /\bwed(nesday)?\b/, /\bthu(rs?|rsday)?\b/, /\bfri(day)?\b/, /\bsaturday\b/]

// "tomorrow", "next friday", "in 3 days", "on the 12th" → YYYY-MM-DD (up to a month ahead).
export const parseDate = (t) => {
  let n = null
  let m
  if (/\bday after tomorrow\b/.test(t)) n = 2
  else if (/\b(tomorrow|tmrw?|tom+or+ow)\b/.test(t)) n = 1
  else if (/\b(today|tonight|asap|right now|this (morning|afternoon|evening))\b/.test(t)) n = 0
  else if ((m = t.match(new RegExp(`\\bin ${COUNT} (day|week)s?\\b`)))) n = num(m[1]) * (m[2] === 'week' ? 7 : 1)
  else if ((m = t.match(/\b(\d{1,2})(st|nd|rd|th)\b/))) {
    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth() + (Number(m[1]) < now.getDate() ? 1 : 0), Number(m[1]))
    n = Math.round((target - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  } else {
    const day = WEEKDAYS.findIndex((re) => re.test(t))
    if (day >= 0) {
      n = (day - new Date().getDay() + 7) % 7
      if (n === 0 && /\bnext\b/.test(t)) n = 7
    }
  }
  return n !== null && n >= 0 && n <= 31 ? dayOffset(n) : null
}

const pad = (n) => String(n).padStart(2, '0')
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const partOf = (time) => (time < '12:00' ? 'morning' : time < '17:00' ? 'afternoon' : 'evening')

// "5pm", "10:30", "at 4" → { time: 'HH:MM' }; "morning" / "evening" → { part }.
export const parseTime = (t) => {
  if (/\bnoon\b/.test(t)) return { time: '12:00' }
  const m =
    t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\b\.?/) ||
    t.match(/\b(\d{1,2})[:.](\d{2})\b/) ||
    t.match(/\bat (\d{1,2})\b(?!\s*(days?|weeks?|st|nd|rd|th)\b)/)
  if (m) {
    let h = Number(m[1])
    const min = Number(m[2] || 0)
    if (m[3] === 'p' && h < 12) h += 12
    if (m[3] === 'a' && h === 12) h = 0
    if (!m[3] && h >= 1 && h <= 7) h += 12 // "at 4" means 4 pm in clinic hours
    if (h < 24 && min < 60) return { time: `${pad(h)}:${pad(min)}` }
  }
  const part = t.match(/\b(morning|afternoon|evening|tonight)\b/)?.[1]
  return part ? { part: part === 'tonight' ? 'evening' : part } : null
}

// Free slots closest to the wanted time, in time order.
export const nearest = (slots, time, count) =>
  [...slots].sort((a, b) => Math.abs(toMin(a) - toMin(time)) - Math.abs(toMin(b) - toMin(time))).slice(0, count).sort()

// "since 3 days", "for a week", "since yesterday" → one of DURATIONS.
export const parseDuration = (t) => {
  if (/\b(since|from) (today|this morning|morning|last night|tonight)\b|\b(few|couple of|\d+) hours?\b|\bjust (started|now|today)\b/.test(t)) return DURATIONS[0]
  if (/\b(since|from) yesterday\b/.test(t)) return DURATIONS[1]
  let days = null
  const m = t.match(new RegExp(`(?<!\\bin )\\b${COUNT}\\s+(day|week|month|year)s?\\b`))
  if (m) days = num(m[1]) * { day: 1, week: 7, month: 30, year: 365 }[m[2]]
  else if (/\b(past|last) (week|month)\b|\bfortnight\b/.test(t)) days = /month|fortnight/.test(t) ? 14 : 7
  if (days === null) return null
  return DURATIONS[days < 1 ? 0 : days <= 3 ? 1 : days <= 10 ? 2 : 3]
}

// "Dr. Rao" / "dr rao" → 'rao'.
export const parseDoctorName = (t) => t.match(/\bdr\.?\s*([a-z]{3,})/)?.[1] || null

export const findDoctorNamed = (name, doctors) =>
  doctors.find((d) => d.name.toLowerCase().split(/\s+/).some((n) => n === name || (name.length >= 4 && distance(n, name) <= 1)))

// "since this morning" says how long, not when to come.
const HOW_LONG = /\b(since|from|for)\s+(the\s+)?(past\s+|last\s+)?(today|yesterday|this morning|morning|last night|night|\S+\s+(hours?|days?|weeks?|months?))\b/g

// Everything we can pull out of one message.
export const understand = (text) => {
  const t = text.toLowerCase()
  const named = parseDoctorName(t)
  const when = t.replace(HOW_LONG, ' ')
  return {
    ...guessSymptom(named ? t.replace(/\bdr\.?\s*[a-z]+/, ' ') : t), // "Dr. Stone" isn't a kidney stone
    named,
    duration: parseDuration(t),
    date: parseDate(when),
    want: parseTime(when),
  }
}

// Typing a button's text ("tomorrow", "10:30", "yes") works like tapping it.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9: ]/g, '').replace(/\s+/g, ' ').trim()
export const matchOption = (text, options) => {
  const t = norm(text)
  if (!t || !options.length) return null
  if (/^(yes|yeah|yep|yup|sure|ok|okay|confirm|go ahead|book it|y)$/.test(t)) return options.find((o) => o.label.startsWith('✅'))
  if (/^(no|nope|nah|n|dont)$/.test(t)) return options.find((o) => o.label.startsWith('✖'))
  const exact = options.find((o) => norm(o.label) === t)
  if (exact || t.length < 3) return exact
  const partial = options.filter((o) => norm(o.label).includes(t))
  return partial.length === 1 ? partial[0] : null
}
