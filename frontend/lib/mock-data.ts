import { Patient, ChatSession, SearchResult } from './types';

// ─── Demo Credentials ───────────────────────────────────────────────────────

export const DEMO_CREDENTIALS = {
  email: 'nurse@novahealth.ai',
  password: 'nova2026',
  name: 'Sarah',
};

// ─── Mock Patients ──────────────────────────────────────────────────────────

export const MOCK_PATIENTS: Patient[] = [
  // CRITICAL (2)
  {
    id: 'P001',
    name: 'Margaret Chen',
    age: 72,
    gender: 'F',
    room: '101',
    status: 'critical',
    condition: 'Acute Myocardial Infarction',
    admittedDate: '2026-03-08',
    vitals: {
      heartRate: 112,
      bloodPressure: '90/58',
      oxygenSat: 89,
      temperature: 99.1,
    },
    medications: [
      { name: 'Heparin', dosage: '5000 units IV', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q12h' },
      { name: 'Nitroglycerin', dosage: '0.4mg SL', lastAdministered: '2026-03-09T04:30:00Z', frequency: 'PRN' },
      { name: 'Aspirin', dosage: '325mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'daily' },
    ],
    allergies: ['Penicillin', 'Sulfa drugs'],
    attendingPhysician: 'Dr. James Rodriguez',
  },
  {
    id: 'P002',
    name: 'Robert Williams',
    age: 65,
    gender: 'M',
    room: '103',
    status: 'critical',
    condition: 'Acute Respiratory Failure',
    admittedDate: '2026-03-07',
    vitals: {
      heartRate: 128,
      bloodPressure: '85/52',
      oxygenSat: 84,
      temperature: 101.4,
    },
    medications: [
      { name: 'Vancomycin', dosage: '1g IV', lastAdministered: '2026-03-09T05:00:00Z', frequency: 'q12h' },
      { name: 'Albuterol', dosage: '2.5mg nebulizer', lastAdministered: '2026-03-09T07:00:00Z', frequency: 'q4h' },
      { name: 'Methylprednisolone', dosage: '125mg IV', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q6h' },
      { name: 'Lorazepam', dosage: '1mg IV', lastAdministered: '2026-03-09T03:00:00Z', frequency: 'PRN' },
    ],
    allergies: ['Latex'],
    attendingPhysician: 'Dr. Sarah Kim',
  },

  // CAUTION (2)
  {
    id: 'P003',
    name: 'David Thompson',
    age: 58,
    gender: 'M',
    room: '112',
    status: 'caution',
    condition: 'Post-operative — Coronary Artery Bypass Graft',
    admittedDate: '2026-03-06',
    vitals: {
      heartRate: 88,
      bloodPressure: '138/85',
      oxygenSat: 94,
      temperature: 99.8,
    },
    medications: [
      { name: 'Metoprolol', dosage: '25mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q12h' },
      { name: 'Warfarin', dosage: '5mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'daily' },
      { name: 'Oxycodone', dosage: '5mg PO', lastAdministered: '2026-03-09T02:00:00Z', frequency: 'q4-6h PRN' },
    ],
    allergies: ['Codeine'],
    attendingPhysician: 'Dr. James Rodriguez',
  },
  {
    id: 'P004',
    name: 'Lisa Patel',
    age: 34,
    gender: 'F',
    room: '115',
    status: 'caution',
    condition: 'Diabetic Ketoacidosis',
    admittedDate: '2026-03-08',
    vitals: {
      heartRate: 105,
      bloodPressure: '100/62',
      oxygenSat: 96,
      temperature: 98.6,
    },
    medications: [
      { name: 'Insulin Regular', dosage: '10 units/hr IV drip', lastAdministered: '2026-03-09T07:00:00Z', frequency: 'continuous' },
      { name: 'Potassium Chloride', dosage: '20mEq IV', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q4h' },
      { name: 'Normal Saline', dosage: '1000mL IV', lastAdministered: '2026-03-09T04:00:00Z', frequency: 'q6h' },
    ],
    allergies: [],
    attendingPhysician: 'Dr. Michael Okafor',
  },

  // STABLE (4)
  {
    id: 'P005',
    name: 'James O\'Brien',
    age: 47,
    gender: 'M',
    room: '120',
    status: 'stable',
    condition: 'Community-Acquired Pneumonia — Recovery',
    admittedDate: '2026-03-05',
    vitals: {
      heartRate: 76,
      bloodPressure: '122/78',
      oxygenSat: 97,
      temperature: 98.9,
    },
    medications: [
      { name: 'Azithromycin', dosage: '500mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'daily' },
      { name: 'Acetaminophen', dosage: '650mg PO', lastAdministered: '2026-03-09T04:00:00Z', frequency: 'q6h PRN' },
    ],
    allergies: ['Amoxicillin'],
    attendingPhysician: 'Dr. Sarah Kim',
  },
  {
    id: 'P006',
    name: 'Eleanor Davis',
    age: 81,
    gender: 'F',
    room: '125',
    status: 'stable',
    condition: 'Hip Replacement — Post-op Day 3',
    admittedDate: '2026-03-06',
    vitals: {
      heartRate: 70,
      bloodPressure: '130/82',
      oxygenSat: 98,
      temperature: 98.4,
    },
    medications: [
      { name: 'Enoxaparin', dosage: '40mg SC', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'daily' },
      { name: 'Oxycodone', dosage: '5mg PO', lastAdministered: '2026-03-09T05:00:00Z', frequency: 'q4-6h PRN' },
      { name: 'Docusate Sodium', dosage: '100mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q12h' },
    ],
    allergies: ['Aspirin', 'Ibuprofen'],
    attendingPhysician: 'Dr. Emily Nguyen',
  },
  {
    id: 'P007',
    name: 'Carlos Mendez',
    age: 53,
    gender: 'M',
    room: '130',
    status: 'stable',
    condition: 'Controlled Type 2 Diabetes — Foot Ulcer Treatment',
    admittedDate: '2026-03-07',
    vitals: {
      heartRate: 74,
      bloodPressure: '126/80',
      oxygenSat: 98,
      temperature: 98.6,
    },
    medications: [
      { name: 'Metformin', dosage: '1000mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q12h' },
      { name: 'Cephalexin', dosage: '500mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q6h' },
    ],
    allergies: [],
    attendingPhysician: 'Dr. Michael Okafor',
  },
  {
    id: 'P008',
    name: 'Susan Park',
    age: 62,
    gender: 'F',
    room: '135',
    status: 'stable',
    condition: 'Atrial Fibrillation — Rate Controlled',
    admittedDate: '2026-03-08',
    vitals: {
      heartRate: 78,
      bloodPressure: '118/74',
      oxygenSat: 99,
      temperature: 98.2,
    },
    medications: [
      { name: 'Diltiazem', dosage: '120mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q12h' },
      { name: 'Apixaban', dosage: '5mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q12h' },
    ],
    allergies: ['Amiodarone'],
    attendingPhysician: 'Dr. James Rodriguez',
  },

  // MONITORING (2)
  {
    id: 'P009',
    name: 'Henry Foster',
    age: 78,
    gender: 'M',
    room: '140',
    status: 'monitoring',
    condition: 'Observation — Fall with Head Contusion',
    admittedDate: '2026-03-09',
    vitals: {
      heartRate: 68,
      bloodPressure: '142/88',
      oxygenSat: 97,
      temperature: 98.4,
    },
    medications: [
      { name: 'Acetaminophen', dosage: '650mg PO', lastAdministered: '2026-03-09T05:00:00Z', frequency: 'q6h PRN' },
      { name: 'Lisinopril', dosage: '10mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'daily' },
    ],
    allergies: ['Morphine'],
    attendingPhysician: 'Dr. Emily Nguyen',
  },
  {
    id: 'P010',
    name: 'Aisha Johnson',
    age: 29,
    gender: 'F',
    room: '142',
    status: 'monitoring',
    condition: 'Post-operative — Appendectomy',
    admittedDate: '2026-03-09',
    vitals: {
      heartRate: 82,
      bloodPressure: '116/72',
      oxygenSat: 99,
      temperature: 98.8,
    },
    medications: [
      { name: 'Ibuprofen', dosage: '400mg PO', lastAdministered: '2026-03-09T06:00:00Z', frequency: 'q6h PRN' },
      { name: 'Ondansetron', dosage: '4mg IV', lastAdministered: '2026-03-09T03:00:00Z', frequency: 'q8h PRN' },
    ],
    allergies: [],
    attendingPhysician: 'Dr. Sarah Kim',
  },
];

// ─── Mock Chat Sessions ─────────────────────────────────────────────────────

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'CS001',
    title: 'Critical Patient Alert',
    lastMessage: 'Margaret Chen\'s oxygen saturation has dropped to 89%. Immediate intervention recommended.',
    timestamp: '2026-03-09T07:15:00Z',
    messages: [
      {
        id: 'CM001',
        role: 'user',
        content: 'Show me the status of critical patients right now.',
        timestamp: '2026-03-09T07:10:00Z',
      },
      {
        id: 'CM002',
        role: 'assistant',
        content: 'I found 2 patients currently in critical status:\n\n**1. Margaret Chen** (Room 101) — Acute Myocardial Infarction\n**2. Robert Williams** (Room 103) — Acute Respiratory Failure\n\nBoth require immediate attention. Margaret Chen\'s vitals are particularly concerning.',
        timestamp: '2026-03-09T07:10:15Z',
      },
      {
        id: 'CM003',
        role: 'user',
        content: 'What are Margaret Chen\'s current vitals?',
        timestamp: '2026-03-09T07:12:00Z',
      },
      {
        id: 'CM004',
        role: 'assistant',
        content: 'Here are Margaret Chen\'s current vitals:',
        timestamp: '2026-03-09T07:12:10Z',
        vitalsData: {
          heartRate: 112,
          bloodPressure: '90/58',
          oxygenSat: 89,
          temperature: 99.1,
        },
      },
      {
        id: 'CM005',
        role: 'user',
        content: 'Her O2 is really low. What should I do?',
        timestamp: '2026-03-09T07:14:00Z',
      },
      {
        id: 'CM006',
        role: 'assistant',
        content: 'Margaret Chen\'s oxygen saturation has dropped to 89%. Immediate intervention recommended:\n\n1. **Increase supplemental O2** — switch to non-rebreather mask at 15L/min\n2. **Elevate head of bed** to 30-45 degrees\n3. **Notify Dr. Rodriguez** immediately — consider arterial blood gas\n4. **Prepare for possible intubation** if sat doesn\'t improve within 15 minutes\n5. **Continuous SpO2 monitoring** — set alarm threshold at 90%\n\nShall I page Dr. Rodriguez?',
        timestamp: '2026-03-09T07:15:00Z',
      },
    ],
  },
  {
    id: 'CS002',
    title: 'Medication Review',
    lastMessage: 'I\'ve attached the updated medication schedule for review.',
    timestamp: '2026-03-09T06:30:00Z',
    messages: [
      {
        id: 'CM007',
        role: 'user',
        content: 'I need to review David Thompson\'s medications before his morning rounds.',
        timestamp: '2026-03-09T06:20:00Z',
      },
      {
        id: 'CM008',
        role: 'assistant',
        content: 'David Thompson (Room 112) — Post-op CABG. Current medications:\n\n| Medication | Dosage | Frequency | Last Given |\n|---|---|---|---|\n| Metoprolol | 25mg PO | q12h | 06:00 |\n| Warfarin | 5mg PO | daily | 06:00 |\n| Oxycodone | 5mg PO | q4-6h PRN | 02:00 |\n\n**Note:** He has a documented allergy to **Codeine**. Ensure no codeine-containing medications are ordered.',
        timestamp: '2026-03-09T06:20:15Z',
      },
      {
        id: 'CM009',
        role: 'user',
        content: 'Can you check his INR from the last lab report?',
        timestamp: '2026-03-09T06:25:00Z',
      },
      {
        id: 'CM010',
        role: 'assistant',
        content: 'I found David Thompson\'s latest lab report from March 8:\n\n- **INR:** 2.3 (therapeutic range: 2.0-3.0) ✓\n- **PT:** 26.1 seconds\n- **aPTT:** 34 seconds\n\nHis INR is within therapeutic range. No Warfarin dosage adjustment needed at this time.',
        timestamp: '2026-03-09T06:25:10Z',
      },
      {
        id: 'CM011',
        role: 'user',
        content: 'Here\'s the updated med schedule from Dr. Rodriguez.',
        timestamp: '2026-03-09T06:28:00Z',
        attachments: [{ name: 'med_schedule_thompson_0309.pdf', type: 'application/pdf' }],
      },
      {
        id: 'CM012',
        role: 'assistant',
        content: 'I\'ve received and indexed the updated medication schedule for David Thompson. Key changes I noticed:\n\n1. **Metoprolol** increased from 25mg to 50mg q12h\n2. **Added Lisinopril** 5mg daily for blood pressure management\n3. **Oxycodone** to be tapered starting March 10\n\nI\'ve attached the updated medication schedule for review. Shall I update his medication record?',
        timestamp: '2026-03-09T06:30:00Z',
      },
    ],
  },
  {
    id: 'CS003',
    title: 'Patient Admission',
    lastMessage: 'Patient Maria Santos has been successfully admitted to Room 145.',
    timestamp: '2026-03-09T05:45:00Z',
    messages: [
      {
        id: 'CM013',
        role: 'user',
        content: 'I need to admit a new patient. Maria Santos, 45F, came through the ER with severe abdominal pain.',
        timestamp: '2026-03-09T05:30:00Z',
      },
      {
        id: 'CM014',
        role: 'assistant',
        content: 'I\'ll help you admit Maria Santos. Let me gather the needed information:\n\n- **Name:** Maria Santos\n- **Age:** 45\n- **Gender:** Female\n- **Chief complaint:** Severe abdominal pain\n\nWhat room would you like to assign her to? Available rooms: 145, 148, 150.',
        timestamp: '2026-03-09T05:30:10Z',
      },
      {
        id: 'CM015',
        role: 'user',
        content: 'Room 145. Suspected acute cholecystitis. She\'s allergic to Erythromycin. Dr. Okafor is attending.',
        timestamp: '2026-03-09T05:35:00Z',
      },
      {
        id: 'CM016',
        role: 'assistant',
        content: 'Got it. Completing the admission:\n\n- **Room:** 145\n- **Condition:** Suspected Acute Cholecystitis\n- **Allergies:** Erythromycin\n- **Attending:** Dr. Michael Okafor\n- **Status:** Caution (pending diagnosis confirmation)\n\nShall I proceed with the admission?',
        timestamp: '2026-03-09T05:35:10Z',
      },
      {
        id: 'CM017',
        role: 'user',
        content: 'Yes, go ahead. Also order initial labs — CBC, CMP, lipase, and a right upper quadrant ultrasound.',
        timestamp: '2026-03-09T05:40:00Z',
      },
      {
        id: 'CM018',
        role: 'assistant',
        content: 'Patient Maria Santos has been successfully admitted to Room 145.\n\n**Admission Summary:**\n- Status: Caution\n- Condition: Suspected Acute Cholecystitis\n- Attending: Dr. Michael Okafor\n- Allergies: Erythromycin flagged in record\n\n**Orders placed:**\n- CBC with differential\n- Comprehensive Metabolic Panel\n- Lipase level\n- Right Upper Quadrant Ultrasound\n\nAll orders have been sent to the lab and radiology. I\'ll notify you when results are available.',
        timestamp: '2026-03-09T05:45:00Z',
      },
    ],
  },
];

// ─── Mock Search Results ────────────────────────────────────────────────────

export const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: 'SR001',
    type: 'patient',
    title: 'Margaret Chen — Acute MI',
    snippet: 'Critical patient admitted 03/08 with acute myocardial infarction. Currently on Heparin, Nitroglycerin, and Aspirin. O2 sat at 89%, requires close monitoring.',
    relevanceScore: 0.97,
    patientName: 'Margaret Chen',
    date: '2026-03-08',
  },
  {
    id: 'SR002',
    type: 'document',
    title: 'Lab Report — Robert Williams CBC',
    snippet: 'WBC: 18.2 (H), RBC: 4.1, Hemoglobin: 12.8, Platelets: 245. Elevated white blood cell count consistent with infection. Recommend blood cultures.',
    relevanceScore: 0.94,
    patientName: 'Robert Williams',
    date: '2026-03-08',
  },
  {
    id: 'SR003',
    type: 'note',
    title: 'Dr. Rodriguez — Post-op Note for David Thompson',
    snippet: 'CABG x3 completed successfully. Patient tolerated procedure well. Plan: Continue anticoagulation, monitor chest tube output, early mobilization Day 2.',
    relevanceScore: 0.91,
    patientName: 'David Thompson',
    date: '2026-03-06',
  },
  {
    id: 'SR004',
    type: 'document',
    title: 'Chest X-ray Report — Robert Williams',
    snippet: 'Bilateral infiltrates consistent with ARDS. No pneumothorax. Endotracheal tube in appropriate position. Recommend follow-up imaging in 24 hours.',
    relevanceScore: 0.89,
    patientName: 'Robert Williams',
    date: '2026-03-08',
  },
  {
    id: 'SR005',
    type: 'note',
    title: 'Nursing Note — Lisa Patel DKA Management',
    snippet: 'Blood glucose trending down: 420 → 310 → 245 mg/dL over 6 hours. Insulin drip maintained at 10 units/hr. Potassium repleted. Patient alert and oriented.',
    relevanceScore: 0.86,
    patientName: 'Lisa Patel',
    date: '2026-03-09',
  },
  {
    id: 'SR006',
    type: 'document',
    title: 'Lab Report — Lisa Patel Metabolic Panel',
    snippet: 'Glucose: 245 (H), BUN: 28, Creatinine: 1.2, Potassium: 3.8, Bicarbonate: 16 (L), Anion gap: 18 (H). DKA resolving with treatment.',
    relevanceScore: 0.84,
    patientName: 'Lisa Patel',
    date: '2026-03-09',
  },
  {
    id: 'SR007',
    type: 'patient',
    title: 'Eleanor Davis — Hip Replacement Recovery',
    snippet: 'Post-op day 3 total hip arthroplasty. Stable vitals. PT session scheduled. On Enoxaparin for DVT prophylaxis. Pain well-controlled with PRN Oxycodone.',
    relevanceScore: 0.82,
    patientName: 'Eleanor Davis',
    date: '2026-03-06',
  },
  {
    id: 'SR008',
    type: 'note',
    title: 'Dr. Nguyen — Fall Risk Assessment, Henry Foster',
    snippet: 'Patient admitted after witnessed fall at home. GCS 15. CT head negative for acute bleed. Neuro checks q2h x 24 hours. Fall precautions initiated.',
    relevanceScore: 0.79,
    patientName: 'Henry Foster',
    date: '2026-03-09',
  },
  {
    id: 'SR009',
    type: 'document',
    title: 'ECG Report — Susan Park',
    snippet: 'Atrial fibrillation with controlled ventricular rate at 78 bpm. No ST changes. QTc within normal limits. Compared to prior: rate improved with Diltiazem.',
    relevanceScore: 0.76,
    patientName: 'Susan Park',
    date: '2026-03-08',
  },
  {
    id: 'SR010',
    type: 'note',
    title: 'Discharge Planning Note — James O\'Brien',
    snippet: 'Pneumonia resolving. Afebrile x 48 hours. O2 sat stable on room air. Plan for discharge tomorrow with 5-day course of oral Azithromycin. Follow-up in 1 week.',
    relevanceScore: 0.73,
    patientName: 'James O\'Brien',
    date: '2026-03-09',
  },
];

// ─── Mock Canned Responses ──────────────────────────────────────────────────

export const MOCK_CANNED_RESPONSES: Array<{
  keywords: string[];
  response: string;
  vitalsData?: Patient['vitals'];
}> = [
  {
    keywords: ['critical', 'critical patients', 'urgent'],
    response: 'There are currently **2 critical patients**:\n\n1. **Margaret Chen** (Room 101) — Acute Myocardial Infarction, O2 sat 89%\n2. **Robert Williams** (Room 103) — Acute Respiratory Failure, O2 sat 84%\n\nBoth require immediate attention. Would you like details on either patient?',
  },
  {
    keywords: ['vitals', 'vital signs', 'heart rate', 'blood pressure', 'oxygen'],
    response: 'Here are the latest vitals for the patient:',
    vitalsData: {
      heartRate: 112,
      bloodPressure: '90/58',
      oxygenSat: 89,
      temperature: 99.1,
    },
  },
  {
    keywords: ['medication', 'medications', 'meds', 'prescribe', 'drug'],
    response: 'I can help with medication management. I can:\n\n- **Review** current medications for any patient\n- **Add** a new prescription\n- **Log** medication administration\n- **Check** for drug-allergy interactions\n\nWhich patient would you like to review?',
  },
  {
    keywords: ['admit', 'admission', 'new patient'],
    response: 'I\'ll help you with the admission. Please provide:\n\n1. **Patient name** and demographics\n2. **Chief complaint** or diagnosis\n3. **Room assignment** (available: 145, 148, 150)\n4. **Known allergies**\n5. **Attending physician**\n\nOr just tell me the details and I\'ll fill in the form.',
  },
  {
    keywords: ['discharge', 'release', 'send home'],
    response: 'I can help prepare a discharge. I\'ll need to:\n\n1. Verify all pending orders are completed\n2. Reconcile medications for take-home prescriptions\n3. Generate discharge instructions\n4. Schedule follow-up appointments\n\nWhich patient are you looking to discharge?',
  },
  {
    keywords: ['search', 'find', 'look up', 'records'],
    response: 'I can search across all patient records, lab reports, doctor notes, and uploaded documents. You can use:\n\n- **Simple search** — filters by name, room, condition\n- **Semantic search** — AI-powered, understands concepts like "patients with elevated WBC"\n\nWhat would you like to search for?',
  },
  {
    keywords: ['upload', 'document', 'file', 'report', 'image'],
    response: 'You can upload documents in two ways:\n\n1. **Drag and drop** a file into this chat\n2. **Use the Upload button** in the sidebar\n\nI accept PDFs, images (X-rays, scans), and text documents. Once uploaded, I\'ll automatically index the content for semantic search.',
  },
  {
    keywords: ['help', 'what can you do', 'capabilities'],
    response: 'I\'m NovaHealth AI, your nursing assistant. Here\'s what I can do:\n\n- **Patient Management** — Admissions, discharges, status updates\n- **Vitals Monitoring** — View and track vital signs\n- **Medication Management** — Review, prescribe, log administration, allergy checks\n- **Document Search** — Semantic search across records, labs, and notes\n- **File Upload** — Index PDFs, images, and documents\n- **Voice Input** — Speak your commands using the microphone\n\nJust ask me anything!',
  },
];

// Fallback response when no keywords match
export const FALLBACK_RESPONSE = 'I understand your request. Let me look into that for you. Could you provide a bit more detail so I can assist you more effectively?';
