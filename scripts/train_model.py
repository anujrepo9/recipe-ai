import pickle, joblib, pandas as pd, numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from lightgbm import LGBMRegressor

pd.options.future.infer_string = False

# ── 1. Load dataset ───────────────────────────────────────────────────────────
df = pickle.load(open('model/full_dataset.pkl', 'rb'))
print(f"Loaded {len(df)} rows, {df['recipe_name'].nunique()} recipes")

# ── 2. Regenerate ingredients_list.pkl ────────────────────────────────────────
all_ingredients = set()
for row in df['ingredients']:
    for ing in str(row).split(','):
        cleaned = ing.strip().lower()
        if cleaned:
            all_ingredients.add(cleaned)

ingredients_list = sorted(all_ingredients)
joblib.dump(ingredients_list, 'model/ingredients_list.pkl')
print(f"Saved ingredients_list.pkl — {len(ingredients_list)} ingredients")

# ── 3. Define features and target ─────────────────────────────────────────────
FEATURE_COLS = ['location', 'restaurant_type', 'cuisine_type',
                'dish_category', 'price_range', 'cooking_method',
                'spice_level', 'season']
TARGET = 'avg_monthly_sales'   # proxy for popularity

X = df[FEATURE_COLS].copy()
y = df[TARGET].copy()

# ── 4. Build pipeline (OneHotEncoder + LightGBM) ──────────────────────────────
preprocessor = ColumnTransformer(transformers=[
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), FEATURE_COLS)
])

model = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', LGBMRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        num_leaves=31,
        random_state=42,
        verbose=-1
    ))
])

# ── 5. Train ──────────────────────────────────────────────────────────────────
model.fit(X, y)
print("Model trained")

# ── 6. Save popularity_model.pkl ──────────────────────────────────────────────
joblib.dump(model, 'model/popularity_model.pkl', compress=3)
print("Saved popularity_model.pkl")

# ── 7. Save feature_columns.pkl ──────────────────────────────────────────────
feature_cols = model.named_steps['preprocessor'].get_feature_names_out().tolist()
joblib.dump(feature_cols, 'model/feature_columns.pkl')
print(f"Saved feature_columns.pkl — {len(feature_cols)} features")

# ── 8. Save label_encoders.pkl (kept for backward compat) ────────────────────
from sklearn.preprocessing import LabelEncoder
label_encoders = {}
for col in ['cuisine', 'restaurant_type', 'dish_category', 'cooking_method', 'location']:
    dataset_col = 'cuisine_type' if col == 'cuisine' else col
    le = LabelEncoder()
    le.fit(df[dataset_col].dropna().unique())
    label_encoders[col] = le
joblib.dump(label_encoders, 'model/label_encoders.pkl')
print("Saved label_encoders.pkl")

# ── 9. Regenerate recipes.pkl ────────────────────────────────────────────────
recipes_df = df.sort_values('customer_rating', ascending=False)\
               .drop_duplicates('recipe_name', keep='first')\
               .reset_index(drop=True)
with open('model/recipes.pkl', 'wb') as f:
    pickle.dump(recipes_df, f, protocol=4)
print(f"Saved recipes.pkl — {len(recipes_df)} unique recipes")

print("\n✅ All pkl files regenerated successfully")