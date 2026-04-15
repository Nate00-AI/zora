'use client';

import { MessageSquarePlus, Trash2, Settings, X, Sparkles, Bot, BookOpen } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'new-chat',        label: 'Chat',            icon: MessageSquarePlus, action: 'goToChat'       },
  { id: 'clear',           label: 'Clear Chat',      icon: Trash2,            action: 'clearChat'      },
  { id: 'knowledge-base', label: 'Knowledge Base',  icon: BookOpen,          action: 'knowledgeBase'  },
  { id: 'settings',       label: 'Settings',        icon: Settings,          action: 'settings'       },
];

export default function Sidebar({ activeView, chatTitle, onGoToChat, onNewChat, onClearChat, onOpenSettings, onOpenKnowledgeBase, isOpen, onClose }) {
  const dispatch = (action) => {
    if (action === 'goToChat')       onGoToChat();
    if (action === 'clearChat')      onClearChat();
    if (action === 'settings')       onOpenSettings();
    if (action === 'knowledgeBase')  onOpenKnowledgeBase();
  };

  return (
    <aside
      className={[
        'fixed lg:relative z-50 lg:z-auto',
        'flex flex-col h-full shrink-0',
        'w-64',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
      style={{
        background:   'var(--bg-sidebar)',
        borderRight:  '1px solid var(--border)',
      }}
    >
      {/* ── Logo header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: 'var(--accent)' }}
          >
            <Sparkles size={15} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Zora
          </span>
        </div>

        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            (item.action === 'settings'       && activeView === 'settings')       ||
            (item.action === 'knowledgeBase'  && activeView === 'knowledge-base') ||
            (item.action === 'goToChat'       && activeView === 'chat');

          return (
            <NavButton
              key={item.id}
              item={item}
              isActive={isActive && item.action !== 'clearChat'}
              onClick={() => dispatch(item.action)}
              subtitle={item.action === 'goToChat' ? chatTitle : undefined}
            />
          );
        })}
      </nav>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--bg-sidebar-hover)' }}
        >
          <div
            className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
            style={{ background: 'var(--accent)' }}
          >
            <Bot size={13} color="white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-sidebar)' }}>
              Zora Alpha
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>v0.1.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Reusable nav button with hover state ─────────────────────────────────── */
function NavButton({ item, isActive, onClick, subtitle }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
      style={{
        background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
        color:      isActive ? 'var(--text-primary)'      : 'var(--text-sidebar)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.background = 'var(--bg-sidebar-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={16} strokeWidth={2} className="shrink-0" />
      <div className="flex flex-col items-start min-w-0">
        <span>{item.label}</span>
        {subtitle && (
          <span
            className="text-xs font-normal truncate w-full"
            style={{ color: isActive ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </button>
  );
}
