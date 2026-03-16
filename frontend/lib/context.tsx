'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { Patient, ChatMessage, ChatSession, SearchResult, SearchMode, MainView, Document } from './types';
import { apiJson, apiFetch, setToken, clearToken } from './api';

// --- State Interface ---

export interface AppState {
  isAuthenticated: boolean;
  isLoading: boolean;
  patients: Patient[];
  selectedPatientId: string | null;
  chatSessions: ChatSession[];
  activeChatId: string;
  searchMode: SearchMode;
  searchQuery: string;
  searchResults: SearchResult[] | null;
  mainView: MainView;
  selectedDocument: Document | null;
  voiceAvailable: boolean | null;
}

// --- Actions Interface ---

export interface AppActions {
  login(email: string, password: string): Promise<boolean>;
  logout(): void;
  selectPatient(id: string): void;
  setSearchMode(mode: SearchMode): void;
  submitSearch(query: string): void;
  clearSearch(): void;
  setActiveChatId(id: string): void;
  addChatMessage(sessionId: string, message: ChatMessage): void;
  updateStreamingMessage(sessionId: string, messageId: string, content: string): void;
  createNewChatSession(): void;
  createTempChatSession(tempId: string): void;
  migrateTempSession(tempId: string, realId: string): void;
  goHome(): void;
  showAllPatients(): void;
  addPatient(patient: Omit<Patient, 'id'>): Promise<void>;
  updatePatient(id: string, updates: Partial<Omit<Patient, 'id'>>): Promise<void>;
  refreshPatients(): Promise<void>;
  viewDocument(documentId: number): void;
  uploadDocument(file: File, patientId: string): Promise<void>;
}

// --- Context ---

