# Zora Chat — AI Chat Interface

A modern, minimalistic AI chatbot frontend built with **Next.js 14**, **React 18**, and **Tailwind CSS**.

---

## Features

- **Chat interface** — user & assistant message bubbles, auto-scroll, timestamps on hover
- **Typing indicator** — animated dots while the bot "thinks"
- **Markdown support** — bold, italic, lists, code blocks, blockquotes, and more in responses
- **Dynamic theme system** — Light / Dark / Custom with a colour picker
- **Instant theme switching** — CSS custom properties, persisted to `localStorage`
- **Responsive** — collapsible sidebar on mobile
- **Persistent history** — chat saved to `localStorage`
- **Keyboard shortcuts** — `Enter` to send, `Shift+Enter` for new line
- **API integration placeholder** — drop in your real API with a single function swap

---

## Project Structure

```
kora-chat/
├── src/
│   ├── app/
│   │   ├── layout.jsx        # Root layout + font loading
│   │   ├── page.jsx          # App shell — state management
│   │   └── globals.css       # Tailwind base + global styles
│   ├── components/
│   │   ├── Sidebar.jsx       # Left navigation panel
│   │   ├── ChatWindow.jsx    # Scrollable message list + typing indicator
│   │   ├── MessageBubble.jsx # Individual message with Markdown rendering
│   │   ├── MessageInput.jsx  # Auto-grow textarea + send button
│   │   └── SettingsPanel.jsx # Theme switcher + colour picker
│   ├── context/
│   │   └── ThemeContext.jsx  # Theme state, CSS tokens, localStorage sync
│   └── utils/
│       └── mockBot.js        # Mock responses + API integration point
├── tailwind.config.js
├── next.config.mjs
└── package.json
```

---

## Setup & Running

### Prerequisites
- Node.js **18+** (LTS recommended)
- npm, yarn, or pnpm

### Install & Start

```bash
# 1. Navigate to the project folder
cd kora-chat

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Connecting a Real AI Backend

Open `src/utils/mockBot.js` and update `sendMessageToAPI`:

```js
export async function sendMessageToAPI(message, history = []) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok) throw new Error('API request failed');
  const data = await response.json();
  return data.content; // adjust to match your API response shape
}
```

Then in `src/app/page.jsx`, replace `mockBotResponse` with `sendMessageToAPI`.

---

## Theme System

Themes are defined as CSS custom-property maps in `src/context/ThemeContext.jsx`.

| Token                  | Purpose                        |
|------------------------|--------------------------------|
| `--bg-primary`         | Main chat background           |
| `--bg-sidebar`         | Sidebar background             |
| `--accent`             | Primary accent / brand colour  |
| `--user-bubble-bg`     | User message bubble            |
| `--bot-bubble-bg`      | Bot message bubble             |
| `--text-primary`       | Main body text                 |
| `--text-muted`         | Subtle text (timestamps, hints)|

To add a new theme, copy the `light` object in `ThemeContext.jsx` and add it to the `themes` map.

---

## Tech Stack

| Layer      | Technology              |
|------------|-------------------------|
| Framework  | Next.js 14 (App Router) |
| UI         | React 18                |
| Styling    | Tailwind CSS v3         |
| Icons      | lucide-react            |
| Markdown   | react-markdown + remark-gfm |
| State      | React hooks (useState, useEffect, useCallback, useContext) |
| Persistence| localStorage            |
