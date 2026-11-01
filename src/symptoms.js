// Symptom catalogue for the appointment assistant.
// `dept` lists the specialist types that can treat it, as regexes matched against a doctor's
// specialization (whatever the admin typed). The first match wins; General Physician is the fallback.
// `level`: 'routine' | 'urgent' (see a doctor today) | 'emergency' (go to ER / call ambulance now).

const D = {
  general: { name: 'General Physician', re: /general|physician|family|internal|gp\b/i },
  ent: { name: 'ENT', re: /\bent\b|otolaryng|\bear\b/i },
  pulmo: { name: 'Pulmonology', re: /pulmo|chest|respir|lung/i },
  neuro: { name: 'Neurology', re: /neuro/i },
  gastro: { name: 'Gastroenterology', re: /gastro|digest|hepat/i },
  derma: { name: 'Dermatology', re: /derma|skin/i },
  eye: { name: 'Ophthalmology', re: /ophthal|eye/i },
  dental: { name: 'Dentistry', re: /\bdent/i },
  ortho: { name: 'Orthopedics', re: /ortho|bone|spine/i },
  pedia: { name: 'Pediatrics', re: /pediat|paediat|child/i },
  gyn: { name: 'Gynecology', re: /gyn|obstet|women/i },
  endo: { name: 'Endocrinology', re: /endocrin|diabet/i },
  cardio: { name: 'Cardiology', re: /cardi|heart/i },
  psych: { name: 'Psychiatry', re: /psych|mental/i },
  uro: { name: 'Urology', re: /\burolog|nephro|kidney/i }, // \b so "neurology" doesn't match
  surgery: { name: 'General Surgery', re: /surg/i },
}

