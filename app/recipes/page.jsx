'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, BookOpen, Loader2 } from 'lucide-react';
import Header from '../../components/Header';
import RecipeCard from '../../components/RecipeCard';
import { supabase } from '../../lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function RecipesPage() {
  const [recipes,       setRecipes]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const [spiceFilter,   setSpiceFilter]   = useState('All');
  const [sortBy,        setSortBy]        = useState('rating');
  const [savedNames,    setSavedNames]    = useState(new Set());
  const [page,          setPage]          = useState(0);
  const [showFilters,   setShowFilters]   = useState(false);
  const PAGE_SIZE = 12;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('recipes').select('*').order('customer_rating', { ascending: false });
        if (!error && data?.length > 0) { setRecipes(data); }
        else {
          const res  = await fetch(`${API_BASE}/api/recipes`);
          const json = await res.json();
          setRecipes(json.recipes || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('saved_recipes').select('recipe_name').eq('user_id', user.id);
      if (data) setSavedNames(new Set(data.map(r => r.recipe_name)));
    }
    loadSaved();
  }, []);

  const allCuisines    = useMemo(() => ['All', ...Array.from(new Set(recipes.map(r => r.cuisine_type).filter(Boolean))).sort()], [recipes]);
  const allSpiceLevels = useMemo(() => ['All', ...Array.from(new Set(recipes.map(r => r.spice_level).filter(Boolean))).sort()], [recipes]);

  const filtered = useMemo(() => {
    let r = [...recipes];
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(x => x.recipe_name?.toLowerCase().includes(q) || x.ingredients?.toLowerCase().includes(q)); }
    if (cuisineFilter !== 'All') r = r.filter(x => x.cuisine_type === cuisineFilter);
    if (spiceFilter   !== 'All') r = r.filter(x => x.spice_level  === spiceFilter);
    if (sortBy === 'rating') r.sort((a,b) => (b.customer_rating||0)-(a.customer_rating||0));
    if (sortBy === 'time')   r.sort((a,b) => (a.preparation_time||99)-(b.preparation_time||99));
    if (sortBy === 'name')   r.sort((a,b) => a.recipe_name.localeCompare(b.recipe_name));
    return r;
  }, [recipes, search, cuisineFilter, spiceFilter, sortBy]);

  const paginated = useMemo(() => filtered.slice(0, (page+1)*PAGE_SIZE), [filtered, page]);
  const hasMore = paginated.length < filtered.length;
  const activeFilters = (cuisineFilter !== 'All' ? 1 : 0) + (spiceFilter !== 'All' ? 1 : 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.5rem)' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <BookOpen size={18} color="var(--accent)" />
            <span className="section-label" style={{ margin: 0 }}>Browse</span>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
            All Recipes
          </h1>
          {!loading && <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.875rem' }}>{filtered.length} recipes found</p>}
        </div>

        {/* Search bar — full width on mobile */}
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input className="input" style={{ paddingLeft: '36px', paddingRight: search ? '36px' : '12px' }}
            placeholder="Search recipes or ingredients..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle row */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button className="btn-ghost" onClick={() => setShowFilters(!showFilters)}
            style={{ fontSize: '0.85rem', padding: '7px 14px' }}>
            Filters {activeFilters > 0 && <span style={{ background: 'var(--accent)', color: 'var(--accent-btn-text)', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>{activeFilters}</span>}
          </button>
          <select className="input" style={{ width: 'auto', flex: '1', minWidth: 100, cursor: 'pointer', fontSize: '0.875rem', padding: '7px 12px' }}
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="rating">Top Rated</option>
            <option value="time">Quickest</option>
            <option value="name">A → Z</option>
          </select>
          {(search || activeFilters > 0) && (
            <button className="btn-ghost" onClick={() => { setSearch(''); setCuisineFilter('All'); setSpiceFilter('All'); setPage(0); }}
              style={{ fontSize: '0.85rem', padding: '7px 12px', color: 'var(--danger)', borderColor: 'rgba(220,38,38,0.2)' }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ flex: '1 1 140px' }}>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Cuisine</p>
              <select className="input" style={{ cursor: 'pointer', fontSize: '0.875rem' }}
                value={cuisineFilter} onChange={e => { setCuisineFilter(e.target.value); setPage(0); }}>
                {allCuisines.map(c => <option key={c} value={c}>{c === 'All' ? 'All Cuisines' : c}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <p className="section-label" style={{ marginBottom: '0.5rem' }}>Spice Level</p>
              <select className="input" style={{ cursor: 'pointer', fontSize: '0.875rem' }}
                value={spiceFilter} onChange={e => { setSpiceFilter(e.target.value); setPage(0); }}>
                {allSpiceLevels.map(s => <option key={s} value={s}>{s === 'All' ? 'All Spice Levels' : s}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '0.875rem' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 14 }} />
                <div className="skeleton" style={{ height: 12, width: '90%' }} />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--muted)' }}>
            <BookOpen size={40} style={{ opacity: 0.2, margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ margin: 0 }}>No recipes match your filters.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '0.875rem' }}>
              {paginated.map((recipe, i) => (
                <RecipeCard key={recipe.id || recipe.recipe_name+i} recipe={recipe} index={i}
                  isSaved={savedNames.has(recipe.recipe_name)}
                  onSaveToggle={(name, isSaved) => {
                    setSavedNames(prev => { const next = new Set(prev); isSaved ? next.add(name) : next.delete(name); return next; });
                  }} />
              ))}
            </div>
            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button className="btn-ghost" onClick={() => setPage(p => p+1)} style={{ padding: '10px 32px', width: '100%', maxWidth: 300 }}>
                  Load more ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
