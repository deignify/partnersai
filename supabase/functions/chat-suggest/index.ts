import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (body.action === "build-memory") {
      const { sampleMessages, myTexts, meName, otherName } = body;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You analyze WhatsApp chat history. You must produce TWO sections:
1. MEMORY SUMMARY: Key events, recurring topics, important dates, relationship dynamics, inside jokes. Max 500 words.
2. STYLE PROFILE for "${meName}" ONLY: Average message length, emoji usage, punctuation style, common phrases, tone patterns, greeting/farewell style. Max 300 words.

Return valid JSON: {"summary": "...", "styleProfile": "..."}`,
            },
            {
              role: "user",
              content: `Chat between ${meName} and ${otherName}:\n${sampleMessages}\n\n${meName}'s messages only:\n${myTexts}`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_analysis",
              description: "Return the chat analysis",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Memory summary of the conversation" },
                  styleProfile: { type: "string", description: "Writing style profile of the user" },
                },
                required: ["summary", "styleProfile"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_analysis" } },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("AI error:", response.status, errText);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const args = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(args), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ summary: "Could not analyze chat", styleProfile: "Default style" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Suggestion mode
    const { draft, tone, recentContext, memorySummary, styleProfile, meName, otherName } = body;

    const toneInstructions: Record<string, string> = {
      short: "Keep replies very brief, 1-2 sentences max.",
      long: "Write detailed, thoughtful replies with 3-5 sentences.",
      calm: "Use a calm, reassuring, gentle tone.",
      romantic: "Be sweet, loving, and affectionate.",
      apologetic: "Show genuine remorse and understanding.",
      flirty: "Be playful, teasing, and charming.",
      formal: "Use polite, respectful, professional language.",
    };

    const systemPrompt = `You are a writing assistant for ${meName}. You NEVER roleplay as ${otherName}. You NEVER pretend to be ${otherName}. You ONLY draft messages that ${meName} could send.

CONVERSATION CONTEXT:
${memorySummary}

${meName}'s WRITING STYLE:
${styleProfile}

TONE: ${toneInstructions[tone || 'calm'] || toneInstructions.calm}

Generate 4 different message suggestions that ${meName} could send. Each should match ${meName}'s style while applying the requested tone. Vary the suggestions from shorter to longer.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Recent conversation:\n${recentContext}\n\n${meName}'s draft (may be empty): "${draft}"\n\nGenerate 4 reply suggestions for ${meName}.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_suggestions",
            description: "Return message suggestions",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of 4 message suggestions",
                },
                reasoning: {
                  type: "string",
                  description: "Brief explanation of why these fit the user's style",
                },
              },
              required: ["suggestions", "reasoning"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_suggestions" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ suggestions: ["I'll get back to you!"], reasoning: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