// Keywords are regex pieces that must start a word ("ear\\b" so "early" doesn't count). Everyday English
// and common Hinglish are both listed, since that is how patients actually type.
export const SYMPTOM_GROUPS = [
  {
    key: 'common',
    label: '🤒 Common illness',
    items: [
      { label: '🤧 Cold & runny nose', dept: [D.general, D.ent], keywords: ['cold', 'runny', 'running nose', 'sneez', 'blocked nose', 'stuffy nose', 'nose block', 'zukam', 'jukam', 'nazla'] },
      { label: '🌡️ Fever', dept: [D.general], keywords: ['fever', 'temperature', 'chills', 'viral', 'flu\\b', 'high temp', 'bukhar', 'bukhaar', 'taap'] },
      { label: '😷 Cough / sore throat', dept: [D.general, D.ent, D.pulmo], keywords: ['cough', 'sore throat', 'throat', 'tonsil', 'phlegm', 'khansi', 'khaansi', 'gala'] },
      { label: '🤕 Headache / migraine', dept: [D.general, D.neuro], keywords: ['headache', 'head ache', 'migraine', 'head pain', 'head hurt', 'head is pain', 'sar dard', 'sir dard', 'sardard', 'sir me dard'] },
      { label: '🤢 Stomach pain / acidity', dept: [D.gastro, D.general], keywords: ['stomach', 'acidity', 'gastric', 'gas\\b', 'abdomen', 'bloat', 'tummy', 'belly', 'constipat', 'indigestion', 'heartburn', 'pet dard', 'pet me dard', 'pet mein dard'] },
      { label: '🚽 Vomiting / diarrhoea', dept: [D.gastro, D.general], keywords: ['vomit', 'diarr', 'loose motion', 'loose stool', 'nausea', 'throwing up', 'threw up', 'puking', 'food poison', 'ulti', 'dast\\b'] },
      { label: '😴 Body ache / weakness', dept: [D.general], keywords: ['body ache', 'body pain', 'weak', 'tired', 'fatigue', 'exhaust', 'no energy', 'dizz', 'giddy', 'chakkar', 'badan dard', 'kamzori'] },
    ],
  },
  {
    key: 'pain',
    label: '🦴 Pain & injury',
    items: [
      { label: '🦵 Joint / knee pain', dept: [D.ortho, D.general], keywords: ['joint', 'knee', 'arthritis', 'shoulder', 'ankle', 'wrist', 'elbow', 'ghutn', 'jodo'] },
      { label: '🔙 Back / neck pain', dept: [D.ortho, D.general], keywords: ['back pain', 'backache', 'back ache', 'lower back', 'neck pain', 'stiff neck', 'spine', 'kamar'] },
      { label: '🩹 Injury / possible fracture', dept: [D.ortho, D.surgery], level: 'urgent', keywords: ['fracture', 'injur', 'fell down', 'fell off', 'had a fall', 'sprain', 'broken', 'twisted', 'deep cut', 'accident', 'dislocat'] },
      { label: '🔥 Burns', dept: [D.surgery, D.derma], level: 'urgent', keywords: ['burn'] },
      { label: '🦷 Tooth pain', dept: [D.dental], keywords: ['tooth', 'teeth', 'dental', 'dentist', 'gum', 'gums? bleed(ing)?', 'bleeding gums?', 'cavity', 'wisdom', 'bad breath', 'daant', 'dant\\b'] },
    ],
  },
  {
    key: 'specialist',
    label: '🩺 Specialist care',
    items: [
      { label: '🧴 Skin rash / allergy', dept: [D.derma], keywords: ['rash', 'itch', 'allerg', 'skin', 'acne', 'pimple', 'hair ?fall', 'dandruff', 'eczema', 'hives', 'khujli', 'daane'] },
      { label: '👁️ Eye problem', dept: [D.eye], keywords: ['eye', 'vision', 'blurry', 'squint', 'aankh', 'ankh'] },
      { label: '👂 Ear / nose problem', dept: [D.ent], keywords: ['ear\\b', 'ears\\b', 'earache', 'hearing', 'sinus', 'nose bleed', 'kaan'] },
      { label: '🩸 Diabetes / sugar', dept: [D.endo, D.general], keywords: ['diabet', 'sugar', 'glucose', 'insulin', 'thyroid'] },
      { label: '💓 High blood pressure', dept: [D.cardio, D.general], keywords: ['blood pressure', 'bp\\b', 'high bp', 'low bp', 'hypertension', 'palpitat'] },
      { label: '🚻 Urine problem / kidney stone', dept: [D.uro, D.general], keywords: ['urine', 'urinat', 'kidney', 'stone', 'urinary', 'burning urin', 'uti\\b', 'pee\\b', 'peeing', 'peshab'] },
      { label: '🤰 Pregnancy / women\'s health', dept: [D.gyn], keywords: ['pregnan', 'period', 'menstru', 'gyn', 'pcod', 'pcos', 'white discharge', 'missed period'] },
      { label: '🧒 Child health', dept: [D.pedia, D.general], keywords: ['child', 'baby', 'kid\\b', 'kids\\b', 'infant', 'toddler', 'newborn', 'my son', 'my daughter', 'vaccin'] },
      { label: '😟 Stress / anxiety / sleep', dept: [D.psych, D.general], keywords: ['stress', 'anxi', 'panic attack', 'depress', 'sleep', 'insomnia', 'mental', 'tension', 'lonely'] },
    ],
  },
  {
    key: 'serious',
    label: '🚨 Serious symptoms',
    items: [
      { label: '❤️ Chest pain', dept: [D.cardio, D.general], level: 'emergency', keywords: ['chest pain', 'pain in my chest', 'chest hurt', 'chest tight', 'heart attack', 'heart pain', 'seene', 'seena'] },
      { label: '🫁 Breathing difficulty', dept: [D.pulmo, D.cardio, D.general], level: 'emergency', keywords: ['breath', 'asthma attack', 'suffocat', 'wheez', 'choking', 'saans', 'sans\\b'] },
      { label: '🧠 Sudden weakness / slurred speech', dept: [D.neuro, D.general], level: 'emergency', keywords: ['stroke', 'paralys', 'slurred', 'numb\\b', 'numbness', 'face drooping'] },
      { label: '😵 Fainting / seizure', dept: [D.neuro, D.general], level: 'emergency', keywords: ['faint', 'seizure', 'fits\\b', 'unconscious', 'passed out', 'blackout', 'convuls'] },
      { label: '🩸 Heavy bleeding', dept: [D.surgery, D.general], level: 'emergency', keywords: ['bleeding', 'blood loss', 'vomiting blood', 'coughing blood'] },
    ],
  },
]

export const NOT_SURE = { label: '❔ Not sure / something else', dept: [D.general] }

export const ALL_SYMPTOMS = SYMPTOM_GROUPS.flatMap((g) => g.items)

// Finds a symptom mentioned in free text, e.g. "I have a bad fever".
// A keyword inside a longer one is ignored ("breath" in "bad breath", "burn" in "burning urine"); of what's
// left, serious symptoms win, then the longest keyword.
export const findSymptom = (text) => {
  const hits = []
  for (const s of ALL_SYMPTOMS)
    for (const k of s.keywords) {
      const m = new RegExp(`\\b${k}`, 'i').exec(text)
      if (m) hits.push({ s, start: m.index, end: m.index + m[0].length })
    }
  const kept = hits.filter((h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start))
  kept.sort((a, b) => (b.s.level === 'emergency') - (a.s.level === 'emergency') || b.end - b.start - (a.end - a.start))
  return kept[0]?.s
}

// Doctors (already filtered to available) that suit this symptom, best department first.
export const matchDoctors = (symptom, doctors) => {
  for (const dept of symptom.dept) {
    const found = doctors.filter((d) => dept.re.test(d.specialization || ''))
    if (found.length) return { dept: dept.name, doctors: found, exact: dept === symptom.dept[0] }
  }
  const general = doctors.filter((d) => D.general.re.test(d.specialization || ''))
  if (general.length) return { dept: D.general.name, doctors: general, exact: false }
  return { dept: null, doctors, exact: false }
}

export const plain = (label) => label.replace(/^\S+\s/, '') // strip leading emoji
