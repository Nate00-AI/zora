'use client';

import { useEffect, useRef } from 'react';
import { Menu, Sparkles } from 'lucide-react';
import MessageBubble from './MessageBubble';

/* ── Typing indicator ────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-4 msg-enter">
      {/* Bot avatar */}
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
        style={{ background: 'var(--accent)' }}
      >
        <Sparkles size={12} color="white" strokeWidth={2.5} />
      </div>

      {/* Bubble with dots */}
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: 'var(--bot-bubble-bg)' }}
      >
        <div className="flex items-center gap-1.5 h-4">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>

      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Zora is thinking…
      </span>
    </div>
  );
}

/* ── Empty chat state ─────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 text-center px-6">
      <div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
        style={{ background: 'var(--accent-subtle)' }}
      >
        <Sparkles size={28} style={{ color: 'var(--accent)' }} />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        How can I help you?
      </h2>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Start a conversation by typing a message below. I'm ready to assist!
      </p>
    </div>
  );
}

/* ── Main ChatWindow ─────────────────────────────────────────────────────── */
export default function ChatWindow({ messages, isTyping, onMenuToggle }) {
  const bottomRef = useRef(null);

  // Scroll to newest message every time messages or typing state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 h-14 shrink-0"
        style={{
          background:   'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Hamburger — visible on mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <Sparkles size={17} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Zora Chat
          </span>
        </div>

        {/* Online badge */}
        <div className="flex items-center gap-1.5 ml-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active</span>
        </div>
      </header>

      {/* ── Message list ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ background: 'var(--bg-primary)' }}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        )}

        {/* Scroll anchor — always rendered */}
        <div ref={bottomRef} aria-hidden="true" />
      </div>
    </div>
  );
}
