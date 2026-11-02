// Cron-driven function (every minute): finds reminders & vehicle services due in
// the next 60 seconds, then calls send-push for each affected user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Only the internal pg_cron scheduler (which presents the service-role key)
  // may trigger this job. Reject all unauthenticated/public invocations.
  if (req.headers.get('Authorization') !== `Bearer ${SERVICE_KEY}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowTime = now.toISOString().slice(11, 16); // HH:MM
    const inOneMin = new Date(now.getTime() + 60_000).toISOString().slice(11, 16);

    type Job = { userId: string; title: string; body: string; tag: string; url: string };
    const jobs: Job[] = [];

    // 1) Reminders due now (within next 60s window) and not completed
    const { data: reminders } = await admin
      .from('reminders')
      .select('id, user_id, title, type, time, notes, date')
      .eq('completed', false)
      .eq('date', todayStr);

    if (reminders) {
      for (const r of reminders) {
        const t = (r.time || '09:00').slice(0, 5);
        if (t >= nowTime && t <= inOneMin) {
          const emoji = r.type === 'meeting' ? '📅' : r.type === 'rent' ? '🏠' : r.type === 'emi' ? '💳' : '🔔';
          jobs.push({
            userId: r.user_id,
            title: `${emoji} ${r.title}`,
            body: r.notes || `Reminder due now${r.time ? ` at ${t}` : ''}`,
            tag: `reminder-${r.id}`,
            url: '/',
          });
        }
      }
    }

    // 2) Vehicle services due today — fire once at 09:00 local-ish
    if (nowTime >= '09:00' && nowTime <= '09:01') {
      const { data: services } = await admin
        .from('vehicle_services')
        .select('id, user_id, title, due_date, notes, vehicle_id')
        .eq('completed', false)
        .or(`due_date.eq.${todayStr},due_date.eq.${new Date(now.getTime() + 86400000).toISOString().slice(0,10)}`);
      if (services) {
        const vehIds = [...new Set(services.map(s => s.vehicle_id))];
        const { data: vehicles } = await admin
          .from('vehicles').select('id, name').in('id', vehIds);
        const vehMap = new Map(vehicles?.map(v => [v.id, v.name]) || []);
        for (const s of services) {
          const isToday = s.due_date === todayStr;
          jobs.push({
            userId: s.user_id,
            title: `${isToday ? '🔧 Service due today' : '⏰ Service due tomorrow'}: ${s.title}`,
            body: `${vehMap.get(s.vehicle_id) || 'Vehicle'} • ${s.title}${s.notes ? ` — ${s.notes}` : ''}`,
            tag: `vs-${s.id}-${isToday ? 'today' : 'pre'}`,
            url: '/',
          });
        }
      }
    }

    // Invoke send-push for each job
    let dispatched = 0;
    for (const job of jobs) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify(job),
      });
      await res.arrayBuffer();
      if (res.ok) dispatched++;
    }

    return new Response(JSON.stringify({ jobs: jobs.length, dispatched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
