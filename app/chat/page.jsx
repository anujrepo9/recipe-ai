'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Sparkles, ChefHat, Wand2,
  Send, Loader2, RotateCcw, Copy, Check,
  Lightbulb, BookOpen, UtensilsCrossed, Star
} from 'lucide-react';
import Header from '../../components/Header';

// ── Mode config ───────────────────────────────────────────────
const MODES = [
  {
    id: 'chat',
    label: 'Ask Chef AI',
    icon: MessageSquare,
    color: 'var(--accent)',
    desc: 'Ask any cooking question — techniques, substitutions, food science',
    placeholder: 'e.g. How do I make pasta al dente? What can I substitute for buttermilk?',
    accent: 'var(--accent-dim)',
    border: 'rgba(0,200,212,0.25)',
  },
  {
    id: 'improve',
    label: 'Improve My Recipe',
    icon: Lightbulb,
    color: '#FFB347',
    desc: 'Tell us what ingredients you have — we\'ll suggest improvements & variations',
    placeholder: 'e.g. I have chicken, garlic, lemon and rosemary. How can I make it more interesting?',
    accent: 'rgba(255,179,71,0.1)',
    border: 'rgba(255,179,71,0.25)',
  },
  {
    id: 'generate',
    label: 'Generate Recipe',
    icon: Wand2,
    color: 'var(--accent-hover)',
    desc: 'No matching recipe found? Let AI create a custom one just for you',
    placeholder: 'e.g. Create a recipe using salmon, miso, and bok choy. Make it Japanese style.',
    accent: 'rgba(0,229,195,0.1)',
    border: 'rgba(0,229,195,0.25)',
  },
  {
    id: 'describe',
    label: 'Describe a Recipe',
    icon: BookOpen,
    color: '#B794F4',
    desc: 'Get a beautiful, appetizing description for any recipe',
    placeholder: 'e.g. Describe Butter Chicken — creamy, rich, north Indian curry with aromatic spices.',
    accent: 'rgba(183,148,244,0.1)',
    border: 'rgba(183,148,244,0.25)',
  },
];

// ── Markdown-lite renderer ────────────────────────────────────
function RenderMessage({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={key++} style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1.3rem', color: 'var(--accent)', margin: '0.5rem 0 0.75rem', fontWeight: 700 }}>
          {line.replace('# ', '')}
        </h2>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', margin: '1rem 0 0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {line.replace('## ', '')}
        </h3>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={key++} style={{ fontWeight: 600, color: 'var(--text-secondary)', margin: '0.25rem 0', fontSize: '0.875rem' }}>
          {line.replace(/\*\*/g, '')}
        </p>
      );
    } else if (/^\*\*.*\*\*/.test(line)) {
      // Inline bold like **Prep time:** X mins
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={key++} style={{ margin: '0.2rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {parts.map((p, pi) =>
            p.startsWith('**') ? <strong key={pi} style={{ color: 'var(--text)' }}>{p.replace(/\*\*/g, '')}</strong> : p
          )}
        </p>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: '8px', margin: '3px 0', paddingLeft: '4px' }}>
          <span style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }}>•</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{line.replace(/^[-*]\s/, '')}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: '10px', margin: '5px 0', paddingLeft: '4px' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem', minWidth: '20px', flexShrink: 0 }}>{num}.</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{line.replace(/^\d+\.\s/, '')}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: '0.4rem' }} />);
    } else {
      elements.push(
        <p key={key++} style={{ margin: '0.2rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {line}
        </p>
      );
    }
  }

  return <div>{elements}</div>;
}

// ── Copy button ───────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handleCopy} title="Copy" style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: copied ? 'var(--accent-hover)' : 'var(--muted)', padding: '4px',
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: '0.75rem', transition: 'color 0.2s',
    }}>
      {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
    </button>
  );
}

