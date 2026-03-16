'use client';

import { useState, useRef, useCallback, KeyboardEvent, DragEvent, ChangeEvent } from 'react';
import { useVoice, VoiceSessionState } from '../../lib/useVoice';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  onSend: (text: string, attachments?: File[]) => void;
  disabled?: boolean;
  voiceAvailable?: boolean | null;
  onVoiceSessionStart?: () => void;
  onVoiceUserTranscript?: (text: string) => void;
  onVoiceAssistantTranscript?: (text: string, isFinal: boolean) => void;
  onVoiceToolStart?: (data: { name: string; toolUseId: string }) => void;
  onVoiceResponseComplete?: () => void;
  onVoiceSessionEnd?: () => void;
}

const VOICE_LABELS: Record<VoiceSessionState, string> = {
  idle: '',
  connecting: 'Connecting to Nova Sonic...',
  listening: 'Listening...',
  thinking: 'Nova is thinking...',
  speaking: 'Nova is speaking...',
};

export default function ChatInput({
  onSend,
  disabled,
  voiceAvailable: voiceAvailableProp,
  onVoiceSessionStart,
  onVoiceUserTranscript,
  onVoiceAssistantTranscript,
  onVoiceToolStart,
  onVoiceResponseComplete,
  onVoiceSessionEnd,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real voice hook — phone-call mode
  const voice = useVoice({
    onTranscript: (data) => {
      if (data.role === 'user' && data.isFinal && data.text.trim()) {
        onVoiceUserTranscript?.(data.text);
      } else if (data.role === 'assistant') {
        onVoiceAssistantTranscript?.(data.text, data.isFinal);
      }
    },
    onToolStart: (data) => {
      onVoiceToolStart?.(data);
    },
    onError: (error) => {
      console.error('[Voice]', error);
    },
    onResponseComplete: () => {
      onVoiceResponseComplete?.();
    },
    onSessionEnd: () => {
      onVoiceSessionEnd?.();
    },
  });

  const effectiveVoiceAvailable = voiceAvailableProp !== undefined ? voiceAvailableProp : voice.voiceAvailable;
  const isVoiceActive = voice.sessionState !== 'idle';

  const send = useCallback(() => {
    if (disabled || isVoiceActive) return;
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setText('');
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [text, files, onSend, disabled, isVoiceActive]);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }, [send]);

  const onTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`;
  }, []);

  // File handling
  const onFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onDragOver = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (isVoiceActive) {
      voice.endSession();
    } else if (effectiveVoiceAvailable !== false) {
      onVoiceSessionStart?.();
      voice.startSession();
    }
  }, [isVoiceActive, effectiveVoiceAvailable, voice, onVoiceSessionStart]);

  const isMicDisabled = effectiveVoiceAvailable === false;
  const isTextDisabled = disabled || isVoiceActive;
  const hasContent = !isTextDisabled && (text.trim().length > 0 || files.length > 0);

  return (
    <div
      className={styles.wrapper}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop zone */}
      {isDragging && (
        <div className={styles.dropzone}>
          <span>Drop files here</span>
        </div>
      )}

      {/* Voice session overlay */}
      {isVoiceActive && (
        <div className={`${styles.voiceOverlay} ${styles[`voice_${voice.sessionState}`]}`}>
          <div className={styles.voiceCenter}>
            <div className={styles.voiceIndicator}>
              {voice.sessionState === 'listening' && (
                <>
                  <span className={styles.voiceBar} />
                  <span className={styles.voiceBar} />
                  <span className={styles.voiceBar} />
                  <span className={styles.voiceBar} />
                  <span className={styles.voiceBar} />
                </>
              )}
              {voice.sessionState === 'thinking' && (
                <span className={styles.voiceDots}>
                  <span />
                  <span />
                  <span />
                </span>
              )}
              {voice.sessionState === 'speaking' && (
                <>
                  <span className={`${styles.voiceBar} ${styles.voiceBarSpeaking}`} />
                  <span className={`${styles.voiceBar} ${styles.voiceBarSpeaking}`} />
                  <span className={`${styles.voiceBar} ${styles.voiceBarSpeaking}`} />
                  <span className={`${styles.voiceBar} ${styles.voiceBarSpeaking}`} />
                  <span className={`${styles.voiceBar} ${styles.voiceBarSpeaking}`} />
                </>
              )}
              {voice.sessionState === 'connecting' && (
                <span className={styles.voiceSpinner} />
              )}
            </div>
            <span className={styles.voiceLabel}>
              {VOICE_LABELS[voice.sessionState]}
            </span>
          </div>
          <button className={styles.voiceEndBtn} onClick={toggleVoice}>
            End
          </button>
        </div>
      )}

      {/* File chips */}
      {files.length > 0 && (
        <div className={styles.fileChips}>
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className={styles.chip}>
              <span className={styles.chipName}>{f.name}</span>
              <button className={styles.chipRemove} onClick={() => removeFile(i)} aria-label={`Remove ${f.name}`}>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className={styles.inputRow}>
        <button
          className={styles.attachBtn}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          placeholder={isTextDisabled ? (isVoiceActive ? "Voice session active..." : "AI is thinking...") : "Message NovaHealth AI..."}
          rows={1}
          disabled={isTextDisabled}
        />

        <button
          className={`${styles.micBtn} ${isVoiceActive ? styles.micActive : ''} ${isMicDisabled ? styles.micDisabled : ''}`}
          onClick={toggleVoice}
          disabled={isMicDisabled || disabled}
          aria-label={isVoiceActive ? 'End voice session' : 'Start voice session'}
          title={isMicDisabled ? 'Voice unavailable - use text chat' : (isVoiceActive ? 'End voice session' : 'Start voice session')}
        >
          {isVoiceActive ? (
            /* Phone/end icon when active */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Mic icon when idle */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>

        <button
          className={`${styles.sendBtn} ${hasContent ? styles.sendActive : ''}`}
          onClick={send}
          disabled={!hasContent}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className={styles.hiddenInput}
        onChange={onFileSelect}
      />
    </div>
  );
}
