import { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { Plus, Trash2, CreditCard, Calendar, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Subscription, BILLING_CYCLES, BillingCycle } from '@/types';
import { cn } from '@/lib/utils';

interface SubscriptionsPageProps {
  subscriptions: Subscription[];
  currency: string;
  onAdd: (data: Omit<Subscription, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionsPage({ subscriptions, currency, onAdd, onUpdate, onDelete }: SubscriptionsPageProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [nextRenewal, setNextRenewal] = useState('');
  const [notes, setNotes] = useState('');

  const activeSubs = useMemo(() => subscriptions.filter(s => s.active), [subscriptions]);

  // Convert any billing cycle to monthly equivalent
  const monthlyCost = useMemo(() => {
    return activeSubs.reduce((sum, s) => {
      switch (s.billingCycle) {
        case 'weekly': return sum + s.amount * 4.33;
        case 'monthly': return sum + s.amount;
        case 'quarterly': return sum + s.amount / 3;
        case 'yearly': return sum + s.amount / 12;
        default: return sum + s.amount;
      }
    }, 0);
  }, [activeSubs]);

  const yearlyCost = useMemo(() => {
    return activeSubs.reduce((sum, s) => {
      switch (s.billingCycle) {
        case 'weekly': return sum + s.amount * 52;
        case 'monthly': return sum + s.amount * 12;
        case 'quarterly': return sum + s.amount * 4;
        case 'yearly': return sum + s.amount;
        default: return sum + s.amount * 12;
      }
    }, 0);
  }, [activeSubs]);

  const sortedSubs = useMemo(() => {
    return [...subscriptions].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const ad = a.nextRenewalDate || '9999';
      const bd = b.nextRenewalDate || '9999';
      return ad.localeCompare(bd);
    });
  }, [subscriptions]);

  const openAdd = () => {
    setEditId(null);
    setName(''); setAmount(''); setBillingCycle('monthly'); setNextRenewal(''); setNotes('');
    setShowDialog(true);
  };

  const openEdit = (s: Subscription) => {
    setEditId(s.id);
    setName(s.name); setAmount(String(s.amount)); setBillingCycle(s.billingCycle);
    setNextRenewal(s.nextRenewalDate || ''); setNotes(s.notes || '');
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!name.trim() || !amt || amt <= 0) return;
    const data = {
      name: name.trim(), amount: amt, billingCycle,
      nextRenewalDate: nextRenewal || undefined,
      notes: notes.trim() || undefined, active: true,
    };
    if (editId) onUpdate(editId, data);
    else onAdd(data);
    setShowDialog(false);
  };

  const getRenewalInfo = (s: Subscription) => {
    if (!s.nextRenewalDate) return null;
    const date = parseISO(s.nextRenewalDate);
    const days = differenceInDays(date, new Date());
    const overdue = isPast(date) && days < 0;
    return { days, overdue, date };
  };

  return (
    <div className="flex flex-col gap-4 pb-2 min-w-0">
      <div className="px-4 md:px-0 pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Subscriptions
          </h1>
          <p className="text-xs text-muted-foreground">Recurring bills & renewals</p>
        </div>
        <Button onClick={openAdd} className="gradient-primary text-primary-foreground rounded-xl gap-1" size="sm">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {/* Summary */}
      <div className="mx-4 md:mx-0 grid grid-cols-2 gap-2">
        <div className="relative overflow-hidden rounded-2xl p-4 text-primary-foreground gradient-fun card-press">
          <div className="absolute -top-10 -right-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <p className="text-[10px] uppercase tracking-wider font-bold opacity-80 relative">Monthly cost</p>
          <p className="text-2xl font-extrabold tabular-nums mt-1 relative">{currency}{Math.round(monthlyCost).toLocaleString('en-IN')}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Yearly cost</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{currency}{Math.round(yearlyCost).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* List */}
      <div className="mx-4 md:mx-0">
        {sortedSubs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No subscriptions tracked. Add Netflix, Spotify, rent, or any recurring bill.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedSubs.map(s => {
              const renewal = getRenewalInfo(s);
              return (
                <button
                  key={s.id}
                  onClick={() => openEdit(s)}
                  className={cn(
                    'w-full text-left glass rounded-2xl p-3.5 card-press',
                    !s.active && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                      s.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{s.name}</p>
                        <span className="text-[10px] text-muted-foreground capitalize px-1.5 py-0.5 rounded bg-muted/50 shrink-0">{s.billingCycle}</span>
                      </div>
                      {renewal ? (
                        <p className={cn(
                          'text-[11px] flex items-center gap-1 mt-0.5',
                          renewal.overdue ? 'text-destructive font-semibold'
                            : renewal.days <= 3 ? 'text-[hsl(var(--brand-orange))] font-semibold'
                            : 'text-muted-foreground'
                        )}>
                          {renewal.overdue ? <AlertTriangle className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                          {renewal.overdue
                            ? `Overdue by ${Math.abs(renewal.days)}d`
                            : renewal.days === 0 ? 'Renews today'
                            : `Renews in ${renewal.days}d (${format(renewal.date, 'd MMM')})`}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-0.5">No renewal date set</p>
                      )}
                    </div>
                    <p className="text-sm font-bold tabular-nums shrink-0">
                      {currency}{Math.round(s.amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {s.notes && <p className="text-xs text-muted-foreground mt-2 break-words pl-13">{s.notes}</p>}
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
            <DialogTitle>{editId ? 'Edit subscription' : 'Add subscription'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name</label>
              <Input placeholder="Netflix, Spotify, Gym..." value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount ({currency})</label>
                <Input type="number" inputMode="decimal" placeholder="299" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Billing</label>
                <Select value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Next renewal (optional)</label>
              <Input type="date" value={nextRenewal} onChange={e => setNextRenewal(e.target.value)} />
            </div>
            <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[50px]" />
          </div>
          <DialogFooter className="flex items-center gap-2">
            {editId && (
              <>
                <Button
                  variant="ghost"
                  className="text-destructive mr-auto"
                  onClick={() => { if (confirm('Delete this subscription?')) { onDelete(editId); setShowDialog(false); } }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { onUpdate(editId, { active: !subscriptions.find(s => s.id === editId)?.active }); setShowDialog(false); }}
                >
                  {subscriptions.find(s => s.id === editId)?.active ? 'Deactivate' : 'Activate'}
                </Button>
              </>
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
