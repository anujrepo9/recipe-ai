'use client';

import { useState } from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MealPlannerPage() {
  // ============ STATE MANAGEMENT ============
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [plan, setPlan] = useState({}); // { dayIndex: { recipe_name, recipe_data } }
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [pickerDay, setPickerDay] = useState(null); // which day slot is open

  // ============ UTILITY FUNCTIONS ============
  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  // ============ EVENT HANDLERS ============
  function shiftWeek(delta) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
  }

  function removeMeal(dayIndex) {
    const newPlan = { ...plan };
    delete newPlan[dayIndex];
    setPlan(newPlan);
  }

  function generateGroceryList() {
    const all = Object.values(plan).flatMap(
      (r) => r.recipe_data?.additional_ingredients || []
    );
    const unique = [...new Set(all.map((i) => i.toLowerCase()))];
    return unique;
  }

  function copyGroceryList() {
    const list = generateGroceryList().join('\n');
    navigator.clipboard.writeText(list);
  }

  // ============ RENDER ============
  const dayGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.75rem',
  };

  const dayCardStyle = {
    background: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '0.875rem',
    border: '1px solid var(--border)',
    minHeight: '160px',
  };

  const dayLabelStyle = {
    fontFamily: 'Syne',
    fontWeight: 600,
    fontSize: '0.8rem',
    color: 'var(--muted)',
    marginBottom: '0.75rem',
  };

  const recipeNameStyle = {
    fontSize: '0.8rem',
    color: 'var(--text)',
    fontWeight: 500,
  };

  const removeButtonStyle = {
    color: 'var(--danger)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
  };

  const addButtonStyle = {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '1px dashed var(--border)',
    background: 'none',
    color: 'var(--muted)',
    cursor: 'pointer',
    fontSize: '0.8rem',
  };

  return (
    <div>
      {/* Header with navigation */}
      <div style={{ marginBottom: '2rem' }}>
        <h1>Meal Planner</h1>
      </div>

      {/* Day Grid */}
      <div style={dayGridStyle}>
        {DAYS.map((day, i) => (
          <div key={i} style={dayCardStyle}>
            <p style={dayLabelStyle}>{day}</p>
            {plan[i] ? (
              <div>
                <p style={recipeNameStyle}>{plan[i].recipe_name}</p>
                <button onClick={() => removeMeal(i)} style={removeButtonStyle}>
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPickerDay(i)}
                style={addButtonStyle}
              >
                + Add
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Grocery List Section */}
      <div style={{ marginTop: '2rem' }}>
        <h2>Grocery List</h2>
        <button onClick={copyGroceryList}>Copy to Clipboard</button>
      </div>
    </div>
  );
}