interface AppContextValue {
  state: AppState;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

// --- Provider ---

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string>('');
  const [searchMode, setSearchMode] = useState<SearchMode>('simple');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [mainView, setMainView] = useState<MainView>('welcome');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);

  // Load data after authentication
  const loadAppData = useCallback(async () => {
    try {
      // Load patients
      const patientRes = await apiJson<{ patients: Patient[]; total: number }>('/api/patients/');
      setPatients(patientRes.patients);

      // Load chat sessions
      const sessionsRes = await apiJson<Array<{ id: string; title: string; updatedAt: string }>>('/api/chat/sessions');
      const sessions: ChatSession[] = sessionsRes.map((s) => ({
        id: s.id,
        title: s.title,
        lastMessage: '',
        timestamp: s.updatedAt || new Date().toISOString(),
        messages: [],
      }));
      setChatSessions(sessions);
      if (sessions.length > 0) {
        setActiveChatIdState(sessions[0].id);
      }
    } catch {
      // If data load fails, stay authenticated but with empty data
    }
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        await apiJson<{ id: string; email: string; name: string; role: string }>('/api/auth/me');
        setIsAuthenticated(true);
        await loadAppData();
      } catch {
        clearToken();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [loadAppData]);

  // Check voice availability when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    async function checkVoice() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/voice/health`
        );
        const data = await res.json();
        setVoiceAvailable(data.available === true);
      } catch {
        setVoiceAvailable(false);
      }
    }
    checkVoice();
  }, [isAuthenticated]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await apiJson<{ access_token: string; token_type: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      setToken(res.access_token);
      setIsAuthenticated(true);
      await loadAppData();
      return true;
    } catch {
      return false;
    }
  }, [loadAppData]);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
    setPatients([]);
    setChatSessions([]);
    setActiveChatIdState('');
    setSelectedPatientId(null);
    setSearchResults(null);
    setMainView('welcome');
  }, []);

  const selectPatient = useCallback(async (id: string) => {
    setSelectedPatientId(id);
    setMainView('patient');
    // Fetch fresh patient data
    try {
      const patient = await apiJson<Patient>(`/api/patients/${id}`);
      setPatients((prev) => prev.map((p) => (p.id === id ? patient : p)));
    } catch {
      // Use cached data if fetch fails
    }
  }, []);

  const submitSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    try {
      const res = await apiJson<{ results: SearchResult[]; total: number }>(
        `/api/search?q=${encodeURIComponent(query)}&mode=${searchMode}`
      );
      setSearchResults(res.results);
      setMainView('search');
    } catch (err) {
      console.error('[Search] failed:', err);
      setSearchResults([]);
      setMainView('search');
    }
  }, [searchMode]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setMainView('welcome');
  }, []);

  const addChatMessage = useCallback((sessionId: string, message: ChatMessage) => {
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, message],
              lastMessage: message.content.slice(0, 80),
              timestamp: message.timestamp,
            }
          : session
      )
    );
  }, []);

  const updateStreamingMessage = useCallback((sessionId: string, messageId: string, content: string) => {
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map((m) =>
                m.id === messageId ? { ...m, content } : m
              ),
            }
          : session
      )
    );
  }, []);

  const setActiveChatId = useCallback(async (id: string) => {
    setActiveChatIdState(id);
    // Fetch messages for this session if not already loaded
    const session = chatSessions.find((s) => s.id === id);
    if (session && session.messages.length === 0) {
      try {
        const msgs = await apiJson<Array<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          timestamp: string;
          attachments?: Array<{ name: string; type: string }>;
        }>>(`/api/chat/sessions/${id}/messages`);
        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  messages: msgs.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                    attachments: m.attachments,
                  })),
                }
              : s
          )
        );
      } catch {
        // Keep empty messages on failure
      }
    }
  }, [chatSessions]);

  const createNewChatSession = useCallback(async () => {
    // Immediately create a local placeholder so the UI switches right away
    const tempId = `local_${Date.now()}`;
    const newSession: ChatSession = {
      id: tempId,
      title: 'New Chat',
      lastMessage: '',
      timestamp: new Date().toISOString(),
      messages: [],
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveChatIdState(tempId);

    // Then create on server and migrate the ID
    try {
      const res = await apiJson<{ id: string; title: string }>('/api/chat/sessions', {
        method: 'POST',
      });
      setChatSessions((prev) =>
        prev.map((s) => (s.id === tempId ? { ...s, id: res.id, title: res.title } : s))
      );
      setActiveChatIdState(res.id);
    } catch {
      // Keep the local session as-is
    }
  }, []);

  const createTempChatSession = useCallback((tempId: string) => {
    const newSession: ChatSession = {
      id: tempId,
      title: 'New Chat',
      lastMessage: '',
      timestamp: new Date().toISOString(),
      messages: [],
    };
    setChatSessions((prev) => [newSession, ...prev]);
  }, []);

  const migrateTempSession = useCallback((tempId: string, realId: string) => {
    setChatSessions((prev) =>
      prev.map((s) =>
        s.id === tempId ? { ...s, id: realId } : s
      )
    );
    setActiveChatIdState(realId);
  }, []);

  const viewDocument = useCallback(async (documentId: number) => {
    try {
      // Backend returns snake_case, frontend expects camelCase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await apiJson<any>(`/api/documents/${documentId}`);
      const doc: Document = {
        id: raw.id,
        filename: raw.filename,
        patientId: raw.patient_id,
        fileType: raw.file_type || 'text',
        extractedText: raw.extracted_text || '',
        uploadedAt: raw.uploaded_at || '',
      };
      setSelectedDocument(doc);
      setMainView('document');
    } catch {
      // Silently fail
    }
  }, []);

  const uploadDocument = useCallback(async (file: File, patientId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    const res = await apiFetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `Upload error ${res.status}`);
    }
  }, []);

  const goHome = useCallback(() => {
    setSelectedPatientId(null);
    setMainView('welcome');
  }, []);

  const showAllPatients = useCallback(() => {
    setMainView('patients');
  }, []);

  const addPatient = useCallback(async (patient: Omit<Patient, 'id'>) => {
    const created = await apiJson<Patient>('/api/patients/', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
    setPatients((prev) => [...prev, created]);
  }, []);

  const updatePatient = useCallback(async (id: string, updates: Partial<Omit<Patient, 'id'>>) => {
    const updated = await apiJson<Patient>(`/api/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setPatients((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }, []);

  const refreshPatients = useCallback(async () => {
    try {
      const res = await apiJson<{ patients: Patient[]; total: number }>('/api/patients/');
      setPatients(res.patients);
    } catch {
      // Keep existing data
    }
  }, []);

  const state: AppState = {
    isAuthenticated,
    isLoading,
    patients,
    selectedPatientId,
    chatSessions,
    activeChatId,
    searchMode,
    searchQuery,
    searchResults,
    mainView,
    selectedDocument,
    voiceAvailable,
  };

  const actions: AppActions = useMemo(() => ({
    login,
    logout,
    selectPatient,
    setSearchMode,
    submitSearch,
    clearSearch,
    setActiveChatId,
    addChatMessage,
    updateStreamingMessage,
    createNewChatSession,
    createTempChatSession,
    migrateTempSession,
    goHome,
    showAllPatients,
    addPatient,
    updatePatient,
    refreshPatients,
    viewDocument,
    uploadDocument,
  }), [
    login, logout, selectPatient, setSearchMode, submitSearch, clearSearch,
    setActiveChatId, addChatMessage, updateStreamingMessage, createNewChatSession,
    createTempChatSession, migrateTempSession,
    goHome, showAllPatients, addPatient, updatePatient, refreshPatients,
    viewDocument, uploadDocument,
  ]);

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// --- Hook ---

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
