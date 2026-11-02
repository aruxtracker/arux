import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Wallet, TrendingDown, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Budget, Expense, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_EMOJI, ExpenseCategory } from '@/types';
import { cn } from '@/lib/utils';

interface BudgetsPageProps {
  budgets: Budget[];
  expenses: Expense[];
  currency: string;
  onAdd: (category: string, monthlyLimit: number) => void;
  onUpdate: (id: string, data: Partial<Pick<Budget, 'category' | 'monthlyLimit'>>) => void;
  onDelete: (id: string) => void;
}

export function BudgetsPage({ budgets, expenses, currency, onAdd, onUpdate, onDelete }: BudgetsPageProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [limit, setLimit] = useState('');

  const now = new Date();
  const monthPrefix = format(now, 'yyyy-MM');

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      if (e.date.startsWith(monthPrefix)) {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
    }
    return map;
  }, [expenses, monthPrefix]);

  const totalBudget = budgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spentByCategory[b.category] || 0), 0);
  const remaining = totalBudget - totalSpent;

  const sortedBudgets = useMemo(
    () => [...budgets].sort((a, b) => {
      const sa = spentByCategory[a.category] || 0;
      const sb = spentByCategory[b.category] || 0;
      return sb - sa;
    }),
    [budgets, spentByCategory]
  );

  const openAdd = () => {
    setEditId(null);
    const usedCats = new Set(budgets.map(b => b.category));
    const firstFree = EXPENSE_CATEGORIES.find(c => !usedCats.has(c)) || 'Other';
    setCategory(firstFree);
    setLimit('');
    setShowDialog(true);
  };

  const openEdit = (b: Budget) => {
    setEditId(b.id);
    setCategory(b.category as ExpenseCategory);
    setLimit(String(b.monthlyLimit));
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const amt = parseFloat(limit);
    if (!amt || amt <= 0) return;
    if (editId) {
      onUpdate(editId, { category, monthlyLimit: amt });
    } else {
      onAdd(category, amt);
    }
    setShowDialog(false);
    setLimit('');
  };

  const getProgress = (spent: number, limit: number) => Math.min(100, (spent / limit) * 100);

  return (
    <div className="flex flex-col gap-4 pb-2 min-w-0">
      <div className="px-4 md:px-0 pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" /> Budgets
          </h1>
          <p className="text-xs text-muted-foreground">{format(now, 'MMMM yyyy')} spending limits</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground rounded-xl gap-1" size="sm">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {/* Summary card */}
      <div className="mx-4 md:mx-0">
        <div className="relative overflow-hidden rounded-[28px] p-5 text-primary-foreground shadow-pop gradient-fun card-press card-sheen">
          <div className="absolute -top-20 -right-12 w-52 h-52 rounded-full bg-white/20 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-80">{format(now, 'MMMM')} budget</p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-75">Total</p>
                <p className="text-lg font-extrabold tabular-nums">{currency}{Math.round(totalBudget).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-75">Spent</p>
                <p className="text-lg font-extrabold tabular-nums">{currency}{Math.round(totalSpent).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-75">Left</p>
                <p className={cn('text-lg font-extrabold tabular-nums', remaining < 0 && 'opacity-90')}>
                  {currency}{Math.round(remaining).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            {totalBudget > 0 && (
              <div className="mt-4 h-2.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/90 transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget list */}
      <div className="mx-4 md:mx-0">
        {sortedBudgets.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No budgets yet. Tap Add to set a monthly limit for a category.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedBudgets.map(b => {
              const spent = spentByCategory[b.category] || 0;
              const pct = getProgress(spent, b.monthlyLimit);
              const over = spent > b.monthlyLimit;
              const emoji = EXPENSE_CATEGORY_EMOJI[b.category as ExpenseCategory] || '📦';
              return (
                <button
                  key={b.id}
                  onClick={() => openEdit(b)}
                  className="w-full text-left glass rounded-2xl p-4 card-press"
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-2xl shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{b.category}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {currency}{Math.round(spent).toLocaleString('en-IN')} of {currency}{Math.round(b.monthlyLimit).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full shrink-0',
                      over ? 'bg-destructive/15 text-destructive'
                        : pct >= 80 ? 'bg-[hsl(var(--brand-orange))]/15 text-[hsl(var(--brand-orange))]'
                        : 'bg-[hsl(var(--brand-green))]/15 text-[hsl(var(--brand-green))]'
                    )}>
                      {over ? <AlertTriangle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {Math.round(pct)}%
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        over ? 'bg-destructive' : pct >= 80 ? 'bg-[hsl(var(--brand-orange))]' : 'bg-[hsl(var(--brand-green))]'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit budget' : 'Add budget'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)} disabled={!!editId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2">{EXPENSE_CATEGORY_EMOJI[c]} {c}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Monthly limit ({currency})</label>
              <Input type="number" inputMode="decimal" placeholder="5000" value={limit} onChange={e => setLimit(e.target.value)} />
            </div>
            {category && (spentByCategory[category] || 0) > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
                <TrendingDown className="w-3.5 h-3.5" />
                Spent so far this month: {currency}{Math.round(spentByCategory[category]).toLocaleString('en-IN')}
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center gap-2">
            {editId && (
              <Button
                variant="ghost"
                className="text-destructive mr-auto"
                onClick={() => { if (confirm('Delete this budget?')) { onDelete(editId); setShowDialog(false); } }}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            )}
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">
              {editId ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
