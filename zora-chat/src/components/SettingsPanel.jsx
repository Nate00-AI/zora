'use client';

import { ArrowLeft, Sun, Moon, Palette, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

/* Preset accent swatches */
const ACCENT_PRESETS = [
  { label: 'Teal',   value: '#10a37f' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Pink',   value: '#ec4899' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red',    value: '#ef4444' },
];

export default function SettingsPanel({ onBack, ragEnabled, setRagEnabled, temperature = 0.7, setTemperature, selectedModel = 'gpt-3.5-turbo', setSelectedModel }) {
  const {
    themeMode, setThemeMode,
    accentColor, setAccentColor,
    customBase, setCustomBase,
  } = useTheme();

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-sidebar-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label="Back to chat"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <h1 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Customise your Zora experience
          </p>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 max-w-lg space-y-8">

        {/* ── Appearance ────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Appearance</SectionLabel>

          <div className="space-y-2">
            <ThemeOption
              icon={Sun}
              label="Light"
              description="Clean white background"
              active={themeMode === 'light'}
              onClick={() => setThemeMode('light')}
            />
            <ThemeOption
              icon={Moon}
              label="Dark"
              description="Easy on the eyes"
              active={themeMode === 'dark'}
              onClick={() => setThemeMode('dark')}
            />
            <ThemeOption
              icon={Palette}
              label="Custom"
              description="Pick your own accent colour"
              active={themeMode === 'custom'}
              onClick={() => setThemeMode('custom')}
            />
          </div>
        </section>

        {/* ── Custom theme controls ─────────────────────────────────────── */}
        {themeMode === 'custom' && (
          <section className="space-y-5">
            <SectionLabel>Custom Theme</SectionLabel>

            {/* Base style toggle */}
            <div>
              <FieldLabel>Base style</FieldLabel>
              <div className="flex gap-2 mt-2">
                {['light', 'dark'].map((base) => (
                  <button
                    key={base}
                    onClick={() => setCustomBase(base)}
                    className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors"
                    style={{
                      background: customBase === base ? 'var(--accent)' : 'var(--bg-sidebar)',
                      color:      customBase === base ? '#ffffff'        : 'var(--text-primary)',
                      border:     '1px solid var(--border)',
                    }}
                  >
                    {base === 'light' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent colour picker */}
            <div>
              <FieldLabel>Accent colour</FieldLabel>

              {/* Preset swatches */}
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setAccentColor(preset.value)}
                    title={preset.label}
                    aria-label={`${preset.label} accent`}
                    className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 active:scale-95"
                    style={{
                      background:    preset.value,
                      outline:       accentColor === preset.value ? `3px solid ${preset.value}` : 'none',
                      outlineOffset: '2px',
                    }}
                  >
                    {accentColor === preset.value && (
                      <Check size={14} color="white" className="absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>

              {/* Free-form colour input */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
              >
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  aria-label="Custom accent colour"
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Custom
                  </p>
                  <p className="text-xs font-mono uppercase" style={{ color: 'var(--text-secondary)' }}>
                    {accentColor}
                  </p>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <FieldLabel>Preview</FieldLabel>
              <div
                className="mt-2 p-4 rounded-xl space-y-2"
                style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
              >
                <div className="flex justify-end">
                  <span
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: accentColor, color: '#ffffff' }}
                  >
                    Your message
                  </span>
                </div>
                <div className="flex justify-start">
                  <span
                    className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: 'var(--bot-bubble-bg)', color: 'var(--bot-bubble-text)' }}
                  >
                    Zora's response
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* ── Knowledge Base ────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Knowledge Base</SectionLabel>
          <div
            className="p-4 rounded-xl"
            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Use documents in chat
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Zora will reference your uploaded files
                </p>
              </div>
              <button
                onClick={() => setRagEnabled?.(!ragEnabled)}
                aria-label="Toggle document retrieval"
                style={{ color: ragEnabled ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {ragEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
            </div>
          </div>
        </section>

        {/* ── Model ────────────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>Model</SectionLabel>
          <div
            className="p-4 rounded-xl space-y-3"
            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
          >            {/* Model selector */}
            <div>
              <FieldLabel>AI Model</FieldLabel>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel?.(e.target.value)}
                className="w-full mt-2 px-3 py-2 rounded-xl text-sm"
                style={{
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  outline: 'none',
                }}
                aria-label="Select AI model"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo — Fast &amp; cheap</option>
                <option value="gpt-4o-mini">GPT-4o Mini — Balanced</option>
                <option value="gpt-4o">GPT-4o — Most capable</option>
              </select>
            </div>

            {/* Temperature slider */}            <div className="flex items-center justify-between">
              <FieldLabel>Temperature</FieldLabel>
              <span
                className="text-sm font-mono font-semibold px-2 py-0.5 rounded-lg"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
              >
                {temperature.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature?.(parseFloat(e.target.value))}
              className="w-full"
              aria-label="Model temperature"
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>0 — Precise</span>
              <span>1 — Balanced</span>
              <span>2 — Creative</span>
            </div>
          </div>
        </section>

        {/* ── About ─────────────────────────────────────────────────────── */}
        <section>
          <SectionLabel>About</SectionLabel>
          <div
            className="p-4 rounded-xl space-y-2.5"
            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border)' }}
          >
            <InfoRow label="Version"    value="0.1.0 Alpha" />
            <InfoRow label="Framework"  value="Next.js 14"  />
            <InfoRow label="Styling"    value="Tailwind CSS" />
            <InfoRow label="Runtime"    value="React 18"    />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Helper sub-components ────────────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
      {children}
    </h2>
  );
}

function FieldLabel({ children }) {
  return (
    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
      {children}
    </p>
  );
}

function ThemeOption({ icon: Icon, label, description, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors"
      style={{
        background: active ? 'var(--accent-subtle)' : 'var(--bg-sidebar)',
        border:     `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      }}
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-xl"
        style={{ background: active ? 'var(--accent)' : 'var(--bg-sidebar-hover)' }}
      >
        <Icon size={18} style={{ color: active ? '#ffffff' : 'var(--text-secondary)' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>

      {active && (
        <div
          className="flex items-center justify-center w-5 h-5 rounded-full shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <Check size={11} color="white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
