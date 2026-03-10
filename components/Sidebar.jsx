'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p className="section-label">{title}</p>
      {children}
    </div>
  );
}

export default function Sidebar({
  ingredients = [],
  cuisines = [],
  locations = [],
  selectedIngredients,
  selectedCuisine,
  selectedLocation,
  onIngredientToggle,
  onCuisineSelect,
  onLocationSelect,
}) {
  const [ingSearch, setIngSearch] = useState('');

  const filteredIngredients = useMemo(() => {
    if (!ingSearch.trim()) return ingredients;
    const q = ingSearch.toLowerCase();
    return ingredients.filter((i) => i.toLowerCase().includes(q));
  }, [ingredients, ingSearch]);

  return (
    <aside className="sidebar">
      {/* Ingredients */}
      <Section title={`Ingredients — ${selectedIngredients.length} selected`}>
        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8B9AAB' }}
          />
          <input
            className="input"
            style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            placeholder="Filter ingredients..."
            value={ingSearch}
            onChange={(e) => setIngSearch(e.target.value)}
          />
          {ingSearch && (
            <button
              onClick={() => setIngSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#8B9AAB', cursor: 'pointer', padding: 2,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
          {filteredIngredients.map((ing) => (
            <span
              key={ing}
              className={`chip ${selectedIngredients.includes(ing) ? 'selected' : ''}`}
              onClick={() => onIngredientToggle(ing)}
            >
              {ing.charAt(0).toUpperCase() + ing.slice(1)}
            </span>
          ))}
          {filteredIngredients.length === 0 && (
            <p style={{ fontSize: '0.82rem', color: '#8B9AAB', margin: 0 }}>No ingredients found</p>
          )}
        </div>
        {selectedIngredients.length > 0 && (
          <button
            onClick={() => selectedIngredients.forEach(i => onIngredientToggle(i))}
            style={{
              marginTop: '8px', background: 'none', border: 'none',
              color: '#FF6B6B', fontSize: '0.78rem', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <X size={12} /> Clear all
          </button>
        )}
      </Section>

      <div className="divider" />

      {/* Cuisine */}
      <Section title="Cuisine">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {cuisines.map((c) => (
            <span
              key={c}
              className={`chip ${selectedCuisine === c ? 'selected' : ''}`}
              onClick={() => onCuisineSelect(selectedCuisine === c ? null : c)}
            >
              {c}
            </span>
          ))}
        </div>
      </Section>

      <div className="divider" />

      {/* Location */}
      <Section title="Location">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {locations.map((l) => (
            <span
              key={l}
              className={`chip ${selectedLocation === l ? 'selected' : ''}`}
              onClick={() => onLocationSelect(selectedLocation === l ? null : l)}
            >
              {l}
            </span>
          ))}
        </div>
      </Section>
    </aside>
  );
}
