import { useState, useMemo } from 'react';
import { format, parseISO, addDays, differenceInDays, isPast } from 'date-fns';
import { Plus, Trash2, Scissors, MapPin, Calendar, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GroomingEntry, GROOMING_TYPES, GroomingType } from '@/types';
import { cn } from '@/lib/utils';

interface GroomingPageProps {
  entries: GroomingEntry[];
  currency: string;
  onAdd: (data: Omit<GroomingEntry, 'id' | 'createdAt'>) => void;
  onDelete: (id: string) => void;
}

export function GroomingPage({ entries, currency, onAdd, onDelete }: GroomingPageProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [type, setType] = useState<GroomingType>('haircut');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [amount, setAmount] = useState('');
  const [place, setPlace] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-suggest next due date based on type
  const handleTypeChange = (v: GroomingType) => {
    setType(v);
    const cfg = GROOMING_TYPES.find(t => t.value === v);
    if (cfg && date) {
      setNextDue(format(addDays(parseISO(date), cfg.defaultIntervalDays), 'yyyy-MM-dd'));
    }
  };

  const handleSubmit = () => {
    if (!date) return;
    onAdd({
      type, date,
      amount: parseFloat(amount) || 0,
      place: place.trim() || undefined,
      nextDue: nextDue || undefined,
      notes: notes.trim() || undefined,
    });
    // Reset
    setType('haircut');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setAmount(''); setPlace(''); setNextDue(''); setNotes('');
    setShowDialog(false);
  };

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    [entries]
  );

  const totalSpent = entries.reduce((s, e) => s + e.amount, 0);
  const lastByType = useMemo(() => {
    const map: Record<string, GroomingEntry> = {};
    for (const e of sortedEntries) {
      if (!map[e.type]) map[e.type] = e;
    }
    return map;
  }, [sortedEntries]);

  // Upcoming due (any entry whose nextDue is set & not yet superseded by a newer entry of same type)
  const upcoming = useMemo(() => {
    return Object.values(lastByType)
      .filter(e => e.nextDue)
      .sort((a, b) => (a.nextDue || '').localeCompare(b.nextDue || ''));
  }, [lastByType]);

  return (
    <div className="flex flex-col gap-4 pb-2 min-w-0">
      <div className="px-4 md:px-0 pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary" /> Grooming
          </h1>
          <p className="text-xs text-muted-foreground">Haircuts, beard trims, spa & more</p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="gradient-primary text-primary-foreground rounded-xl gap-1"
          size="sm"
        >
          <Plus className="w-4 h-4" /> Log
        </Button>
      </div>

      {/* Summary */}
      <div className="mx-4 md:mx-0 grid grid-cols-2 gap-2">
        <div className="glass rounded-2xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total spent</p>
          <p className="text-xl font-bold">{currency}{Math.round(totalSpent).toLocaleString('en-IN')}</p>
        </div>
        <div className="glass rounded-2xl p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Entries</p>
          <p className="text-xl font-bold">{entries.length}</p>
        </div>
      </div>

      {/* Upcoming due */}
      {upcoming.length > 0 && (
        <div className="mx-4 md:mx-0 glass rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
          </div>
          <div className="p-2 space-y-1">
            {upcoming.map(e => {
              const cfg = GROOMING_TYPES.find(t => t.value === e.type);
              const days = e.nextDue ? differenceInDays(parseISO(e.nextDue), new Date()) : 0;
              const overdue = e.nextDue && isPast(parseISO(e.nextDue));
              return (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                  <span className="text-xl">{cfg?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cfg?.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.nextDue && format(parseISO(e.nextDue), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className={cn(
                    'text-[11px] font-bold px-2 py-1 rounded-full',
                    overdue ? 'bg-destructive/15 text-destructive'
                      : days <= 3 ? 'bg-[hsl(var(--brand-orange))]/15 text-[hsl(var(--brand-orange))]'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `in ${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="mx-4 md:mx-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          History ({sortedEntries.length})
        </p>
        {sortedEntries.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-muted-foreground">
            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No grooming logged yet. Tap Log to add your first entry.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {sortedEntries.map(e => {
              const cfg = GROOMING_TYPES.find(t => t.value === e.type);
              return (
                <div key={e.id} className="glass rounded-xl p-3 flex items-start gap-3">
                  <span className="text-2xl shrink-0">{cfg?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{cfg?.label}</p>
                      {e.amount > 0 && (
                        <p className="font-bold text-sm">{currency}{Math.round(e.amount).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {format(parseISO(e.date), 'MMM d, yyyy')}
                      </span>
                      {e.place && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {e.place}
                        </span>
                      )}
                    </div>
                    {e.notes && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">{e.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Delete this entry?')) onDelete(e.id);
                    }}
                    className="tap-target shrink-0 p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle>Log grooming</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={type} onValueChange={(v) => handleTypeChange(v as GroomingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GROOMING_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">{t.emoji} {t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount ({currency})</label>
                <Input type="number" inputMode="decimal" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Place (optional)</label>
              <Input placeholder="Salon name" value={place} onChange={e => setPlace(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center justify-between">
                <span>Next due (auto-suggested)</span>
                {nextDue && (
                  <button onClick={() => setNextDue('')} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </label>
              <Input type="date" value={nextDue} onChange={e => setNextDue(e.target.value)} />
            </div>
            <Textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px]" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="gradient-primary text-primary-foreground">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
