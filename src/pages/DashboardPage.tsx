import { useState } from 'react';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  ArrowUpRight, ArrowDownRight, Calendar, ChevronRight, Plus, RotateCcw,
  CheckSquare, FileBarChart, Flame, Car, Scissors, Lightbulb, ShoppingCart, Bell,
} from 'lucide-react';
import { Income, Expense, Meeting, TabId, Budget, Subscription, Task, Idea, Reminder } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { SmartInsights } from '@/components/SmartInsights';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { getAvatar } from '@/lib/avatars';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';


interface DashboardPageProps {
  incomes: Income[];
  expenses: Expense[];
  budgets: Budget[];
  subscriptions: Subscription[];
  upcomingMeetings: Meeting[];
  meetings: Meeting[];
  tasks: Task[];
  ideas: Idea[];
  reminders: Reminder[];
  currency: string;
  getMonthlyStats: (year: number, month: number) => { totalIncome: number; totalExpenses: number; balance: number };
  getAllTimeBalance: () => { totalIncome: number; totalExpenses: number; balance: number };
  onNavigate?: (tab: TabId) => void;
  onResetBalance?: () => Promise<boolean | void> | void;
}


function formatCurrency(amount: number, currency: string) {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMeetingRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'd MMM');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 20) return 'Good evening';
  return 'Good night';
}

const SHORTCUTS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; tint: string }[] = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, tint: 'var(--brand-purple)' },
  { id: 'expenses', label: 'Spend', icon: ArrowDownRight, tint: 'var(--expense)' },
  { id: 'income', label: 'Income', icon: ArrowUpRight, tint: 'var(--income)' },
  { id: 'reports', label: 'Reports', icon: FileBarChart, tint: 'var(--brand-blue)' },
  { id: 'habits', label: 'Habits', icon: Flame, tint: 'var(--brand-orange)' },
  { id: 'vehicles', label: 'Garage', icon: Car, tint: 'var(--brand-teal)' },
  { id: 'grooming', label: 'Grooming', icon: Scissors, tint: 'var(--brand-pink)' },
  { id: 'reminders', label: 'Alerts', icon: Bell, tint: 'var(--brand-yellow)' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, tint: 'var(--brand-yellow)' },
  { id: 'dreambucket', label: 'Dreams', icon: ShoppingCart, tint: 'var(--brand-blue)' },
  { id: 'meetings', label: 'Meets', icon: Calendar, tint: 'var(--meeting)' },
];

