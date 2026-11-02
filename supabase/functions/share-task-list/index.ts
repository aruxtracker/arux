// Team collaboration: invite a user (by email) to a shared task list.
// If the user already has an account, add them as a member immediately.
// Otherwise, create a pending invite they can accept on signup.

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
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { listId, email } = await req.json();
    if (!listId || !email) {
      return new Response(JSON.stringify({ error: 'listId and email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const cleanEmail = String(email).trim().toLowerCase();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller owns the list
    const { data: list } = await admin.from('task_lists').select('id, owner_id, name').eq('id', listId).single();
    if (!list || list.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not the list owner' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Look up existing user by email (admin API)
    const { data: usersResp } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const target = usersResp.users.find(u => u.email?.toLowerCase() === cleanEmail);

    if (target) {
      if (target.id === user.id) {
        return new Response(JSON.stringify({ error: "You can't invite yourself" }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Add as member directly + mark list as shared
      const { error: memErr } = await admin.from('task_list_members')
        .upsert({ list_id: listId, user_id: target.id, role: 'editor' }, { onConflict: 'list_id,user_id', ignoreDuplicates: true });
      if (memErr && !memErr.message.includes('duplicate')) throw memErr;
      await admin.from('task_lists').update({ is_shared: true }).eq('id', listId);
      await admin.from('task_activity').insert({
        list_id: listId, actor_id: user.id, action: 'invite_accepted',
        metadata: { invited: cleanEmail },
      });
      return new Response(JSON.stringify({ status: 'member_added', email: cleanEmail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Otherwise create a pending invite
    const { data: invite, error: invErr } = await admin.from('task_list_invites').insert({
      list_id: listId, invited_by: user.id, invited_email: cleanEmail,
    }).select().single();
    if (invErr) throw invErr;
    await admin.from('task_lists').update({ is_shared: true }).eq('id', listId);

    return new Response(JSON.stringify({ status: 'invite_pending', email: cleanEmail, token: invite.token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
