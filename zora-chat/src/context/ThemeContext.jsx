'use client';

import { createContext, useContext, useState, useEffect } from 'react';

/**
 * CSS custom-property tokens for each theme.
 * Components consume these via var(--token-name) in inline styles.
 */
const themes = {
  light: {
    '--bg-primary':         '#ffffff',
    '--bg-secondary':       '#f9f9f9',
    '--bg-sidebar':         '#f0f0f0',
    '--bg-sidebar-hover':   '#e5e5e6',
    '--bg-sidebar-active':  '#dcdcdd',
    '--text-primary':       '#1a1a1a',
    '--text-secondary':     '#6b7280',
    '--text-sidebar':       '#374151',
    '--text-muted':         '#9ca3af',
    '--accent':             '#10a37f',
    '--accent-hover':       '#0d8f6f',
    '--accent-subtle':      '#e6f7f2',
    '--user-bubble-bg':     '#10a37f',
    '--user-bubble-text':   '#ffffff',
    '--bot-bubble-bg':      '#f3f4f6',
    '--bot-bubble-text':    '#1a1a1a',
    '--border':             '#e5e7eb',
    '--input-bg':           '#ffffff',
    '--input-border':       '#d1d5db',
    '--scrollbar-thumb':    '#d1d5db',
    '--scrollbar-thumb-hover': '#9ca3af',
    '--typing-dot':         '#9ca3af',
  },
  dark: {
    '--bg-primary':         '#212121',
    '--bg-secondary':       '#2f2f2f',
    '--bg-sidebar':         '#171717',
    '--bg-sidebar-hover':   '#2a2a2a',
    '--bg-sidebar-active':  '#383838',
    '--text-primary':       '#ececec',
    '--text-secondary':     '#9ca3af',
    '--text-sidebar':       '#d1d5db',
    '--text-muted':         '#6b7280',
    '--accent':             '#10a37f',
    '--accent-hover':       '#0d8f6f',
    '--accent-subtle':      '#1a3a32',
    '--user-bubble-bg':     '#374151',
    '--user-bubble-text':   '#f9fafb',
    '--bot-bubble-bg':      '#2f2f2f',
    '--bot-bubble-text':    '#ececec',
    '--border':             '#374151',
    '--input-bg':           '#2f2f2f',
    '--input-border':       '#374151',
    '--scrollbar-thumb':    '#4b5563',
    '--scrollbar-thumb-hover': '#6b7280',
    '--typing-dot':         '#6b7280',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode]   = useState('light'); // 'light' | 'dark' | 'custom'
  const [accentColor, setAccentColor] = useState('#10a37f');
  const [customBase, setCustomBase]   = useState('light'); // base for custom mode

  // Hydrate persisted theme from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('zora-theme');
      if (raw) {
        const { mode, accent, base } = JSON.parse(raw);
        setThemeMode(mode   ?? 'light');
        setAccentColor(accent ?? '#10a37f');
        setCustomBase(base    ?? 'light');
      }
    } catch {
      // fallback to defaults
    }
  }, []);

  // Persist every change
  useEffect(() => {
    try {
      localStorage.setItem('zora-theme', JSON.stringify({
        mode: themeMode, accent: accentColor, base: customBase,
      }));
    } catch {
      // ignore storage errors
    }
  }, [themeMode, accentColor, customBase]);

  // Build the CSS variable map for the active theme
  const cssVars = (() => {
    const baseKey = themeMode === 'custom' ? customBase : themeMode;
    const vars = { ...themes[baseKey] };

    if (themeMode === 'custom') {
      vars['--accent']           = accentColor;
      vars['--accent-hover']     = accentColor;
      vars['--user-bubble-bg']   = accentColor;
    }
    return vars;
  })();

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, accentColor, setAccentColor, customBase, setCustomBase }}>
      <div
        className="zora-root"
        data-theme={themeMode === 'custom' ? customBase : themeMode}
        style={cssVars}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
