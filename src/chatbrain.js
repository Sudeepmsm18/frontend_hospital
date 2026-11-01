// Free-text understanding for the scripted assistant — no AI model, just small parsers that pull
// a symptom, how long, which day, what time and which doctor out of whatever the patient types.
// Handles everyday English and common Hinglish ("kal", "subah", "2 din se bukhar"). Tested in chatbrain.test.js.
import { ALL_SYMPTOMS, findSymptom } from './symptoms.js'
import { dayOffset, prettyDate } from './api.js'

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
export const distance = (a, b) => {
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
const COMMON = new Set(['fewer', 'never', 'tried', 'where', 'there', 'these', 'those', 'three', 'store', 'shine', 'bread', 'steep', 'sheep', 'couch', 'token', 'cough', 'tough', 'sugar', 'super', 'still', 'sleep', 'start', 'weeks', 'times', 'today', 'which', 'while', 'child', 'chill'])
const BY_SEVERITY = [...ALL_SYMPTOMS].sort((a, b) => (b.level === 'emergency') - (a.level === 'emergency'))

// An exact keyword match is `sure`; a typo match is not, so the bot asks "did you mean…?" first.
export const guessSymptom = (text) => {
  const exact = findSymptom(text)
  if (exact) return { symptom: exact, sure: true }
  const words = (text.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length >= 5 && !COMMON.has(w))
  for (const s of BY_SEVERITY)
    for (const k of s.keywords)
      if (/^[a-z]{5,}$/.test(k) && words.some((w) => w[0] === k[0] && near(w, k))) return { symptom: s, sure: false }
  return null
}

const NUM = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, fifteen: 15, twenty: 20, thirty: 30, few: 3, several: 4, many: 10, 'couple of': 2, 'a couple of': 2, 'a few': 3,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, saat: 7, das: 10,
}
const num = (w) => NUM[w] ?? Number(w)
const COUNT = `(\\d+|${Object.keys(NUM).sort((a, b) => b.length - a.length).join('|')})`
const UNIT = '(days?|din|weeks?|hafte|hafta|months?|mahine|mahina|years?|saal)'
const UNIT_DAYS = { day: 1, din: 1, week: 7, hafte: 7, hafta: 7, month: 30, mahine: 30, mahina: 30, year: 365, saal: 365 }
const unitDays = (u) => UNIT_DAYS[u.replace(/s$/, '')] ?? UNIT_DAYS[u]
const WEEKDAYS = [/\bsunday\b/, /\bmon(day)?\b/, /\btue(s|sday)?\b/, /\bwed(nesday)?\b/, /\bthu(rs?|rsday)?\b/, /\bfri(day)?\b/, /\bsaturday\b/]
const weekday = (t) => WEEKDAYS.findIndex((re) => re.test(t))

