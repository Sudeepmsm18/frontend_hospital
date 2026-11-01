// Everyday patient messages and what the assistant should take from them. Run with `npm test`.
// When a real message is misunderstood, add it here first, then fix symptoms.js / chatbrain.js / intents.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { understand, parseDuration, parseDurationAnswer, parseDate, parseTime, matchOption, DURATIONS } from './chatbrain.js'
import { classify, TRAINING } from './intents.js'
import { dayOffset } from './api.js'

const [TODAY, FEW_DAYS, WEEK, LONG] = DURATIONS
const daysUntil = (dow, next = false) => {
  const n = (dow - new Date().getDay() + 7) % 7
  return n === 0 && next ? 7 : n
}

// Collects every mismatch so one run shows them all, not just the first.
const check = (cases, actual, expected) => {
  const wrong = cases.map((c) => [c, actual(c), expected(c)]).filter(([, a, e]) => JSON.stringify(a) !== JSON.stringify(e))
  assert.equal(wrong.length, 0, '\n' + wrong.map(([c, a, e]) => `  ${JSON.stringify(c[0] ?? c)} → got ${JSON.stringify(a)}, expected ${JSON.stringify(e)}`).join('\n'))
}

test('symptoms in everyday English and Hinglish', () => {
  const cases = [
    ['I have fever', 'Fever'], ['running a high temperature since morning', 'Fever'], ['viral fever', 'Fever'],
    ['i think i have the flu', 'Fever'], ['2 din se bukhar hai', 'Fever'], ['mujhe bukhaar hai', 'Fever'], ['feeling feverish', 'Fever'],
    ['cold and sneezing', 'Cold'], ['runny nose since yesterday', 'Cold'], ['zukam ho gaya', 'Cold'], ['my nose is blocked nose', 'Cold'],
    ['bad cough', 'Cough'], ['sore throat and cough', 'Cough'], ['khansi aa rahi hai', 'Cough'], ['throat is paining', 'Cough'], ['tonsils swollen', 'Cough'],
    ['terrible headache', 'Headache'], ['my head hurts', 'Headache'], ['migraine again', 'Headache'], ['sar dard ho raha hai', 'Headache'], ['head is paining', 'Headache'],
    ['stomach ache', 'Stomach'], ['acidity problem', 'Stomach'], ['pet me dard', 'Stomach'], ['tummy hurts', 'Stomach'], ['gas problem', 'Stomach'], ['constipation since 3 days', 'Stomach'],
    ['vomiting since morning', 'Vomiting'], ['loose motions', 'Vomiting'], ['diarrhea', 'Vomiting'], ['threw up twice', 'Vomiting'], ['ulti ho rahi hai', 'Vomiting'], ['food poisoning', 'Vomiting'],
    ['body pain', 'Body ache'], ['feeling weak', 'Body ache'], ['very tired all the time', 'Body ache'], ['feeling dizzy', 'Body ache'], ['chakkar aa raha hai', 'Body ache'],
    ['knee pain', 'Joint'], ['shoulder hurts', 'Joint'], ['twisted ankle', 'Injury'], ['ghutno me dard', 'Joint'],
    ['back pain', 'Back'], ['lower back is stiff', 'Back'], ['kamar dard', 'Back'], ['neck pain from laptop', 'Back'],
    ['i fell down the stairs', 'Injury'], ['might be a fracture', 'Injury'], ['sprained my wrist', 'Injury'], ['had an accident on bike', 'Injury'],
    ['burnt my hand while cooking', 'Burns'],
    ['toothache', 'Tooth'], ['tooth pain', 'Tooth'], ['need a dentist', 'Tooth'], ['daant me dard', 'Tooth'], ['bad breath', 'Tooth'], ['gums bleeding', 'Tooth'],
    ['skin rash', 'Skin'], ['itching all over', 'Skin'], ['pimples on face', 'Skin'], ['hair fall problem', 'Skin'], ['khujli ho rahi hai', 'Skin'], ['allergy', 'Skin'],
    ['eye is red', 'Eye'], ['blurry vision', 'Eye'], ['aankh me jalan', 'Eye'],
    ['ear pain', 'Ear'], ['earache', 'Ear'], ['sinus problem', 'Ear'], ['kaan me dard', 'Ear'],
    ['sugar is high', 'Diabetes'], ['diabetes checkup', 'Diabetes'], ['thyroid test', 'Diabetes'],
    ['bp is high', 'blood pressure'], ['high blood pressure', 'blood pressure'],
    ['burning urine', 'Urine'], ['kidney stone pain', 'Urine'], ['uti again', 'Urine'], ['pain while peeing', 'Urine'],
    ['missed period', 'Pregnancy'], ['i am pregnant', 'Pregnancy'], ['pcod issue', 'Pregnancy'],
    ['my baby is crying a lot', 'Child'], ['vaccination for my child', 'Child'],
    ['stress and anxiety', 'Stress'], ['cant sleep at night', 'Stress'], ['feeling depressed', 'Stress'], ['panic attacks', 'Stress'],
    ['chest pain', 'Chest pain'], ['pain in my chest', 'Chest pain'], ['seene me dard', 'Chest pain'], ['fever and chest pain', 'Chest pain'],
    ['difficulty breathing', 'Breathing'], ['short of breath', 'Breathing'], ['saans lene me taklif', 'Breathing'], ['wheezing', 'Breathing'],
    ['slurred speech', 'slurred'], ['face drooping one side', 'slurred'], ['left arm numbness', 'slurred'],
    ['fainted this morning', 'Fainting'], ['had a seizure', 'Fainting'], ['passed out', 'Fainting'],
    ['heavy bleeding', 'bleeding'], ['vomiting blood', 'bleeding'],
  ]
  check(cases, ([text, want]) => { const l = understand(text).symptom?.label ?? null; return l?.includes(want) ? want : l }, ([, want]) => want)
})

