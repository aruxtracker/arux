import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, MessageCircle, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { LentBorrowEntry, LentBorrowDirection } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type EntryInput = Omit<LentBorrowEntry, 'id' | 'createdAt'>;
const emptyForm = { personName: '', amount: '', direction: 'lent' as LentBorrowDirection, date: format(new Date(), 'yyyy-MM-dd'), dueDate: '', notes: '' };

interface Props {
  entries: LentBorrowEntry[];
  currency: string;
  onAdd: (data: EntryInput) => void;
  onUpdate: (id: string, data: Partial<EntryInput>) => void;
  onDelete: (id: string) => void;
}

export function LentBorrowPage({ entries, currency, onAdd, onUpdate, onDelete }: Props) {
  const [directionFilter, setDirectionFilter] = useState<'all' | LentBorrowDirection>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LentBorrowEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [settling, setSettling] = useState<LentBorrowEntry | null>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const fmt = (amount: number) => `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const totals = useMemo(() => entries.reduce((sum, entry) => {
    const outstanding = Math.max(0, entry.amount - entry.settledAmount);
    if (entry.direction === 'lent') sum.receivable += outstanding;
    else sum.payable += outstanding;
    return sum;
  }, { receivable: 0, payable: 0 }), [entries]);
  const shown = entries.filter(entry => directionFilter === 'all' || entry.direction === directionFilter);

  const openForm = (entry?: LentBorrowEntry) => {
    setEditing(entry || null);
    setForm(entry ? {
      personName: entry.personName, amount: String(entry.amount), direction: entry.direction,
      date: entry.date, dueDate: entry.dueDate || '', notes: entry.notes || '',
    } : emptyForm);
    setFormOpen(true);
  };
  const save = () => {
    const amount = Number(form.amount);
    if (!form.personName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const next: EntryInput = {
      personName: form.personName.trim(), amount, direction: form.direction,
      date: form.date, dueDate: form.dueDate || undefined, notes: form.notes || undefined,
      settledAmount: editing?.settledAmount || 0, settled: editing ? editing.settledAmount >= amount : false,
    };
    if (editing) onUpdate(editing.id, next); else onAdd(next);
    setFormOpen(false);
  };
  const saveSettlement = () => {
    if (!settling) return;
    const paid = Number(settlementAmount);
    if (!Number.isFinite(paid) || paid <= 0) return;
    const settledAmount = Math.min(settling.amount, settling.settledAmount + paid);
    onUpdate(settling.id, { settledAmount, settled: settledAmount >= settling.amount });
    setSettling(null);
    setSettlementAmount('');
  };

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 pt-2 md:px-0">
        <div><h1 className="text-2xl font-bold">Lent &amp; Borrow</h1><p className="text-sm text-muted-foreground">Track money given and received</p></div>
        <Button onClick={() => openForm()} size="sm" className="gap-1.5 rounded-xl gradient-primary border-0"><Plus className="h-4 w-4"/> Add</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 md:px-0">
        <div className="glass rounded-2xl p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowDownLeft className="h-4 w-4 income-text"/> To receive</div><p className="mt-2 text-xl font-bold income-text">{fmt(totals.receivable)}</p></div>
        <div className="glass rounded-2xl p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowUpRight className="h-4 w-4 text-destructive"/> To repay</div><p className="mt-2 text-xl font-bold text-destructive">{fmt(totals.payable)}</p></div>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 md:px-0">
        {(['all', 'lent', 'borrowed'] as const).map(value => <Button key={value} variant={directionFilter === value ? 'default' : 'outline'} size="sm" onClick={() => setDirectionFilter(value)} className="shrink-0 capitalize">{value === 'all' ? 'All entries' : value}</Button>)}
      </div>
      {shown.length === 0 ? <div className="px-4 py-14 text-center text-sm text-muted-foreground">No entries yet. Add a lent or borrowed amount to get started.</div> :
        <div className="flex flex-col gap-2 px-4 md:px-0">{shown.map(entry => {
          const outstanding = Math.max(0, entry.amount - entry.settledAmount);
          const isLent = entry.direction === 'lent';
          const overdue = !!entry.dueDate && entry.dueDate < format(new Date(), 'yyyy-MM-dd') && outstanding > 0;
          const nudge = () => {
            const text = `Hi ${entry.personName}, just a friendly reminder about the ${fmt(outstanding)} ${isLent ? 'I lent you' : 'I borrowed from you'}.${entry.dueDate ? ` It was due on ${format(new Date(`${entry.dueDate}T00:00:00`), 'd MMM yyyy')}.` : ''}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
          };
          return <div key={entry.id} className="glass rounded-2xl p-4 card-enter">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isLent ? 'income-bg income-text' : 'bg-destructive/10 text-destructive'}`}><Wallet className="h-5 w-5"/></div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{entry.personName}</p><span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize text-secondary-foreground">{entry.direction}</span>{overdue && <span className="text-xs font-semibold text-destructive">Overdue</span>}</div>
                <p className="mt-1 text-xs text-muted-foreground">{format(new Date(`${entry.date}T00:00:00`), 'd MMM yyyy')}{entry.dueDate ? ` · Due ${format(new Date(`${entry.dueDate}T00:00:00`), 'd MMM yyyy')}` : ''}</p>
                {entry.notes && <p className="mt-1 truncate text-xs text-muted-foreground">{entry.notes}</p>}
                {entry.amount > 0 && entry.settledAmount > 0 && <p className="mt-2 text-xs text-muted-foreground">Paid {fmt(entry.settledAmount)} of {fmt(entry.amount)}</p>}
              </div>
              <div className="text-right"><p className={`font-bold ${isLent ? 'income-text' : 'text-destructive'}`}>{fmt(outstanding)}</p><p className="text-xs text-muted-foreground">remaining</p></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-border/50 pt-2">
              {outstanding > 0 && <Button variant="ghost" size="sm" onClick={() => { setSettling(entry); setSettlementAmount(String(outstanding)); }}>Record payment</Button>}
              {isLent && outstanding > 0 && <Button variant="ghost" size="sm" onClick={nudge}><MessageCircle className="mr-1.5 h-4 w-4"/> WhatsApp</Button>}
              <Button variant="ghost" size="icon" aria-label="Edit entry" onClick={() => openForm(entry)}><Pencil className="h-4 w-4"/></Button>
              <Button variant="ghost" size="icon" aria-label="Delete entry" onClick={() => setDeleting(entry.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </div>
          </div>;
        })}</div>}
      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="max-w-sm rounded-2xl"><DialogHeader><DialogTitle>{editing ? 'Edit entry' : 'Add lent or borrowed'}</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3 py-2"><div><Label>Direction</Label><Select value={form.direction} onValueChange={value => setForm(current => ({ ...current, direction: value as LentBorrowDirection }))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="lent">I lent money</SelectItem><SelectItem value="borrowed">I borrowed money</SelectItem></SelectContent></Select></div>
          <div><Label>Person</Label><Input value={form.personName} onChange={event => setForm(current => ({ ...current, personName: event.target.value }))} placeholder="Name"/></div>
          <div><Label>Amount</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} placeholder="0.00"/></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))}/></div>
          <div><Label>Due date (optional)</Label><Input type="date" value={form.dueDate} onChange={event => setForm(current => ({ ...current, dueDate: event.target.value }))}/></div>
          <div><Label>Notes (optional)</Label><Textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} rows={2}/></div>
        </div><DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={save} disabled={!form.personName.trim() || Number(form.amount) <= 0}>{editing ? 'Save changes' : 'Add entry'}</Button></DialogFooter>
      </DialogContent></Dialog>
      <Dialog open={!!settling} onOpenChange={open => !open && setSettling(null)}><DialogContent className="max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Record a repayment</DialogTitle></DialogHeader><div className="py-2"><Label>Amount received / repaid</Label><Input type="number" min="0" step="0.01" value={settlementAmount} onChange={event => setSettlementAmount(event.target.value)}/><p className="mt-2 text-xs text-muted-foreground">Outstanding: {settling ? fmt(settling.amount - settling.settledAmount) : ''}</p></div><DialogFooter><Button variant="outline" onClick={() => setSettling(null)}>Cancel</Button><Button onClick={saveSettlement} disabled={Number(settlementAmount) <= 0}>Save payment</Button></DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this entry?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleting) onDelete(deleting); setDeleting(null); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}