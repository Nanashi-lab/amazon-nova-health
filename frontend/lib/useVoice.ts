'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// --- Types ---

export type VoiceSessionState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

export interface UseVoiceOptions {
  onTranscript: (data: { text: string; role: string; isFinal: boolean }) => void;
  onToolStart: (data: { name: string; toolUseId: string }) => void;
  onError: (error: string) => void;
  onResponseComplete: () => void;
  onSessionEnd: () => void;
}

export interface UseVoiceReturn {
  voiceAvailable: boolean | null;
  sessionState: VoiceSessionState;
  startSession: () => void;
  endSession: () => void;
}

// --- Helpers ---

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

/** Encode an ArrayBuffer to base64, chunked to avoid stack overflow. */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Decode base64 LPCM (Int16 LE) to Float32Array for AudioContext playback. */
function base64ToFloat32(base64: string): Float32Array {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samples = bytes.length / 2;
  const float32 = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

// --- Hook ---

export function useVoice(options: UseVoiceOptions): UseVoiceReturn {
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [sessionState, setSessionState] = useState<VoiceSessionState>('idle');

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const playingCountRef = useRef(0);
  const optionsRef = useRef(options);
  const sessionStateRef = useRef<VoiceSessionState>('idle');
  optionsRef.current = options;

  // Keep ref in sync with state (for use inside callbacks without stale closures)
  const setSessionStateSync = useCallback((s: VoiceSessionState) => {
    sessionStateRef.current = s;
    setSessionState(s);
  }, []);

  // Check voice availability on mount
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${API_BASE}/api/voice/health`);
        const data = await res.json();
        if (!cancelled) setVoiceAvailable(data.available === true);
      } catch {
        if (!cancelled) setVoiceAvailable(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  const cleanupAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const fullCleanup = useCallback(() => {
    cleanupAudio();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    nextPlayTimeRef.current = 0;
    playingCountRef.current = 0;
    setSessionStateSync('idle');
  }, [cleanupAudio, setSessionStateSync]);

  // WebSocket message handler
  const handleWsMessage = useCallback((event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'audio': {
          // First audio chunk = agent is speaking
          if (sessionStateRef.current === 'thinking') {
            setSessionStateSync('speaking');
          }

          const float32 = base64ToFloat32(msg.audio);
          const ctx = audioCtxRef.current;
          if (!ctx) break;

          const buffer = ctx.createBuffer(1, float32.length, 16000);
          buffer.getChannelData(0).set(float32);

          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);

          if (nextPlayTimeRef.current < ctx.currentTime) {
            nextPlayTimeRef.current = ctx.currentTime;
          }
          source.start(nextPlayTimeRef.current);
          nextPlayTimeRef.current += buffer.duration;

          playingCountRef.current += 1;

          source.onended = () => {
            playingCountRef.current -= 1;
            if (playingCountRef.current <= 0) {
              playingCountRef.current = 0;
            }
          };
          break;
        }
        case 'transcript': {
          // User final transcript → agent is now thinking
          if (msg.role === 'user' && msg.isFinal) {
            setSessionStateSync('thinking');
          }
          optionsRef.current.onTranscript({
            text: msg.text,
            role: msg.role,
            isFinal: msg.isFinal,
          });
          break;
        }
        case 'tool_start':
          optionsRef.current.onToolStart({
            name: msg.name,
            toolUseId: msg.toolUseId,
          });
          break;
        case 'response_complete':
          // Agent done speaking this turn → back to listening for next turn
          setSessionStateSync('listening');
          optionsRef.current.onResponseComplete();
          break;
        case 'session_end':
          // Server ended the session (agent called stop_conversation or timeout)
          optionsRef.current.onSessionEnd();
          fullCleanup();
          break;
        case 'error':
          optionsRef.current.onError(msg.message || 'Voice error');
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }, [setSessionStateSync, fullCleanup]);

  const startSession = useCallback(async () => {
    if (sessionStateRef.current !== 'idle') return;

    setSessionStateSync('connecting');

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        optionsRef.current.onError('Not authenticated');
        setSessionStateSync('idle');
        return;
      }

      // Create AudioContext at 16kHz and resume (user gesture)
      const ctx = new AudioContext({ sampleRate: 16000 });
      await ctx.resume();
      audioCtxRef.current = ctx;
      nextPlayTimeRef.current = 0;
      playingCountRef.current = 0;

      // Get mic stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
        },
      });
      streamRef.current = stream;

      // Load AudioWorklet
      await ctx.audioWorklet.addModule('/pcm-processor.js');
      const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
      workletNodeRef.current = workletNode;

      // Connect mic → worklet
      const sourceNode = ctx.createMediaStreamSource(stream);
      sourceNode.connect(workletNode);
      sourceNodeRef.current = sourceNode;

      // Open WebSocket
      const ws = new WebSocket(`${WS_BASE}/api/voice?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setSessionStateSync('listening');

        // Start streaming mic audio to server
        workletNode.port.onmessage = (e: MessageEvent) => {
          if (ws.readyState === WebSocket.OPEN) {
            const base64 = arrayBufferToBase64(e.data);
            ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
          }
        };
      };

      ws.onmessage = handleWsMessage;

      ws.onerror = () => {
        optionsRef.current.onError('Voice connection error');
        fullCleanup();
      };

      ws.onclose = () => {
        // If not already idle (user-initiated end), clean up
        if (sessionStateRef.current !== 'idle') {
          optionsRef.current.onSessionEnd();
          fullCleanup();
        }
      };
    } catch (err) {
      optionsRef.current.onError(
        err instanceof Error ? err.message : 'Failed to start voice session'
      );
      fullCleanup();
    }
  }, [handleWsMessage, fullCleanup, setSessionStateSync]);

  const endSession = useCallback(() => {
    if (sessionStateRef.current === 'idle') return;

    // Tell backend to end the session
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }));
    }

    fullCleanup();
  }, [fullCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [cleanupAudio]);

  return {
    voiceAvailable,
    sessionState,
    startSession,
    endSession,
  };
}
