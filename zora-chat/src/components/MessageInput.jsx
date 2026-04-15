'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowUp, BookOpen } from 'lucide-react';

export default function MessageInput({ onSend, disabled, ragEnabled, onToggleRag, docCount = 0 }) {
  const [value, setValue]   = useState('');
  const textareaRef         = useRef(null);
  const isEmpty             = !value.trim();

  /* ── Auto-grow textarea ─────────────────────────────────────────────── */
  const handleInput = useCallback((e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    setValue(el.value);
  }, []);

  /* ── Send logic ─────────────────────────────────────────────────────── */
  const submitMessage = useCallback(() => {
    if (isEmpty || disabled) return;
    onSend(value);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  }, [value, isEmpty, disabled, onSend]);

  /* ── Keyboard shortcut: Enter sends, Shift+Enter = newline ─────────── */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  }, [submitMessage]);

  const canSend = !isEmpty && !disabled;

  return (
    <div
      className="shrink-0 px-4 pb-4 pt-3"
      style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}
    >
      <div className="max-w-3xl mx-auto">

        {/* Input container */}
        <div
          className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-shadow duration-150"
          style={{
            background:  'var(--input-bg)',
            border:      `1px solid var(--input-border)`,
            boxShadow:   '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          {/* KB toggle button */}
          <div className="relative shrink-0 mb-0.5">
            <button
              type="button"
              onClick={onToggleRag}
              disabled={docCount === 0}
              aria-label={ragEnabled ? 'Disable knowledge base' : 'Enable knowledge base'}
              title={docCount === 0 ? 'No documents in knowledge base' : ragEnabled ? 'Knowledge base ON — click to disable' : 'Knowledge base OFF — click to enable'}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150"
              style={{
                background: ragEnabled ? 'var(--accent)' : 'transparent',
                color:      ragEnabled ? '#ffffff' : docCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                cursor:     docCount > 0 ? 'pointer' : 'not-allowed',
                border:     ragEnabled ? 'none' : '1px solid var(--border)',
              }}
            >
              <BookOpen size={15} strokeWidth={2} />
            </button>
            {docCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold leading-none pointer-events-none"
                style={{
                  background: ragEnabled ? 'var(--text-primary)' : 'var(--accent)',
                  color: '#ffffff',
                }}
              >
                {docCount > 9 ? '9+' : docCount}
              </span>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={disabled}
            placeholder={disabled ? 'Zora is thinking…' : 'Message Zora…'}
            className="flex-1 resize-none bg-transparent border-none outline-none text-sm leading-relaxed"
            style={{
              color:     'var(--text-primary)',
              minHeight: '24px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          />

          {/* Send button */}
          <button
            onClick={submitMessage}
            disabled={!canSend}
            aria-label="Send message"
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-all duration-150 mb-0.5"
            style={{
              background: canSend ? 'var(--accent)' : 'var(--border)',
              color:      canSend ? '#ffffff'        : 'var(--text-muted)',
              cursor:     canSend ? 'pointer'        : 'not-allowed',
              transform:  canSend ? 'scale(1)'       : 'scale(0.92)',
            }}
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Hint text */}
        <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          <kbd className="font-mono">Enter</kbd> to send &nbsp;·&nbsp;
          <kbd className="font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
