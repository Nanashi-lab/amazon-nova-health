export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  room: string;
  status: 'critical' | 'caution' | 'stable' | 'monitoring';
  condition: string;
  admittedDate: string;
  vitals: {
    heartRate: number;
    bloodPressure: string;
    oxygenSat: number;
    temperature: number;
  };
  medications: Array<{
    name: string;
    dosage: string;
    lastAdministered: string;
    frequency: string;
  }>;
  allergies: string[];
  attendingPhysician: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: Array<{ name: string; type: string }>;
  vitalsData?: Patient['vitals'];
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: ChatMessage[];
}

export interface SearchResult {
  id: string;
  type: 'patient' | 'document' | 'note';
  title: string;
  snippet: string;
  relevanceScore?: number;
  patientName?: string;
  date: string;
}

export interface Document {
  id: number;
  filename: string;
  patientId: string;
  fileType: string;
  extractedText: string;
  uploadedAt: string;
}

export type SearchMode = 'simple' | 'semantic';
export type MainView = 'welcome' | 'patient' | 'search' | 'patients' | 'document';
