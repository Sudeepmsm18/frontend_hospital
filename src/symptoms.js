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

export const SYMPTOM_GROUPS = [
  {
    key: 'common',
    label: '🤒 Common illness',
    items: [
      { label: '🤧 Cold & runny nose', dept: [D.general, D.ent], keywords: ['cold', 'runny', 'sneez', 'blocked nose'] },
      { label: '🌡️ Fever', dept: [D.general], keywords: ['fever', 'temperature', 'chills'] },
      { label: '😷 Cough / sore throat', dept: [D.general, D.ent, D.pulmo], keywords: ['cough', 'sore throat', 'throat pain'] },
      { label: '🤕 Headache / migraine', dept: [D.general, D.neuro], keywords: ['headache', 'migraine', 'head pain', 'head hurt', 'head is pain'] },
      { label: '🤢 Stomach pain / acidity', dept: [D.gastro, D.general], keywords: ['stomach', 'acidity', 'gastric', 'abdomen', 'bloat'] },
      { label: '🚽 Vomiting / diarrhoea', dept: [D.gastro, D.general], keywords: ['vomit', 'diarr', 'loose motion', 'nausea'] },
      { label: '😴 Body ache / weakness', dept: [D.general], keywords: ['body ache', 'weak', 'tired', 'fatigue'] },
    ],
  },
  {
    key: 'pain',
    label: '🦴 Pain & injury',
    items: [
      { label: '🦵 Joint / knee pain', dept: [D.ortho, D.general], keywords: ['joint', 'knee', 'arthritis'] },
      { label: '🔙 Back / neck pain', dept: [D.ortho, D.general], keywords: ['back pain', 'neck pain', 'spine'] },
      { label: '🩹 Injury / possible fracture', dept: [D.ortho, D.surgery], level: 'urgent', keywords: ['fracture', 'injury', 'fell', 'sprain', 'broken'] },
      { label: '🔥 Burns', dept: [D.surgery, D.derma], level: 'urgent', keywords: ['burn'] },
      { label: '🦷 Tooth pain', dept: [D.dental], keywords: ['tooth', 'teeth', 'dental', 'dentist', 'gum'] },
    ],
  },
  {
    key: 'specialist',
    label: '🩺 Specialist care',
    items: [
      { label: '🧴 Skin rash / allergy', dept: [D.derma], keywords: ['rash', 'itch', 'allerg', 'skin', 'acne'] },
      { label: '👁️ Eye problem', dept: [D.eye], keywords: ['eye', 'vision', 'blurry'] },
      { label: '👂 Ear / nose problem', dept: [D.ent], keywords: ['ear', 'hearing', 'sinus'] },
      { label: '🩸 Diabetes / sugar', dept: [D.endo, D.general], keywords: ['diabet', 'sugar'] },
      { label: '💓 High blood pressure', dept: [D.cardio, D.general], keywords: ['blood pressure', 'bp', 'hypertension'] },
      { label: '🚻 Urine problem / kidney stone', dept: [D.uro, D.general], keywords: ['urine', 'kidney', 'stone', 'urinary'] },
      { label: '🤰 Pregnancy / women\'s health', dept: [D.gyn], keywords: ['pregnan', 'period', 'menstru', 'gyn'] },
      { label: '🧒 Child health', dept: [D.pedia, D.general], keywords: ['child', 'baby', 'kid', 'infant'] },
      { label: '😟 Stress / anxiety / sleep', dept: [D.psych, D.general], keywords: ['stress', 'anxiety', 'depress', 'sleep', 'insomnia'] },
    ],
  },
  {
    key: 'serious',
    label: '🚨 Serious symptoms',
    items: [
      { label: '❤️ Chest pain', dept: [D.cardio, D.general], level: 'emergency', keywords: ['chest pain', 'pain in my chest', 'chest hurt', 'heart attack'] },
      { label: '🫁 Breathing difficulty', dept: [D.pulmo, D.cardio, D.general], level: 'emergency', keywords: ['breath', 'breathing', 'asthma attack', 'suffocat'] },
      { label: '🧠 Sudden weakness / slurred speech', dept: [D.neuro, D.general], level: 'emergency', keywords: ['stroke', 'paralys', 'slurred', 'numb'] },
      { label: '😵 Fainting / seizure', dept: [D.neuro, D.general], level: 'emergency', keywords: ['faint', 'seizure', 'fits', 'unconscious'] },
      { label: '🩸 Heavy bleeding', dept: [D.surgery, D.general], level: 'emergency', keywords: ['bleeding', 'blood loss'] },
    ],
  },
]

export const NOT_SURE = { label: '❔ Not sure / something else', dept: [D.general] }

export const ALL_SYMPTOMS = SYMPTOM_GROUPS.flatMap((g) => g.items)

// Finds a symptom mentioned in free text, e.g. "I have a bad fever".
// Serious symptoms are checked first, and keywords must start a word ("ear" won't match "heart").
const BY_SEVERITY = [...ALL_SYMPTOMS].sort((a, b) => (b.level === 'emergency') - (a.level === 'emergency'))
export const findSymptom = (text) =>
  BY_SEVERITY.find((s) => s.keywords.some((k) => new RegExp(`\\b${k}`, 'i').test(text)))

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
