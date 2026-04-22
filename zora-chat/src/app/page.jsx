'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import MessageInput from '@/components/MessageInput';
import SettingsPanel from '@/components/SettingsPanel';
import KnowledgeBase from '@/components/KnowledgeBase';
import Calendar from '@/components/Calendar';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi there! I'm **Zora**, your AI assistant. Ask me anything — I'm here to help! 👋",
  timestamp: new Date().toISOString(),
};

async function sendMessageToAPI(message, history = [], includeRag = false, temperature = 0.7, model = 'gpt-3.5-turbo') {
  const response = await fetch('http://localhost:8000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, include_rag: includeRag, temperature, model }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail ?? `Server error ${response.status}`);
  }

  return response.json(); // { content, sources, prompt_tokens, completion_tokens, calendar_actions }
}

export default function HomePage() {
  const [messages, setMessages]     = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping]     = useState(false);
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'settings'
  const [sidebarOpen, setSidebarOpen]   = useState(false); // mobile toggle
  const [ragEnabled, setRagEnabled]     = useState(false);
  const [ragDocuments, setRagDocuments] = useState([]);
  const [tokenStats, setTokenStats]       = useState({ promptTokens: 0, completionTokens: 0 });
  const [temperature, setTemperature]     = useState(0.7);
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [calendarEvents, setCalendarEvents] = useState([]);

  const chatTitle = (() => {
    const firstUser = messages.find((m) => m.role === 'user');
    if (!firstUser) return 'New conversation';
    const text = firstUser.content.trim();
    return text.length > 28 ? text.slice(0, 28).trimEnd() + '…' : text;
  })();

  // ── Persist chat history ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zora-chat-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // use default welcome message
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('zora-chat-v1', JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // ── Persist RAG toggle ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zora-rag-enabled');
      if (saved !== null) setRagEnabled(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('zora-rag-enabled', JSON.stringify(ragEnabled)); }
    catch { /* ignore */ }
  }, [ragEnabled]);

  // ── Persist temperature ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zora-temperature');
      if (saved !== null) setTemperature(parseFloat(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('zora-temperature', String(temperature)); }
    catch { /* ignore */ }
  }, [temperature]);

  // ── Persist selected model ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zora-model');
      if (saved) setSelectedModel(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem('zora-model', selectedModel); }
    catch { /* ignore */ }
  }, [selectedModel]);

  // ── Load RAG documents on mount ───────────────────────────────────────────
  useEffect(() => {
    fetch('http://localhost:8000/api/rag/documents')
      .then((r) => r.json())
      .then((data) => setRagDocuments(data.documents ?? []))
      .catch(() => { /* backend may not be running */ });
  }, []);
  // ── Load calendar events on mount ──────────────────────────────────────────
  const loadCalendarEvents = useCallback(() => {
    fetch('http://localhost:8000/api/calendar/events')
      .then((r) => r.json())
      .then((data) => setCalendarEvents(data.events ?? []))
      .catch(() => { /* backend may not be running */ });
  }, []);

  useEffect(() => { loadCalendarEvents(); }, [loadCalendarEvents]);
  // ── Send a message ────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim() || isTyping) return;

    const userMsg = {
      id:        `user-${Date.now()}`,
      role:      'user',
      content:   content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Build history from current messages (exclude welcome, map to {role, content})
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map(({ role, content: c }) => ({ role, content: c }));

      const { content: text, sources, prompt_tokens, completion_tokens, calendar_actions } = await sendMessageToAPI(content, history, ragEnabled, temperature, selectedModel);
      let botContent = text;
      if (sources && sources.length > 0) {
        botContent += `\n\n---\n*Sources: ${sources.join(', ')}*`;
      }
      if (calendar_actions && calendar_actions.length > 0) {
        loadCalendarEvents();
      }
      setTokenStats((prev) => ({
        promptTokens:     prev.promptTokens     + (prompt_tokens     ?? 0),
        completionTokens: prev.completionTokens + (completion_tokens ?? 0),
      }));
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, role: 'assistant', content: botContent, timestamp: new Date().toISOString() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, ragEnabled]);

  // ── Sidebar actions ───────────────────────────────────────────────────────
  const handleGoToChat = useCallback(() => {
    setActiveView('chat');
    setSidebarOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, id: `welcome-${Date.now()}`, timestamp: new Date().toISOString() }]);
    setActiveView('chat');
    setSidebarOpen(false);
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
    setSidebarOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setActiveView('settings');
    setSidebarOpen(false);
  }, []);

  const handleOpenKnowledgeBase = useCallback(() => {
    setActiveView('knowledge-base');
    setSidebarOpen(false);
  }, []);

  const handleOpenCalendar = useCallback(() => {
    setActiveView('calendar');
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex w-full h-full overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        activeView={activeView}
        chatTitle={chatTitle}
        onGoToChat={handleGoToChat}
        onNewChat={handleNewChat}
        onClearChat={handleClearChat}
        onOpenSettings={handleOpenSettings}
        onOpenKnowledgeBase={handleOpenKnowledgeBase}
        onOpenCalendar={handleOpenCalendar}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main panel */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {activeView === 'chat' ? (
          <>
            <ChatWindow
              messages={messages}
              isTyping={isTyping}
              onMenuToggle={() => setSidebarOpen(true)}
              tokenStats={tokenStats}
            />
            <MessageInput
              onSend={handleSendMessage}
              disabled={isTyping}
              ragEnabled={ragEnabled}
              onToggleRag={() => setRagEnabled((v) => !v)}
              docCount={ragDocuments.length}
            />
          </>
        ) : activeView === 'knowledge-base' ? (
          <KnowledgeBase
            onBack={() => setActiveView('chat')}
            ragDocuments={ragDocuments}
            setRagDocuments={setRagDocuments}
          />
        ) : activeView === 'calendar' ? (
          <Calendar
            onBack={() => setActiveView('chat')}
            events={calendarEvents}
            loadEvents={loadCalendarEvents}
          />
        ) : (
          <SettingsPanel
            onBack={() => setActiveView('chat')}
            ragEnabled={ragEnabled}
            setRagEnabled={setRagEnabled}
            temperature={temperature}
            setTemperature={setTemperature}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />
        )}
      </div>
    </div>
  );
}
