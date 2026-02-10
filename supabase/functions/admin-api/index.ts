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
    if (!authHeader) throw new Error('No auth token');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    // Check admin role
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: roleData } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) throw new Error('Forbidden: Admin access required');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET actions
    if (req.method === 'GET') {
      if (action === 'users') {
        const { data: users } = await adminSupabase.auth.admin.listUsers();
        const { data: subs } = await adminSupabase.from('user_subscriptions').select('*');
        const { data: roles } = await adminSupabase.from('user_roles').select('*');
        
        const enriched = users?.users?.map(u => {
          const sub = subs?.find(s => s.user_id === u.id);
          const userRoles = roles?.filter(r => r.user_id === u.id).map(r => r.role) || [];
          return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            plan: sub?.plan || 'free',
            subscription_status: sub?.status || 'none',
            current_period_end: sub?.current_period_end,
            roles: userRoles,
          };
        }) || [];

        return new Response(JSON.stringify({ users: enriched }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'stats') {
        const { data: users } = await adminSupabase.auth.admin.listUsers();
        const { data: subs } = await adminSupabase.from('user_subscriptions').select('*');
        const totalUsers = users?.users?.length || 0;
        const proUsers = subs?.filter(s => s.plan === 'pro' && s.status === 'active').length || 0;
        const { count: totalMessages } = await adminSupabase.from('chat_messages').select('*', { count: 'exact', head: true });

        return new Response(JSON.stringify({
          totalUsers,
          proUsers,
          freeUsers: totalUsers - proUsers,
          totalMessages: totalMessages || 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // POST actions
    if (req.method === 'POST') {
      const body = await req.json();

      if (action === 'update-subscription') {
        const { userId, plan, status } = body;
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await adminSupabase.from('user_subscriptions').upsert({
          user_id: userId,
          plan,
          status,
          current_period_start: now.toISOString(),
          current_period_end: plan === 'pro' ? periodEnd.toISOString() : null,
        }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'delete-subscription') {
        const { userId } = body;
        await adminSupabase.from('user_subscriptions').delete().eq('user_id', userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'add-admin') {
        const { userId } = body;
        await adminSupabase.from('user_roles').upsert({
          user_id: userId,
          role: 'admin',
        }, { onConflict: 'user_id,role' });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'remove-admin') {
        const { userId } = body;
        await adminSupabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'delete-user-data') {
        const { userId } = body;
        await adminSupabase.from('chat_messages').delete().eq('user_id', userId);
        await adminSupabase.from('imported_chats').delete().eq('user_id', userId);
        await adminSupabase.from('chat_sessions').delete().eq('user_id', userId);
        await adminSupabase.from('daily_usage').delete().eq('user_id', userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    throw new Error('Invalid action');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    const status = msg.includes('Forbidden') ? 403 : msg.includes('Unauthorized') ? 401 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
