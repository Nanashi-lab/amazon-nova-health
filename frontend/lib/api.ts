'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') localStorage.setItem('token', token);
}

export function clearToken(): void {
  if (typeof window !== 'undefined') localStorage.removeItem('token');
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    throw new Error('Unauthorized');
  }

  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function streamChat(
  message: string,
  sessionId: string | null,
  onToken: (text: string) => void,
  onToolStart: (tool: { name: string; toolUseId: string }) => void,
  onToolResult: (result: { toolUseId: string; content: string }) => void,
  onDone: (fullText: string, sessionId: string) => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    });

    if (!res.ok) {
      const body = await res.text();
      onError(body || `Chat error ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError('No response stream');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete last line

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);
            switch (currentEvent) {
              case 'token':
                onToken(data.text);
                break;
              case 'tool_start':
                onToolStart({ name: data.name, toolUseId: data.toolUseId });
                break;
              case 'tool_result':
                onToolResult({ toolUseId: data.toolUseId, content: data.content });
                break;
              case 'done':
                onDone(data.text, data.sessionId);
                break;
              case 'error':
                onError(data.error);
                break;
            }
          } catch {
            // Skip malformed JSON
          }
          currentEvent = '';
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Stream connection failed');
  }
}
