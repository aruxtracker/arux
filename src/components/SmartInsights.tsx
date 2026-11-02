import { useMemo, useState } from 'react';
import {
  Sparkles, RefreshCw, ChevronRight, TrendingUp, TrendingDown, PieChart,
  PiggyBank, AlertTriangle, Repeat, Zap, Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { Budget, Expense, Income, Subscription } from '@/types';
import { buildInsights, Insight, InsightTone } from '@/lib/insights';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TONE_STYLE: Record<InsightTone, { bg: string; text: string; ring: string }> = {
  good: { bg: 'hsl(var(--income) / 0.12)', text: 'hsl(var(--income))', ring: 'hsl(var(--income) / 0.25)' },
  warn: { bg: 'hsl(var(--brand-orange) / 0.14)', text: 'hsl(var(--brand-orange))', ring: 'hsl(var(--brand-orange) / 0.25)' },
  bad: { bg: 'hsl(var(--expense) / 0.14)', text: 'hsl(var(--expense))', ring: 'hsl(var(--expense) / 0.25)' },
  info: { bg: 'hsl(var(--primary) / 0.12)', text: 'hsl(var(--primary))', ring: 'hsl(var(--primary) / 0.22)' },
};

/** Line icons per insight type — clean and premium, no emoji. */
function insightIcon(insight: Insight) {
  switch (insight.id) {
    case 'week-spend': return insight.tone === 'bad' ? TrendingUp : TrendingDown;
    case 'top-category': return PieChart;
    case 'savings-rate': return PiggyBank;
    case 'budget-alert': return AlertTriangle;
    case 'renewals': return Repeat;
    case 'biggest': return Zap;
    case 'empty': return Sparkles;
    default: return Info;
  }
}


interface SmartInsightsProps {
  incomes: Income[];
  expenses: Expense[];
  budgets: Budget[];
  subscriptions: Subscription[];
  currency: string;
}

export function SmartInsights({ incomes, expenses, budgets, subscriptions, currency }: SmartInsightsProps) {
  const insights = useMemo(
    () => buildInsights({ incomes, expenses, budgets, subscriptions, currency }),
    [incomes, expenses, budgets, subscriptions, currency]
  );

  const [aiSummary, setAiSummary] = useState<{ summary: string; bullets: string[] } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const loadAiSummary = async (regenerate = false) => {
    setLoadingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('monthly-insights', {
        body: { month: format(new Date(), 'yyyy-MM'), regenerate },
      });
      if (error) throw error;
      const bullets = Array.isArray((data as any)?.bullets) ? (data as any).bullets : [];
      setAiSummary({ summary: (data as any)?.summary || '', bullets });
    } catch (err) {
      console.error(err);
      toast.error('Could not generate the AI summary right now');
    }
    setLoadingAi(false);
  };

  return (
    <div className="rounded-[28px] bg-card border border-border/60 card-shadow p-3.5 card-press">
      <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <Sparkles className="w-4 h-4 text-primary" /> Smart insights
        </span>
        <button
          onClick={() => loadAiSummary(!!aiSummary)}
          disabled={loadingAi}
          className="h-9 px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 bg-primary/10 text-primary tap-shrink disabled:opacity-60"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loadingAi && 'animate-spin')} />
          {aiSummary ? 'Refresh AI' : 'AI summary'}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {insights.map((insight: Insight, i) => {
          const tone = TONE_STYLE[insight.tone];
          const Icon = insightIcon(insight);
          return (
            <div
              key={insight.id}
              className="flex items-start gap-3 rounded-2xl p-3 card-enter"
              style={{ background: tone.bg, boxShadow: `inset 0 0 0 1px ${tone.ring}`, animationDelay: `${i * 45}ms` }}
            >
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'hsl(var(--card) / 0.75)', color: tone.text }}
              >
                <Icon className="w-4 h-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug" style={{ color: tone.text }}>{insight.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 break-words">{insight.body}</p>
              </div>
            </div>
          );
        })}

      </div>

      {aiSummary && (
        <div className="mt-2.5 rounded-2xl border border-border/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
            AI summary · {format(new Date(), 'MMMM')}
          </p>
          {aiSummary.summary && <p className="text-sm text-foreground/90 break-words">{aiSummary.summary}</p>}
          {aiSummary.bullets.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {aiSummary.bullets.map((b, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                  <span className="break-words">{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