test('typos are guessed but not assumed', () => {
  // "stomache" still starts with the exact keyword "stomach", so that one is sure.
  const cases = [['feever', 'Fever', false], ['hedache', 'Headache', false], ['stomache', 'Stomach', true], ['diarhea', 'Vomiting', false], ['breating problem', 'Breathing', false], ['vomitting', 'Vomiting', true]]
  check(cases, ([text, want]) => { const h = understand(text); return [h.symptom?.label.includes(want) ? want : h.symptom?.label, h.sure] }, ([, want, sure]) => [want, sure])
})

test('ordinary words are not symptoms', () => {
  const cases = ['early morning', 'my number is 98000', 'kidding', 'i fell asleep', 'never mind', 'what time', 'book for tomorrow', 'hello', 'thanks a lot', 'i will come at 5', 'whats the fees', 'cancel it', 'the 15th', 'see you']
  check(cases.map((c) => [c]), ([text]) => understand(text).symptom?.label ?? null, () => null)
})

test('how long they have had it', () => {
  const cases = [
    ['since today', TODAY], ['since this morning', TODAY], ['since last night', TODAY], ['just started', TODAY], ['few hours', TODAY], ['aaj se', TODAY],
    ['since yesterday', FEW_DAYS], ['kal se', FEW_DAYS], ['2 days', FEW_DAYS], ['since 3 days', FEW_DAYS], ['from 4 to 5 days', WEEK],
    ['4-5 days', WEEK], ['for a couple of days', FEW_DAYS], ['few days', FEW_DAYS], ['2 din se', FEW_DAYS], ['teen din', FEW_DAYS], ['one day', FEW_DAYS],
    ['a week', WEEK], ['for a week', WEEK], ['since last week', WEEK], ['10 days', WEEK], ['ek hafte se', WEEK], ['about 6 days', WEEK],
    ['2 weeks', LONG], ['three weeks', LONG], ['a month', LONG], ['for months', LONG], ['since last month', LONG], ['a long time', LONG], ['2 mahine', LONG], ['for years', LONG],
    ['in 2 days', null], ['tomorrow', null], ['hello', null],
  ]
  check(cases, ([t]) => parseDuration(t), ([, e]) => e)
})

