'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles } from 'lucide-react';

export default function MessageBubble({ message }) {
  const [showTimestamp, setShowTimestamp] = useState(false);
  const isUser = message.role === 'user';

  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

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

        {/* Timestamp — fades in on hover */}
        <span
          className="text-xs mt-1 px-1 transition-opacity duration-200"
          style={{
            color:   'var(--text-muted)',
            opacity: showTimestamp ? 1 : 0,
          }}
          aria-hidden={!showTimestamp}
          suppressHydrationWarning
        >
          {time}
        </span>
      </div>
    </div>
  );
}