// "tomorrow", "kal", "next friday", "in 3 days", "on the 12th" → YYYY-MM-DD (up to a month ahead).
export const parseDate = (t) => {
  let n = null
  let m
  if (/\b(day after tomorrow|parso|parson)\b/.test(t)) n = 2
  else if (/\b(tomorrow|tmrw?|tom+or+ow|kal)\b/.test(t)) n = 1
  else if (/\b(today|tonight|asap|right now|aaj|now itself|this (morning|afternoon|evening))\b/.test(t)) n = 0
  else if ((m = t.match(new RegExp(`\\b(?:in|after) ${COUNT} ${UNIT}\\b`)))) n = num(m[1]) * unitDays(m[2])
  else if (/\bnext week\b/.test(t)) n = 7
  else if (/\b(this )?weekend\b/.test(t)) n = (6 - new Date().getDay() + 7) % 7
  else if ((m = t.match(/\b(\d{1,2})(st|nd|rd|th)\b/))) {
    const now = new Date()
    const target = new Date(now.getFullYear(), now.getMonth() + (Number(m[1]) < now.getDate() ? 1 : 0), Number(m[1]))
    n = Math.round((target - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
  } else {
    const day = weekday(t)
    if (day >= 0) {
      n = (day - new Date().getDay() + 7) % 7
      if (n === 0 && /\bnext\b/.test(t)) n = 7
    }
  }
  return n !== null && n >= 0 && n <= 31 ? dayOffset(n) : null
}

const pad = (n) => String(n).padStart(2, '0')
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export const partOf = (time) => (time < '12:00' ? 'morning' : time < '17:00' ? 'afternoon' : 'evening')
const PARTS = { morning: 'morning', subah: 'morning', afternoon: 'afternoon', dopahar: 'afternoon', dopehar: 'afternoon', lunch: 'afternoon', evening: 'evening', shaam: 'evening', sham: 'evening', tonight: 'evening', night: 'evening', raat: 'evening' }

// Hour (+ optional minutes and am/pm) → "HH:MM". Without am/pm, 1–7 means afternoon (clinic hours).
const clock = (hour, minutes, ap) => {
  let h = Number(hour)
  const min = Number(minutes || 0)
  if (ap === 'p' && h < 12) h += 12
  if (ap === 'a' && h === 12) h = 0
  if (!ap && h >= 1 && h <= 7) h += 12
  return h < 24 && min < 60 ? `${pad(h)}:${pad(min)}` : null
}

// "5pm", "10:30", "at 4" → { time }; "after 5" → { after }; "before noon" → { before };
// "earliest" → { first: true }; "morning" / "shaam" → { part }. `loose` also accepts a bare "10" or "4 30".
export const parseTime = (t, loose = false) => {
  let m
  if ((m = t.match(/\b(after|before|by)\s+(noon|lunch|(\d{1,2})(?:[:.](\d{2}))?\s*(?:([ap])\.?m\b\.?)?)/))) {
    const time = m[2] === 'noon' ? '12:00' : m[2] === 'lunch' ? '14:00' : clock(m[3], m[4], m[5])
    if (time) return { [m[1] === 'after' ? 'after' : 'before']: time }
  }
  if (/\b(earliest|first (available|free)|first (slot|time)|as early as possible)\b/.test(t)) return { first: true }
  if (/\b(latest|last (slot|time)|as late as possible)\b/.test(t)) return { last: true }
  if (/\bnoon\b/.test(t)) return { time: '12:00' }
  m =
    t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\b\.?/) ||
    t.match(/\b(\d{1,2})[:.](\d{2})\b/) ||
    t.match(/\b(?:at|around|by) (\d{1,2})\b(?!\s*(days?|weeks?|st|nd|rd|th)\b)/) ||
    t.match(/\b(\d{1,2}) ?(?:baje|o'?clock)\b/) ||
    (loose && (t.trim().match(/^(\d{1,2})(?:[:. ](\d{2}))?$/)))
  if (m) {
    const time = clock(m[1], m[2], m[3])
    if (time) return { time }
  }
  const part = Object.keys(PARTS).find((p) => new RegExp(`\\b${p}\\b`).test(t))
  return part ? { part: PARTS[part] } : null
}

// Free slots closest to the wanted time, in time order.
export const nearest = (slots, time, count) =>
  [...slots].sort((a, b) => Math.abs(toMin(a) - toMin(time)) - Math.abs(toMin(b) - toMin(time))).slice(0, count).sort()

// Slots that fit what they asked for ("after 5", "evening", "earliest"), or null for "anything".
export const slotsFor = (slots, want) => {
  if (!want) return null
  if (want.first) return slots.slice(0, 1)
  if (want.last) return slots.slice(-1)
  if (want.after) return slots.filter((t) => t >= want.after)
  if (want.before) return slots.filter((t) => t < want.before)
  if (want.part) return slots.filter((t) => partOf(t) === want.part)
  return null
}

const toDuration = (days) => DURATIONS[days < 1 ? 0 : days <= 3 ? 1 : days <= 10 ? 2 : 3]

// "since 3 days", "4 to 5 days", "for a week", "since yesterday", "kal se", "2 din se" → one of DURATIONS.
export const parseDuration = (t) => {
  let m
  if (/\b(since|from) (today|this morning|morning|afternoon|evening|last night|tonight|an hour|few hours)\b|\b(few|couple of|\d+|an?) hours?\b|\bjust (started|now|today)\b|\b(aaj|subah|sham|shaam|raat) se\b/.test(t)) return DURATIONS[0]
  if (/\b(since|from) yesterday\b|\bkal se\b|\byesterday (morning|night|evening)?\s*(onwards|on)\b/.test(t)) return DURATIONS[1]
  if ((m = t.match(new RegExp(`(?<!\\b(?:in|after) )\\b${COUNT}\\s+${UNIT}\\b`)))) return toDuration(num(m[1]) * unitDays(m[2]))
  if (/\b(since|from) (last|past) (month|year)\b|\b(for|since) (weeks|months|years|ages|a long time|long)\b|\blong time\b|\bmonths\b/.test(t)) return DURATIONS[3]
  if (/\b(since|from|for the) (last|past) week\b|\bsince a week\b|\bfortnight\b/.test(t)) return /fortnight/.test(t) ? DURATIONS[3] : DURATIONS[2]
  if (/\b(for|since) (a few|few|some|many|several) days\b|\bfew days\b/.test(t)) return DURATIONS[1]
  const since = t.match(/\b(?:since|from) (last )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
  if (since) return toDuration((new Date().getDay() - weekday(since[2]) + 7) % 7 || 7)
  return null
}

// Same, but for a reply to "How long have you had this?", where "yesterday", "5" or "a week" is enough.
export const parseDurationAnswer = (t) => {
  const s = t.trim().toLowerCase()
  if (/^\d{1,2}$/.test(s)) return toDuration(Number(s))
  return parseDuration(s) || parseDuration(`since ${s.replace(/^(since|from|for)\s+/, '')}`) || (/\b(today|aaj)\b/.test(s) ? DURATIONS[0] : /\b(yesterday|kal)\b/.test(s) ? DURATIONS[1] : null)
}

// "Dr. Rao" / "dr rao" → 'rao' (but not the "dr" in "drooping").
const DR = /\bdr(?:\.\s*|\s+)([a-z]{3,})/
export const parseDoctorName = (t) => t.match(DR)?.[1] || null

export const findDoctorNamed = (name, doctors) =>
  doctors.find((d) => d.name.toLowerCase().split(/\s+/).some((n) => n === name || (name.length >= 4 && distance(n, name) <= 1)))

// "since this morning" / "kal se" says how long, not when to come.
const HOW_LONG = new RegExp(
  `\\b(since|from|for)\\s+(the\\s+)?(past\\s+|last\\s+)?(today|yesterday|this morning|morning|last night|night|evening|afternoon|${COUNT}\\s+(hours?|${UNIT}))\\b|\\b(kal|aaj|subah|sham|shaam|raat|${COUNT}\\s+${UNIT})\\s+se\\b`,
  'g'
)

// Everything we can pull out of one message.
export const understand = (text) => {
  const t = text.toLowerCase()
  const named = parseDoctorName(t)
  const when = t.replace(HOW_LONG, ' ')
  return {
    ...guessSymptom(named ? t.replace(DR, ' ') : t), // "Dr. Stone" isn't a kidney stone
    named,
    duration: parseDuration(t),
    date: parseDate(when),
    want: parseTime(when),
  }
}

// Typing a button's text ("tomorrow", "10:30") works like tapping it.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9: ]/g, '').replace(/\s+/g, ' ').trim()
export const matchOption = (text, options) => {
  const t = norm(text)
  if (!t || !options.length) return null
  const exact = options.find((o) => norm(o.label) === t)
  if (exact || t.length < 3) return exact
  const partial = options.filter((o) => norm(o.label).includes(t))
  return partial.length === 1 ? partial[0] : null
}
