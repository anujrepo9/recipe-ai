'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChefHat, Bookmark, BookOpen, Menu, X, LogOut, User, MessageSquare, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/ThemeProvider';

export default function Header({ onMobileMenuToggle }) {
  const [user, setUser]       = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setProfileOpen(false);
    router.push('/');
  }

  const navLinks = [
    { href: '/',         label: 'Recipe Finder', icon: ChefHat },
    { href: '/recipes',  label: 'All Recipes',   icon: BookOpen },
    { href: '/chat',     label: 'Chef AI',        icon: MessageSquare },
    { href: '/saved',    label: 'Saved',          icon: Bookmark },
  ];

  return (
    <header
      style={{
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: '64px',
      }}
    >
      <div
        style={{
          maxWidth: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          gap: '1rem',
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00C8D4, #00E5C3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ChefHat size={20} color="#080B0F" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: '1.15rem',
              color: '#F0F4F8',
              letterSpacing: '-0.01em',
            }}
          >
            Recipe<span style={{ color: '#00C8D4' }}>AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="hidden md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9rem',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  background: active ? 'var(--accent-dim)' : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '9px',
              background: isLight ? 'rgba(232,98,10,0.1)' : 'rgba(0,200,212,0.08)',
              border: `1px solid ${isLight ? 'rgba(232,98,10,0.25)' : 'rgba(0,200,212,0.2)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: isLight ? '#E8620A' : '#00C8D4',
            }}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: 'rgba(0,200,212,0.08)',
                  border: '1px solid rgba(0,200,212,0.2)',
                  borderRadius: '8px',
                  color: '#00C8D4',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                <User size={16} />
                <span className="hidden sm:inline">
                  {user.email?.split('@')[0]}
                </span>
              </button>

              {profileOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    background: '#1A1F24',
                    border: '1px solid rgba(0,200,212,0.15)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '180px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    zIndex: 50,
                  }}
                >
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(0,200,212,0.1)', marginBottom: '4px' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#8B9AAB' }}>Signed in as</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#F0F4F8', fontWeight: 500 }}>{user.email}</p>
                  </div>
                  <Link
                    href="/saved"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', borderRadius: '8px',
                      textDecoration: 'none', color: '#8B9AAB',
                      fontSize: '0.875rem', transition: 'all 0.15s',
                    }}
                  >
                    <Bookmark size={15} /> Saved Recipes
                  </Link>
                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', padding: '8px 12px', borderRadius: '8px',
                      background: 'none', border: 'none', color: '#FF6B6B',
                      fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.875rem', textDecoration: 'none' }}>
              Sign in
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => { setMenuOpen(!menuOpen); onMobileMenuToggle?.(!menuOpen); }}
            style={{
              background: 'none', border: 'none', color: '#8B9AAB',
              cursor: 'pointer', padding: '4px', display: 'flex',
            }}
            className="md:hidden"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            background: 'rgba(17, 21, 24, 0.97)',
            borderBottom: '1px solid rgba(0,200,212,0.1)',
            padding: '1rem',
            zIndex: 39,
            backdropFilter: 'blur(20px)',
          }}
          className="md:hidden"
        >
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px', borderRadius: '10px',
                textDecoration: 'none', color: pathname === href ? '#00C8D4' : '#8B9AAB',
                fontWeight: 500, fontSize: '0.95rem',
                background: pathname === href ? 'rgba(0,200,212,0.08)' : 'transparent',
              }}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </div>
      )}

      {/* Overlay to close profile menu */}
      {profileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 45 }}
          onClick={() => setProfileOpen(false)}
        />
      )}
    </header>
  );
}
