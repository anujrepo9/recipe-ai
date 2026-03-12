'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Sparkles, ChefHat, Wand2, Send, Loader2, RotateCcw, Copy, Check, Lightbulb, BookOpen } from 'lucide-react';
import Header from '../../components/Header';

const MODES = [
  { id: 'chat',     label: 'Ask Chef AI',      icon: MessageSquare, color: 'var(--accent)',       desc: 'Cooking Q&A',            placeholder: 'e.g. How do I make pasta al dente? What substitutes buttermilk?' },
  { id: 'improve',  label: 'Improve Recipe',   icon: Lightbulb,     color: 'var(--amber)',        desc: 'Enhance your ingredients', placeholder: 'e.g. I have chicken, garlic, lemon and rosemary...' },
  { id: 'generate', label: 'Generate Recipe',  icon: Wand2,         color: 'var(--accent-hover)', desc: 'Create from scratch',     placeholder: 'e.g. Salmon, miso, bok choy — Japanese style' },
  { id: 'describe', label: 'Describe Recipe',  icon: BookOpen,      color: '#B794F4',             desc: 'Write appetizing copy',   placeholder: 'e.g. Describe Butter Chicken — creamy north Indian curry' },
];

const QUICK = {
  chat:     ['Crispy fried chicken tips?', 'Substitute for heavy cream?', 'Fix over-salted food?'],
  generate: ['Salmon, miso, bok choy', 'Chicken, lemon, rosemary', 'Paneer, spinach, spices'],
  improve:  ['Chicken, garlic, butter, herbs', 'Rice, eggs, soy sauce', 'Pasta, tomatoes, basil'],
  describe: ['Describe Butter Chicken', 'Describe Pav Bhaji', 'Describe Ramen'],
};

