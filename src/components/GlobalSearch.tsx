import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Search, X, ArrowDownRight, ArrowUpRight, CheckSquare, Calendar, Lightbulb, Bell,
} from 'lucide-react';
import {
  Income, Expense, Task, Meeting, Idea, Reminder, TabId,
  EXPENSE_CATEGORY_EMOJI, INCOME_CATEGORY_EMOJI,
} from '@/types';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  incomes: Income[];
  expenses: Expense[];
  tasks: Task[];
  meetings: Meeting[];
  ideas: Idea[];
  reminders: Reminder[];
  currency: string;
  onNavigate?: (tab: TabId) => void;
}

interface Hit {
  key: string;
  tab: TabId;
  group: string;
  title: string;
  meta: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  amount?: number;
}

/**
 * One search bar across every module. Results are grouped by module and tapping
 * a result jumps to the page that owns it.
 */
export function GlobalSearch({ incomes, expenses, tasks, meetings, ideas, reminders, currency, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const hits = useMemo<Hit[]>(() => {
    if (q.length < 1) return [];
    const has = (...parts: (string | undefined | null)[]) =>
      parts.filter(Boolean).some(p => (p as string).toLowerCase().includes(q));
    const out: Hit[] = [];

    expenses.forEach(e => {
      if (has(e.category, e.notes, String(e.amount))) {
        out.push({
          key: `e-${e.id}`, tab: 'expenses', group: 'Spending',
          title: `${EXPENSE_CATEGORY_EMOJI[e.category] || '📦'} ${e.category}`,
          meta: `${format(new Date(e.date), 'd MMM yyyy')}${e.notes ? ` · ${e.notes}` : ''}`,
          icon: ArrowDownRight, tint: 'var(--expense)', amount: -e.amount,
        });
      }
    });
    incomes.forEach(i => {
      if (has(i.source, i.category, i.notes, String(i.amount))) {
        out.push({
          key: `i-${i.id}`, tab: 'income', group: 'Income',
          title: `${INCOME_CATEGORY_EMOJI[i.category] || '💰'} ${i.source}`,
          meta: `${format(new Date(i.date), 'd MMM yyyy')} · ${i.category}`,
          icon: ArrowUpRight, tint: 'var(--income)', amount: i.amount,
        });
      }
    });
    tasks.forEach(t => {
      if (has(t.title, t.notes, ...(t.tags || []))) {
        out.push({
          key: `t-${t.id}`, tab: 'tasks', group: 'Tasks',
          title: t.title,
          meta: t.completed ? 'Completed' : t.dueDate ? `Due ${format(new Date(t.dueDate), 'd MMM')}` : 'Open task',
          icon: CheckSquare, tint: 'var(--brand-purple)',
        });
      }
    });
    meetings.forEach(m => {
      if (has(m.title, m.notes)) {
        out.push({
          key: `m-${m.id}`, tab: 'meetings', group: 'Meetings',
          title: m.title, meta: `${format(new Date(m.date), 'd MMM yyyy')} · ${m.time}`,
          icon: Calendar, tint: 'var(--meeting)',
        });
      }
    });
    ideas.forEach(i => {
      if (has(i.title, i.description, ...(i.tags || []))) {
        out.push({
          key: `d-${i.id}`, tab: 'ideas', group: 'Ideas',
          title: i.title, meta: i.description?.slice(0, 60) || i.category,
          icon: Lightbulb, tint: 'var(--brand-yellow)',
        });
      }
    });
    reminders.forEach(r => {
      if (has(r.title, r.notes, r.type)) {
        out.push({
          key: `r-${r.id}`, tab: 'reminders', group: 'Alerts',
          title: r.title, meta: `${format(new Date(r.date), 'd MMM yyyy')}${r.time ? ` · ${r.time}` : ''}`,
          icon: Bell, tint: 'var(--brand-orange)',
        });
      }
    });
    return out.slice(0, 40);
  }, [q, incomes, expenses, tasks, meetings, ideas, reminders]);

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    hits.forEach(h => { map.set(h.group, [...(map.get(h.group) || []), h]); });
    return [...map.entries()];
  }, [hits]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 h-12 px-4 rounded-[20px] bg-card border border-border/60 card-shadow">
        <Search className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search everything"
          aria-label="Search everything"
          className="flex-1 min-w-0 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear search" className="w-8 h-8 -mr-1.5 rounded-full flex items-center justify-center text-muted-foreground tap-shrink">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {q.length >= 1 && (
        <div className="absolute z-[70] left-0 right-0 mt-2 max-h-[60vh] overflow-y-auto rounded-[22px] bg-card border border-border/60 shadow-pop p-1.5 animate-fade-in">
          {grouped.length === 0 ? (
            <p className="px-3.5 py-5 text-sm text-muted-foreground text-center">No matches for “{query}”</p>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-1 last:mb-0">
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {group} · {items.length}
                </p>
                {items.map(h => (
                  <button
                    key={h.key}
                    onClick={() => { onNavigate?.(h.tab); setQuery(''); }}
                    className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left active:bg-muted/60 transition-colors"
                  >
                    <span
                      className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: `hsl(${h.tint} / 0.14)`, color: `hsl(${h.tint})` }}
                    >
                      <h.icon className="w-[17px] h-[17px]" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-foreground truncate">{h.title}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{h.meta}</span>
                    </span>
                    {h.amount !== undefined && (
                      <span className={cn('text-sm font-bold tabular-nums shrink-0', h.amount < 0 ? 'expense-text' : 'income-text')}>
                        {h.amount < 0 ? '-' : '+'}{currency}{Math.abs(h.amount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
