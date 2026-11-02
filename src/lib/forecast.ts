// Lightweight forecasting utilities (linear regression + helpers)
// Used for predicting future expenses and reaching savings goals.

import { Income, Expense } from '@/types';
import { format, subMonths, addMonths, parseISO, differenceInDays } from 'date-fns';

export interface MonthlyPoint {
  month: string; // YYYY-MM
  total: number;
}

/** Aggregate values by YYYY-MM */
export function aggregateMonthly<T extends { date: string; amount: number }>(items: T[]): MonthlyPoint[] {
  const map = new Map<string, number>();
  items.forEach(it => {
    const key = it.date.slice(0, 7);
    map.set(key, (map.get(key) || 0) + it.amount);
  });
  return [...map.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Simple linear regression: y = a + b*x */
export function linearRegression(values: number[]): { a: number; b: number } {
  const n = values.length;
  if (n < 2) return { a: values[0] || 0, b: 0 };
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((s, x) => s + x, 0) / n;
  const meanY = values.reduce((s, y) => s + y, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (values[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const b = den === 0 ? 0 : num / den;
  const a = meanY - b * meanX;
  return { a, b };
}

/** Forecast the next `months` periods of expense totals */
export function forecastMonthly(history: MonthlyPoint[], months = 3): MonthlyPoint[] {
  const recent = history.slice(-6);
  if (recent.length === 0) return [];
  const { a, b } = linearRegression(recent.map(p => p.total));
  const result: MonthlyPoint[] = [];
  const lastMonth = recent[recent.length - 1].month;
  const [yy, mm] = lastMonth.split('-').map(Number);
  const lastDate = new Date(yy, mm - 1, 1);
  for (let i = 1; i <= months; i++) {
    const next = addMonths(lastDate, i);
    const idx = recent.length - 1 + i;
    const predicted = Math.max(0, a + b * idx);
    result.push({ month: format(next, 'yyyy-MM'), total: predicted });
  }
  return result;
}

/** Estimate when a savings goal will be reached at the current pace */
export function estimateGoalETA(saved: number, target: number, monthlyContribution: number): Date | null {
  if (saved >= target) return new Date();
  if (monthlyContribution <= 0) return null;
  const remaining = target - saved;
  const months = Math.ceil(remaining / monthlyContribution);
  return addMonths(new Date(), months);
}

/** Detect recurring subscriptions: same amount appearing in 3+ months in a row */
export function detectRecurring(expenses: Expense[]): { amount: number; category: string; occurrences: number }[] {
  const groups = new Map<string, Set<string>>(); // key -> set of YYYY-MM
  expenses.forEach(e => {
    const key = `${Math.round(e.amount)}|${e.category}`;
    const month = e.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(month);
  });
  const recurring: { amount: number; category: string; occurrences: number }[] = [];
  groups.forEach((months, key) => {
    if (months.size >= 3) {
      const [amt, cat] = key.split('|');
      recurring.push({ amount: Number(amt), category: cat, occurrences: months.size });
    }
  });
  return recurring.sort((a, b) => b.occurrences - a.occurrences);
}

/** Burn rate: average daily spend over last 30 days */
export function burnRate(expenses: Expense[]): number {
  const cutoff = subMonths(new Date(), 1);
  const recent = expenses.filter(e => parseISO(e.date) >= cutoff);
  const total = recent.reduce((s, e) => s + e.amount, 0);
  return total / 30;
}

/** Day-of-week analysis: which weekday do you spend the most? */
export function topSpendingDay(expenses: Expense[]): { day: string; total: number } | null {
  if (expenses.length === 0) return null;
  const totals = [0, 0, 0, 0, 0, 0, 0];
  expenses.forEach(e => { totals[parseISO(e.date).getDay()] += e.amount; });
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let max = 0, idx = 0;
  totals.forEach((t, i) => { if (t > max) { max = t; idx = i; } });
  return { day: days[idx], total: max };
}

/** Savings rate %: (income - expense) / income over a period */
export function savingsRate(income: number, expense: number): number {
  if (income <= 0) return 0;
  return Math.max(0, ((income - expense) / income) * 100);
}

/** Build daily heatmap data for a year */
export function buildHeatmap(expenses: Expense[], days = 365): { date: string; count: number }[] {
  const map = new Map<string, number>();
  const today = new Date();
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - days);
  expenses.forEach(e => {
    const d = parseISO(e.date);
    if (d >= cutoff && d <= today) {
      map.set(e.date, (map.get(e.date) || 0) + e.amount);
    }
  });
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}
