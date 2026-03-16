'use client';

import { ChatMessage as ChatMessageType } from '@/lib/types';
import ToolCallCard from './ToolCallCard';
import styles from './ChatMessage.module.css';

interface ChatMessageProps {
  message: ChatMessageType;
}

interface ParsedSegment {
  type: 'text' | 'tool';
  content: string;
  toolName?: string;
  toolResult?: string;
}

function parseMessageContent(content: string): ParsedSegment[] {
  // Parse inline tool call markers: [Tool: name...] and [Result: content]
  const segments: ParsedSegment[] = [];
  const toolPattern = /\[Tool: (.+?)\.{3}\]\n?(?:\[Result: (.+?)\]\n?)?/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = toolPattern.exec(content)) !== null) {
    // Add text before this tool call
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) segments.push({ type: 'text', content: text });
    }

    segments.push({
      type: 'tool',
      content: match[0],
      toolName: match[1],
      toolResult: match[2] || undefined,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) segments.push({ type: 'text', content: text });
  }

  // If no tool calls found, return the whole content as text
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: 'text', content: content });
  }

  return segments;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const segments = !isUser ? parseMessageContent(message.content) : [];

  // Check for tool call attachments from backend (historical messages)
  const toolAttachments = message.attachments?.filter(
    (a) => 'toolUseId' in a && 'name' in a
  ) as Array<{ name: string; toolUseId: string; content?: string }> | undefined;

  return (
    <div className={`${styles.wrapper} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && <span className={styles.meta}>NovaHealth AI</span>}

      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
        {isUser ? (
          <p className={styles.content}>{message.content}</p>
        ) : (
          <>
            {segments.map((seg, idx) =>
              seg.type === 'text' ? (
                <p key={idx} className={styles.content}>{seg.content}</p>
              ) : (
                <ToolCallCard
                  key={idx}
                  name={seg.toolName || 'unknown'}
                  content={seg.toolResult}
                  isLoading={!seg.toolResult}
                />
              )
            )}

            {/* Render tool calls from backend attachments (historical messages) */}
            {toolAttachments && toolAttachments.length > 0 && segments.every(s => s.type === 'text') && (
              toolAttachments.map((tool, idx) => (
                <ToolCallCard
                  key={`att-${idx}`}
                  name={tool.name}
                  content={tool.content || 'Completed'}
                />
              ))
            )}
          </>
        )}

        {message.vitalsData && (
          <div className={styles.vitalsGrid}>
            <div className={styles.vitalsChip}>
              <span className={styles.vitalsLabel}>HR</span>
              <span className={styles.vitalsValue}>{message.vitalsData.heartRate} bpm</span>
            </div>
            <div className={styles.vitalsChip}>
              <span className={styles.vitalsLabel}>BP</span>
              <span className={styles.vitalsValue}>{message.vitalsData.bloodPressure}</span>
            </div>
            <div className={styles.vitalsChip}>
              <span className={styles.vitalsLabel}>SpO2</span>
              <span className={styles.vitalsValue}>{message.vitalsData.oxygenSat}%</span>
            </div>
            <div className={styles.vitalsChip}>
              <span className={styles.vitalsLabel}>Temp</span>
              <span className={styles.vitalsValue}>{message.vitalsData.temperature}&deg;F</span>
            </div>
          </div>
        )}

        {/* File attachments */}
        {message.attachments && message.attachments.some(a => 'type' in a && typeof (a as { type?: string }).type === 'string' && !(a as { toolUseId?: string }).toolUseId) && (
          <div className={styles.attachments}>
            {message.attachments
              .filter(a => 'type' in a && typeof (a as { type?: string }).type === 'string' && !(a as { toolUseId?: string }).toolUseId)
              .map((file, idx) => (
                <div key={idx} className={styles.fileCard}>
                  <span className={styles.fileIcon}>&#128196;</span>
                  <span className={styles.fileName}>{(file as { name: string }).name}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <span className={styles.timestamp}>{time}</span>
    </div>
  );
}
