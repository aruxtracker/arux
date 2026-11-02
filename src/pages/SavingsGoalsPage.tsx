import { useState } from 'react';
import { Target, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
  notes?: string;
  createdAt: string;
}

interface SavingsGoalsPageProps {
  goals: SavingsGoal[];
  currency: string;
  onAdd: (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

export function SavingsGoalsPage({ goals, currency, onAdd, onUpdate, onDelete }: SavingsGoalsPageProps) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', targetAmount: '', savedAmount: '', deadline: '', notes: '' });

  const resetForm = () => setForm({ title: '', targetAmount: '', savedAmount: '', deadline: '', notes: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.targetAmount) return;
    const data = {
      title: form.title,
      targetAmount: Number(form.targetAmount),
      savedAmount: Number(form.savedAmount) || 0,
      deadline: form.deadline || undefined,
      notes: form.notes || undefined,
    };
    if (editId) {
      onUpdate(editId, data);
      setEditId(null);
    } else {
      onAdd(data);
    }
    resetForm();
    setOpen(false);
  };

  const startEdit = (goal: SavingsGoal) => {
    setForm({
      title: goal.title,
      targetAmount: String(goal.targetAmount),
      savedAmount: String(goal.savedAmount),
      deadline: goal.deadline || '',
      notes: goal.notes || '',
    });
    setEditId(goal.id);
    setOpen(true);
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const overallPct = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary text-primary-foreground rounded-xl gap-1.5">
              <Plus className="w-4 h-4" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-border">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Goal' : 'New Savings Goal'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input placeholder="Goal name (e.g. New Camera)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              <div className="flex gap-2">
                <Input type="number" placeholder="Target amount" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} required min="1" step="any" />
                <Input type="number" placeholder="Saved so far" value={form.savedAmount} onChange={e => setForm(f => ({ ...f, savedAmount: e.target.value }))} min="0" step="any" />
              </div>
              <Input type="date" placeholder="Deadline (optional)" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <Button type="submit" className="gradient-primary text-primary-foreground rounded-xl">
                {editId ? 'Update' : 'Create Goal'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall progress */}
      {goals.length > 0 && (
        <div className="mx-4 md:mx-0 glass rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold">Overall Progress</p>
            <p className="text-xs text-muted-foreground">{currency}{totalSaved.toLocaleString('en-IN')} / {currency}{totalTarget.toLocaleString('en-IN')}</p>
          </div>
          <Progress value={overallPct} className="h-3 bg-muted" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{overallPct.toFixed(0)}% complete</p>
        </div>
      )}

      {/* Goal cards */}
      <div className="flex flex-col gap-3 px-4 md:px-0">
        {goals.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No savings goals yet. Create one to start tracking!</p>
          </div>
        )}
        {goals.map(goal => {
          const pct = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
          const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
          return (
            <div key={goal.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                    pct >= 100 ? 'income-bg' : 'bg-secondary')}>
                    <Target className={cn('w-5 h-5', pct >= 100 ? 'income-text' : 'text-primary')} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{goal.title}</p>
                    {goal.deadline && <p className="text-xs text-muted-foreground">Due: {new Date(goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(goal)} className="tap-target p-2 rounded-xl hover:bg-muted transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => onDelete(goal.id)} className="tap-target p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{currency}{goal.savedAmount.toLocaleString('en-IN')}</span>
                  <span className="text-muted-foreground">{currency}{goal.targetAmount.toLocaleString('en-IN')}</span>
                </div>
                <Progress value={pct} className="h-2.5 bg-muted" />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{pct.toFixed(0)}% saved</span>
                <span>{currency}{remaining.toLocaleString('en-IN')} remaining</span>
              </div>
              {goal.notes && <p className="text-xs text-muted-foreground mt-2 italic">{goal.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
