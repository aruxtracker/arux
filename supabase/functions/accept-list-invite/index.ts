// Called after signup/login to accept any pending list invites for the user's email.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user || !user.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find pending invites for this email
    const { data: invites } = await admin
      .from('task_list_invites')
      .select('id, list_id, invited_email, status, expires_at')
      .eq('invited_email', user.email.toLowerCase())
      .eq('status', 'pending');

    if (!invites || invites.length === 0) {
      return new Response(JSON.stringify({ accepted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let accepted = 0;
    for (const inv of invites) {
      if (new Date(inv.expires_at) < new Date()) continue;
      // Add as member
      const { error: memErr } = await admin.from('task_list_members')
        .upsert({ list_id: inv.list_id, user_id: user.id, role: 'editor' },
          { onConflict: 'list_id,user_id', ignoreDuplicates: true });
      if (memErr && !memErr.message.includes('duplicate')) continue;
      await admin.from('task_list_invites').update({ status: 'accepted' }).eq('id', inv.id);
      await admin.from('task_activity').insert({
        list_id: inv.list_id, actor_id: user.id, action: 'invite_accepted',
        metadata: { email: user.email },
      });
      accepted++;
    }

    return new Response(JSON.stringify({ accepted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
