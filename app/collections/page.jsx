'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Plus, X, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Header from '../../components/Header';
import RecipeCard from '../../components/RecipeCard';
import { supabase } from '../../lib/supabase';

const COLOR_PALETTE = [
  '#E8620A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA502',
  '#9D4EDD', '#3A86FF', '#FB5607', '#06A77D', '#D5573B'
];

export default function CollectionsPage() {
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCollectionForm, setNewCollectionForm] = useState({ open: false, name: '', color: COLOR_PALETTE[0] });
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [collectionRecipes, setCollectionRecipes] = useState({});
  const [loadingRecipes, setLoadingRecipes] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load collections
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadCollections();
  }, [user]);

  // Load all recipes for display
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .order('customer_rating', { ascending: false });
        if (!error && data?.length > 0) {
          setAllRecipes(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  async function loadCollections() {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setCollections(data);
        // Preload recipe counts
        for (const col of data) {
          const { data: recipeData } = await supabase
            .from('collection_recipes')
            .select('recipe_name', { count: 'exact' })
            .eq('collection_id', col.id);
          if (recipeData) {
            setCollectionRecipes(prev => ({
              ...prev,
              [col.id]: { count: recipeData.length, recipes: [] }
            }));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadCollectionRecipes(collectionId) {
    if (loadingRecipes[collectionId]) return;
    setLoadingRecipes(prev => ({ ...prev, [collectionId]: true }));
    try {
      const { data } = await supabase
        .from('collection_recipes')
        .select('recipe_name')
        .eq('collection_id', collectionId);
      if (data) {
        const recipeNames = data.map(r => r.recipe_name);
        const matched = allRecipes.filter(r => recipeNames.includes(r.recipe_name));
        setCollectionRecipes(prev => ({
          ...prev,
          [collectionId]: { count: recipeNames.length, recipes: matched }
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecipes(prev => ({ ...prev, [collectionId]: false }));
    }
  }

  async function createCollection() {
    if (!newCollectionForm.name.trim() || !user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: newCollectionForm.name.trim(),
          color: newCollectionForm.color
        })
        .select();

      if (!error && data) {
        setCollections(prev => [data[0], ...prev]);
        setNewCollectionForm({ open: false, name: '', color: COLOR_PALETTE[0] });
        setCollectionRecipes(prev => ({
          ...prev,
          [data[0].id]: { count: 0, recipes: [] }
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  async function deleteCollection(collectionId) {
    if (!confirm('Delete this collection? Recipes will not be affected.')) return;
    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionId);
      if (!error) {
        setCollections(prev => prev.filter(c => c.id !== collectionId));
        setCollectionRecipes(prev => {
          const next = { ...prev };
          delete next[collectionId];
          return next;
        });
        if (expandedId === collectionId) setExpandedId(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Header />
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem)' }}>
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--muted)' }}>
            <FolderOpen size={40} style={{ opacity: 0.2, margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ margin: 0 }}>Sign in to manage collections.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.5rem)' }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <FolderOpen size={18} color="var(--accent)" />
            <span className="section-label" style={{ margin: 0 }}>Organize</span>
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem' }}>
            Collections
          </h1>
          {!loading && <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.875rem' }}>{collections.length} collection{collections.length !== 1 ? 's' : ''}</p>}
        </div>

        {/* New Collection Button / Form */}
        {!newCollectionForm.open ? (
          <button
            onClick={() => setNewCollectionForm(prev => ({ ...prev, open: true }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'var(--surface)',
              border: '2px dashed var(--border-strong)',
              borderRadius: '12px',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.2s',
              marginBottom: '1.5rem',
              width: '100%'
            }}
            onMouseEnter={e => {
              e.target.style.background = 'var(--surface2)';
              e.target.style.borderColor = 'var(--accent)';
            }}
            onMouseLeave={e => {
              e.target.style.background = 'var(--surface)';
              e.target.style.borderColor = 'var(--border-strong)';
            }}
          >
            <Plus size={16} /> New collection
          </button>
        ) : (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="Collection name..."
                value={newCollectionForm.name}
                onChange={e => setNewCollectionForm(prev => ({ ...prev, name: e.target.value }))}
                autoFocus
                style={{ flex: 1, minWidth: 140, fontSize: '0.875rem' }}
              />
              <div style={{ display: 'flex', gap: '3px' }}>
                {COLOR_PALETTE.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCollectionForm(prev => ({ ...prev, color }))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: color,
                      border: newCollectionForm.color === color ? '3px solid var(--text)' : '1px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn-ghost"
                onClick={() => setNewCollectionForm({ open: false, name: '', color: COLOR_PALETTE[0] })}
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={createCollection}
                disabled={!newCollectionForm.name.trim() || creating}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !newCollectionForm.name.trim() || creating ? 0.5 : 1,
                  cursor: !newCollectionForm.name.trim() || creating ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                Create
              </button>
            </div>
          </div>
        )}

        {/* Collections Grid / List */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '0.875rem' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--border)', height: 180 }} />
            ))}
          </div>
        ) : collections.length === 0 && !newCollectionForm.open ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--muted)' }}>
            <FolderOpen size={40} style={{ opacity: 0.2, margin: '0 auto 0.75rem', display: 'block' }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No collections yet. Create one to organize your recipes.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '0.875rem', marginBottom: '1.5rem' }}>
              {collections.map(collection => {
                const recipeData = collectionRecipes[collection.id] || { count: 0, recipes: [] };
                const isExpanded = expandedId === collection.id;
                return (
                  <div key={collection.id}>
                    {/* Collection Card */}
                    <div
                      style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setExpandedId(isExpanded ? null : collection.id);
                        if (!isExpanded && recipeData.recipes.length === 0) {
                          loadCollectionRecipes(collection.id);
                        }
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div
                        style={{
                          background: collection.color,
                          height: '80px',
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'space-between',
                          padding: '1rem'
                        }}
                      >
                        <FolderOpen size={24} color="rgba(255,255,255,0.8)" />
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteCollection(collection.id);
                          }}
                          style={{
                            background: 'rgba(0,0,0,0.2)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'rgba(255,255,255,0.8)',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ padding: '1.25rem' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                          {collection.name}
                        </h3>
                        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {recipeData.count} recipe{recipeData.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Collection Recipes */}
            {expandedId && collectionRecipes[expandedId] && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginTop: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: 'var(--text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: '6px',
                      background: collections.find(c => c.id === expandedId)?.color
                    }} />
                    {collections.find(c => c.id === expandedId)?.name}
                  </h2>
                  <button
                    onClick={() => setExpandedId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {loadingRecipes[expandedId] ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    <Loader2 size={24} style={{ margin: '0 auto 0.75rem', display: 'block', animation: 'spin 1s linear infinite' }} />
                    Loading recipes...
                  </div>
                ) : collectionRecipes[expandedId].recipes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>No recipes in this collection yet.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const availableRecipes = allRecipes.filter(r => 
                            !collectionRecipes[expandedId].recipes.find(cr => cr.recipe_name === r.recipe_name)
                          );
                          if (availableRecipes.length === 0) {
                            alert('All recipes are already in this collection.');
                            return;
                          }
                          // Show available recipes to add
                          setCollectionRecipes(prev => ({
                            ...prev,
                            [expandedId]: { ...prev[expandedId], showAddRecipes: !prev[expandedId].showAddRecipes }
                          }));
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          background: 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        <Plus size={14} /> Add recipes
                      </button>
                    </div>
                    
                    {collectionRecipes[expandedId].showAddRecipes && (
                      <div style={{
                        background: 'var(--surface2)',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--border)'
                      }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
                          Available recipes to add:
                        </h3>
                        {(() => {
                          const availableRecipes = allRecipes.filter(r => 
                            !collectionRecipes[expandedId].recipes.find(cr => cr.recipe_name === r.recipe_name)
                          );
                          return availableRecipes.length === 0 ? (
                            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>
                              All recipes are already in this collection.
                            </p>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '0.875rem' }}>
                              {availableRecipes.slice(0, 12).map((recipe, i) => (
                                <div key={recipe.id} style={{ position: 'relative' }}>
                                  <RecipeCard recipe={recipe} index={i} />
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from('collection_recipes')
                                          .insert({
                                            collection_id: expandedId,
                                            recipe_name: recipe.recipe_name
                                          });
                                        if (!error) {
                                          setCollectionRecipes(prev => ({
                                            ...prev,
                                            [expandedId]: {
                                              ...prev[expandedId],
                                              recipes: [...prev[expandedId].recipes, recipe],
                                              count: prev[expandedId].count + 1
                                            }
                                          }));
                                        }
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                    style={{
                                      position: 'absolute',
                                      top: '12px',
                                      right: '12px',
                                      background: 'var(--accent)',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '6px 12px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      zIndex: 10
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '0.875rem' }}>
                      {collectionRecipes[expandedId].recipes.map((recipe, i) => (
                        <div key={recipe.id || recipe.recipe_name + i} style={{ position: 'relative' }}>
                          <RecipeCard
                            recipe={recipe}
                            index={i}
                          />
                          <button
                            onClick={async () => {
                              if (!confirm('Remove recipe from collection?')) return;
                              try {
                                const { error } = await supabase
                                  .from('collection_recipes')
                                  .delete()
                                  .eq('collection_id', expandedId)
                                  .eq('recipe_name', recipe.recipe_name);
                                if (!error) {
                                  setCollectionRecipes(prev => ({
                                    ...prev,
                                    [expandedId]: {
                                      ...prev[expandedId],
                                      recipes: prev[expandedId].recipes.filter(r => r.recipe_name !== recipe.recipe_name),
                                      count: prev[expandedId].count - 1
                                    }
                                  }));
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              zIndex: 10,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            title="Remove from collection"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
