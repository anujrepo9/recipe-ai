'use client';

import { useState } from 'react';
import { Star, Clock, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <span style={{ display: 'inline-flex', gap: '2px', color: '#FFB347' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          fill={i <= full ? '#FFB347' : i === full + 1 && half ? 'url(#half)' : 'none'}
          strokeWidth={1.5}
          style={{ opacity: i <= full || (i === full + 1 && half) ? 1 : 0.3 }}
        />
      ))}
    </span>
  );
}

export default function RecipeCard({ recipe, index = 0, onSaveToggle, isSaved = false }) {
  const [expanded, setExpanded] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(isSaved);

  const {
    recipe_name,
    customer_rating = 0,
    preparation_time = 30,
    matched_ingredients = [],
    additional_ingredients = [],
    instructions = '',
    predicted_popularity,
    cuisine_type,
    spice_level,
  } = recipe;

  const matchPercent = recipe.total_ingredients
    ? Math.round((matched_ingredients.length / recipe.total_ingredients) * 100)
    : null;

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/auth';
      setSaving(false);
      return;
    }

    try {
      if (saved) {
        await supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_name', recipe_name);
        setSaved(false);
      } else {
        await supabase.from('saved_recipes').upsert({
          user_id: user.id,
          recipe_name,
          recipe_data: recipe,
        });
        setSaved(true);
      }
      onSaveToggle?.(recipe_name, !saved);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // Parse instructions into steps
  const steps = instructions
    ? instructions.split(/\d+\.\s+/).filter(Boolean).map(s => s.trim())
    : [];

  return (
    <div
      className="recipe-card"
      style={{ animationDelay: `${Math.min(index * 0.06, 0.36)}s` }}
    >
      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {cuisine_type && (
              <span className="badge badge-teal">{cuisine_type}</span>
            )}
            {spice_level && (
              <span className="badge badge-muted">{spice_level}</span>
            )}
            {predicted_popularity !== undefined && (
              <span className="badge badge-amber">
                {Math.round(predicted_popularity)}% popular
              </span>
            )}
          </div>
          <h3
            style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#F0F4F8',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {index + 1}. {recipe_name}
          </h3>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          title={saved ? 'Remove from saved' : 'Save recipe'}
          style={{
            background: saved ? 'rgba(0,200,212,0.12)' : 'transparent',
            border: `1px solid ${saved ? 'rgba(0,200,212,0.3)' : 'rgba(139,154,171,0.2)'}`,
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: saved ? '#00C8D4' : '#8B9AAB',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Stars rating={customer_rating} />
          <span style={{ fontSize: '0.875rem', color: '#8B9AAB', fontWeight: 500 }}>
            {customer_rating.toFixed(1)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#8B9AAB', fontSize: '0.875rem' }}>
          <Clock size={14} />
          <span>{preparation_time} min</span>
        </div>
        {matchPercent !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: 80, height: 6, borderRadius: '999px',
                background: 'rgba(139,154,171,0.15)', overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${matchPercent}%`,
                  background: matchPercent === 100
                    ? 'linear-gradient(90deg, #00C8D4, #00E5C3)'
                    : 'linear-gradient(90deg, #00C8D4, rgba(0,200,212,0.5))',
                  borderRadius: '999px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '0.78rem', color: '#8B9AAB' }}>{matchPercent}% match</span>
          </div>
        )}
      </div>

      {/* Ingredients */}
      {(matched_ingredients.length > 0 || additional_ingredients.length > 0) && (
        <div style={{ marginBottom: '1rem' }}>
          {matched_ingredients.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: '#8B9AAB', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                You have ({matched_ingredients.length}):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {matched_ingredients.map((ing) => (
                  <span key={ing} className="tag-matched">
                    {ing.charAt(0).toUpperCase() + ing.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {additional_ingredients.length > 0 && (
            <div>
              <span style={{ fontSize: '0.78rem', color: '#8B9AAB', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Still need:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {additional_ingredients.map((ing) => (
                  <span key={ing} className="tag-extra">
                    {ing.charAt(0).toUpperCase() + ing.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions toggle */}
      {steps.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', color: '#00C8D4',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              padding: '4px 0', fontFamily: 'DM Sans, sans-serif',
              transition: 'color 0.2s',
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Hide instructions' : 'Show instructions'}
          </button>

          {expanded && (
            <ol
              style={{
                margin: '1rem 0 0 0',
                paddingLeft: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {steps.map((step, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: '#D0D8E4',
                    paddingLeft: '4px',
                  }}
                >
                  {step}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
