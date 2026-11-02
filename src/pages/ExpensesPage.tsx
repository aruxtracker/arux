import { useState } from 'react';
import { format } from 'date-fns';
import { SwipeRow } from '@/components/SwipeRow';
import { Plus, Pencil, Trash2, ShoppingBag, Filter } from 'lucide-react';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory, EXPENSE_CATEGORY_EMOJI } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ExpensesPageProps {
  expenses: Expense[];
  currency: string;
  onAdd: (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

const EMPTY_FORM = { amount: '', category: 'Food' as ExpenseCategory, date: format(new Date(), 'yyyy-MM-dd'), notes: '' };

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Groceries: 'bg-lime-100 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400',
  Fuel: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  Rent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  Bills: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  EMI: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  Travel: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  Transport: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  Shopping: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  Entertainment: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  Health: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  Education: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  Insurance: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  Subscriptions: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  Business: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  Personal: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  Clothing: 'bg-stone-100 text-stone-600 dark:bg-stone-900/30 dark:text-stone-400',
  Gifts: 'bg-rose-100 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400',
  Charity: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  Maintenance: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function ExpensesPage({ expenses, currency, onAdd, onUpdate, onDelete }: ExpensesPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'All'>('All');

  const filtered = filterCategory === 'All' ? expenses : expenses.filter(e => e.category === filterCategory);
  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);

  const handleOpen = (expense?: Expense) => {
    if (expense) {
      setEditingId(expense.id);
      setForm({ amount: String(expense.amount), category: expense.category, date: expense.date, notes: expense.notes || '' });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.amount || !form.category || !form.date) return;
    const data = { amount: parseFloat(form.amount), category: form.category, date: form.date, notes: form.notes };
    if (editingId) {
      onUpdate(editingId, data);
    } else {
      onAdd(data);
    }
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Total: <span className="expense-text font-semibold">{currency}{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
        </div>
        <Button onClick={() => handleOpen()} size="sm" className="gap-1.5 rounded-xl gradient-primary border-0 text-white hover:opacity-90">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="px-4 md:px-0">
        <Select value={filterCategory} onValueChange={v => setFilterCategory(v as ExpenseCategory | 'All')}>
          <SelectTrigger className="w-full rounded-xl glass">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_EMOJI[c]} {c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-4 md:mx-0 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl expense-bg flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 expense-text" />
          </div>
          <p className="text-muted-foreground text-sm">{filterCategory === 'All' ? 'No expense entries yet' : `No ${filterCategory} expenses`}</p>
          <p className="text-muted-foreground text-xs mt-1">Tap "Add" to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 md:px-0">
          {filtered.map((expense, i) => (
            <SwipeRow
              key={expense.id}
              onEdit={() => handleOpen(expense)}
              onDelete={() => setDeleteId(expense.id)}
              radiusClass="rounded-2xl"
              className="card-enter"
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              <div className="glass rounded-2xl p-3 flex items-center gap-3 card-press">
                <div className="w-11 h-11 rounded-2xl expense-bg flex items-center justify-center flex-shrink-0 text-lg">
                  {EXPENSE_CATEGORY_EMOJI[expense.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full truncate max-w-[60%]', CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other)}>
                      {EXPENSE_CATEGORY_EMOJI[expense.category]} {expense.category}
                    </span>
                    <p className="text-sm font-bold expense-text whitespace-nowrap">-{currency}{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground">{format(new Date(expense.date), 'd MMM yyyy')}</p>
                      {expense.notes && <p className="text-[11px] text-muted-foreground truncate">{expense.notes}</p>}
                    </div>
                    <div className="hidden md:flex gap-1 shrink-0">
                      <button onClick={() => handleOpen(expense)} className="tap-target p-2 rounded-xl hover:bg-muted active:scale-95 transition-all">
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => setDeleteId(expense.id)} className="tap-target p-2 rounded-xl hover:bg-destructive/10 active:scale-95 transition-all">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </SwipeRow>
          ))}
        </div>

      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl glass">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currency}</span>
                <Input type="number" placeholder="0.00" step="0.01" className="pl-8" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_EMOJI[c]} {c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.amount || !form.date} className="gradient-primary border-0 text-white">
              {editingId ? 'Update' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
