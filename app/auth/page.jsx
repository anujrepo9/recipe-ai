'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AuthPage() {
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('login');
      }
    } catch (err) { setError(err.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1rem, 4vw, 2rem) 1rem' }}>

      {/* Background glow */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 'min(500px, 90vw)', height: '300px', background: 'radial-gradient(ellipse, var(--accent-dim) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'clamp(16px, 4vw, 24px)', padding: 'clamp(1.5rem, 5vw, 2.5rem) clamp(1.25rem, 5vw, 2rem)', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem' }}>
            <ChefHat size={26} color="var(--accent-btn-text)" strokeWidth={2.5} />
          </div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)', margin: '0 0 0.2rem' }}>
            Recipe<span style={{ color: 'var(--accent)' }}>AI</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </p>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--muted)', fontSize: '0.78rem', textDecoration: 'none' }}>
            <ArrowLeft size={12} /> Back to Recipe Finder
          </a>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: '10px', padding: '4px', marginBottom: '1.25rem', gap: '4px' }}>
          {[{id:'login',label:'Sign In'},{id:'signup',label:'Sign Up'}].map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setError(null); setSuccess(null); }}
              style={{ flex: 1, padding: '9px', background: mode === m.id ? 'var(--accent)' : 'transparent', color: mode === m.id ? 'var(--accent-btn-text)' : 'var(--muted)', border: 'none', borderRadius: '7px', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {success && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--accent-dim)', border: '1px solid var(--border-strong)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem', color: 'var(--accent)', fontSize: '0.85rem' }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {success}
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px', fontFamily: 'Syne' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: '34px' }} type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '6px', fontFamily: 'Syne' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input className="input" style={{ paddingLeft: '34px', paddingRight: '38px' }}
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
                value={password} onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.25rem', width: '100%' }}>
            {loading
              ? <><Loader2 size={15} className="animate-spin-slow" /> Please wait...</>
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--muted)', fontSize: '0.78rem' }}>
          By signing up you agree to our <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>Terms of Service</span>.
        </p>
      </div>
    </div>
  );
}