function RenderMessage({ content }) {
  const lines = content.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: '0.35rem' }} />;
        if (line.startsWith('# '))  return <h2 key={i} style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--accent)', margin: '0.4rem 0 0.6rem', fontWeight: 700 }}>{line.slice(2)}</h2>;
        if (line.startsWith('## ')) return <h3 key={i} style={{ fontFamily: 'Syne', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', margin: '0.75rem 0 0.3rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{line.slice(3)}</h3>;
        if (line.match(/^\*\*.*\*\*$/)) return <p key={i} style={{ fontWeight: 600, color: 'var(--text)', margin: '0.2rem 0', fontSize: '0.875rem' }}>{line.replace(/\*\*/g,'')}</p>;
        if (/^\*\*.*\*\*/.test(line)) {
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return <p key={i} style={{ margin: '0.2rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{parts.map((p,pi) => p.startsWith('**') ? <strong key={pi} style={{ color: 'var(--text)' }}>{p.replace(/\*\*/g,'')}</strong> : p)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <div key={i} style={{ display: 'flex', gap: '8px', margin: '3px 0' }}>
            <span style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }}>•</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{line.slice(2)}</span>
          </div>
        );
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)?.[1];
          return (
            <div key={i} style={{ display: 'flex', gap: '10px', margin: '4px 0' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.82rem', minWidth: '18px', flexShrink: 0 }}>{num}.</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{line.replace(/^\d+\.\s/,'')}</span>
            </div>
          );
        }
        return <p key={i} style={{ margin: '0.2rem 0', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{line}</p>;
      })}
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--accent-hover)' : 'var(--muted)', padding: '4px', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem' }}>
      {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

function Bubble({ msg, modeColor }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '0.875rem', animation: 'fadeUp 0.3s ease forwards' }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${modeColor}, var(--accent-dim))`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px', marginTop: '4px' }}>
          <ChefHat size={14} color="white" strokeWidth={2.5} />
        </div>
      )}
      <div style={{ maxWidth: '80%', background: isUser ? 'var(--accent-dim)' : 'var(--surface2)', border: `1px solid ${isUser ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px', padding: '0.75rem 1rem' }}>
        {isUser
          ? <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.6 }}>{msg.content}</p>
          : <>
              <RenderMessage content={msg.content} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border)' }}>
                <CopyBtn text={msg.content} />
              </div>
            </>
        }
      </div>
      {isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-dim)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '8px', marginTop: '4px', fontFamily: 'Syne', fontWeight: 800, fontSize: '0.7rem', color: 'var(--accent)' }}>
          U
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [activeMode, setActiveMode] = useState('chat');
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const mode = MODES.find(m => m.id === activeMode);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  useEffect(() => {
    const welcomes = {
      chat:     "Hi! I'm Chef AI 👋 Ask me anything about cooking — techniques, substitutions, food science, or recipe ideas.",
      improve:  "Ready to level up your cooking! Tell me your ingredients and I'll suggest improvements and flavour pairings.",
      generate: "Let's create something delicious! Tell me your ingredients (and cuisine preference) and I'll generate a full recipe.",
      describe: "I'll write appetizing descriptions for any recipe. Tell me the recipe name and any details you know!",
    };
    setMessages([{ role: 'assistant', content: welcomes[activeMode] }]);
    setError(null); setInput('');
  }, [activeMode]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages); setInput(''); setLoading(true); setError(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: activeMode, messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'API error');
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setLoading(false); inputRef.current?.focus(); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, maxWidth: '860px', width: '100%', margin: '0 auto', padding: 'clamp(1rem, 3vw, 1.5rem) clamp(0.75rem, 3vw, 1rem)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.3rem' }}>
            <Sparkles size={16} color="var(--accent)" />
            <span className="section-label" style={{ margin: 0 }}>AI Powered</span>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Chef <span style={{ color: 'var(--accent)' }}>AI</span> Assistant
          </h1>
        </div>

        {/* Mode selector — scrollable on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          {MODES.map(m => {
            const Icon = m.icon;
            const active = activeMode === m.id;
            return (
              <button key={m.id} onClick={() => setActiveMode(m.id)}
                style={{ background: active ? 'var(--accent-dim)' : 'var(--surface)', border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: '12px', padding: 'clamp(0.6rem, 2vw, 0.875rem)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', transform: active ? 'translateY(-1px)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                  <Icon size={14} color={active ? 'var(--accent)' : 'var(--muted)'} />
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 'clamp(0.72rem, 2vw, 0.82rem)', color: active ? 'var(--accent)' : 'var(--muted)' }}>{m.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(0.68rem, 1.8vw, 0.74rem)', color: active ? 'var(--text-secondary)' : 'var(--muted)', lineHeight: 1.3 }}>{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Chat window */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 'clamp(360px, 55vh, 500px)' }}>
          {/* Header */}
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--accent-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: mode.color, boxShadow: `0 0 8px ${mode.color}` }} />
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent)' }}>{mode.label}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>· Llama 3 (Groq)</span>
            </div>
            <button onClick={() => setMessages(prev => [prev[0]])}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontFamily: 'DM Sans', padding: '3px 8px', borderRadius: '6px' }}>
              <RotateCcw size={12} /> Reset
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(0.875rem, 3vw, 1.25rem)', scrollbarWidth: 'thin' }}>
            {messages.map((msg, i) => <Bubble key={i} msg={msg} modeColor={mode.color} />)}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.875rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ChefHat size={14} color="var(--accent)" />
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px 18px 18px 18px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={13} color="var(--accent)" className="animate-spin-slow" />
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Chef AI is thinking...</span>
                </div>
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.875rem', fontSize: '0.82rem', color: 'var(--danger)' }}>
                ⚠️ {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
            {/* Quick chips — horizontal scroll on mobile */}
            {messages.length <= 1 && (
              <div className="suggestion-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '2px' }}>
                {(QUICK[activeMode] || []).map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '999px', padding: '5px 12px', fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'DM Sans', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={mode.placeholder} rows={1}
                style={{ flex: 1, background: 'var(--input-bg)', border: `1px solid ${input ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: '10px', padding: '0.625rem 0.875rem', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif', fontSize: 'clamp(0.82rem, 2.5vw, 0.9rem)', outline: 'none', resize: 'none', lineHeight: 1.5, minHeight: '40px', maxHeight: '110px', overflow: 'auto' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'; }} />
              <button onClick={sendMessage} disabled={loading || !input.trim()}
                style={{ width: 40, height: 40, borderRadius: '10px', flexShrink: 0, background: input.trim() && !loading ? 'var(--accent)' : 'var(--surface2)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                {loading ? <Loader2 size={16} color="var(--muted)" className="animate-spin-slow" /> : <Send size={16} color={input.trim() ? 'var(--accent-btn-text)' : 'var(--muted)'} />}
              </button>
            </div>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'center' }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
