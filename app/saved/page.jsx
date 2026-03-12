'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, ChefHat, Loader2, History, Clock, Trash2 } from 'lucide-react';
import Header from '../../components/Header';
import RecipeCard from '../../components/RecipeCard';
import { supabase } from '../../lib/supabase';

export default function SavedPage() {
  const [user,          setUser]          = useState(null);
  const [savedRecipes,  setSavedRecipes]  = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('saved'); // 'saved' | 'history'
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setUser(user);

      const [savedRes, historyRes] = await Promise.all([
        supabase.from('saved_recipes').select('*').eq('user_id', user.id).order('saved_at', { ascending: false }),
        supabase.from('search_history').select('*').eq('user_id', user.id).order('searched_at', { ascending: false }).limit(20),
      ]);

      setSavedRecipes(savedRes.data || []);
      setSearchHistory(historyRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleUnsave(recipeName) {
    const { data: { user: u } } = await supabase.auth.getUser();
    await supabase.from('saved_recipes').delete().eq('user_id', u.id).eq('recipe_name', recipeName);
    setSavedRecipes((prev) => prev.filter((r) => r.recipe_name !== recipeName));
  }

  async function clearHistory() {
    if (!confirm('Clear all search history?')) return;
    await supabase.from('search_history').delete().eq('user_id', user.id);
    setSearchHistory([]);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Loader2 size={32} color="#00C8D4" className="animate-spin-slow" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 'clamp(1.8rem, 4vw, 2.2rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.5rem' }}>
            Your Profile
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>{user?.email}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--accent-dim)', paddingBottom: '0' }}>
          {[
            { id: 'saved',   label: `Saved (${savedRecipes.length})`,       icon: Bookmark },
            { id: 'history', label: `Search History (${searchHistory.length})`, icon: History },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`,
                color: tab === id ? 'var(--accent)' : 'var(--muted)',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600, fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '-1px',
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Saved Recipes Tab */}
        {tab === 'saved' && (
          savedRecipes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: '20px', border: '1px dashed var(--accent-dim)' }}>
              <Bookmark size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} color="#00C8D4" />
              <h3 style={{ fontFamily: 'Syne', color: 'var(--text)', margin: '0 0 0.5rem' }}>No saved recipes yet</h3>
              <p style={{ color: 'var(--muted)', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
                Save recipes from the finder or browse page.
              </p>
              <a href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                <ChefHat size={16} /> Find Recipes
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {savedRecipes.map((r, i) => (
                <RecipeCard
                  key={r.id}
                  recipe={r.recipe_data || { recipe_name: r.recipe_name }}
                  index={i}
                  isSaved={true}
                  onSaveToggle={(name) => handleUnsave(name)}
                />
              ))}
            </div>
          )
        )}

        {/* Search History Tab */}
        {tab === 'history' && (
          searchHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--card-bg)', borderRadius: '20px', border: '1px dashed var(--accent-dim)' }}>
              <History size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} color="#00C8D4" />
              <p style={{ color: 'var(--muted)', margin: 0 }}>No search history yet.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button onClick={clearHistory} className="btn-ghost" style={{ color: 'var(--danger)', borderColor: 'rgba(255,107,107,0.2)' }}>
                  <Trash2 size={14} /> Clear history
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {searchHistory.map((h) => (
                  <div key={h.id} className="glass-card" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
                          {h.ingredients?.map((ing) => (
                            <span key={ing} className="badge badge-teal" style={{ fontSize: '0.72rem' }}>
                              {ing.charAt(0).toUpperCase() + ing.slice(1)}
                            </span>
                          ))}
                          {h.cuisine && <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>{h.cuisine}</span>}
                          {h.location && <span className="badge badge-muted" style={{ fontSize: '0.72rem' }}>{h.location}</span>}
                        </div>
                        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.8rem' }}>
                          {h.results_count} recipe{h.results_count !== 1 ? 's' : ''} found
                        </p>
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)', fontSize: '0.75rem', flexShrink: 0 }}>
                        <Clock size={12} />
                        {new Date(h.searched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
}
