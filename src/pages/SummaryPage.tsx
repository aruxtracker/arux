import { useState, useMemo } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, ShoppingBag, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Income, Expense } from '@/types';
import { cn } from '@/lib/utils';

interface SummaryPageProps {
  incomes: Income[];
  expenses: Expense[];
  currency: string;
  getMonthlyStats: (year: number, month: number) => { totalIncome: number; totalExpenses: number; balance: number };
}

export function SummaryPage({ incomes, expenses, currency, getMonthlyStats }: SummaryPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { totalIncome, totalExpenses, balance } = getMonthlyStats(year, month);

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(currentDate, 5 - i);
      const stats = getMonthlyStats(d.getFullYear(), d.getMonth());
      return { month: format(d, 'MMM'), Income: stats.totalIncome, Expenses: stats.totalExpenses };
    });
  }, [currentDate, getMonthlyStats]);

  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const categoryTotals = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <h1 className="text-2xl font-bold">Summary</h1>
        <div className="flex items-center gap-1 glass rounded-xl p-1">
          <button onClick={() => setCurrentDate(d => subMonths(d, 1))} className="tap-target p-2 rounded-xl hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 min-w-[90px] text-center">
            {format(currentDate, 'MMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(d => addMonths(d, 1))}
            disabled={format(addMonths(currentDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
            className="tap-target p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 md:px-0">
        <SummaryCard icon={<TrendingUp className="w-5 h-5 income-text" />} label="Total Income"
          value={`${currency}${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          cls="income-bg" textCls="income-text" />
        <SummaryCard icon={<ShoppingBag className="w-5 h-5 expense-text" />} label="Total Expenses"
          value={`${currency}${totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          cls="expense-bg" textCls="expense-text" />
        <SummaryCard icon={<Wallet className="w-5 h-5 text-primary" />} label="Remaining Balance"
          value={`${balance < 0 ? '-' : ''}${currency}${Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          cls={balance >= 0 ? 'bg-secondary' : 'expense-bg'}
          textCls={balance >= 0 ? 'text-primary' : 'expense-text'} />
      </div>

      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">6-Month Overview</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={4} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
              formatter={(value: number) => [`${currency}${value.toLocaleString('en-IN')}`, '']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {categories.length > 0 && (
        <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3">Expense Breakdown</p>
          <div className="flex flex-col gap-2">
            {categories.map(([cat, amount]) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{cat}</span>
                    <span className="text-muted-foreground">{currency}{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, cls, textCls }: { icon: React.ReactNode; label: string; value: string; cls: string; textCls: string }) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', cls)}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-xl font-bold mt-0.5', textCls)}>{value}</p>
      </div>
    </div>
  );
}
