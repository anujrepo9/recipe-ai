'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, X, BookOpen, Loader2 } from 'lucide-react';
import Header from '../../components/Header';
import RecipeCard from '../../components/RecipeCard';
import { supabase } from '../../lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function RecipesPage() {
  const [recipes,      setRecipes]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const [spiceFilter,  setSpiceFilter]  = useState('All');
  const [sortBy,       setSortBy]       = useState('rating');
  const [savedNames,   setSavedNames]   = useState(new Set());
  const [page,         setPage]         = useState(0);
  const PAGE_SIZE = 12;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Try Supabase first
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .order('customer_rating', { ascending: false });

        if (!error && data && data.length > 0) {
          setRecipes(data);
        } else {
          // Fallback to Python API
          const res  = await fetch(`${API_BASE}/api/recipes`);
          const json = await res.json();
          setRecipes(json.recipes || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load saved recipes
  useEffect(() => {
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('saved_recipes').select('recipe_name').eq('user_id', user.id);
      if (data) setSavedNames(new Set(data.map((r) => r.recipe_name)));
    }
    loadSaved();
  }, []);

  const allCuisines = useMemo(() => {
    const s = new Set(recipes.map((r) => r.cuisine_type).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [recipes]);

  const allSpiceLevels = useMemo(() => {
    const s = new Set(recipes.map((r) => r.spice_level).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [recipes]);

  const filtered = useMemo(() => {
    let r = [...recipes];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.recipe_name?.toLowerCase().includes(q) ||
          x.ingredients?.toLowerCase().includes(q)
      );
    }
    if (cuisineFilter !== 'All') r = r.filter((x) => x.cuisine_type === cuisineFilter);
    if (spiceFilter  !== 'All') r = r.filter((x) => x.spice_level  === spiceFilter);

    if (sortBy === 'rating')  r.sort((a, b) => (b.customer_rating || 0) - (a.customer_rating || 0));
    if (sortBy === 'time')    r.sort((a, b) => (a.preparation_time || 99) - (b.preparation_time || 99));
    if (sortBy === 'name')    r.sort((a, b) => a.recipe_name.localeCompare(b.recipe_name));

    return r;
  }, [recipes, search, cuisineFilter, spiceFilter, sortBy]);

  const paginated = useMemo(
    () => filtered.slice(0, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );
  const hasMore = paginated.length < filtered.length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <BookOpen size={20} color="#00C8D4" />
            <span className="section-label" style={{ margin: 0 }}>Browse</span>
          </div>
          <h1
            style={{
              fontFamily: 'Playfair Display, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
              fontWeight: 700,
              color: '#F0F4F8',
              margin: '0 0 0.5rem',
            }}
          >
            All Recipes
          </h1>
          {!loading && (
            <p style={{ color: '#8B9AAB', margin: 0, fontSize: '0.9rem' }}>
              {filtered.length} recipes found
            </p>
          )}
        </div>

        {/* Filters Row */}
        <div
          style={{
            display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
            marginBottom: '1.75rem', alignItems: 'center',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '340px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8B9AAB' }} />
            <input
              className="input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search recipes or ingredients..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8B9AAB', cursor: 'pointer', padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Cuisine Filter */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: '140px', cursor: 'pointer' }}
            value={cuisineFilter}
            onChange={(e) => { setCuisineFilter(e.target.value); setPage(0); }}
          >
            {allCuisines.map((c) => <option key={c} value={c}>{c === 'All' ? 'All Cuisines' : c}</option>)}
          </select>

          {/* Spice Filter */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: '130px', cursor: 'pointer' }}
            value={spiceFilter}
            onChange={(e) => { setSpiceFilter(e.target.value); setPage(0); }}
          >
            {allSpiceLevels.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Spice Levels' : s}</option>)}
          </select>

          {/* Sort */}
          <select
            className="input"
            style={{ width: 'auto', minWidth: '130px', cursor: 'pointer' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="rating">Top Rated</option>
            <option value="time">Quickest</option>
            <option value="name">A → Z</option>
          </select>

          {/* Clear filters */}
          {(search || cuisineFilter !== 'All' || spiceFilter !== 'All') && (
            <button
              className="btn-ghost"
              onClick={() => { setSearch(''); setCuisineFilter('All'); setSpiceFilter('All'); setPage(0); }}
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: '#111518', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(0,200,212,0.08)' }}>
                <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }} />
                <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 14, width: '90%' }} />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#8B9AAB' }}>
            <BookOpen size={48} style={{ opacity: 0.2, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ margin: 0 }}>No recipes match your filters.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
              {paginated.map((recipe, i) => (
                <RecipeCard
                  key={recipe.id || recipe.recipe_name + i}
                  recipe={recipe}
                  index={i}
                  isSaved={savedNames.has(recipe.recipe_name)}
                  onSaveToggle={(name, isSaved) => {
                    setSavedNames(prev => {
                      const next = new Set(prev);
                      isSaved ? next.add(name) : next.delete(name);
                      return next;
                    });
                  }}
                />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <button
                  className="btn-ghost"
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '10px 32px' }}
                >
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
