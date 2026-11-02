import { useState, useMemo } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Income, Expense } from '@/types';

interface ChartsPageProps {
  incomes: Income[];
  expenses: Expense[];
  currency: string;
  getMonthlyStats: (year: number, month: number) => { totalIncome: number; totalExpenses: number; balance: number };
}

const PIE_COLORS = [
  'hsl(270 70% 55%)', 'hsl(340 75% 55%)', 'hsl(220 80% 58%)',
  'hsl(160 60% 42%)', 'hsl(30 80% 55%)', 'hsl(200 70% 50%)',
];

export function ChartsPage({ incomes, expenses, currency, getMonthlyStats }: ChartsPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 6-month bar data
  const barData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(currentDate, 5 - i);
      const stats = getMonthlyStats(d.getFullYear(), d.getMonth());
      return { month: format(d, 'MMM'), Income: stats.totalIncome, Expenses: stats.totalExpenses };
    }), [currentDate, getMonthlyStats]);

  // 12-month line data
  const lineData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(currentDate, 11 - i);
      const stats = getMonthlyStats(d.getFullYear(), d.getMonth());
      return { month: format(d, 'MMM yy'), Expenses: stats.totalExpenses };
    }), [currentDate, getMonthlyStats]);

  // Category pie for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    monthExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthExpenses]);

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 12,
    fontSize: 12,
  };

  const fmtValue = (value: number) => `${currency}${value.toLocaleString('en-IN')}`;

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <h1 className="text-2xl font-bold">Charts</h1>
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="tap-target p-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 min-w-[90px] text-center">{format(currentDate, 'MMM yyyy')}</span>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))}
            disabled={format(addMonths(currentDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
            className="tap-target p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Income vs Expense Bar */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Income vs Expenses (6 months)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} barGap={4} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtValue(v), '']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Line Graph */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Expense Trend (12 months)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtValue(v), '']} />
            <Line type="monotone" dataKey="Expenses" stroke="hsl(var(--expense))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--expense))' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Pie Chart */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Category Breakdown – {format(currentDate, 'MMM yyyy')}</p>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={35} dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtValue(v), '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 flex-1">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-medium truncate">{entry.name}</span>
                  <span className="ml-auto text-muted-foreground">{fmtValue(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
