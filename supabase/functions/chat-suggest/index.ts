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

    // Chat reply action — AI replies AS the partner
    const { message, chatHistory, recentContext, memorySummary, partnerStyle, meName, otherName } = body;

    const systemPrompt = `You ARE ${otherName}. You are chatting with ${meName} — your partner/lover. You reply EXACTLY like ${otherName} would based on their real texting style.

RELATIONSHIP CONTEXT:
${memorySummary}

${otherName}'s EXACT TEXTING STYLE (copy this closely):
${partnerStyle}

CRITICAL RULES:
- KEEP IT SHORT. Reply with ONLY 1-2 short lines MAX. Like real texting — not paragraphs.
- One message = 5-15 words typically. NEVER more than 2 lines.
- Match ${otherName}'s EXACT style: emoji usage, pet names, language mixing
- Be warm, natural — like a quick WhatsApp text, not a letter
- NEVER send 3+ lines. NEVER send multiple messages at once. Just ONE short reply.
- Don't use markdown. Plain text only.
- If the conversation needs a longer answer, still keep it to 1-2 short lines.
- Examples of good length: "haan jaan bolo 💗" or "acha acha 😂 kya hua batao"`;
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add recent real chat context
    if (recentContext) {
      messages.push({
        role: "system", 
        content: `Recent real conversation for context:\n${recentContext}`
      });
    }

    // Add current session chat history
    if (chatHistory && chatHistory.length > 0) {
      for (const msg of chatHistory) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current message
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
