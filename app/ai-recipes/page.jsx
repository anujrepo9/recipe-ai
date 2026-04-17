'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChefHat, Loader2, AlertCircle, SlidersHorizontal, X, Wand2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { supabase } from '../../lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/* ─── tiny markdown renderer ──────────────────────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} style={{ fontFamily: 'Playfair Display,serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.5rem' }}>{line.slice(2)}</h2>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} style={{ fontFamily: 'Syne,sans-serif', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', margin: '1.1rem 0 0.4rem' }}>{line.slice(3)}</h3>);
    } else if (line.startsWith('### ')) {
      elements.push(<h4 key={i} style={{ fontFamily: 'DM Sans,sans-serif', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', margin: '0.75rem 0 0.3rem' }}>{line.slice(4)}</h4>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.1rem' }}>•</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\.\s/)[1];
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.3rem', alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', minWidth: 18, flexShrink: 0, marginTop: '0.15rem', fontFamily: 'Syne' }}>{num}.</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: inlineFormat(line.replace(/^\d+\.\s/, '')) }} />
        </div>
      );
    } else if (line.trim() === '' || line.trim() === '---') {
      if (line.trim() === '---') {
        elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />);
      } else {
        elements.push(<div key={i} style={{ height: '0.35rem' }} />);
      }
    } else if (line.trim()) {
      elements.push(
        <p key={i} style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.7, margin: '0 0 0.35rem' }} dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
    i++;
  }
  return elements;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text);font-weight:600">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--surface2);padding:1px 5px;border-radius:4px;font-size:0.82em">$1</code>');
}

/* ─── Skeleton card while AI generates ────────────────────────────────────── */
function AiSkeletonCard() {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="skeleton" style={{ height: 20, width: '55%', borderRadius: 6 }} />
      <div className="skeleton" style={{ height: 13, width: '35%', borderRadius: 6 }} />
      <div style={{ display: 'flex', gap: 6 }}>{[90, 65, 75].map((w, i) => <div key={i} className="skeleton" style={{ height: 22, width: w, borderRadius: 999 }} />)}</div>
      <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
      {[100, 90, 85, 95, 80, 70].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 12, width: `${w}%`, borderRadius: 4 }} />
      ))}
    </div>
  );
}

