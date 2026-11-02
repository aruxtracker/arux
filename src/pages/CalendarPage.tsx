import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, parseISO, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, Calendar } from 'lucide-react';
import { Meeting, Task, Reminder, Subscription } from '@/types';
import { cn } from '@/lib/utils';

type EventKind = 'meeting' | 'task' | 'reminder' | 'subscription';

const KIND_META: { kind: EventKind; label: string; color: string; emoji: string }[] = [
  { kind: 'meeting', label: 'Meetings', color: 'hsl(var(--meeting))', emoji: '📅' },
  { kind: 'task', label: 'Tasks', color: 'hsl(var(--primary))', emoji: '⬜' },
  { kind: 'reminder', label: 'Reminders', color: 'hsl(var(--brand-orange))', emoji: '🔔' },
  { kind: 'subscription', label: 'Subs', color: 'hsl(var(--brand-teal))', emoji: '🔁' },
];

interface CalendarPageProps {
  meetings: Meeting[];
  tasks: Task[];
  reminders: Reminder[];
  subscriptions?: Subscription[];
}

interface CalendarItem {
  kind: EventKind;
  title: string;
  subtitle?: string;
  time?: string;
  completed?: boolean;
  emoji: string;
}

export function CalendarPage({ meetings, tasks, reminders, subscriptions = [] }: CalendarPageProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<Record<EventKind, boolean>>({
    meeting: true, task: true, reminder: true, subscription: true,
  });

  const toggleFilter = (kind: EventKind) =>
    setFilters(prev => ({ ...prev, [kind]: !prev[kind] }));

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [currentMonth]);

  /** All items keyed by yyyy-MM-dd, already filtered by the active toggles. */
  const itemsByDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    const push = (dateStr: string | undefined, item: CalendarItem) => {
      if (!dateStr) return;
      const key = dateStr.slice(0, 10);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    };

    if (filters.meeting) {
      for (const m of meetings) {
        push(m.date, { kind: 'meeting', title: m.title, time: m.time, subtitle: m.notes, emoji: '📅' });
      }
    }
    if (filters.task) {
      for (const t of tasks) {
        push(t.dueDate || t.date, {
          kind: 'task', title: t.title, completed: t.completed,
          subtitle: t.notes, emoji: t.completed ? '✅' : '⬜',
        });
      }
    }
    if (filters.reminder) {
      for (const r of reminders) {
        push(r.date, { kind: 'reminder', title: r.title, time: r.time, subtitle: r.notes, completed: r.completed, emoji: '🔔' });
      }
    }
    if (filters.subscription) {
      for (const s of subscriptions) {
        if (!s.active) continue;
        push(s.nextRenewalDate, {
          kind: 'subscription', title: `${s.name} renews`,
          subtitle: `${s.billingCycle} · ${s.category || 'Subscription'}`, emoji: '🔁',
        });
      }
    }
    return map;
  }, [meetings, tasks, reminders, subscriptions, filters]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedItems = useMemo(
    () => [...(itemsByDate[selectedKey] || [])].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    [itemsByDate, selectedKey]
  );

  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const totalEventsThisMonth = useMemo(() => {
    const monthPrefix = format(currentMonth, 'yyyy-MM');
    return Object.entries(itemsByDate)
      .filter(([k]) => k.startsWith(monthPrefix))
      .reduce((sum, [, items]) => sum + items.length, 0);
  }, [itemsByDate, currentMonth]);

  const activeCount = KIND_META.filter(k => filters[k.kind]).length;

  return (
    <div className="flex flex-col gap-4 pb-2 min-w-0">
      <div className="px-4 md:px-0 pt-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" /> Calendar
        </h1>
        <p className="text-xs text-muted-foreground">Meetings, tasks, reminders & renewals in one view</p>
      </div>

      {/* Filters */}
      <div className="mx-4 md:mx-0 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {KIND_META.map(k => {
          const on = filters[k.kind];
          return (
            <button
              key={k.kind}
              onClick={() => toggleFilter(k.kind)}
              aria-pressed={on}
              className={cn(
                'shrink-0 h-10 px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 tap-shrink transition-all',
                on ? 'text-white shadow-sm' : 'glass text-muted-foreground'
              )}
              style={on ? { backgroundColor: k.color } : undefined}
            >
              <span className={cn('w-2 h-2 rounded-full', on && 'bg-white/90')} style={on ? undefined : { backgroundColor: k.color }} />
              {k.label}
            </button>
          );
        })}
        {activeCount < KIND_META.length && (
          <button
            onClick={() => setFilters({ meeting: true, task: true, reminder: true, subscription: true })}
            className="shrink-0 h-10 px-3.5 rounded-full text-xs font-bold glass text-primary tap-shrink"
          >
            Show all
          </button>
        )}
      </div>

      {/* Month navigation */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/60 tap-shrink"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</p>
            <p className="text-[11px] text-muted-foreground">{totalEventsThisMonth} events shown</p>
          </div>
          <button
            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted/60 tap-shrink"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdayLabels.map((l, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-muted-foreground uppercase">{l}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const items = itemsByDate[key] || [];
            const inMonth = isSameMonth(day, currentMonth);
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const kinds = KIND_META.filter(k => items.some(i => i.kind === k.kind));

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all tap-shrink relative',
                  selected ? 'gradient-primary text-primary-foreground shadow-pop' : 'hover:bg-muted/50',
                  !inMonth && 'opacity-30',
                  !selected && today && 'ring-1 ring-primary'
                )}
              >
                <span className={cn(
                  'text-xs font-semibold',
                  selected && 'text-primary-foreground',
                  !selected && today && 'text-primary',
                  !selected && !today && 'text-foreground'
                )}>
                  {format(day, 'd')}
                </span>
                {kinds.length > 0 && (
                  <div className="flex gap-0.5 absolute bottom-1">
                    {kinds.map(k => (
                      <span
                        key={k.kind}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: selected ? 'hsl(var(--primary-foreground))' : k.color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      <div className="mx-4 md:mx-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.14em] mb-2 px-1">
          {format(selectedDate, 'EEEE, d MMM')}
        </p>
        {selectedItems.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {activeCount === 0 ? 'All filters are off — turn one on to see your day.' : 'Nothing scheduled for this day.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {selectedItems.map((item, idx) => {
              const meta = KIND_META.find(k => k.kind === item.kind)!;
              return (
                <div
                  key={idx}
                  className="glass rounded-xl p-3 flex items-start gap-3"
                  style={{ borderLeft: `3px solid ${meta.color}` }}
                >
                  <span className="text-lg shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm font-semibold', item.completed && 'line-through opacity-60')}>
                        {item.title}
                      </p>
                      {item.time && (
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{item.time}</span>
                      )}
                    </div>
                    {item.subtitle && <p className="text-xs text-muted-foreground mt-0.5 break-words">{item.subtitle}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
