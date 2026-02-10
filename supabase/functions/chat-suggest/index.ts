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

    // Build memory action
    if (body.action === "build-memory") {
      const { sampleMessages, myTexts, partnerTexts, meName, otherName } = body;

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
              content: `Analyze this WhatsApp chat and produce THREE sections as JSON:

1. "summary": Key relationship dynamics, recurring topics, inside jokes, important dates, how they talk to each other. Max 500 words.

2. "partnerStyle": Detailed analysis of how "${otherName}" writes messages. Include: typical message length, emoji/emoticon usage, pet names they use, how they express love/anger/humor, common phrases, greeting style, texting quirks, language mixing patterns. Max 400 words.

3. "styleProfile": How "${meName}" writes. Same analysis. Max 200 words.

Return valid JSON with keys: summary, partnerStyle, styleProfile`,
            },
            {
              role: "user",
              content: `Full chat:\n${sampleMessages}\n\n${otherName}'s messages:\n${partnerTexts}\n\n${meName}'s messages:\n${myTexts}`,
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
                  summary: { type: "string" },
                  partnerStyle: { type: "string" },
                  styleProfile: { type: "string" },
                },
                required: ["summary", "partnerStyle", "styleProfile"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_analysis" } },
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);
        if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        return new Response(toolCall.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ summary: "", partnerStyle: "", styleProfile: "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate reply suggestions
    if (body.action === "suggest-replies") {
      const { lastMessage, memorySummary, partnerStyle, meName, otherName } = body;

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
              content: `You help ${meName} reply to ${otherName}. Based on their texting style and relationship, suggest 3 short quick replies that ${meName} would naturally send. Each reply should be 3-10 words, casual, matching ${meName}'s style.

Context: ${memorySummary}
${meName}'s style: ${partnerStyle}`,
            },
            {
              role: "user",
              content: `${otherName} just said: "${lastMessage}"\n\nGive 3 quick reply options for ${meName}.`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_suggestions",
              description: "Return reply suggestions",
              parameters: {
                type: "object",
                properties: {
                  replies: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["replies"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_suggestions" } },
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        return new Response(toolCall.function.arguments, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ replies: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Chat reply action — AI replies AS the partner
    const { message, chatHistory, recentContext, memorySummary, partnerStyle, meName, otherName } = body;

    const systemPrompt = `You ARE ${otherName}. You are texting ${meName} on WhatsApp right now.

RELATIONSHIP CONTEXT:
${memorySummary}

${otherName}'s EXACT TEXTING STYLE (mimic this perfectly):
${partnerStyle}

ABSOLUTE RULES — FOLLOW STRICTLY:
- Send EXACTLY ONE short message. Like ONE single WhatsApp bubble.
- Keep it 3-12 words. That's it. One line.
- Match ${otherName}'s exact emoji style, pet names, language mixing.
- If they say "hi" → reply with a simple greeting like they would. NOT multiple questions.
- If they ask "kese ho" → reply ONE short answer. Not a paragraph.
- NEVER send multiple sentences. NEVER use newlines to send multiple messages.
- NEVER ask 3+ questions in one reply. Max 1 question per reply.
- Think: what would ONE WhatsApp bubble look like? Send only that.
- No markdown. Plain text only.
- Be natural, warm, in-character.

EXAMPLES OF CORRECT LENGTH:
- "hii jaanu 💗"
- "acha batao kya hua 😂"  
- "miss you so much 🥺"
- "haan bolo na jaan 💗"
- "pagal ho kya 😭😂"`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (recentContext) {
      messages.push({
        role: "system", 
        content: `Recent real conversation for context:\n${recentContext}`
      });
    }

    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({ role: "user", content: message });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
        max_tokens: 60,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
