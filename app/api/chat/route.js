import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

// Utility: retry wrapper
async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Groq API error");
      }
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
    }
  }
}

// Utility: validate structured recipe
function isValidRecipe(content) {
  return (
    content.includes("## Ingredients") &&
    content.includes("## Instructions") &&
    content.includes("## Chef's Tips")
  );
}

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { mode, messages, context } = body;

    let systemPrompt = "";
    let temperature = 0.7;
    let max_tokens = 500;

    // ---------- PROMPT ENGINEERING ----------

    if (mode === "chat") {
      systemPrompt = `You are ChefAI, a professional culinary assistant.

      RULES:
      - Stay strictly within cooking/food domain
      - Be concise and practical
      - Use bullet points for steps
      - Avoid vague answers
      - If unclear, ask a follow-up question`;
          }

          if (mode === "improve") {
            const { ingredients, cuisine, currentRecipe } = context || {};

            systemPrompt = `You are ChefAI, an expert chef.

      User Ingredients:
      - ${ingredients?.join("\n- ") || "Various ingredients"}

      ${cuisine ? `Cuisine: ${cuisine}` : ""}
      ${currentRecipe ? `Recipe: ${currentRecipe}` : ""}

      TASK:
      Suggest improvements.

      STRICT RULES:
      - Use numbered list
      - Be specific (quantities, techniques)
      - No vague suggestions
      - Focus on flavor, texture, presentation`;

            temperature = 0.5;
    }

    if (mode === "generate") {
      const { ingredients, cuisine, dietary } = context || {};

      systemPrompt = `You are ChefAI, a professional chef.

Ingredients:
- ${ingredients?.join("\n- ") || "Common pantry items"}

${cuisine ? `Cuisine: ${cuisine}` : ""}
${dietary ? `Dietary: ${dietary}` : ""}

TASK: Generate a complete recipe.

STRICT FORMAT (DO NOT BREAK):
# [Recipe Name]

**Prep time:** X mins | **Cook time:** X mins | **Serves:** X

## Description
[2-3 sentence description]

## Ingredients
- item

## Instructions
1. step

## Chef's Tips
- tip

RULES:
- Do NOT add extra sections
- Use realistic cooking steps
- Ensure logical order
- If format breaks, internally fix before output`;

      temperature = 0.6;
      max_tokens = 700;
    }

    if (mode === "describe") {
      const { recipeName, ingredients, cuisine, rating, spiceLevel } = context || {};

      systemPrompt = `You are a gourmet food writer.

Recipe: ${recipeName}
Cuisine: ${cuisine || "International"}
Ingredients: ${ingredients || "Various"}
Rating: ${rating || 4.5}
Spice: ${spiceLevel || "Medium"}

TASK:
Write 2-3 sentence description.

RULES:
- Max 60 words
- No bullet points
- Rich, vivid language`;
    }

    // ---------- FEW SHOT EXAMPLE (BOOST QUALITY) ----------

    const fewShotExample = mode === "generate" ? [
      {
        role: "user",
        content: "Create recipe using chicken and rice"
      },
      {
          role: "assistant",
          content: `# Garlic Chicken Rice Bowl

        **Prep time:** 10 mins | **Cook time:** 25 mins | **Serves:** 2

        ## Description
        A comforting bowl of juicy garlic-infused chicken served over fluffy rice, perfect for a quick and satisfying meal.

        ## Ingredients
        - 1 cup rice
        - 200g chicken
        - 3 cloves garlic

        ## Instructions
        1. Cook rice until fluffy
        2. Sauté garlic and chicken
        3. Combine and serve

        ## Chef's Tips
        - Use fresh garlic for best flavor`
      }
    ] : [];

    // ---------- API CALL ----------

    let data = await fetchWithRetry(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...fewShotExample,
          ...(messages || []),
        ],
        temperature,
        max_tokens,
      }),
    });

    let content = data.choices?.[0]?.message?.content || "";

    // ---------- VALIDATION + AUTO RETRY ----------

    if (mode === "generate" && !isValidRecipe(content)) {
      data = await fetchWithRetry(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt + "\nFix formatting strictly."
            },
            ...(messages || []),
          ],
          temperature: 0.4,
          max_tokens,
        }),
      });

      content = data.choices?.[0]?.message?.content || content;
    }

    return NextResponse.json({ content, mode });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