test('short answers to "how long have you had this?"', () => {
  const cases = [
    ['From 4 to 5 days', WEEK], ['yesterday', FEW_DAYS], ['today', TODAY], ['this morning', TODAY], ['5', WEEK], ['2', FEW_DAYS], ['20', LONG],
    ['a week', WEEK], ['2 din', FEW_DAYS], ['kal se', FEW_DAYS], ['last week', WEEK], ['morning', TODAY], ['monday', parseDuration('since monday')],
    ['no idea', null], ['hmm', null],
  ]
  check(cases, ([t]) => parseDurationAnswer(t), ([, e]) => e)
})

test('which day', () => {
  const cases = [
    ['today', 0], ['tomorrow', 1], ['tmrw', 1], ['tommorow', 1], ['kal', 1], ['day after tomorrow', 2], ['parso', 2],
    ['in 3 days', 3], ['after 2 days', 2], ['in a week', 7], ['next week', 7], ['asap', 0], ['aaj', 0],
    ['friday', daysUntil(5)], ['on fri', daysUntil(5)], ['next monday', daysUntil(1, true)], ['wednesday morning', daysUntil(3)],
    ['hello', null], ['since 3 days', null], ['sat down', null], ['month', null],
  ]
  check(cases, ([t]) => parseDate(t), ([, n]) => (n === null ? null : dayOffset(n)))
})

test('what time', () => {
  const cases = [
    ['5pm', { time: '17:00' }], ['at 5 pm', { time: '17:00' }], ['10:30', { time: '10:30' }], ['10.30 am', { time: '10:30' }], ['11am', { time: '11:00' }],
    ['at 4', { time: '16:00' }], ['around 10', { time: '10:00' }], ['noon', { time: '12:00' }], ['12 pm', { time: '12:00' }], ['5 baje', { time: '17:00' }],
    ['after 5', { after: '17:00' }], ['after 4pm', { after: '16:00' }], ['before noon', { before: '12:00' }], ['after lunch', { after: '14:00' }], ['before 11 am', { before: '11:00' }],
    ['morning', { part: 'morning' }], ['in the evening', { part: 'evening' }], ['afternoon', { part: 'afternoon' }], ['subah', { part: 'morning' }], ['shaam ko', { part: 'evening' }],
    ['earliest slot', { first: true }], ['first available', { first: true }], ['last slot', { last: true }],
    ['2 days', null], ['hello', null], ['10', null],
  ]
  check(cases, ([t]) => parseTime(t), ([, e]) => e)
  check([['10', { time: '10:00' }], ['4 30', { time: '16:30' }], ['9', { time: '09:00' }]], ([t]) => parseTime(t, true), ([, e]) => e)
})

test('whole messages', () => {
  const cases = [
    ['I have fever since 3 days, can I come tomorrow at 5pm?', { s: 'Fever', duration: FEW_DAYS, date: 1, want: { time: '17:00' } }],
    ['2 din se bukhar hai, kal subah aa sakta hu?', { s: 'Fever', duration: FEW_DAYS, date: 1, want: { part: 'morning' } }],
    ['headache since this morning', { s: 'Headache', duration: TODAY, date: null, want: null }],
    ['cough for 2 weeks, in 3 days evening', { s: 'Cough', duration: LONG, date: 3, want: { part: 'evening' } }],
    ['stomach pain kal se, aaj shaam ko', { s: 'Stomach', duration: FEW_DAYS, date: 0, want: { part: 'evening' } }],
    ['back pain since last week, earliest slot friday', { s: 'Back', duration: WEEK, date: daysUntil(5), want: { first: true } }],
    ['book dr rao on friday after 3', { s: undefined, duration: null, date: daysUntil(5), want: { after: '15:00' }, named: 'rao' }],
  ]
  check(cases, ([t]) => {
    const h = understand(t)
    const e = cases.find((c) => c[0] === t)[1]
    return { s: e.s && h.symptom?.label.includes(e.s) ? e.s : h.symptom?.label, duration: h.duration, date: h.date, want: h.want, ...(e.named && { named: h.named }) }
  }, ([, e]) => ({ ...e, date: e.date === null ? null : dayOffset(e.date) }))
})

