'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ChefHat, Loader2, AlertCircle, SlidersHorizontal, X } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import RecipeCard from '../components/RecipeCard';
import { supabase } from '../lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>
      <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[80, 60, 70].map((w, i) => <div key={i} className="skeleton" style={{ height: 22, width: w, borderRadius: 999 }} />)}
      </div>
      <div className="skeleton" style={{ height: 12, width: '90%' }} />
    </div>
  );
}

export default function HomePage() {
  const [ingredients,   setIngredients]   = useState([]);
  const [cuisines,      setCuisines]      = useState([]);
  const [locations,     setLocations]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [predicting,    setPredicting]    = useState(false);
  const [results,       setResults]       = useState(null);
  const [error,         setError]         = useState(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [selectedCuisine,     setSelectedCuisine]     = useState(null);
  const [selectedLocation,    setSelectedLocation]    = useState(null);
  const [savedNames,          setSavedNames]          = useState(new Set());

  useEffect(() => {
    async function fetchData() {
      // Cache static lists in sessionStorage — they don't change between visits.
      // This alone eliminates 3 edge/serverless calls per page load.
      const CACHE_KEY = 'recipeai-static-v1';
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { ingredients: ing, cuisines: cui, locations: loc } = JSON.parse(cached);
          setIngredients(ing);
          setCuisines(cui);
          setLocations(loc);
          setLoading(false);
          return;
        } catch { /* bad cache — fall through to fetch */ }
      }

      try {
        const [ingRes, cuiRes, locRes] = await Promise.all([
          fetch(`${API_BASE}/api/ingredients`),
          fetch(`${API_BASE}/api/cuisines`),
          fetch(`${API_BASE}/api/locations`),
        ]);
        const [ingData, cuiData, locData] = await Promise.all([ingRes.json(), cuiRes.json(), locRes.json()]);
        const ing = ingData.ingredients || [];
        const cui = cuiData.cuisines || [];
        const loc = locData.locations || [];
        setIngredients(ing);
        setCuisines(cui);
        setLocations(loc);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ingredients: ing, cuisines: cui, locations: loc })); } catch { /* storage full — ignore */ }
      } catch (e) {
        setError('Could not connect to the API. Make sure the server is running.');
      } finally { setLoading(false); }
    }
    fetchData();
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

  function toggleIngredient(ing) {
    setSelectedIngredients(prev => prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]);
  }

  async function handlePredict() {
    if (!selectedIngredients.length) { setError('Please select at least 1 ingredient.'); return; }
    if (!selectedCuisine)            { setError('Please select a cuisine type.'); return; }
    if (!selectedLocation)           { setError('Please select a location.'); return; }
    setError(null); setPredicting(true); setResults(null);
    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: selectedIngredients, cuisine: selectedCuisine, location: selectedLocation }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Prediction failed');
      setResults(data.recommendations);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('search_history').insert({ user_id: user.id, ingredients: selectedIngredients, cuisine: selectedCuisine, location: selectedLocation, results_count: data.recommendations.length }).then(() => {});
      }
    } catch (e) { setError(e.message || 'Something went wrong. Please try again.'); }
    finally { setPredicting(false); }
  }

  const filterCount = selectedIngredients.length + (selectedCuisine ? 1 : 0) + (selectedLocation ? 1 : 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', overflowX: 'hidden' }}>
      <Header />
      <div style={{ display: 'flex', position: 'relative', overflowX: 'hidden' }}>

        {/* Desktop Sidebar */}
        <div id="desktop-sidebar-wrap">
          {loading ? (
            <aside className="sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[120,80,100,60,90].map((w,i) => <div key={i} className="skeleton" style={{ height: 28, width: w, borderRadius: 999 }} />)}
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
            {/* Backdrop */}
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 49, backdropFilter: 'blur(3px)' }} onClick={() => setSidebarOpen(false)} />
            {/* Drawer — plain div, NOT aside (Sidebar renders its own aside) */}
            <div style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 'min(85vw, 300px)',
              background: 'var(--surface)',
              borderRight: '1px solid var(--border-strong)',
              zIndex: 50, overflowY: 'auto',
              animation: 'slideInLeft 0.25s ease',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Drawer header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Filters</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <X size={20} />
                </button>
              </div>
              {/* Sidebar content directly — no wrapper aside */}
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
                <ChefHat size={16} color="var(--accent)" />
                <span style={{ fontFamily: 'Syne', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>AI-Powered</span>
              </div>
              <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(1.4rem, 5vw, 2.2rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.5rem', lineHeight: 1.2 }}>
                Find Recipes with<br />
                <em style={{ color: 'var(--accent)' }}>What You Already Have.</em>
              </h1>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--muted)', fontSize: 'clamp(0.82rem, 2.5vw, 0.95rem)', maxWidth: '480px' }}>
                Select ingredients, cuisine, and location — our ML model predicts popularity and finds your perfect match.
              </p>

              {filterCount > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '1rem' }}>
                  {selectedIngredients.slice(0, 4).map(ing => <span key={ing} className="badge badge-teal">{ing.charAt(0).toUpperCase()+ing.slice(1)}</span>)}
                  {selectedIngredients.length > 4 && <span className="badge badge-muted">+{selectedIngredients.length-4} more</span>}
                  {selectedCuisine  && <span className="badge badge-amber">{selectedCuisine}</span>}
                  {selectedLocation && <span className="badge badge-muted">{selectedLocation}</span>}
                </div>
              )}

              {/* CTA row */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button className="btn-primary" id="predict-btn" onClick={handlePredict} disabled={predicting || loading}>
                  {predicting ? <><Loader2 size={15} className="animate-spin-slow" /> Finding recipes...</> : <><Sparkles size={15} /> Get Recommendations</>}
                </button>
                {/* Mobile filter button — always visible on mobile */}
                <button className="btn-ghost" onClick={() => setSidebarOpen(true)}
                  style={{ display: 'flex', flex: '0 0 auto' }}
                  id="mobile-filter-btn">
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
            #mobile-filter-btn  { display: none; }
            #desktop-sidebar-wrap { display: block; }
            @media (max-width: 768px) {
              #mobile-filter-btn    { display: inline-flex !important; }
              #predict-btn          { width: 100%; justify-content: center; }
              #desktop-sidebar-wrap { display: none !important; }
            }
          `}</style>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.875rem 1rem', marginBottom: '1.25rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
            </div>
          )}

          {/* Loading */}
          {predicting && (
            <div>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} className="animate-spin-slow" /> Running ML model...
              </p>
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Results */}
          {results && !predicting && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
                  Recommendations <span style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.875rem', color: 'var(--accent)' }}>{results.length} found</span>
                </h2>
              </div>
              {results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted)' }}>
                  <ChefHat size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem', display: 'block' }} />
                  <p style={{ margin: 0 }}>No recipes found. Try different ingredients or cuisine.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {results.map((recipe, i) => (
                    <RecipeCard key={recipe.recipe_name+i} recipe={recipe} index={i}
                      isSaved={savedNames.has(recipe.recipe_name)}
                      onSaveToggle={(name, isSaved) => {
                        setSavedNames(prev => { const next = new Set(prev); isSaved ? next.add(name) : next.delete(name); return next; });
                      }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!results && !predicting && !error && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--card-bg)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Sparkles size={28} color="var(--accent)" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.4rem', fontSize: '1rem' }}>Ready to find recipes</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                Pick ingredients from the sidebar, then hit Get Recommendations.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
