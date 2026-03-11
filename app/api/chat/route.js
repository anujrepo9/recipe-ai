import { NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile'; // Free, fast, great quality

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Groq API key not configured. Add GROQ_API_KEY to your environment variables.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { mode, messages, context } = body;

    // Build system prompt based on mode
    let systemPrompt = '';

    if (mode === 'chat') {
      systemPrompt = `You are ChefAI, a friendly and knowledgeable culinary assistant. 
You help users with cooking questions, technique tips, ingredient substitutions, food science, and recipe advice.
Keep responses concise, warm, and practical. Use bullet points for steps or lists.
If asked something unrelated to food/cooking, gently redirect back to culinary topics.`;

    } else if (mode === 'improve') {
      const { ingredients, cuisine, currentRecipe } = context || {};
      systemPrompt = `You are ChefAI, a professional chef and recipe consultant.
The user has these ingredients: ${ingredients?.join(', ') || 'various ingredients'}.
${cuisine ? `Preferred cuisine: ${cuisine}` : ''}
${currentRecipe ? `They found this recipe: "${currentRecipe}"` : ''}

Suggest creative improvements, substitutions, or flavor enhancements based on their available ingredients.
Be specific, practical, and encouraging. Format suggestions as a clean numbered or bulleted list.`;

    } else if (mode === 'generate') {
      const { ingredients, cuisine, dietary } = context || {};
      systemPrompt = `You are ChefAI, a creative professional chef.
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
- Tip 2`;

    } else if (mode === 'describe') {
      const { recipeName, ingredients, cuisine, rating, spiceLevel } = context || {};
      systemPrompt = `You are ChefAI, a food writer for a gourmet magazine.
Write a short, appetizing 2-3 sentence description for this recipe card.
Recipe: ${recipeName}
Cuisine: ${cuisine || 'International'}
Key ingredients: ${ingredients || 'various'}
Rating: ${rating || 4.5}/5
Spice level: ${spiceLevel || 'medium'}

Make it mouth-watering and evocative. No bullet points — flowing prose only. Max 60 words.`;
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...(messages || []),
        ],
        temperature: mode === 'generate' ? 0.8 : 0.7,
        max_tokens: mode === 'generate' ? 800 : 500,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Groq API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ content, mode });

  } catch (error) {
    console.error('Groq API error:', error);
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    );
  }
}
