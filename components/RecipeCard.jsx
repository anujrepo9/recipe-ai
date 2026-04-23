'use client';

import { useState } from 'react';
import { Star, Clock, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, Youtube, ShoppingBag, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

function Stars({ rating }) {
  const full = Math.floor(rating);
  return (
    <span style={{ display: 'inline-flex', gap: '2px', color: 'var(--amber)' }}>
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={14} fill={i <= full ? 'var(--amber)' : 'none'} strokeWidth={1.5}
          style={{ opacity: i <= full ? 1 : 0.3 }} />
      ))}
    </span>
  );
}

function getSwiggyUrl(recipeName) {
  return `https://www.swiggy.com/search?query=${encodeURIComponent(recipeName)}`;
}

function getRestaurantUrl(recipeName, cuisineType) {
  const query = encodeURIComponent(`${recipeName} ${cuisineType || ''} restaurant near me`);
  return `https://www.google.com/maps/search/${query}`;
}

function getYoutubeUrl(recipeName, existingUrl) {
  if (existingUrl) return existingUrl;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(recipeName + ' recipe')}`;
}

function LinkBtn({ href, color, bg, borderColor, hoverBg, icon, label }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '0.78rem',
        fontWeight: 600,
        color,
        textDecoration: 'none',
        padding: '4px 10px',
        borderRadius: '6px',
        border: `1px solid ${borderColor}`,
        background: hovered ? hoverBg : bg,
        transition: 'background 0.2s',
        whiteSpace: 'nowrap',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {icon}
      {label}
    </a>
  );
}

export default function RecipeCard({ recipe, index = 0, onSaveToggle, isSaved = false }) {
  const [expanded, setExpanded] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(isSaved);

  const { recipe_name, customer_rating = 0, preparation_time = 30,
    matched_ingredients = [], additional_ingredients = [],
    instructions = '', predicted_popularity, cuisine_type, spice_level,
    youtube_url = '' } = recipe;

  const matchPercent = recipe.total_ingredients
    ? Math.round((matched_ingredients.length / recipe.total_ingredients) * 100) : null;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/auth'; setSaving(false); return; }
    try {
      if (saved) {
        await supabase.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_name', recipe_name);
        setSaved(false);
      } else {
        await supabase.from('saved_recipes').upsert({ user_id: user.id, recipe_name, recipe_data: recipe });
        setSaved(true);
      }
      onSaveToggle?.(recipe_name, !saved);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  const steps = instructions
    ? instructions.split(/\d+\.\s+/).filter(Boolean).map(s => s.trim()) : [];

  return (
    <div className="recipe-card" style={{ animationDelay: `${Math.min(index * 0.06, 0.36)}s` }}>
      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {cuisine_type && <span className="badge badge-teal">{cuisine_type}</span>}
            {spice_level  && <span className="badge badge-muted">{spice_level}</span>}
            {predicted_popularity !== undefined && (
              <span className="badge badge-amber">{Math.round(predicted_popularity)}% popular</span>
            )}
          </div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
            {index + 1}. {recipe_name}
          </h3>
        </div>
        <button onClick={handleSave} disabled={saving} title={saved ? 'Remove from saved' : 'Save recipe'}
          style={{
            background: saved ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${saved ? 'var(--border-strong)' : 'var(--border)'}`,
            borderRadius: '8px', padding: '8px', cursor: 'pointer',
            color: saved ? 'var(--accent)' : 'var(--muted)', transition: 'all 0.2s', flexShrink: 0,
          }}>
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Stars rating={customer_rating} />
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 500 }}>{customer_rating.toFixed(1)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--muted)', fontSize: '0.875rem' }}>
          <Clock size={14} /><span>{preparation_time} min</span>
        </div>
        {matchPercent !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 80, height: 6, borderRadius: '999px', background: 'var(--accent-dim)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${matchPercent}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-hover))', borderRadius: '999px', transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{matchPercent}% match</span>
          </div>
        )}
      </div>

      {/* Ingredients */}
      {(matched_ingredients.length > 0 || additional_ingredients.length > 0) && (
        <div style={{ marginBottom: '1rem' }}>
          {matched_ingredients.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                You have ({matched_ingredients.length}):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {matched_ingredients.map((ing) => (
                  <span key={ing} className="tag-matched">{ing.charAt(0).toUpperCase() + ing.slice(1)}</span>
                ))}
              </div>
            </div>
          )}
          {additional_ingredients.length > 0 && (
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Still need:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {additional_ingredients.map((ing) => (
                  <span key={ing} className="tag-extra">{ing.charAt(0).toUpperCase() + ing.slice(1)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Action Links Row ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border)',
      }}>
        <LinkBtn
          href={getYoutubeUrl(recipe_name, youtube_url)}
          color="#FF0000"
          bg="rgba(255,0,0,0.06)"
          borderColor="rgba(255,0,0,0.25)"
          hoverBg="rgba(255,0,0,0.12)"
          icon={<Youtube size={13} />}
          label="YouTube"
        />
        <LinkBtn
          href={getSwiggyUrl(recipe_name)}
          color="#FC8019"
          bg="rgba(252,128,25,0.06)"
          borderColor="rgba(252,128,25,0.25)"
          hoverBg="rgba(252,128,25,0.13)"
          icon={<ShoppingBag size={13} />}
          label="Order on Swiggy"
        />
        <LinkBtn
          href={getRestaurantUrl(recipe_name, cuisine_type)}
          color="#4285F4"
          bg="rgba(66,133,244,0.06)"
          borderColor="rgba(66,133,244,0.25)"
          hoverBg="rgba(66,133,244,0.12)"
          icon={<MapPin size={13} />}
          label="Nearby Restaurants"
        />
      </div>

      {/* Instructions */}
      {steps.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.75rem' }}>
            <button onClick={() => setExpanded(!expanded)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: '4px 0', fontFamily: 'DM Sans, sans-serif' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {expanded ? 'Hide instructions' : 'Show instructions'}
            </button>
          </div>
          {expanded && (
            <ol style={{ margin: '1rem 0 0', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {steps.map((step, i) => (
                <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-secondary)', paddingLeft: '4px' }}>{step}</li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}