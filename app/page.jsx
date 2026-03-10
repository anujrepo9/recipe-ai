'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChefHat, Loader2, AlertCircle, SlidersHorizontal, X } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import RecipeCard from '../components/RecipeCard';
import { supabase } from '../lib/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function SkeletonCard() {
  return (
    <div style={{
      background: '#111518', border: '1px solid rgba(0,200,212,0.08)',
      borderRadius: '20px', padding: '1.5rem', marginBottom: '1rem',
    }}>
      <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[80, 60, 70].map((w, i) => (
          <div key={i} className="skeleton" style={{ height: 24, width: w, borderRadius: 999 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 14, width: '90%' }} />
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

  // Fetch dropdown data from Python API
  useEffect(() => {
    async function fetchData() {
      try {
        const [ingRes, cuiRes, locRes] = await Promise.all([
          fetch(`${API_BASE}/api/ingredients`),
          fetch(`${API_BASE}/api/cuisines`),
          fetch(`${API_BASE}/api/locations`),
        ]);
        const [ingData, cuiData, locData] = await Promise.all([
          ingRes.json(), cuiRes.json(), locRes.json(),
        ]);
        setIngredients(ingData.ingredients || []);
        setCuisines(cuiData.cuisines || []);
        setLocations(locData.locations || []);
      } catch (e) {
        console.error('Failed to load filter data:', e);
        setError('Could not connect to the API. Make sure the server is running.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Load user's saved recipes
  useEffect(() => {
    async function loadSaved() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('saved_recipes')
        .select('recipe_name')
        .eq('user_id', user.id);
      if (data) setSavedNames(new Set(data.map((r) => r.recipe_name)));
    }
    loadSaved();
  }, []);

  function toggleIngredient(ing) {
    setSelectedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  }

  async function handlePredict() {
    if (!selectedIngredients.length) {
      setError('Please select at least 1 ingredient.');
      return;
    }
    if (!selectedCuisine) {
      setError('Please select a cuisine type.');
      return;
    }
    if (!selectedLocation) {
      setError('Please select a location.');
      return;
    }

    setError(null);
    setPredicting(true);
    setResults(null);

    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: selectedIngredients,
          cuisine: selectedCuisine,
          location: selectedLocation,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Prediction failed');
      setResults(data.recommendations);

      // Log search history to Supabase (fire-and-forget)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('search_history').insert({
          user_id: user.id,
          ingredients: selectedIngredients,
          cuisine: selectedCuisine,
          location: selectedLocation,
          results_count: data.recommendations.length,
        }).then(() => {});
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setPredicting(false);
    }
  }

  const selectionComplete = selectedIngredients.length > 0 && selectedCuisine && selectedLocation;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />

      <div style={{ display: 'flex', position: 'relative' }}>
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          {loading ? (
            <aside className="sidebar">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[120, 80, 100, 60, 90].map((w, i) => (
                  <div key={i} className="skeleton" style={{ height: 30, width: w, borderRadius: 999 }} />
                ))}
              </div>
            </aside>
          ) : (
            <Sidebar
              ingredients={ingredients}
              cuisines={cuisines}
              locations={locations}
              selectedIngredients={selectedIngredients}
              selectedCuisine={selectedCuisine}
              selectedLocation={selectedLocation}
              onIngredientToggle={toggleIngredient}
              onCuisineSelect={setSelectedCuisine}
              onLocationSelect={setSelectedLocation}
            />
          )}
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 49 }}
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="sidebar open" style={{ zIndex: 50 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, color: '#F0F4F8' }}>Filters</span>
                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#8B9AAB', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <Sidebar
                ingredients={ingredients}
                cuisines={cuisines}
                locations={locations}
                selectedIngredients={selectedIngredients}
                selectedCuisine={selectedCuisine}
                selectedLocation={selectedLocation}
                onIngredientToggle={toggleIngredient}
                onCuisineSelect={setSelectedCuisine}
                onLocationSelect={setSelectedLocation}
              />
            </aside>
          </>
        )}

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0, maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>

          {/* Hero Section */}
          <div
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              marginBottom: '2rem',
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(0,200,212,0.08) 0%, rgba(0,229,195,0.04) 100%)',
              border: '1px solid rgba(0,200,212,0.15)',
              padding: '2.5rem 2rem',
            }}
          >
            {/* Background image overlay */}
            <div
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'url(/kitchen.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.07,
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                <ChefHat size={18} color="#00C8D4" />
                <span style={{ fontFamily: 'Syne', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#00C8D4', textTransform: 'uppercase' }}>
                  AI-Powered
                </span>
              </div>
              <h1
                style={{
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                  fontWeight: 700,
                  color: '#F0F4F8',
                  margin: '0 0 0.5rem',
                  lineHeight: 1.2,
                }}
              >
                Find Recipes with<br />
                <em style={{ color: '#00C8D4', fontStyle: 'italic' }}>What You Already Have.</em>
              </h1>
              <p style={{ margin: '0 0 1.5rem', color: '#8B9AAB', fontSize: '0.95rem', maxWidth: '480px' }}>
                Select your ingredients, cuisine, and location — our ML model predicts popularity and finds your perfect match.
              </p>

              {/* Selection summary chips */}
              {(selectedIngredients.length > 0 || selectedCuisine || selectedLocation) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
                  {selectedIngredients.slice(0, 5).map((ing) => (
                    <span key={ing} className="badge badge-teal">
                      {ing.charAt(0).toUpperCase() + ing.slice(1)}
                    </span>
                  ))}
                  {selectedIngredients.length > 5 && (
                    <span className="badge badge-muted">+{selectedIngredients.length - 5} more</span>
                  )}
                  {selectedCuisine && <span className="badge badge-amber">{selectedCuisine}</span>}
                  {selectedLocation && <span className="badge badge-muted">{selectedLocation}</span>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={handlePredict}
                  disabled={predicting || loading}
                  style={{ minWidth: 200 }}
                >
                  {predicting ? (
                    <><Loader2 size={16} className="animate-spin-slow" /> Finding recipes...</>
                  ) : (
                    <><Sparkles size={16} /> Get Recommendations</>
                  )}
                </button>

                {/* Mobile filter button */}
                <button
                  className="btn-ghost md:hidden"
                  onClick={() => setSidebarOpen(true)}
                  style={{ display: 'flex' }}
                >
                  <SlidersHorizontal size={16} />
                  Filters
                  {(selectedIngredients.length + (selectedCuisine ? 1 : 0) + (selectedLocation ? 1 : 0)) > 0 && (
                    <span
                      style={{
                        background: '#00C8D4', color: '#080B0F',
                        borderRadius: '999px', padding: '1px 6px',
                        fontSize: '0.7rem', fontWeight: 700,
                      }}
                    >
                      {selectedIngredients.length + (selectedCuisine ? 1 : 0) + (selectedLocation ? 1 : 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
                borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#FF6B6B',
                fontSize: '0.9rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          {/* Loading skeletons */}
          {predicting && (
            <div>
              <p style={{ color: '#8B9AAB', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} className="animate-spin-slow" />
                Running ML model...
              </p>
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Results */}
          {results && !predicting && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#F0F4F8', margin: 0 }}>
                  Recommendations
                  <span style={{ marginLeft: 10, fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.875rem', color: '#00C8D4' }}>
                    {results.length} recipes found
                  </span>
                </h2>
              </div>

              {results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#8B9AAB' }}>
                  <ChefHat size={48} style={{ opacity: 0.3, margin: '0 auto 1rem', display: 'block' }} />
                  <p>No recipes found for your selection. Try different ingredients or cuisine.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {results.map((recipe, i) => (
                    <RecipeCard
                      key={recipe.recipe_name + i}
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
              )}
            </div>
          )}

          {/* Empty state */}
          {!results && !predicting && !error && (
            <div
              style={{
                textAlign: 'center', padding: '4rem 2rem',
                background: '#111518', borderRadius: '20px',
                border: '1px dashed rgba(0,200,212,0.15)',
              }}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: 'rgba(0,200,212,0.08)', border: '1px solid rgba(0,200,212,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}
              >
                <Sparkles size={32} color="#00C8D4" strokeWidth={1.5} />
              </div>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, color: '#F0F4F8', margin: '0 0 0.5rem' }}>
                Ready to find recipes
              </h3>
              <p style={{ color: '#8B9AAB', fontSize: '0.9rem', margin: 0 }}>
                Pick your ingredients from the sidebar, then hit Get Recommendations.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