// ── Chat message bubble ───────────────────────────────────────
function MessageBubble({ msg, modeColor }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: '1rem',
      animation: 'fadeUp 0.3s ease forwards',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${modeColor}, rgba(0,200,212,0.5))`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: '10px', marginTop: '4px',
        }}>
          <ChefHat size={16} color="#080B0F" strokeWidth={2.5} />
        </div>
      )}

      <div style={{
        maxWidth: '82%',
        background: isUser
          ? `var(--accent-dim)`
          : 'var(--surface2)',
        border: `1px solid ${isUser ? 'rgba(0,200,212,0.25)' : 'var(--border)'}`,
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        padding: '0.875rem 1.1rem',
      }}>
        {isUser ? (
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>{msg.content}</p>
        ) : (
          <>
            <RenderMessage content={msg.content} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
              <CopyButton text={msg.content} />
            </div>
          </>
        )}
      </div>

      {isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(0,200,212,0.15)', border: '1px solid rgba(0,200,212,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: '10px', marginTop: '4px',
          fontFamily: 'Syne', fontWeight: 800, fontSize: '0.75rem', color: 'var(--accent)',
        }}>
          U
        </div>
      )}
    </div>
  );
}

// ── Main Chat Page ────────────────────────────────────────────
export default function ChatPage() {
  const [activeMode,   setActiveMode]   = useState('chat');
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const mode = MODES.find(m => m.id === activeMode);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Welcome message when mode changes
  useEffect(() => {
    const welcomes = {
      chat:     'Hi! I\'m Chef AI 👋 Ask me anything about cooking — techniques, substitutions, food science, or recipe ideas. What\'s on your mind?',
      improve:  'Ready to level up your cooking! Tell me what ingredients you have and I\'ll suggest creative improvements, flavor pairings, and variations.',
      generate: 'Let\'s create something delicious! Tell me what ingredients you have (and any cuisine preference or dietary needs) and I\'ll generate a complete recipe just for you.',
      describe: 'I\'ll write beautiful, appetizing descriptions for any recipe. Just tell me the recipe name and any details you know about it!',
    };
    setMessages([{ role: 'assistant', content: welcomes[activeMode] }]);
    setError(null);
    setInput('');
  }, [activeMode]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: activeMode,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'API error');

      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearChat() {
    setActiveMode(m => m); // triggers useEffect welcome reset
    setMessages(prev => [prev[0]]); // keep welcome
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Page title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.4rem' }}>
            <Sparkles size={18} color="#00C8D4" />
            <span className="section-label" style={{ margin: 0 }}>AI Powered</span>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Chef <span style={{ color: 'var(--accent)' }}>AI</span> Assistant
          </h1>
        </div>

        {/* Mode selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
          {MODES.map(m => {
            const Icon = m.icon;
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMode(m.id)}
                style={{
                  background: active ? m.accent : 'var(--accent-dim)',
                  border: `1px solid ${active ? m.border : 'var(--border)'}`,
                  borderRadius: '14px',
                  padding: '0.875rem 1rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  transform: active ? 'translateY(-1px)' : 'none',
                  boxShadow: active ? `0 4px 20px ${m.accent}` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Icon size={16} color={active ? m.color : 'var(--muted)'} />
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: active ? m.color : 'var(--muted)' }}>
                    {m.label}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: active ? 'rgba(240,244,248,0.7)' : 'var(--muted)', lineHeight: 1.4 }}>
                  {m.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Chat window */}
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: `1px solid ${mode.border}`,
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: '440px',
          boxShadow: `0 0 40px ${mode.accent}`,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          {/* Chat header */}
          <div style={{
            padding: '0.875rem 1.25rem',
            borderBottom: `1px solid var(--border)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--accent-dim)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: mode.color, boxShadow: `0 0 8px ${mode.color}` }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: mode.color }}>
                {mode.label}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>· Llama 3 via Groq</span>
            </div>
            <button
              onClick={clearChat}
              title="Clear chat"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontFamily: 'DM Sans', padding: '4px 8px', borderRadius: '6px', transition: 'all 0.15s' }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', scrollbarWidth: 'thin', scrollbarColor: '#1A1F24 transparent' }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} modeColor={mode.color} />
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${mode.color}, rgba(0,200,212,0.5))`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ChefHat size={16} color="#080B0F" />
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px 18px 18px 18px', padding: '0.875rem 1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={14} color={mode.color} className="animate-spin-slow" />
                  <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Chef AI is thinking...</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--danger)' }}>
                ⚠️ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--accent-dim)' }}>
            {/* Quick suggestion chips */}
            {messages.length <= 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.75rem' }}>
                {activeMode === 'chat' && [
                  'How do I make crispy fried chicken?',
                  'Best substitute for heavy cream?',
                  'How to fix over-salted food?',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '5px 12px', fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>
                    {s}
                  </button>
                ))}
                {activeMode === 'generate' && [
                  'Salmon, miso, bok choy — Japanese',
                  'Chicken, lemon, rosemary — Mediterranean',
                  'Paneer, spinach, spices — Indian',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '5px 12px', fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>
                    {s}
                  </button>
                ))}
                {activeMode === 'improve' && [
                  'Chicken, garlic, butter, herbs',
                  'Rice, eggs, soy sauce, veggies',
                  'Pasta, tomatoes, basil, olive oil',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '5px 12px', fontSize: '0.78rem', color: 'var(--muted)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode.placeholder}
                rows={1}
                style={{
                  flex: 1,
                  background: 'var(--surface2)',
                  border: `1px solid ${input ? mode.border : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  color: 'var(--text)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                  transition: 'border-color 0.2s',
                  minHeight: '44px',
                  maxHeight: '120px',
                  overflow: 'auto',
                }}
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                  background: input.trim() && !loading ? mode.color : 'var(--border)',
                  border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: input.trim() && !loading ? `0 0 20px ${mode.accent}` : 'none',
                }}
              >
                {loading
                  ? <Loader2 size={18} color="#8B9AAB" className="animate-spin-slow" />
                  : <Send size={18} color={input.trim() ? 'var(--bg)' : 'var(--muted)'} />
                }
              </button>
            </div>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: 'var(--muted)', textAlign: 'center' }}>
              Press Enter to send · Shift+Enter for new line · Powered by Llama 3 (Groq)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