test('typed text matches the buttons on screen', () => {
  const opts = [{ label: '✅ Yes, book it' }, { label: '🕒 Pick another time' }, { label: '✖ Cancel' }]
  check([['cancel', '✖ Cancel'], ['another time', '🕒 Pick another time'], ['yes, book it', '✅ Yes, book it'], ['xyz', undefined]],
    ([t]) => matchOption(t, opts)?.label, ([, e]) => e)
})

// Phrasings that are NOT in the training examples, to measure how well the classifier generalises.
const UNSEEN = {
  book: ['i need to see a doctor tomorrow', 'can you book me an appointment', 'want an appointment please', 'i would like to consult someone', 'i am feeling unwell, need a doctor', 'set up a visit for me', 'mujhe doctor se milna hai', 'i need a doctor appointment', 'please book a checkup'],
  cancel: ['please cancel my booking', 'i want to cancel my visit', 'i am not able to come tomorrow', 'cancel the appointment please', 'drop the booking', 'i will not come'],
  reschedule: ['can i reschedule', 'please change my appointment time', 'move my booking to friday', 'i want to shift my visit', 'postpone it please', 'change the appointment date'],
  my_appointments: ['when is my next appointment', 'do i have a booking', 'show me my bookings', 'what time do i have to come', 'is my appointment booked', 'my upcoming visit'],
  find_doctor: ['which doctors do you have', 'show me the list of doctors', 'is a cardiologist available', 'what are the doctor timings', 'who is available today'],
  emergency: ['this is an emergency', 'please send an ambulance', 'urgent please help'],
  greeting: ['hello there', 'hey hi', 'good morning doctor', 'hi assistant'],
  how_are_you: ['how are you today', 'hey how are you doing'],
  who_are_you: ['are you a robot', 'am i talking to a human', 'who is this'],
  help: ['what can you help me with', 'how do i book', 'show me the menu'],
  thanks: ['thanks so much', 'thank you very much', 'many thanks'],
  bye: ['ok bye then', 'bye take care', 'that is all thanks bye'],
  affirm: ['yes sure', 'okay go ahead', 'yeah that works', 'haan ji'],
  deny: ['no thanks i am good', 'nope not that', 'nahi'],
  worried: ['i am really worried', 'is this serious', 'i feel scared'],
  feeling_better: ['i feel much better now', 'i am okay now', 'feeling better today'],
  medicines: ['is my prescription ready', 'where can i collect my medicines', 'what tablets did the doctor give'],
  fees: ['what is the consultation fee', 'how much will it cost', 'do you take insurance'],
}

test('intent classifier on unseen phrasings (at least 90% right)', () => {
  const all = Object.entries(UNSEEN).flatMap(([intent, list]) => list.map((t) => [t, intent]))
  const wrong = all.filter(([t, intent]) => classify(t)?.intent !== intent)
  const accuracy = 1 - wrong.length / all.length
  console.log(`  intent accuracy on ${all.length} unseen messages: ${(accuracy * 100).toFixed(1)}% (trained on ${Object.values(TRAINING).flat().length} examples)`)
  for (const [t, intent] of wrong) console.log(`    ✗ "${t}" → ${classify(t)?.intent ?? 'not sure'} (expected ${intent})`)
  assert.ok(accuracy >= 0.9, `accuracy ${accuracy}`)
})

test('classifier says "not sure" for gibberish and pure details', () => {
  check(['asdfgh', 'qwerty uiop', 'from 4 to 5 days', '10:30', 'the 15th'].map((t) => [t]), ([t]) => classify(t)?.intent ?? null, () => null)
})
