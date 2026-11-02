// Generates AI insights for a user's month using AI Gateway.
// Caches results in monthly_insights table.

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
    const AI_API_KEY = Deno.env.get('AI_API_KEY') || Deno.env.get('OPENAI_API_KEY') || '';

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

    const { month, regenerate } = await req.json(); // month: YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: 'Invalid month' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Cache check
    if (!regenerate) {
      const { data: cached } = await admin
        .from('monthly_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ cached: true, ...cached }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build context
    const startDate = `${month}-01`;
    const [yy, mm] = month.split('-').map(Number);
    const endDate = new Date(yy, mm, 0).toISOString().slice(0, 10);
    const prevMonth = new Date(yy, mm - 2, 1).toISOString().slice(0, 7);

    const [{ data: incs }, { data: exps }, { data: prevExps }] = await Promise.all([
      admin.from('incomes').select('amount, source, category').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      admin.from('expenses').select('amount, category').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      admin.from('expenses').select('amount, category').eq('user_id', user.id).gte('date', `${prevMonth}-01`).lt('date', startDate),
    ]);

    const totalIncome = (incs || []).reduce((s, i) => s + Number(i.amount), 0);
    const totalExpense = (exps || []).reduce((s, e) => s + Number(e.amount), 0);
    const byCategory: Record<string, number> = {};
    (exps || []).forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount); });
    const prevByCategory: Record<string, number> = {};
    (prevExps || []).forEach(e => { prevByCategory[e.category] = (prevByCategory[e.category] || 0) + Number(e.amount); });

    const context = {
      month, totalIncome, totalExpense,
      savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
      topCategories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5),
      changeVsLastMonth: Object.entries(byCategory).map(([k, v]) => ({
        category: k, current: v, previous: prevByCategory[k] || 0,
        delta: prevByCategory[k] ? Math.round(((v - prevByCategory[k]) / prevByCategory[k]) * 100) : null,
      })),
    };

    // Call AI Gateway
    const aiGatewayUrl = Deno.env.get('AI_GATEWAY_URL') || 'https://openrouter.ai/api/v1/chat/completions';
    const aiRes = await fetch(aiGatewayUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful personal finance coach. Reply in plain English with friendly, actionable insights. Keep it short.',
          },
          {
            role: 'user',
            content: `Analyze this month's finances and respond with JSON only:
{
  "summary": "1-2 sentence overall summary",
  "bullets": ["3 short, specific, actionable insights as bullet points"]
}

Currency is INR (₹). Data:
${JSON.stringify(context, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit, try again shortly' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '{}';
    let parsed: { summary: string; bullets: string[] };
    try { parsed = JSON.parse(content); }
    catch { parsed = { summary: content.slice(0, 200), bullets: [] }; }

    // Save / update cache
    const { data: saved } = await admin.from('monthly_insights').upsert({
      user_id: user.id, month,
      summary: parsed.summary,
      bullets: parsed.bullets,
    }, { onConflict: 'user_id,month' }).select().single();

    return new Response(JSON.stringify({ cached: false, ...saved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
