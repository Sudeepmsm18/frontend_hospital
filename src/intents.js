// What the patient wants, learned from example messages — a small Naive Bayes classifier trained in the
// browser when this file loads (no AI service, no API key). To teach it a new phrasing, add the phrase
// under the right intent and run `npm test` to check nothing else broke.
export const TRAINING = {
  book: [
    'i am feeling unwell', 'unwell', 'need a doctor', 'doctor se milna', 'doctor ko dikhana', 'i want to visit', 'can i see someone today', 'want to get checked', 'please help me see a doctor', 'looking for an appointment', 'is there any appointment available', 'book me in', 'i need to visit the clinic', 'feeling bad need to see doctor', 'checkup karwana hai', 'treatment chahiye',
    'book an appointment', 'i want to book an appointment', 'need to see a doctor', 'can i get an appointment',
    'i want to consult a doctor', 'schedule a visit', 'make an appointment', 'fix an appointment', 'need a checkup',
    'i want a checkup', 'i am not feeling well', 'not feeling good', 'feeling sick', 'i feel unwell', 'i am ill',
    'something is wrong with me', 'need doctor', 'get me a doctor', 'i want to meet a doctor', 'appointment please',
    'book a slot', 'reserve a slot', 'can i come in', 'i need medical help', 'want to visit the hospital',
    'i need a consultation', 'general checkup', 'health checkup', 'full body checkup', 'want to show to a doctor',
    'doctor ko dikhana hai', 'appointment chahiye', 'new appointment', 'book for me', 'i need to see someone',
    'follow up visit', 'follow up appointment', 'routine checkup', 'i would like to come in', 'see a doctor today',
    'i need an appointment for my mother', 'book appointment for my son', 'can you book me in', 'get an appointment',
    'i want to see the doctor', 'consultation please', 'need treatment', 'i am sick', 'my health is not good',
  ],
  cancel: [
    'not able to make it', 'unable to come', 'cannot come tomorrow', 'i have to cancel', 'cancel please', 'cancel it please', 'scrap my appointment', 'i changed my mind cancel', 'no longer need it', 'cancel my visit tomorrow', 'i am busy cancel it',
    'cancel my appointment', 'i want to cancel', 'cancel the booking', 'please cancel my visit', 'i cannot come',
    'i will not be able to come', 'drop my appointment', 'remove my booking', 'delete my appointment',
    'i do not need the appointment anymore', 'call off my appointment', 'not coming', 'cancel tomorrow appointment',
    'cancel booking', 'appointment cancel karo', 'i need to cancel', 'withdraw my appointment', 'cancel my slot',
    'i wont make it', 'i cant make it to the appointment', 'please cancel', 'cancel all my appointments',
  ],
  reschedule: [
    'postpone', 'postpone the visit', 'delay my appointment', 'shift my booking', 'shift the visit', 'can i come later', 'another time please', 'change the day', 'different slot', 'move the visit', 'reschedule it', 'can i shift it', 'come another day instead', 'later date please',
    'reschedule my appointment', 'change my appointment', 'move my appointment', 'can i change the time',
    'shift my appointment', 'postpone my appointment', 'prepone my appointment', 'change the date',
    'i want a different time', 'change slot', 'can we move it', 'reschedule', 'change booking time',
    'i need to change my booking', 'push my appointment to another day', 'move it to another day',
    'can i come on a different day', 'change my slot', 'different day for my appointment', 'rebook my appointment',
  ],
  my_appointments: [
    'what time do i need to come', 'what time is my visit', 'when do i need to come', 'timing of my appointment', 'am i booked', 'where is my appointment', 'details of my booking', 'when is my visit',
    'show my appointments', 'when is my appointment', 'what time is my appointment', 'my bookings',
    'do i have any appointment', 'upcoming appointments', 'what is my slot', 'my allotted time', 'check my booking',
    'appointment status', 'when should i come', 'what time should i come', 'is my appointment confirmed',
    'list my visits', 'my schedule', 'when am i seeing the doctor', 'which doctor am i seeing',
    'did my booking go through', 'next appointment', 'show bookings', 'my appointment details', 'my visits',
    'what are my appointments', 'tell me my appointment time', 'is my booking done',
  ],
  find_doctor: [
    'who can i see', 'which doctor should i see', 'doctors available tomorrow', 'doctor on duty', 'specialist available', 'list specialists', 'what kind of doctors are there',
    'list of doctors', 'which doctors are available', 'show doctors', 'who are the doctors', 'available doctors',
    'doctors list', 'find a doctor', 'which specialist', 'do you have a cardiologist', 'is there a dermatologist',
    'doctor timings', 'when is the doctor available', 'which doctor is available today', 'is the doctor available',
    'who is available now', 'show specialists', 'doctor hours', 'opd timings', 'what are the timings',
    'clinic timings', 'hospital timings', 'what specialists do you have', 'which departments are there',
    'tell me about your doctors', 'best doctor', 'is there a neurologist', 'do you have a child specialist',
  ],
  emergency: [
    'emergency', 'it is an emergency', 'need ambulance', 'call an ambulance', 'urgent help', 'very serious',
    'someone collapsed', 'accident', 'he is not breathing', 'help immediately', 'dying', 'critical condition',
    'serious injury', 'please help fast', 'life threatening', 'urgent',
  ],
  greeting: [
    'hi doctor', 'hello bot', 'hey assistant', 'hi carepoint', 'hello hello',
    'hi', 'hello', 'hey', 'hii', 'hey there', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hola',
    'yo', 'hi there', 'hello assistant', 'greetings', 'morning', 'hey carepoint', 'hello there', 'hiya', 'helo',
  ],
  how_are_you: [
    'how are you', 'how r u', 'how are you doing', 'hows it going', 'whats up', 'how do you do', 'you good',
    'how is your day', 'how have you been', 'sup', 'how are things', 'kaise ho',
  ],
  who_are_you: [
    'who is there', 'who am i talking to', 'who are u', 'is this a person',
    'who are you', 'are you a bot', 'are you human', 'are you a real person', 'is this a robot', 'what are you',
    'am i talking to a bot', 'are you ai', 'what is your name', 'your name', 'are you a doctor', 'is this automated',
    'am i chatting with a person', 'are you real',
  ],
  help: [
    'show the menu', 'open menu', 'options please', 'what do i do', 'i need guidance',
    'help', 'what can you do', 'how does this work', 'i need help', 'guide me', 'how to book', 'what are my options',
    'menu', 'options', 'show menu', 'main menu', 'start over', 'restart', 'i am confused', 'how do i use this',
    'what should i do', 'show options', 'go back', 'back to menu',
  ],
  thanks: [
    'thanks a ton', 'big thanks', 'thank you doctor', 'thanks buddy',
    'thanks', 'thank you', 'thank u', 'thx', 'ty', 'thanks a lot', 'much appreciated', 'great thanks',
    'thank you so much', 'dhanyavad', 'shukriya', 'you are helpful', 'that was helpful', 'awesome thanks', 'cheers',
    'thanks for the help', 'nice thanks',
  ],
  bye: [
    'bye', 'goodbye', 'see you', 'see ya', 'that is all', 'nothing else', 'i am done', 'that is it', 'no thanks bye',
    'take care', 'good night', 'ok bye', 'catch you later', 'talk later', 'bye bye', 'gotta go',
  ],
  affirm: [
    'yes go ahead', 'okay sure', 'ya sure', 'haan theek hai', 'theek hai', 'yes that is fine', 'correct yes',
    'yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'yes please', 'correct', 'right', 'that is right', 'exactly',
    'confirm', 'go ahead', 'sounds good', 'perfect', 'alright', 'fine', 'haan', 'ha', 'ji', 'of course', 'definitely',
    'absolutely', 'do it', 'yup', 'ok book it', 'yes book it', 'please do', 'works for me', 'that works', 'ya',
  ],
  deny: [
    'no thank you', 'no not now', 'no i do not', 'not this one', 'nahin', 'no please',
    'no', 'nope', 'nah', 'not really', 'no thanks', 'wrong', 'that is wrong', 'incorrect', 'not that', 'nahi',
    'never mind', 'nevermind', 'dont', 'no way', 'not now', 'leave it', 'forget it', 'no no', 'na',
  ],
  worried: [
    'is it something serious', 'is it dangerous', 'i am tense', 'i am worried about my health', 'will it be fine', 'i am really scared', 'should i panic',
    'i am scared', 'i am worried', 'i am nervous', 'is it serious', 'should i be worried', 'will i be ok',
    'i am afraid', 'is this dangerous', 'i am panicking', 'scared', 'worried', 'i am frightened', 'is it bad',
  ],
  feeling_better: [
    'i am alright now', 'i am good now', 'it is better now', 'pain has reduced', 'fever is gone', 'i do not feel sick anymore', 'i am okay now thanks',
    'i am feeling better', 'i feel fine now', 'i am ok now', 'it is gone', 'i recovered', 'no longer sick',
    'much better now', 'i got better', 'feeling good now', 'i am fine now', 'pain is gone',
  ],
  medicines: [
    'my pills', 'tablets prescribed', 'prescribed medicine', 'medicine ready', 'where to collect medicine',
    'my medicines', 'my prescription', 'where are my medicines', 'what medicine should i take',
    'prescription status', 'is my medicine ready', 'pharmacy', 'collect medicines', 'dosage',
    'when to take my tablets', 'medicine list', 'show prescription', 'my tablets', 'what did the doctor prescribe',
    'can i get medicine', 'dawai', 'which tablet', 'my medication',
  ],
  fees: [
    'consultation charges', 'fee for doctor', 'is there any fee', 'insurance accepted', 'payment options',
    'how much does it cost', 'consultation fee', 'what are the charges', 'is it free', 'price', 'fees',
    'cost of appointment', 'do i need to pay', 'payment', 'how much is the consultation', 'kitna paisa',
    'charges for doctor', 'do you accept insurance', 'insurance',
  ],
}