export function DashboardPage({ incomes, expenses, budgets, subscriptions, upcomingMeetings, meetings, tasks, ideas, reminders, currency, getMonthlyStats, getAllTimeBalance, onNavigate, onResetBalance }: DashboardPageProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const avatar = getAvatar(profile.avatarPreset);
  const [showReset, setShowReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const firstName = (() => {
    const raw = profile.displayName
      || (user?.user_metadata?.display_name as string | undefined)
      || user?.email?.split('@')[0]
      || '';
    const first = raw.trim().split(/[\s._-]+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
  })();

  const now = new Date();

  const { totalIncome: monthIncome, totalExpenses: monthExpenses } = getMonthlyStats(now.getFullYear(), now.getMonth());
  const { balance } = getAllTimeBalance();
  const nextMeeting = upcomingMeetings[0];
  const recent = [
    ...incomes.slice(0, 4).map(i => ({ kind: 'income' as const, id: i.id, title: i.source, date: i.date, amount: i.amount })),
    ...expenses.slice(0, 4).map(e => ({ kind: 'expense' as const, id: e.id, title: e.category, date: e.date, amount: e.amount })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const monthLabel = format(now, 'MMMM');

  return (
    <div className="flex flex-col gap-5 pb-2 min-w-0">
      {/* Header */}
      <div className="px-4 md:px-0 pt-2 flex items-center gap-3 card-enter">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground font-semibold tracking-wide">
            {format(now, 'EEEE · d MMM')}
          </p>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight truncate">
            {firstName ? `Hi ${firstName}, ` : ''}<span className="gradient-text-fun">{getGreeting()}</span>
          </h1>
        </div>
        <button
          onClick={() => onNavigate?.('settings')}
          aria-label="Open your profile"
          className={cn(
            'w-12 h-12 md:w-14 md:h-14 rounded-full shrink-0 flex items-center justify-center shadow-pop tap-shrink bg-gradient-to-br',
            avatar ? avatar.ring : 'from-primary to-accent'
          )}
        >
          {avatar
            ? <span className="text-2xl md:text-3xl leading-none">{avatar.emoji}</span>
            : <span className="text-lg md:text-xl font-extrabold text-primary-foreground">
                {(firstName || 'A').slice(0, 2).toUpperCase()}
              </span>}
        </button>
      </div>

      {/* Global search */}
      <div className="relative z-50 px-4 md:px-0 card-enter" style={{ animationDelay: '30ms' }}>

        <GlobalSearch
          incomes={incomes} expenses={expenses} tasks={tasks}
          meetings={meetings} ideas={ideas} reminders={reminders}
          currency={currency} onNavigate={onNavigate}
        />
      </div>



      {/* Hero balance card */}
      <div className="mx-4 md:mx-0 card-enter" style={{ animationDelay: '60ms' }}>
        <div className="relative overflow-hidden rounded-[32px] p-6 on-gradient shadow-pop gradient-fun card-press card-sheen">

          <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-80">Total balance</p>
              <button
                onClick={() => setShowReset(true)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/15 border border-white/25 text-[11px] font-bold tap-shrink"
                aria-label="Reset total balance"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
            <p className={cn('text-[40px] md:text-5xl font-extrabold mt-1.5 tracking-tight tabular-nums leading-none', balance < 0 && 'opacity-90')}>
              {formatCurrency(balance, currency)}
            </p>

            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <div className="rounded-2xl bg-white/15 backdrop-blur-md px-3.5 py-3 border border-white/15">
                <div className="flex items-center gap-1.5 opacity-90">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <p className="text-[10px] uppercase tracking-wider font-bold">{monthLabel} in</p>
                </div>
                <p className="text-base font-extrabold mt-1 tabular-nums truncate">{formatCurrency(monthIncome, currency)}</p>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur-md px-3.5 py-3 border border-white/15">
                <div className="flex items-center gap-1.5 opacity-90">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <p className="text-[10px] uppercase tracking-wider font-bold">{monthLabel} out</p>
                </div>
                <p className="text-base font-extrabold mt-1 tabular-nums truncate">{formatCurrency(monthExpenses, currency)}</p>
              </div>
            </div>

            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => onNavigate?.('expenses')}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl on-gradient-pill py-3 text-sm font-bold tap-shrink"
              >
                <Plus className="w-4 h-4" /> Add expense
              </button>
              <button
                onClick={() => onNavigate?.('income')}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-white/15 border border-white/25 py-3 text-sm font-bold tap-shrink"
              >
                <Plus className="w-4 h-4" /> Add income
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcut grid */}
      <Section title="Quick access" delay={120}>
        <div className="rounded-[28px] bg-card border border-border/60 card-shadow p-3 card-press">

          <div className="grid grid-cols-4 gap-1">
            {SHORTCUTS.map(({ id, label, icon: Icon, tint }) => (
              <button
                key={id}
                onClick={() => onNavigate?.(id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-muted/60 transition-colors tap-shrink"
              >
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: `hsl(${tint} / 0.14)`, color: `hsl(${tint})` }}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-semibold text-foreground/80 leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Smart insights */}
      <div className="px-4 md:px-0 card-enter" style={{ animationDelay: '150ms' }}>
        <SmartInsights
          incomes={incomes}
          expenses={expenses}
          budgets={budgets}
          subscriptions={subscriptions}
          currency={currency}
        />
      </div>

      {/* Next meeting */}
      <Section title="Up next" delay={180}>
        {nextMeeting ? (
          <button
            onClick={() => onNavigate?.('meetings')}
            className="w-full text-left rounded-[24px] bg-card border border-border/60 card-shadow p-4 flex items-center gap-3.5 tap-shrink card-press"
          >

            <div className="w-11 h-11 rounded-2xl bg-[hsl(var(--meeting-bg))] flex items-center justify-center shrink-0">
              <Calendar className="w-[18px] h-[18px] meeting-text" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{nextMeeting.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getMeetingRelativeDate(nextMeeting.date)} · {nextMeeting.time}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ) : (
          <div className="rounded-[24px] bg-muted/40 border border-dashed border-border p-4 flex items-center gap-3 text-muted-foreground">
            <div className="w-10 h-10 rounded-2xl bg-card flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-sm">No upcoming meetings</span>
          </div>
        )}
      </Section>

      {/* Recent activity */}
      {recent.length > 0 && (
        <Section title="Recent activity" delay={240} action={{ label: 'Reports', onClick: () => onNavigate?.('reports') }}>
          <div className="rounded-[24px] bg-card border border-border/60 card-shadow overflow-hidden divide-y divide-border/60">
            {recent.map((item) => {
              const isIncome = item.kind === 'income';
              return (
                <div key={`${item.kind}-${item.id}`} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                    isIncome ? 'income-bg' : 'expense-bg'
                  )}>
                    {isIncome
                      ? <ArrowUpRight className="w-[18px] h-[18px] income-text" />
                      : <ArrowDownRight className="w-[18px] h-[18px] expense-text" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{format(new Date(item.date), 'd MMM')}</p>
                  </div>
                  <p className={cn('text-sm font-bold tabular-nums shrink-0', isIncome ? 'income-text' : 'expense-text')}>
                    {isIncome ? '+' : '-'}{formatCurrency(item.amount, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Reset balance confirmation */}
      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset total balance?</DialogTitle>
            <DialogDescription>
              This permanently deletes every income and expense entry so your balance restarts at
              {' '}{currency}0. Budgets, tasks and meetings are untouched. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowReset(false)} disabled={resetting}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={resetting}
              onClick={async () => {
                setResetting(true);
                await onResetBalance?.();
                setResetting(false);
                setShowReset(false);
              }}
            >
              {resetting ? 'Resetting...' : 'Reset balance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children, action, delay = 0 }: { title: string; children: React.ReactNode; action?: { label: string; onClick: () => void }; delay?: number }) {
  return (
    <div className="px-4 md:px-0 card-enter" style={{ animationDelay: `${delay}ms` }}>

      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.14em]">{title}</p>
        {action && (
          <button onClick={action.onClick} className="text-[11px] font-bold text-primary flex items-center gap-0.5 min-h-10 px-2 -mr-2 rounded-xl tap-shrink">
            {action.label} <ChevronRight className="w-3 h-3" />
          </button>

        )}
      </div>
      {children}
    </div>
  );
}
