'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  Plus, Trash2, Bell, Clock,
} from 'lucide-react';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const REMINDER_OPTIONS = [
  { label: 'No reminder',       value: 0    },
  { label: '5 minutes before',  value: 5    },
  { label: '15 minutes before', value: 15   },
  { label: '30 minutes before', value: 30   },
  { label: '1 hour before',     value: 60   },
  { label: '1 day before',      value: 1440 },
];

const API = 'http://localhost:8000';

function pad(n) { return String(n).padStart(2, '0'); }

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export default function Calendar({ onBack, events, loadEvents }) {
  const today    = new Date();
  const todayStr = toISODate(today);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const timerRefs = useRef([]);

  const [form, setForm] = useState({
    title: '', date: todayStr, time: '09:00', description: '', reminder_minutes: 0,
  });

  /* ── Schedule browser notifications ──────────────────────────────────────── */
  useEffect(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();

    const now = Date.now();
    events.forEach((ev) => {
      if (!ev.reminder_minutes) return;
      const eventMs  = new Date(`${ev.date}T${ev.time}:00`).getTime();
      const notifyAt = eventMs - ev.reminder_minutes * 60_000;
      const delay    = notifyAt - now;
      if (delay > 0 && delay < 7 * 24 * 60 * 60_000) { // only schedule within 7 days
        const id = setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification(`⏰ Reminder: ${ev.title}`, {
              body: ev.reminder_minutes >= 60
                ? `Starts in ${ev.reminder_minutes / 60} hour${ev.reminder_minutes > 60 ? 's' : ''}`
                : `Starts in ${ev.reminder_minutes} minute${ev.reminder_minutes > 1 ? 's' : ''}`,
            });
          }
        }, delay);
        timerRefs.current.push(id);
      }
    });
    return () => timerRefs.current.forEach(clearTimeout);
  }, [events]);

  /* ── Month navigation ─────────────────────────────────────────────────────── */
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  /* ── Derived values ───────────────────────────────────────────────────────── */
  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth    = new Date(viewYear, viewMonth + 1, 0).getDate();

  const eventsByDate = events.reduce((acc, ev) => {
    (acc[ev.date] = acc[ev.date] || []).push(ev);
    return acc;
  }, {});

  const selectedEvents = (eventsByDate[selectedDate] ?? [])
    .sort((a, b) => a.time.localeCompare(b.time));

  const upcomingEvents = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 4);

  /* ── Create event ─────────────────────────────────────────────────────────── */
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/calendar/events`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, reminder_minutes: parseInt(form.reminder_minutes) }),
      });
      setShowModal(false);
      setForm({ title: '', date: selectedDate, time: '09:00', description: '', reminder_minutes: 0 });
      loadEvents();
    } catch {}
    setSubmitting(false);
  };

  /* ── Delete event ─────────────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await fetch(`${API}/api/calendar/events/${id}`, { method: 'DELETE' });
      loadEvents();
    } catch {}
    setDeleting(null);
  };

  const openModal = () => {
    setForm(f => ({ ...f, date: selectedDate }));
    setShowModal(true);
  };

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Back to chat"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Calendar</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Schedule and manage meetings</p>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: month grid ─────────────────────────────────────────────── */}
        <div
          className="flex flex-col shrink-0 p-5 overflow-y-auto"
          style={{ width: '300px', borderRight: '1px solid var(--border)' }}
        >
          {/* Month navigator */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronLeft size={17} />
            </button>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <ChevronRight size={17} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-muted)' }}>
                {d[0]}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDayOffset }, (_, i) => <div key={`pad${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day     = i + 1;
              const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isToday    = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const hasEvents  = !!(eventsByDate[dateStr]?.length);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className="relative flex flex-col items-center justify-center py-1.5 rounded-xl text-sm transition-colors"
                  style={{
                    background: isSelected
                      ? 'var(--accent)'
                      : isToday ? 'var(--accent-subtle)' : 'transparent',
                    color:      isSelected ? '#fff' : 'var(--text-primary)',
                    fontWeight: isToday ? 700 : 400,
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--bg-sidebar-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected)
                      e.currentTarget.style.background = isToday ? 'var(--accent-subtle)' : 'transparent';
                  }}
                >
                  {day}
                  {hasEvents && (
                    <span
                      className="w-1 h-1 rounded-full mt-0.5"
                      style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--accent)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Upcoming events mini-list */}
          {upcomingEvents.length > 0 && (
            <div className="mt-5 pt-4 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Upcoming
              </p>
              {upcomingEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedDate(ev.date)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {ev.date === todayStr ? 'Today' : ev.date} — {ev.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: day events panel ──────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatDisplayDate(selectedDate)}
            </p>
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <Plus size={14} strokeWidth={2.5} />
              New meeting
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {selectedEvents.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center h-40 text-center rounded-2xl"
                style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No meetings on this day</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Click "New meeting" to add one</p>
              </div>
            ) : (
              selectedEvents.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  onDelete={handleDelete}
                  deleting={deleting === ev.id}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Create event modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              New Meeting
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <ModalField label="Title">
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Meeting title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </ModalField>

              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Date">
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </ModalField>
                <ModalField label="Time">
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  />
                </ModalField>
              </div>

              <ModalField label="Description (optional)">
                <textarea
                  rows={2}
                  placeholder="Notes or agenda…"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                />
              </ModalField>

              <ModalField label="Reminder">
                <select
                  value={form.reminder_minutes}
                  onChange={e => setForm(f => ({ ...f, reminder_minutes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  {REMINDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </ModalField>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-opacity"
                  style={{ background: 'var(--accent)', color: '#fff', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Creating…' : 'Create meeting'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium"
                  style={{ background: 'var(--bg-sidebar)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Event card ─────────────────────────────────────────────────────────────── */
function EventCard({ event, onDelete, deleting }) {
  const [confirm, setConfirm] = useState(false);
  const reminderLabel = REMINDER_OPTIONS.find(o => o.value === event.reminder_minutes)?.label ?? '';

  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {event.title}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Clock size={11} strokeWidth={2} />
              {event.time}
            </span>
            {event.reminder_minutes > 0 && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Bell size={11} strokeWidth={2} />
                {reminderLabel}
              </span>
            )}
          </div>
          {event.description && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              {event.description}
            </p>
          )}
        </div>

        {/* Delete / confirm */}
        {confirm ? (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onDelete(event.id)}
              disabled={deleting}
              className="px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: '#ef4444', color: '#fff' }}
            >
              {deleting ? '…' : 'Delete'}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-2.5 py-1 rounded-lg text-xs"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="p-1.5 rounded-lg shrink-0 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            aria-label="Delete meeting"
          >
            <Trash2 size={14} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Modal field wrapper ────────────────────────────────────────────────────── */
function ModalField({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {children}
    </div>
  );
}
