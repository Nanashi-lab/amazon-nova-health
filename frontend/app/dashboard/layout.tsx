'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/context';
import { streamChat, apiJson } from '@/lib/api';
import TopNav from '@/components/layout/TopNav';
import Sidebar from '@/components/layout/Sidebar';
import MainArea from '@/components/layout/MainArea';
import ChatPanel from '@/components/layout/ChatPanel';
import SearchBar from '@/components/sidebar/SearchBar';
import PatientList from '@/components/sidebar/PatientList';
import AddPatientButton from '@/components/sidebar/AddPatientButton';
import ChatMessageList from '@/components/chat/ChatMessageList';
import ChatInput from '@/components/chat/ChatInput';
import ChatSessionList from '@/components/chat/ChatSessionList';
import styles from '@/components/layout/DashboardLayout.module.css';
import chatStyles from '@/components/chat/ChatHeader.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, actions } = useApp();
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingContentRef = useRef('');
  const streamingMessageIdRef = useRef('');

  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) router.push('/');
  }, [state.isAuthenticated, state.isLoading, router]);

  const activeSession = state.chatSessions.find((s) => s.id === state.activeChatId);
  const voiceAssistantMsgIdRef = useRef('');
  const voiceAssistantContentRef = useRef('');
  const voiceAssistantDbSavedRef = useRef(false);

  // Voice: user finished speaking, persist and show transcript
  const handleVoiceUserTranscript = useCallback(async (text: string) => {
    const sessionId = state.activeChatId;
    if (!sessionId || !text.trim()) return;

    // Add user message to chat
    actions.addChatMessage(sessionId, {
      id: `CM_${Date.now()}_vu`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    });

    // Persist to backend
    try {
      await apiJson(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ role: 'user', content: text }),
      });
    } catch {
      // Non-critical -- message is already in local state
    }

    // Create placeholder for assistant response
    const msgId = `CM_${Date.now()}_va`;
    voiceAssistantMsgIdRef.current = msgId;
    voiceAssistantContentRef.current = '';
    actions.addChatMessage(sessionId, {
      id: msgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    });
  }, [state.activeChatId, actions]);

  // Voice: assistant transcript chunk
  // Nova Sonic sends transcripts twice (fast text + TTS-synced). Only use isFinal to avoid duplication.
  const handleVoiceAssistantTranscript = useCallback(async (text: string, isFinal: boolean) => {
    const sessionId = state.activeChatId;
    if (!sessionId) return;

    // Only process final transcripts to avoid duplication
    if (!isFinal) return;

    // If no message placeholder exists yet, create one
    if (!voiceAssistantMsgIdRef.current) {
      const msgId = `CM_${Date.now()}_va`;
      voiceAssistantMsgIdRef.current = msgId;
      voiceAssistantContentRef.current = '';
      actions.addChatMessage(sessionId, {
        id: msgId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      });
    }

    // Append — Nova Sonic sends separate final transcripts per speech segment
    // e.g. "hello" then "welcome" should become "hello welcome", not just "welcome"
    if (voiceAssistantContentRef.current) {
      voiceAssistantContentRef.current += ' ' + text;
    } else {
      voiceAssistantContentRef.current = text;
    }
    actions.updateStreamingMessage(
      sessionId,
      voiceAssistantMsgIdRef.current,
      voiceAssistantContentRef.current
    );

    // Persist to DB — save once, then no-op on subsequent segments
    // (response_complete may fire before final transcript, so persist here)
    if (!voiceAssistantDbSavedRef.current && voiceAssistantContentRef.current.trim()) {
      voiceAssistantDbSavedRef.current = true;
      try {
        await apiJson(`/api/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ role: 'assistant', content: voiceAssistantContentRef.current }),
        });
      } catch {
        // Non-critical
      }
    }
  }, [state.activeChatId, actions]);

  // Voice: tool start event — finalize current message and start fresh for post-tool response
  const handleVoiceToolStart = useCallback((data: { name: string; toolUseId: string }) => {
    const sessionId = state.activeChatId;
    if (!sessionId) return;

    // Finalize current assistant message (pre-tool response) if it has content
    const oldMsgId = voiceAssistantMsgIdRef.current;
    if (oldMsgId && voiceAssistantContentRef.current.trim()) {
      actions.updateStreamingMessage(sessionId, oldMsgId, voiceAssistantContentRef.current);
    }

    // Create new placeholder for post-tool response
    const newMsgId = `CM_${Date.now()}_vt`;
    voiceAssistantMsgIdRef.current = newMsgId;
    voiceAssistantContentRef.current = '';
    voiceAssistantDbSavedRef.current = false;
    actions.addChatMessage(sessionId, {
      id: newMsgId,
      role: 'assistant',
      content: `[Tool: ${data.name}...]`,
      timestamp: new Date().toISOString(),
    });
  }, [state.activeChatId, actions]);

  // Voice: response complete — reset for next cycle
  const handleVoiceResponseComplete = useCallback(() => {
    voiceAssistantContentRef.current = '';
    voiceAssistantMsgIdRef.current = '';
    voiceAssistantDbSavedRef.current = false;
  }, []);

  const handleSend = useCallback(async (text: string, attachments?: File[]) => {
    if (isStreaming) return;

    // Ensure we have an active session before sending
    let sessionId = state.activeChatId;
    if (!sessionId) {
      // No session yet — let the server create one (send null)
      // We'll create a temporary local session to hold messages until the server responds
      const tempId = `temp_${Date.now()}`;
      sessionId = tempId;
      actions.createTempChatSession(tempId);
      actions.setActiveChatId(tempId);
    }

    const sessionIdRef = { current: sessionId };

    // Add user message immediately (optimistic)
    actions.addChatMessage(sessionIdRef.current, {
      id: `CM_${Date.now()}_u`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachments: attachments?.map((f) => ({ name: f.name, type: f.type })),
    });

    // Create a streaming assistant message placeholder
    const streamMsgId = `CM_${Date.now()}_stream`;
    streamingMessageIdRef.current = streamMsgId;
    streamingContentRef.current = '';

    actions.addChatMessage(sessionIdRef.current, {
      id: streamMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    });

    setIsTyping(true);
    setIsStreaming(true);

    // Send null if this is a temp session so the server creates a real one
    const serverSessionId = sessionIdRef.current.startsWith('temp_') ? null : sessionIdRef.current;

    await streamChat(
      text,
      serverSessionId,
      // onToken
      (tokenText) => {
        setIsTyping(false);
        streamingContentRef.current += tokenText;
        actions.updateStreamingMessage(
          sessionIdRef.current,
          streamingMessageIdRef.current,
          streamingContentRef.current
        );
      },
      // onToolStart
      (tool) => {
        setIsTyping(false);
        streamingContentRef.current += `\n[Tool: ${tool.name}...]\n`;
        actions.updateStreamingMessage(
          sessionIdRef.current,
          streamingMessageIdRef.current,
          streamingContentRef.current
        );
      },
      // onToolResult
      (result) => {
        streamingContentRef.current += `[Result: ${result.content.slice(0, 100)}]\n`;
        actions.updateStreamingMessage(
          sessionIdRef.current,
          streamingMessageIdRef.current,
          streamingContentRef.current
        );
      },
      // onDone
      (fullText, returnedSessionId) => {
        // Server created a real session — migrate temp session to real ID
        if (returnedSessionId && returnedSessionId !== sessionIdRef.current) {
          actions.migrateTempSession(sessionIdRef.current, returnedSessionId);
          sessionIdRef.current = returnedSessionId;
        }
        // Finalize the streaming message with the full text
        actions.updateStreamingMessage(
          sessionIdRef.current,
          streamingMessageIdRef.current,
          fullText || streamingContentRef.current
        );
        setIsTyping(false);
        setIsStreaming(false);
      },
      // onError
      (error) => {
        actions.updateStreamingMessage(
          sessionIdRef.current,
          streamingMessageIdRef.current,
          streamingContentRef.current + `\n\nError: ${error}`
        );
        setIsTyping(false);
        setIsStreaming(false);
      }
    );
  }, [state.activeChatId, actions, isStreaming]);

  if (state.isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!state.isAuthenticated) return null;

  return (
    <div className={styles.dashboard}>
      <div className={styles.topnav}>
        <TopNav />
      </div>
      <div className={styles.sidebar}>
        <Sidebar>
          <SearchBar />
          <PatientList />
          <AddPatientButton />
        </Sidebar>
      </div>
      <div className={styles.mainArea}>
        <MainArea>{children}</MainArea>
      </div>
      <div className={styles.chatPanel}>
        <ChatPanel>
          <div className={chatStyles.header}>
            <div className={chatStyles.headerLeft}>
              <h3 className={chatStyles.title}>Chat</h3>
              {activeSession && (
                <span className={chatStyles.sessionName}>{activeSession.title}</span>
              )}
            </div>
            <ChatSessionList />
          </div>
          <ChatMessageList isTyping={isTyping} />
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming}
            voiceAvailable={state.voiceAvailable}
            onVoiceSessionStart={() => actions.createNewChatSession()}
            onVoiceUserTranscript={handleVoiceUserTranscript}
            onVoiceAssistantTranscript={handleVoiceAssistantTranscript}
            onVoiceToolStart={handleVoiceToolStart}
            onVoiceResponseComplete={handleVoiceResponseComplete}
            onVoiceSessionEnd={() => {
              // Finalize any incomplete assistant message so chat doesn't show spinner
              const sessionId = state.activeChatId;
              if (sessionId && voiceAssistantMsgIdRef.current) {
                const content = voiceAssistantContentRef.current.trim() || '[Voice session ended]';
                actions.updateStreamingMessage(sessionId, voiceAssistantMsgIdRef.current, content);
              }
              voiceAssistantMsgIdRef.current = '';
              voiceAssistantContentRef.current = '';
            }}
          />
        </ChatPanel>
      </div>
    </div>
  );
}