/* ─── Individual AI recipe card ────────────────────────────────────────────── */
function AiRecipeCard({ recipe, aiData }) {
  const spiceColors = { mild: '#4ade80', medium: '#fbbf24', hot: '#f97316', 'very hot': '#ef4444' };
  const spiceColor = spiceColors[(recipe.spice_level || 'medium').toLowerCase()] || '#fbbf24';

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      
      {/* Card header */}
      <div style={{ padding: '0.85rem 1rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--accent-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
          <h3 style={{ fontFamily: 'Playfair Display,serif', fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
            {recipe.recipe_name}
          </h3>
          {recipe.predicted_rating && (
            <span style={{ background: 'var(--accent)', color: 'var(--accent-btn-text)', padding: '2px 8px', borderRadius: 999, fontFamily: 'Syne', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
              ★ {Number(recipe.predicted_rating).toFixed(1)}
            </span>
          )}
        </div>

        {/* Matched ingredients row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
          {recipe.matched_ingredients?.map(ing => (
            <span key={ing} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 8px', borderRadius: 999, fontSize: '0.68rem', fontFamily: 'DM Sans', fontWeight: 600, background: 'rgba(20,184,166,0.12)', color: '#2dd4bf', border: '1px solid rgba(20,184,166,0.25)' }}>
              ✓ {ing}
            </span>
          ))}
          {recipe.location && <span className="badge badge-muted">{recipe.location}</span>}
          {recipe.cuisine_type && <span className="badge badge-amber">{recipe.cuisine_type}</span>}
          {recipe.spice_level && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 8px', borderRadius: 999, fontSize: '0.68rem', fontFamily: 'DM Sans', fontWeight: 600, background: `${spiceColor}18`, color: spiceColor, border: `1px solid ${spiceColor}30` }}>
              🌶 {recipe.spice_level}
            </span>
          )}
        </div>
      </div>

      {/* AI content */}
      <div style={{ padding: '1.25rem' }}>
        {aiData?.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
            <Loader2 size={15} className="animate-spin-slow" />
            <span>Generating AI description...</span>
          </div>
        ) : aiData?.error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={14} /> {aiData.error}
          </div>

        ) : aiData?.content ? (
          <div>
            {renderMarkdown(aiData.content)}
            {recipe.youtube_url && (
              <a
                href={recipe.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: '1rem', padding: '5px 14px', borderRadius: 999, fontSize: '0.78rem', fontFamily: 'DM Sans', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
                Watch on YouTube
              </a>
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function AiRecipesPage() {
  const [ingredients,          setIngredients]          = useState([]);
  const [cuisines,             setCuisines]             = useState([]);
  const [locations,            setLocations]            = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [predicting,           setPredicting]           = useState(false);
  const [results,              setResults]              = useState(null);
  const [error,                setError]                = useState(null);
  const [sidebarOpen,          setSidebarOpen]          = useState(false);
  const [selectedIngredients,  setSelectedIngredients]  = useState([]);
  const [selectedCuisine,      setSelectedCuisine]      = useState(null);
  const [selectedLocation,     setSelectedLocation]     = useState(null);
  const [aiDetails,            setAiDetails]            = useState({});  // { name: { content, loading, error } }
  const [visibleCount,         setVisibleCount]         = useState(3);

  /* load filter options */
  useEffect(() => {
    async function fetchData() {
      const CACHE_KEY = 'recipeai-static-v1';
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { ingredients: ing, cuisines: cui, locations: loc } = JSON.parse(cached);
          setIngredients(ing); setCuisines(cui); setLocations(loc); setLoading(false); return;
        } catch { /* fall through */ }
      }
      try {
        const [ingRes, cuiRes, locRes] = await Promise.all([
          fetch(`${API_BASE}/api/ingredients`),
          fetch(`${API_BASE}/api/cuisines`),
          fetch(`${API_BASE}/api/locations`),
        ]);
        const [ingData, cuiData, locData] = await Promise.all([ingRes.json(), cuiRes.json(), locRes.json()]);
        const ing = ingData.ingredients || [], cui = cuiData.cuisines || [], loc = locData.locations || [];
        setIngredients(ing); setCuisines(cui); setLocations(loc);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ingredients: ing, cuisines: cui, locations: loc })); } catch {}
      } catch { setError('Could not connect to the API. Make sure the server is running.'); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  /* generate AI detail for a single recipe */
  const generateAiDetail = useCallback(async (recipe) => {
    const key = recipe.recipe_name;
    setAiDetails(prev => ({ ...prev, [key]: { loading: true, content: null, error: null } }));
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ai-detail',
          messages: [{ role: 'user', content: `Generate a detailed profile for: ${recipe.recipe_name}` }],
          context: {
            recipeName:    recipe.recipe_name,
            cuisine:       recipe.cuisine_type,
            location:      recipe.location,
            spiceLevel:    recipe.spice_level,
            cookingTime:   recipe.cooking_time,
            rating:        recipe.predicted_rating,
            ingredients:   selectedIngredients,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiDetails(prev => ({ ...prev, [key]: { loading: false, content: data.content, error: null } }));
    } catch (e) {
      setAiDetails(prev => ({ ...prev, [key]: { loading: false, content: null, error: e.message || 'AI generation failed' } }));
    }
  }, [selectedIngredients]);

  /* predict + generate first 3 */
  async function handlePredict() {
    if (!selectedIngredients.length) { setError('Please select at least 1 ingredient.'); return; }
    if (!selectedCuisine)            { setError('Please select a cuisine type.'); return; }
    if (!selectedLocation)           { setError('Please select a location.'); return; }
    setError(null); setPredicting(true); setResults(null); setAiDetails({}); setVisibleCount(3);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: selectedIngredients, cuisine: selectedCuisine, location: selectedLocation }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Prediction failed');
      setResults(data.recommendations);
      // Generate first 3 in parallel
      data.recommendations.slice(0, 3).forEach(recipe => generateAiDetail(recipe));
      // Log search
      const { data: { user } } = await supabase.auth.getUser();
      if (user) supabase.from('search_history').insert({ user_id: user.id, ingredients: selectedIngredients, cuisine: selectedCuisine, location: selectedLocation, results_count: data.recommendations.length }).then(() => {});
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setPredicting(false); }
  }

  /* load next 3 */
  function handleLoadMore() {
    const next = visibleCount + 3;
    if (results) {
      results.slice(visibleCount, next).forEach(recipe => {
        if (!aiDetails[recipe.recipe_name]) generateAiDetail(recipe);
      });
    }
    setVisibleCount(next);
  }

  function toggleIngredient(ing) {
    setSelectedIngredients(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);
  }

  const filterCount    = selectedIngredients.length + (selectedCuisine ? 1 : 0) + (selectedLocation ? 1 : 0);
  const visibleResults = results ? results.slice(0, visibleCount) : [];
  const hasMore        = results && visibleCount < results.length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <Header />
      <div style={{ display: 'flex', position: 'relative', overflowX: 'hidden' }}>

        {/* Desktop Sidebar */}
        <div id="ai-desktop-sidebar-wrap">
          {loading ? (
            <aside className="sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[120, 80, 100, 60, 90].map((w, i) => <div key={i} className="skeleton" style={{ height: 28, width: w, borderRadius: 999 }} />)}
              </div>
            </aside>
          ) : (
            <Sidebar ingredients={ingredients} cuisines={cuisines} locations={locations}
              selectedIngredients={selectedIngredients} selectedCuisine={selectedCuisine}
              selectedLocation={selectedLocation} onIngredientToggle={toggleIngredient}
              onCuisineSelect={setSelectedCuisine} onLocationSelect={setSelectedLocation} />
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 49, backdropFilter: 'blur(3px)' }} onClick={() => setSidebarOpen(false)} />
            <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 'min(85vw, 300px)', background: 'var(--surface)', borderRight: '1px solid var(--border-strong)', zIndex: 50, overflowY: 'auto', animation: 'slideInLeft 0.25s ease', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Filters</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                <Sidebar ingredients={ingredients} cuisines={cuisines} locations={locations}
                  selectedIngredients={selectedIngredients} selectedCuisine={selectedCuisine}
                  selectedLocation={selectedLocation} onIngredientToggle={toggleIngredient}
                  onCuisineSelect={setSelectedCuisine} onLocationSelect={setSelectedLocation}
                  inDrawer={true} />
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="page-main" style={{ flex: 1, minWidth: 0, maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem' }}>

          {/* Hero */}
          <div className="hero-section" style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem', position: 'relative', background: 'var(--accent-dim)', border: '1px solid var(--border)', padding: '2rem 1.5rem' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/kitchen.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.07 }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.6rem' }}>
                <Wand2 size={16} color="var(--accent)" />
                <span style={{ fontFamily: 'Syne', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>AI-Generated Profiles</span>
              </div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.5rem', lineHeight: 1.2 }}>
                Deep-Dive Recipes<br />
                <em style={{ color: 'var(--accent)' }}>Powered by AI.</em>
              </h1>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--muted)', fontSize: 'clamp(0.82rem, 2.5vw, 0.95rem)', maxWidth: '520px' }}>
                Select your ingredients — our ML model finds matches, then Groq AI writes a full detailed profile for each recipe: ingredients breakdown, techniques, tips, and more.
              </p>

              {filterCount > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '1rem' }}>
                  {selectedIngredients.slice(0, 4).map(ing => <span key={ing} className="badge badge-teal">{ing.charAt(0).toUpperCase() + ing.slice(1)}</span>)}
                  {selectedIngredients.length > 4 && <span className="badge badge-muted">+{selectedIngredients.length - 4} more</span>}
                  {selectedCuisine  && <span className="badge badge-amber">{selectedCuisine}</span>}
                  {selectedLocation && <span className="badge badge-muted">{selectedLocation}</span>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button className="btn-primary" id="ai-predict-btn" onClick={handlePredict} disabled={predicting || loading}>
                  {predicting
                    ? <><Loader2 size={15} className="animate-spin-slow" /> Finding recipes...</>
                    : <><Sparkles size={15} /> Generate AI Recipes</>}
                </button>
                <button className="btn-ghost" onClick={() => setSidebarOpen(true)} style={{ display: 'flex', flex: '0 0 auto' }} id="ai-mobile-filter-btn">
                  <SlidersHorizontal size={15} /> Filters
                  {filterCount > 0 && (
                    <span style={{ background: 'var(--accent)', color: 'var(--accent-btn-text)', borderRadius: '999px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {filterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          <style>{`
            #ai-mobile-filter-btn   { display: none; }
            #ai-desktop-sidebar-wrap { display: block; }
            @media (max-width: 768px) {
              #ai-mobile-filter-btn    { display: inline-flex !important; }
              #ai-predict-btn          { width: 100%; justify-content: center; }
              #ai-desktop-sidebar-wrap { display: none !important; }
            }
          `}</style>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
            </div>
          )}

          {/* ML loading skeletons */}
          {predicting && (
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} className="animate-spin-slow" /> Running ML model...
              </p>
              {[...Array(3)].map((_, i) => <div key={i} style={{ marginBottom: '1rem' }}><AiSkeletonCard /></div>)}
            </div>
          )}

          {/* Results */}
          {results && !predicting && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
                  AI Profiles{' '}
                  <span style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.875rem', color: 'var(--accent)' }}>
                    showing {visibleResults.length} of {results.length}
                  </span>
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'DM Sans' }}>
                  <Wand2 size={13} color="var(--accent)" /> Groq · llama-3.3-70b
                </div>
              </div>

              {results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted)' }}>
                  <ChefHat size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
                  <p style={{ margin: 0 }}>No recipes found. Try different ingredients or cuisine.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {visibleResults.map((recipe, i) => (
                      <AiRecipeCard
                        key={recipe.recipe_name + i}
                        recipe={recipe}
                        aiData={aiDetails[recipe.recipe_name]}
                      />
                    ))}
                  </div>

                  {/* Load more / collapse toggle */}
                  {(hasMore || visibleCount > 3) && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {hasMore && (
                        <button
                          onClick={handleLoadMore}
                          className="btn-primary"
                          style={{ gap: 8 }}
                        >
                          <ChevronDown size={15} />
                          Load next {Math.min(3, results.length - visibleCount)} recipes
                          <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {results.length - visibleCount} left
                          </span>
                        </button>
                      )}
                      {visibleCount > 3 && (
                        <button
                          onClick={() => setVisibleCount(3)}
                          className="btn-ghost"
                          style={{ gap: 8 }}
                        >
                          <ChevronUp size={15} /> Collapse
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Empty state */}
          {!results && !predicting && !error && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--card-bg)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Wand2 size={28} color="var(--accent)" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.4rem', fontSize: '1rem' }}>Ready to generate</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                Pick ingredients, hit Generate — and get a full AI-written profile for each recipe.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}