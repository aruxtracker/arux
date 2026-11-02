import {
  startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth,
  parseISO, isWithinInterval, addDays, format,
} from 'date-fns';
import { Expense, Income, Budget, Subscription, EXPENSE_CATEGORY_EMOJI, ExpenseCategory } from '@/types';

export type InsightTone = 'good' | 'warn' | 'bad' | 'info';

export interface Insight {
  id: string;
  emoji: string;
  title: string;
  body: string;
  tone: InsightTone;
}

function money(amount: number, currency: string) {
  return `${currency}${Math.round(amount).toLocaleString('en-IN')}`;
}

function sumIn(rows: { amount: number; date: string }[], start: Date, end: Date) {
  return rows.reduce((total, row) => {
    try {
      const d = parseISO(row.date);
      return isWithinInterval(d, { start, end }) ? total + row.amount : total;
    } catch {
      return total;
    }
  }, 0);
}

export function buildInsights(params: {
  incomes: Income[];
  expenses: Expense[];
  budgets: Budget[];
  subscriptions: Subscription[];
  currency: string;
  now?: Date;
}): Insight[] {
  const { incomes, expenses, budgets, subscriptions, currency } = params;
  const now = params.now || new Date();
  const insights: Insight[] = [];

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisWeek = sumIn(expenses, weekStart, weekEnd);
  const lastWeek = sumIn(expenses, prevStart, prevEnd);

  // 1. Week-over-week spending
  if (thisWeek > 0 || lastWeek > 0) {
    if (lastWeek > 0) {
      const diff = ((thisWeek - lastWeek) / lastWeek) * 100;
      const up = diff >= 0;
      insights.push({
        id: 'week-spend',
        emoji: up ? '📈' : '📉',
        title: `${money(thisWeek, currency)} spent this week`,
        body: `${Math.abs(Math.round(diff))}% ${up ? 'more' : 'less'} than last week (${money(lastWeek, currency)}).`,
        tone: up ? (diff > 25 ? 'bad' : 'warn') : 'good',
      });
    } else {
      insights.push({
        id: 'week-spend',
        emoji: '📊',
        title: `${money(thisWeek, currency)} spent this week`,
        body: 'No spending recorded last week to compare against.',
        tone: 'info',
      });
    }
  }

  // 2. Top category this week
  const weekByCategory: Record<string, number> = {};
  expenses.forEach(e => {
    try {
      if (isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd })) {
        weekByCategory[e.category] = (weekByCategory[e.category] || 0) + e.amount;
      }
    } catch { /* skip */ }
  });
  const topWeek = Object.entries(weekByCategory).sort((a, b) => b[1] - a[1])[0];
  if (topWeek) {
    const share = thisWeek > 0 ? Math.round((topWeek[1] / thisWeek) * 100) : 0;
    insights.push({
      id: 'top-category',
      emoji: EXPENSE_CATEGORY_EMOJI[topWeek[0] as ExpenseCategory] || '💸',
      title: `Top category: ${topWeek[0]}`,
      body: `${money(topWeek[1], currency)} this week — ${share}% of everything you spent.`,
      tone: share > 50 ? 'warn' : 'info',
    });
  }

  // 3. Savings rate this month
  const monthIncome = sumIn(incomes, monthStart, monthEnd);
  const monthExpense = sumIn(expenses, monthStart, monthEnd);
  if (monthIncome > 0) {
    const saved = monthIncome - monthExpense;
    const rate = Math.round((saved / monthIncome) * 100);
    insights.push({
      id: 'savings-rate',
      emoji: saved >= 0 ? '🏦' : '⚠️',
      title: saved >= 0 ? `You kept ${rate}% of ${format(now, 'MMMM')} income` : `Overspending in ${format(now, 'MMMM')}`,
      body: saved >= 0
        ? `${money(saved, currency)} left from ${money(monthIncome, currency)} earned.`
        : `You spent ${money(Math.abs(saved), currency)} more than you earned this month.`,
      tone: saved < 0 ? 'bad' : rate < 15 ? 'warn' : 'good',
    });
  }

  // 4. Budget pressure
  const budgetAlerts = budgets
    .map(b => {
      const spent = expenses.reduce((total, e) => {
        try {
          return e.category === b.category && isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd })
            ? total + e.amount : total;
        } catch { return total; }
      }, 0);
      return { ...b, spent, pct: b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0 };
    })
    .filter(b => b.pct >= 80)
    .sort((a, b) => b.pct - a.pct);
  if (budgetAlerts.length > 0) {
    const worst = budgetAlerts[0];
    insights.push({
      id: 'budget-alert',
      emoji: worst.pct >= 100 ? '🚨' : '🔔',
      title: worst.pct >= 100 ? `${worst.category} budget exceeded` : `${worst.category} budget almost gone`,
      body: `${money(worst.spent, currency)} of ${money(worst.monthlyLimit, currency)} used (${Math.round(worst.pct)}%)${budgetAlerts.length > 1 ? ` · ${budgetAlerts.length - 1} more at risk` : ''}.`,
      tone: worst.pct >= 100 ? 'bad' : 'warn',
    });
  }

  // 5. Renewals in the next 7 days
  const soon = addDays(now, 7);
  const upcoming = subscriptions.filter(s => {
    if (!s.active || !s.nextRenewalDate) return false;
    try {
      const d = parseISO(s.nextRenewalDate);
      return d >= new Date(now.toDateString()) && d <= soon;
    } catch { return false; }
  });
  if (upcoming.length > 0) {
    const total = upcoming.reduce((t, s) => t + s.amount, 0);
    insights.push({
      id: 'renewals',
      emoji: '🔁',
      title: `${upcoming.length} renewal${upcoming.length > 1 ? 's' : ''} in 7 days`,
      body: `${money(total, currency)} due — ${upcoming.slice(0, 3).map(s => s.name).join(', ')}.`,
      tone: 'warn',
    });
  }

  // 6. Biggest single expense this month
  const biggest = expenses
    .filter(e => {
      try { return isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }); } catch { return false; }
    })
    .sort((a, b) => b.amount - a.amount)[0];
  if (biggest && monthExpense > 0) {
    insights.push({
      id: 'biggest',
      emoji: '💥',
      title: `Biggest hit: ${money(biggest.amount, currency)}`,
      body: `${biggest.category} on ${format(parseISO(biggest.date), 'd MMM')} — ${Math.round((biggest.amount / monthExpense) * 100)}% of this month's spend.`,
      tone: 'info',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'empty',
      emoji: '✨',
      title: 'No insights yet',
      body: 'Add a few incomes and expenses and ARUX will start spotting patterns for you.',
      tone: 'info',
    });
  }

  return insights;
}
