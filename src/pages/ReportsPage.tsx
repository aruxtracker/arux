import { useState, useMemo } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Calendar, Download, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Income, Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { aggregateMonthly, forecastMonthly, burnRate, topSpendingDay, savingsRate, detectRecurring } from '@/lib/forecast';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsPageProps {
  incomes: Income[];
  expenses: Expense[];
  currency: string;
  getMonthlyStats?: (year: number, month: number) => { totalIncome: number; totalExpenses: number; balance: number };
}

const PIE_COLORS = [
  'hsl(270 70% 55%)', 'hsl(340 75% 55%)', 'hsl(220 80% 58%)',
  'hsl(160 60% 42%)', 'hsl(30 80% 55%)', 'hsl(200 70% 50%)',
];

export function ReportsPage({ incomes, expenses, currency, getMonthlyStats }: ReportsPageProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [insight, setInsight] = useState<{ summary: string; bullets: string[] } | null>(null);
  const [pieDate, setPieDate] = useState(new Date());

  const incomeMonthly = useMemo(() => aggregateMonthly(incomes), [incomes]);
  const expenseMonthly = useMemo(() => aggregateMonthly(expenses), [expenses]);
  const forecast = useMemo(() => forecastMonthly(expenseMonthly, 3), [expenseMonthly]);

  // 12 months series
  const series = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM yy');
      const inc = incomeMonthly.find(p => p.month === key)?.total || 0;
      const exp = expenseMonthly.find(p => p.month === key)?.total || 0;
      return { month: label, Income: inc, Expenses: exp, Net: inc - exp };
    });
  }, [incomeMonthly, expenseMonthly]);

  const forecastSeries = useMemo(() => {
    const past = expenseMonthly.slice(-6).map(p => ({ month: format(new Date(p.month + '-01'), 'MMM yy'), Actual: p.total, Forecast: null as number | null }));
    const future = forecast.map(p => ({ month: format(new Date(p.month + '-01'), 'MMM yy'), Actual: null as number | null, Forecast: p.total }));
    if (past.length > 0 && future.length > 0) {
      // Bridge line: copy last actual into first forecast point
      future[0].Actual = past[past.length - 1].Actual;
    }
    return [...past, ...future];
  }, [expenseMonthly, forecast]);

  const thisMonth = useMemo(() => {
    const key = format(new Date(), 'yyyy-MM');
    return {
      income: incomeMonthly.find(p => p.month === key)?.total || 0,
      expense: expenseMonthly.find(p => p.month === key)?.total || 0,
    };
  }, [incomeMonthly, expenseMonthly]);

  const burn = useMemo(() => burnRate(expenses), [expenses]);
  const topDay = useMemo(() => topSpendingDay(expenses), [expenses]);
  const savings = savingsRate(thisMonth.income, thisMonth.expense);
  const recurring = useMemo(() => detectRecurring(expenses).slice(0, 6), [expenses]);

  // Category pie for the selected month
  const pieMonthExpenses = useMemo(() => {
    const y = pieDate.getFullYear(), m = pieDate.getMonth();
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [expenses, pieDate]);

  const pieData = useMemo(() => {
    const totals: Record<string, number> = {};
    pieMonthExpenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
    return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [pieMonthExpenses]);

  // Long-term expense line (12 months)
  const lineData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i);
      const key = format(d, 'yyyy-MM');
      const exp = expenseMonthly.find(p => p.month === key)?.total || 0;
      return { month: format(d, 'MMM yy'), Expenses: exp };
    }), [expenseMonthly]);

  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString('en-IN')}`;

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 12, fontSize: 12,
  };

  const generateInsight = async () => {
    setAiLoading(true);
    try {
      const month = format(new Date(), 'yyyy-MM');
      const { data, error } = await supabase.functions.invoke('monthly-insights', { body: { month, regenerate: true } });
      if (error) throw error;
      setInsight({ summary: data.summary, bullets: data.bullets || [] });
      toast.success('AI insight ready 🧠');
    } catch (e: any) {
      toast.error(e?.message || 'AI failed');
    } finally { setAiLoading(false); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('ARUX — Monthly Report', 14, 20);
    doc.setFontSize(11);
    doc.text(format(new Date(), 'MMMM yyyy'), 14, 28);
    doc.setFontSize(10);
    doc.text(`Income: ${fmt(thisMonth.income)}`, 14, 38);
    doc.text(`Expenses: ${fmt(thisMonth.expense)}`, 14, 44);
    doc.text(`Savings rate: ${savings.toFixed(0)}%`, 14, 50);
    doc.text(`Daily burn: ${fmt(burn)}`, 14, 56);
    if (insight) {
      doc.setFontSize(12); doc.text('AI Insight', 14, 70);
      doc.setFontSize(9);
      doc.text(insight.summary, 14, 76, { maxWidth: 180 });
    }
    autoTable(doc, {
      startY: 100,
      head: [['Month', 'Income', 'Expenses', 'Net']],
      body: series.map(s => [s.month, fmt(s.Income), fmt(s.Expenses), fmt(s.Net)]),
    });
    doc.save(`arux-report-${format(new Date(), 'yyyy-MM')}.pdf`);
    toast.success('PDF exported 📄');
  };

  return (
    <div className="flex flex-col gap-4 pb-2 min-w-0">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <h1 className="text-2xl font-bold">Reports</h1>
        <Button onClick={exportPDF} variant="outline" size="sm" className="gap-1 rounded-xl">
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
      </div>

      {/* Overview cards */}
      <div className="mx-4 md:mx-0 grid grid-cols-2 gap-2">
        <StatCard label="Savings rate" value={`${savings.toFixed(0)}%`} icon={<TrendingUp className="w-3.5 h-3.5" />} color="income" />
        <StatCard label="Daily burn" value={fmt(burn)} icon={<TrendingDown className="w-3.5 h-3.5" />} color="expense" />
        <StatCard label="Top spend day" value={topDay?.day || '—'} sub={topDay ? fmt(topDay.total) : ''} icon={<Calendar className="w-3.5 h-3.5" />} color="meeting" />
        <StatCard label="Net this month" value={fmt(thisMonth.income - thisMonth.expense)} icon={<Sparkles className="w-3.5 h-3.5" />} color="balance" />
      </div>

      {/* AI Insight */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Insight</p>
          <Button onClick={generateInsight} disabled={aiLoading} size="sm" variant="ghost" className="gap-1">
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {insight ? 'Refresh' : 'Generate'}
          </Button>
        </div>
        {insight ? (
          <div className="space-y-2">
            <p className="text-sm">{insight.summary}</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              {insight.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Tap Generate for an AI-powered summary of this month.</p>
        )}
      </div>

      {/* 12-month bars */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Income vs Expenses (12 months)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={series} barGap={2} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Income" fill="hsl(var(--income))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Expenses" fill="hsl(var(--expense))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-1">📈 Next 3 months forecast</p>
        <p className="text-[11px] text-muted-foreground mb-3">Linear regression on last 6 months</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={forecastSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v ? fmt(v) : '—'} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Actual" stroke="hsl(var(--expense))" fill="hsl(var(--expense) / 0.2)" strokeWidth={2} />
            <Area type="monotone" dataKey="Forecast" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Expense trend line (12 months) */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Expense trend (12 months)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={45} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
            <Line type="monotone" dataKey="Expenses" stroke="hsl(var(--expense))" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(var(--expense))' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category pie with month picker */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Category breakdown</p>
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
            <button onClick={() => setPieDate(d => subMonths(d, 1))} className="tap-target p-2 rounded-xl hover:bg-muted transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium px-1.5 min-w-[78px] text-center">{format(pieDate, 'MMM yyyy')}</span>
            <button onClick={() => setPieDate(d => addMonths(d, 1))}
              disabled={format(addMonths(pieDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
              className="tap-target p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-40">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {pieData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
        ) : (
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={35} dataKey="value" paddingAngle={3} strokeWidth={0}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-medium truncate">{entry.name}</span>
                  <span className="ml-auto text-muted-foreground">{fmt(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recurring */}
      <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" /> Detected recurring spends
        </p>
        {recurring.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recurring patterns detected yet.</p>
        ) : (
          <div className="space-y-1.5">
            {recurring.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                <span>{r.category}</span>
                <span className="text-xs text-muted-foreground">{r.occurrences} months</span>
                <span className="font-semibold">{fmt(r.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        {icon} {label}
      </div>
      <p className={`text-lg font-bold mt-1 text-${color === 'income' ? '[hsl(var(--income))]' : color === 'expense' ? '[hsl(var(--expense))]' : color === 'meeting' ? '[hsl(var(--meeting))]' : 'foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
