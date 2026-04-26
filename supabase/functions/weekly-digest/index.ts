import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Unauthorized');

    // Last 7 days window
    const since = new Date(Date.now() - 7 * 86400000).toISOString();

    const [{ data: session }, { count: msgCount }, { data: moods }, { data: notes }] = await Promise.all([
      supabase.from('chat_sessions').select('partner_name').eq('user_id', user.id).maybeSingle(),
      supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since),
      supabase.from('mood_entries').select('mood, score').eq('user_id', user.id).gte('created_at', since),
      supabase.from('love_notes').select('content').eq('user_id', user.id).gte('created_at', since).limit(3),
    ]);

    // Mood aggregation
    const moodCounts: Record<string, number> = {};
    let totalScore = 0;
    (moods || []).forEach(m => {
      moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
      totalScore += m.score || 0;
    });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    const avgScore = moods?.length ? Math.round((totalScore / moods.length) * 10) / 10 : 0;

    // AI summary using Lovable AI Gateway
    let aiSummary = '';
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (apiKey && session?.partner_name && (msgCount || 0) > 0) {
      try {
        const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              { role: 'system', content: 'You write warm, 2-sentence weekly relationship summaries. Be uplifting and specific.' },
              { role: 'user', content: `This week with ${session.partner_name}: ${msgCount} messages, mostly ${topMood} mood (avg ${avgScore}/10). Write a warm 2-sentence recap.` },
            ],
          }),
        });
        const aiData = await aiRes.json();
        aiSummary = aiData?.choices?.[0]?.message?.content || '';
      } catch (_) { /* graceful fallback */ }
    }

    return new Response(
      JSON.stringify({
        period: 'last_7_days',
        partner_name: session?.partner_name || null,
        messages_count: msgCount || 0,
        top_mood: topMood,
        avg_mood_score: avgScore,
        recent_notes: (notes || []).map(n => n.content),
        ai_summary: aiSummary,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: msg.includes('Unauthorized') ? 401 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});