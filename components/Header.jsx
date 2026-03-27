'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChefHat, Bookmark, BookOpen, Menu, X, LogOut, User, MessageSquare, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeProvider';

export default function Header() {
  const [user,        setUser]        = useState(null);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setMenuOpen(false); setProfileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfileOpen(false);
    router.push('/');
  }

  const navLinks = [
    { href: '/',        label: 'Recipe Finder', icon: ChefHat },
    { href: '/recipes', label: 'All Recipes',   icon: BookOpen },
    { href: '/chat',    label: 'Chef AI',        icon: MessageSquare },
    { href: '/saved',   label: 'Saved',          icon: Bookmark },
  ];

  return (
    <>
      {/* Responsive styles — no Tailwind dependency */}
      <style>{`
        .nav-desktop    { display: flex; }
        .auth-desktop   { display: block; }
        .hamburger-btn  { display: none; }
        @media (max-width: 768px) {
          .nav-desktop   { display: none !important; }
          .auth-desktop  { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
      `}</style>

      <header style={{
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 40,
        height: '60px',
      }}>
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(0.875rem, 3vw, 1.5rem)', gap: '0.75rem' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ChefHat size={18} color="var(--accent-btn-text)" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              Recipe<span style={{ color: 'var(--accent)' }}>AI</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="nav-desktop" style={{ alignItems: 'center', gap: '0.15rem' }}>
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', borderRadius: '8px', textDecoration: 'none',
                  fontFamily: 'DM Sans, sans-serif', fontWeight: active ? 600 : 500,
                  fontSize: '0.875rem',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}>
                  <Icon size={15} />{label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>

            {/* Theme toggle */}
            <button onClick={toggleTheme} title={isLight ? 'Dark mode' : 'Light mode'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: '9px', background: 'var(--accent-dim)', border: '1px solid var(--border-strong)', cursor: 'pointer', color: 'var(--accent)', flexShrink: 0 }}>
              {isLight ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            {/* Auth — desktop only */}
            <div className="auth-desktop">
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setProfileOpen(!profileOpen)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--accent-dim)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    <User size={15} />
                    <span>{user.email?.split('@')[0]}</span>
                  </button>
                  {profileOpen && (
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '8px', minWidth: '190px', boxShadow: '0 16px 40px rgba(0,0,0,0.25)', zIndex: 60 }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>Signed in as</p>
                        <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>{user.email}</p>
                      </div>
                      <Link href="/saved" onClick={() => setProfileOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', textDecoration: 'none', color: 'var(--muted)', fontSize: '0.875rem' }}>
                        <Bookmark size={14} /> Saved Recipes
                      </Link>
                      <button onClick={handleSignOut}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '7px 16px', background: 'var(--accent)', color: 'var(--accent-btn-text)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', border: 'none', borderRadius: '10px', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Sign in
                </Link>
              )}
            </div>

            {/* Hamburger — mobile only */}
            <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}
              style={{ alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: menuOpen ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${menuOpen ? 'var(--border-strong)' : 'transparent'}`, borderRadius: '8px', color: 'var(--muted)', cursor: 'pointer' }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(80vw, 300px)',
            background: 'var(--surface)',
            borderLeft: '1px solid var(--border)',
            zIndex: 51, overflowY: 'auto',
            padding: '1rem',
            display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
            animation: 'slideInRight 0.25s ease',
          }}>
            {/* Drawer header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Menu</span>
              <button onClick={() => setMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '12px', textDecoration: 'none', color: active ? 'var(--accent)' : 'var(--text)', fontWeight: active ? 600 : 400, fontSize: '1rem', background: active ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${active ? 'var(--border-strong)' : 'transparent'}` }}>
                    <Icon size={18} style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--muted)' }} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Auth in drawer */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
              {user ? (
                <>
                  <div style={{ padding: '10px 16px', marginBottom: '8px', background: 'var(--surface2)', borderRadius: '12px' }}>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>Signed in as</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500, wordBreak: 'break-all' }}>{user.email}</p>
                  </div>
                  <button onClick={handleSignOut}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--danger)', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 500 }}>
                    <LogOut size={16} /> Sign out
                  </button>
                </>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'var(--accent)', color: 'var(--accent-btn-text)', borderRadius: '12px', textDecoration: 'none', fontFamily: 'Syne', fontWeight: 700, fontSize: '0.95rem' }}>
                  <User size={16} /> Sign In
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {profileOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setProfileOpen(false)} />}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
