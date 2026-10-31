import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, ArrowUp, Square, RotateCcw, Bot, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { useApp } from '../lib/AppContext.jsx';
import { api } from '../services/api.js';
import { Markdown } from '../lib/markdown.jsx';
import { useScrollLock } from '../lib/scrollLock.js';

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

const STARTERS = [
  'Who is Narendra Modi?',
  'Explain Big-O notation simply',
  'Write a short cover letter for a software internship',
  'How do I prepare for my first hackathon?',
  'Give me a 7-day plan to learn React',
  'Explain recursion with a Python example',
];

function BotAvatar({ small }) {
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 ${small ? 'h-7 w-7' : 'h-9 w-9'}`}>
      <Bot className={small ? 'h-4 w-4' : 'h-5 w-5'} />
    </div>
  );
}

export default function ChatWidget() {
  const { preferences } = useApp();
  const { pathname } = useLocation();
  // On small screens these pages have their own sticky input bar at the bottom.
  const crowded = pathname === '/ask' || pathname === '/preferences';
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [messages, setMessages] = useState([]); // {role, content, error?}
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  // Full-screen on phones: lock the page behind it.
  useScrollLock(open && isPhone());

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e) => e.key === 'Escape' && open && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text, base = messages) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');
    const history = [...base.filter((m) => !m.error), { role: 'user', content }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let reply = '';
    try {
      await api.chatStream(history, preferences, (chunk) => {
        reply += chunk;
        setMessages([...history, { role: 'assistant', content: reply }]);
      }, controller.signal);
      if (!reply) setMessages([...history, { role: 'assistant', content: "Sorry, I didn't get a response. Please try again.", error: true }]);
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages([...history, { role: 'assistant', content: reply ? `${reply}\n\n*Stopped.*` : '*Stopped.*' }]);
      } else {
        setMessages([...history, ...(reply ? [{ role: 'assistant', content: reply }] : []), { role: 'assistant', content: err.message, error: true, retry: content }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const retry = (content) => {
    // Remove the failed exchange and resend the same message.
    const idx = messages.map((m) => m.role).lastIndexOf('user');
    send(content, messages.slice(0, idx));
  };

  const last = messages[messages.length - 1];
  const waitingFirstToken = streaming && last?.role === 'assistant' && !last.content;

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Campus Buddy chat' : 'Open Campus Buddy chat'}
        aria-expanded={open}
        className={`fixed bottom-[calc(var(--bottomnav-h)+16px)] right-4 z-40 flex items-center gap-2 rounded-full bg-slate-900 py-3 pl-3.5 pr-3.5 text-white shadow-xl transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-2xl active:scale-95 sm:pr-5 lg:bottom-6 lg:right-6 ${open ? 'max-sm:hidden' : ''} ${crowded ? 'max-lg:hidden' : ''}`}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        <span className="hidden text-sm font-semibold sm:inline">{open ? 'Close' : 'Campus Buddy'}</span>
        {!open && messages.length === 0 && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Campus Buddy chat"
          className={`fixed z-50 flex flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/20 animate-scale-in max-sm:inset-0 sm:bottom-24 sm:right-6 sm:rounded-3xl sm:border sm:border-slate-200 lg:bottom-24 ${wide ? 'sm:h-[min(760px,calc(100dvh-8rem))] sm:w-[min(720px,calc(100vw-3rem))]' : 'sm:h-[min(620px,calc(100dvh-8rem))] sm:w-[400px]'}`}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-4 py-3">
            <BotAvatar />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">Campus Buddy</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> <span className="truncate">Ask me anything · Claude</span></div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => { abortRef.current?.abort(); setMessages([]); }} aria-label="New chat" title="New chat" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><RotateCcw className="h-4 w-4" /></button>
            )}
            <button onClick={() => setWide((w) => !w)} aria-label={wide ? 'Shrink chat' : 'Expand chat'} className="hidden h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 sm:grid">{wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><X className="h-5 w-5" /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="overlay-scroll flex-1 space-y-4 px-4 py-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="animate-fade-in">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[15px] font-semibold text-slate-900">Hi {preferences.name && preferences.name !== 'Student' ? preferences.name : 'there'}!</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">I'm Campus Buddy. Ask me anything: general knowledge, studies, code, writing, career advice, or what's happening on campus.</p>
                </div>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Try asking</p>
                <div className="space-y-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-700">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-slate-900 px-3.5 py-2 text-[14px] text-white">{m.content}</div>
                  </div>
                ) : m.error ? (
                  <div key={i} className="flex items-start gap-2.5">
                    <BotAvatar small />
                    <div className="flex-1 rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                      <p className="flex items-center gap-1.5 font-semibold"><AlertCircle className="h-4 w-4" /> Couldn't get a reply</p>
                      <p className="mt-0.5">{m.content}</p>
                      {m.retry && i === messages.length - 1 && <button onClick={() => retry(m.retry)} className="mt-2 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-red-200 hover:bg-red-100">Try again</button>}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-start gap-2.5">
                    <BotAvatar small />
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-slate-50 px-3.5 py-2.5">
                      {m.content ? (
                        <Markdown text={m.content} className="text-[14px]" />
                      ) : (
                        <div className="flex gap-1 py-1.5" aria-label="Campus Buddy is typing">
                          <span className="typing-dot h-2 w-2 rounded-full bg-indigo-500" />
                          <span className="typing-dot h-2 w-2 rounded-full bg-violet-500" />
                          <span className="typing-dot h-2 w-2 rounded-full bg-indigo-400" />
                        </div>
                      )}
                      {streaming && i === messages.length - 1 && m.content && <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-indigo-400" />}
                    </div>
                  </div>
                ),
              )
            )}
          </div>

          {/* Input */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="shrink-0 border-t border-slate-100 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pl-3.5 transition focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100">
              <label htmlFor="buddy-input" className="sr-only">Message Campus Buddy</label>
              <textarea
                id="buddy-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask me anything…"
                className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[14px] placeholder:text-slate-400 focus:outline-none"
              />
              {streaming ? (
                <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop generating" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white hover:bg-slate-700">
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()} aria-label="Send message" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white transition hover:brightness-110 active:scale-95 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400">
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
            {waitingFirstToken && <p className="mt-1.5 text-center text-[11px] text-slate-400">Campus Buddy is thinking…</p>}
          </form>
        </div>
      )}
    </>
  );
}
