'use client';

import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Volume2, VolumeX } from 'lucide-react';

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s/gm, '')
    .replace(/---/g, '')
    .trim();
}

export default function MessageBubble({ message }) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [isSpeaking, setIsSpeaking]       = useState(false);
  const isUser = message.role === 'user';

  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const toggleSpeak = useCallback(() => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(stripMarkdown(message.content));
    utterance.lang = 'en-US';
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, message.content]);

  return (
    <div
      className={`msg-enter flex items-end gap-2 mb-5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Bot avatar — only shown for assistant messages */}
      {!isUser && (
        <div
          className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 mb-0.5"
          style={{ background: 'var(--accent)' }}
        >
          <Sparkles size={12} color="white" strokeWidth={2.5} />
        </div>
      )}

      {/* Bubble + timestamp wrapper */}
      <div
        className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: 'min(680px, 78%)' }}
        onMouseEnter={() => setShowTimestamp(true)}
        onMouseLeave={() => setShowTimestamp(false)}
      >
        {/* Message bubble */}
        <div
          className={[
            'px-4 py-3 text-sm leading-relaxed',
            'rounded-2xl',
            isUser ? 'rounded-br-sm' : 'rounded-bl-sm',
          ].join(' ')}
          style={{
            background: isUser ? 'var(--user-bubble-bg)' : 'var(--bot-bubble-bg)',
            color:      isUser ? 'var(--user-bubble-text)' : 'var(--bot-bubble-text)',
          }}
        >
          <div className={isUser ? 'prose-chat prose-user' : 'prose-chat'}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Timestamp + speak button — fade in on hover */}
        <div
          className="flex items-center gap-2 mt-1 px-1 transition-opacity duration-200"
          style={{ opacity: showTimestamp ? 1 : 0 }}
          aria-hidden={!showTimestamp}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>
            {time}
          </span>
          {!isUser && (
            <button
              onClick={toggleSpeak}
              aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              title={isSpeaking ? 'Stop' : 'Read aloud'}
              className="flex items-center justify-center w-5 h-5 rounded-md transition-colors"
              style={{ color: isSpeaking ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {isSpeaking ? <VolumeX size={13} strokeWidth={2} /> : <Volume2 size={13} strokeWidth={2} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
