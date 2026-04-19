import { NextResponse } from 'next/server';

// Keep this on Node.js runtime — never promote to edge.
export const runtime = 'nodejs';

const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'llama-3.3-70b-versatile';
const OLLAMA_URL    = process.env.OLLAMA_URL   || 'http://127.0.0.1:11434';
const OLLAMA_MODEL  = process.env.OLLAMA_MODEL || 'gemma3:4b';

// ── System prompt builder ─────────────────────────────────────────────────────
function buildSystemPrompt(mode, context = {}) {
  if (mode === 'chat') {
    return {
      prompt: `You are ChefAI, a friendly and knowledgeable culinary assistant. 
You help users with cooking questions, technique tips, ingredient substitutions, food science, and recipe advice.
Keep responses concise, warm, and practical. Use bullet points for steps or lists.
If asked something unrelated to food/cooking, gently redirect back to culinary topics.`,
      temperature: 0.7,
      max_tokens: 500,
    };
  }

  if (mode === 'improve') {
    const { ingredients, cuisine, currentRecipe } = context;
    return {
      prompt: `You are ChefAI, a professional chef and recipe consultant.
The user has these ingredients: ${ingredients?.join(', ') || 'various ingredients'}.
${cuisine ? `Preferred cuisine: ${cuisine}` : ''}
${currentRecipe ? `They found this recipe: "${currentRecipe}"` : ''}

Suggest creative improvements, substitutions, or flavor enhancements based on their available ingredients.
Be specific, practical, and encouraging. Format suggestions as a clean numbered or bulleted list.`,
      temperature: 0.7,
      max_tokens: 500,
    };
  }

  if (mode === 'generate') {
    const { ingredients, cuisine, dietary } = context;
    return {
      prompt: `You are ChefAI, a creative professional chef.
Generate a complete, detailed recipe using primarily these ingredients: ${ingredients?.join(', ') || 'common pantry items'}.
${cuisine ? `Cuisine style: ${cuisine}` : ''}
${dietary ? `Dietary requirements: ${dietary}` : ''}

Format your response EXACTLY like this:
# [Recipe Name]

**Prep time:** X mins | **Cook time:** X mins | **Serves:** X

## Description
[2-3 sentence appetizing description]

## Ingredients
- Ingredient 1
- Ingredient 2

## Instructions
1. Step one
2. Step two

## Chef's Tips
- Tip 1
- Tip 2`,
      temperature: 0.8,
      max_tokens: 1000,
    };
  }

  if (mode === 'describe') {
    const { recipeName, ingredients, cuisine, rating, spiceLevel } = context;
    return {
      prompt: `You are ChefAI, a food writer for a gourmet magazine.
Write a short, appetizing 2-3 sentence description for this recipe card.
Recipe: ${recipeName}
Cuisine: ${cuisine || 'International'}
Key ingredients: ${ingredients || 'various'}
Rating: ${rating || 4.5}/5
Spice level: ${spiceLevel || 'medium'}

Make it mouth-watering and evocative. No bullet points — flowing prose only. Max 60 words.`,
      temperature: 0.7,
      max_tokens: 150,
    };
  }

  if (mode === 'ai-detail') {
    const { recipeName, cuisine, location, spiceLevel, cookingTime, rating, ingredients } = context;
    const ingsStr = Array.isArray(ingredients) ? ingredients.join(', ') : (ingredients || 'various');
    return {
      prompt: `You are ChefAI, a professional chef and culinary writer. Generate a comprehensive, detailed recipe profile.

Recipe: ${recipeName}
Cuisine: ${cuisine || 'International'}
Location/Region: ${location || 'Global'}
Spice Level: ${spiceLevel || 'Medium'}
Cooking Time: ${cookingTime ? cookingTime + ' minutes' : 'varies'}
Predicted Rating: ${rating ? Number(rating).toFixed(1) + '/5' : 'N/A'}
Available Ingredients: ${ingsStr}

Write the profile using EXACTLY this structure:

# ${recipeName}

## Overview
Write 2-3 sentences describing the dish — its origin, what makes it special, and its flavor identity.

## Key Ingredients & Why They Work
List 4-6 core ingredients with a brief note on the role each plays in the dish.

## Cooking Method
Step-by-step instructions in 5-8 concise numbered steps. Be specific about techniques and timings.

## Flavor Profile
Describe the taste experience — balance of spice, sweetness, acidity, umami, and texture.

## Chef's Tips
3-4 practical tips: common mistakes to avoid, substitutions, or ways to elevate the dish.

## Serving Suggestions
How to plate, what to pair it with (drinks, sides), and serving temperature.

Keep the tone confident, warm, and practical. Total response: 350-450 words.`,
      temperature: 0.7,
      max_tokens: 1000,
    };
  }

  if (mode === 'nutrition-price') {
    const { recipeName, ingredients, cuisine, priceRange, location } = context;
    const ingsStr = Array.isArray(ingredients) ? ingredients.join(', ') : (ingredients || 'various');
    return {
      prompt: `You are ChefAI, a nutrition and culinary cost expert.
Analyze this recipe and return ONLY a valid JSON object — no markdown, no explanation, no backticks.

Recipe: ${recipeName}
Cuisine: ${cuisine || 'Indian'}
Key ingredients: ${ingsStr}
Price tier: ${priceRange || 'mid_range'}
Region: ${location || 'India'}

Return exactly this JSON shape:
{
  "calories": <number per serving>,
  "protein": <grams>,
  "carbs": <grams>,
  "fat": <grams>,
  "fiber": <grams>,
  "servings": <typical servings>,
  "price_inr": <estimated INR cost to cook at home>,
  "price_note": "<one sentence explaining cost factors>"
}

Use realistic Indian market prices for home cooking. Be accurate but approximate is fine.`,
      temperature: 0.3,
      max_tokens: 300,
    };
  }

  return { prompt: 'You are ChefAI, a helpful culinary assistant.', temperature: 0.7, max_tokens: 500 };
}

// ── Groq provider ─────────────────────────────────────────────────────────────
async function callGroq(systemPrompt, messages, temperature, max_tokens) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages || []),
      ],
      temperature,
      max_tokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API error');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Ollama provider ───────────────────────────────────────────────────────────
async function callOllama(systemPrompt, messages, temperature, max_tokens) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(messages || []),
      ],
      stream: false,
      options: {
        temperature,
        num_predict: max_tokens,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { mode, messages, context } = body;

    const { prompt, temperature, max_tokens } = buildSystemPrompt(mode, context || {});

    const groqKey = process.env.GROQ_API_KEY;
    let content  = '';
    let provider = '';

    if (groqKey) {
      // Online mode — use Groq (fast cloud model)
      content  = await callGroq(prompt, messages, temperature, max_tokens);
      provider = 'groq';
    } else {
      // Offline mode — fall back to local Ollama
      content  = await callOllama(prompt, messages, temperature, max_tokens);
      provider = 'ollama';
    }

    return NextResponse.json({ content, mode, provider });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}