// Lowercase, expand a few contractions, drop punctuation, and trim plurals so "appointments" = "appointment".
const CONTRACTIONS = [[/n't\b/g, ' not'], [/'m\b/g, ' am'], [/'re\b/g, ' are'], [/'s\b/g, ' is'], [/'ll\b/g, ' will'], [/\bcant\b/g, 'can not'], [/\bwont\b/g, 'will not'], [/\bdont\b/g, 'do not'], [/\bim\b/g, 'i am'], [/\bu\b/g, 'you'], [/\br\b/g, 'are']]
export const tokens = (text) => {
  let t = text.toLowerCase().replace(/[’`]/g, "'")
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to)
  return (t.match(/[a-z]+/g) || []).map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
}
// Words alone that say nothing about the intent; a message made only of these isn't classified.
const FILLER = new Set(['i', 'a', 'an', 'the', 'to', 'is', 'am', 'are', 'be', 'it', 'me', 'my', 'for', 'of', 'on', 'in', 'at', 'and', 'or', 'from', 'with', 'this', 'that', 'can', 'do', 'will', 'please', 'want', 'need', 'have', 'has', 'some', 'just'])
const features = (text) => {
  const w = tokens(text)
  return [...new Set([...w, ...w.slice(1).map((x, i) => `${w[i]}_${x}`)])]
}

// Train: every example becomes a TF-IDF vector, so rare telling words ("postpone", "insurance") weigh more
// than common ones ("i", "my"). A message is matched to its most similar examples (nearest neighbours).
const examples = Object.entries(TRAINING).flatMap(([intent, list]) => list.map((ex) => ({ intent, fs: features(ex) })))
const df = new Map()
for (const ex of examples) for (const f of ex.fs) df.set(f, (df.get(f) || 0) + 1)
// Word pairs ("appointment_please") help with word order but count for less than the words themselves.
const idf = (f) => Math.log(1 + examples.length / df.get(f)) * (f.includes('_') ? 0.5 : 1)
const vector = (fs) => {
  const v = new Map(fs.filter((f) => df.has(f)).map((f) => [f, idf(f)]))
  const norm = Math.hypot(...v.values())
  return { v, norm }
}
for (const ex of examples) Object.assign(ex, vector(ex.fs))

// Action words that settle the intent on their own, whatever else the message says
// ("cancel the appointment please" must never start a new booking).
const DECISIVE = [
  [/\b(reschedul|postpone|prepone)|\b(shift|move|change|push)\b.*\b(appointment|booking|visit|slot|date|day|time|it)\b/, 'reschedule'],
  [/\bcancel/, 'cancel'],
]

// → { intent, confidence } or null when the message has nothing the model recognises or it isn't sure.
// confidence is the cosine similarity (0–1) to the closest training examples of that intent.
export const classify = (text, minConfidence = 0.45) => {
  const lower = text.toLowerCase()
  const decided = DECISIVE.find(([re]) => re.test(lower))
  if (decided) return { intent: decided[1], confidence: 1 }
  const fs = features(text)
  if (!fs.some((f) => df.has(f) && !f.includes('_') && !FILLER.has(f))) return null
  const q = vector(fs)
  const best = new Map()
  for (const ex of examples) {
    let dot = 0
    for (const [f, w] of q.v) if (ex.v.has(f)) dot += w * ex.v.get(f)
    const sim = dot / (q.norm * ex.norm || 1)
    // Each intent scores the mean of its two closest examples, so one lucky overlap doesn't win alone.
    const top = best.get(ex.intent) || [0, 0]
    if (sim > top[0]) best.set(ex.intent, [sim, top[0]])
    else if (sim > top[1]) best.set(ex.intent, [top[0], sim])
  }
  const ranked = [...best].map(([intent, [a, b]]) => ({ intent, confidence: a * 0.75 + b * 0.25 })).sort((x, y) => y.confidence - x.confidence)
  return ranked[0]?.confidence >= minConfidence ? ranked[0] : null
}
