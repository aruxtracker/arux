import { useState } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, Bell, Check, Car, ArrowRight, AlertTriangle } from 'lucide-react';
import { Reminder, REMINDER_TYPES, ReminderType, VehicleService, Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface RemindersPageProps {
  reminders: Reminder[];
  vehicleServices?: VehicleService[];
  vehicles?: Vehicle[];
  onAdd: (data: Omit<Reminder, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<Reminder, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
  onUpdateService?: (id: string, data: Partial<Omit<VehicleService, 'id' | 'createdAt'>>) => void;
  onNavigateToVehicles?: () => void;
}

const EMPTY_FORM = { title: '', type: 'general' as ReminderType, date: format(new Date(), 'yyyy-MM-dd'), time: '', recurring: '', notes: '' };

const TYPE_COLORS: Record<ReminderType, string> = {
  meeting: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  rent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  emi: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  general: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
};

export function RemindersPage({ reminders, vehicleServices = [], vehicles = [], onAdd, onUpdate, onDelete, onUpdateService, onNavigateToVehicles }: RemindersPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = reminders.filter(r => !r.completed && r.date >= today);
  const past = reminders.filter(r => r.completed || r.date < today);

  const handleOpen = (reminder?: Reminder) => {
    if (reminder) {
      setEditingId(reminder.id);
      setForm({ title: reminder.title, type: reminder.type, date: reminder.date, time: reminder.time || '', recurring: reminder.recurring || '', notes: reminder.notes || '' });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title || !form.date) return;
    const data = { title: form.title, type: form.type, date: form.date, time: form.time || undefined, recurring: form.recurring || undefined, notes: form.notes, completed: false };
    if (editingId) {
      onUpdate(editingId, data);
    } else {
      onAdd(data);
    }
    setShowForm(false);
  };

  const getTypeInfo = (type: ReminderType) => REMINDER_TYPES.find(t => t.value === type) || REMINDER_TYPES[3];

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-muted-foreground">{upcoming.length} upcoming</p>
        </div>
        <Button onClick={() => handleOpen()} size="sm" className="gap-1.5 rounded-xl gradient-primary border-0 text-white hover:opacity-90">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {/* Vehicle service reminders */}
      {vehicleServices.filter(s => !s.completed).length > 0 && (
        <div className="px-4 md:px-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Car className="w-3 h-3" /> Vehicle Services
            </p>
            {onNavigateToVehicles && (
              <button onClick={onNavigateToVehicles} className="text-[11px] font-semibold text-primary flex items-center gap-0.5 hover:underline">
                Garage <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {vehicleServices.filter(s => !s.completed).slice(0, 5).map(s => {
              const veh = vehicles.find(v => v.id === s.vehicleId);
              const days = s.dueDate ? differenceInDays(parseISO(s.dueDate), new Date()) : null;
              const overdue = days !== null && days < 0;
              const soon = days !== null && days >= 0 && days <= 7;
              return (
                <div key={s.id} className={cn(
                  'glass rounded-2xl p-4 flex items-center gap-3 transition-transform hover:scale-[1.01]',
                  overdue && 'border-destructive/50',
                  soon && 'border-orange-500/50'
                )}>
                  <button
                    onClick={() => onUpdateService?.(s.id, { completed: true })}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-teal))] flex items-center justify-center flex-shrink-0 text-white shadow-pop"
                  >
                    <Car className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{s.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 truncate max-w-[120px]">
                        🚗 {veh?.name || 'Vehicle'}
                      </span>
                      {s.dueDate && (
                        <span className={cn(
                          'text-xs flex items-center gap-1',
                          overdue ? 'text-destructive font-bold' : soon ? 'text-orange-600 font-semibold' : 'text-muted-foreground'
                        )}>
                          {(overdue || soon) && <AlertTriangle className="w-3 h-3" />}
                          {format(parseISO(s.dueDate), 'd MMM')}
                          {overdue && ' • overdue'}
                          {soon && days !== null && ` • ${days}d`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {reminders.length === 0 && vehicleServices.filter(s => !s.completed).length === 0 ? (
        <div className="mx-4 md:mx-0 flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-muted-foreground text-sm">No reminders yet</p>
          <p className="text-muted-foreground text-xs mt-1">Stay on top of your commitments</p>
        </div>
      ) : reminders.length === 0 ? null : (
        <div className="flex flex-col gap-4 px-4 md:px-0">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</p>
              <div className="flex flex-col gap-2">
                {upcoming.map(rem => {
                  const info = getTypeInfo(rem.type);
                  return (
                    <div key={rem.id} className="glass rounded-2xl p-4 flex items-center gap-3 hover:scale-[1.01] transition-transform">
                      <button onClick={() => onUpdate(rem.id, { completed: true })}
                        className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors">
                        <span className="text-lg">{info.emoji}</span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{rem.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TYPE_COLORS[rem.type])}>
                            {info.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(rem.date), 'd MMM yyyy')}
                            {rem.time && ` · ${rem.time}`}
                          </span>
                        </div>
                        {rem.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{rem.notes}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleOpen(rem)} className="tap-target p-2 rounded-xl hover:bg-muted transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => setDeleteId(rem.id)} className="tap-target p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Completed / Past</p>
              <div className="flex flex-col gap-2">
                {past.map(rem => {
                  const info = getTypeInfo(rem.type);
                  return (
                    <div key={rem.id} className="glass rounded-2xl p-4 flex items-center gap-3 opacity-60">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate line-through">{rem.title}</p>
                        <span className="text-xs text-muted-foreground">{format(new Date(rem.date), 'd MMM yyyy')}</span>
                      </div>
                      <button onClick={() => setDeleteId(rem.id)} className="tap-target p-2 rounded-xl hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl glass">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Reminder' : 'New Reminder'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Pay Rent, EMI Due" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ReminderType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Time</Label>
              <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.date} className="gradient-primary border-0 text-white">
              {editingId ? 'Update' : 'Add Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder?</AlertDialogTitle>
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
