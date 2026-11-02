import { useState, useMemo } from 'react';
import { Vehicle, VehicleService, VehicleExpense, VEHICLE_TYPES, VEHICLE_EXPENSE_CATEGORIES, VehicleType, VehicleExpenseCategory } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Wrench, Fuel, Calendar, Gauge, ChevronLeft, AlertTriangle, CheckCircle2, ArrowRight, Bell } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  vehicles: Vehicle[];
  vehicleServices: VehicleService[];
  vehicleExpenses: VehicleExpense[];
  currency: string;
  onAddVehicle: (data: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateVehicle: (id: string, data: Partial<Omit<Vehicle, 'id' | 'createdAt'>>) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onAddService: (data: Omit<VehicleService, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateService: (id: string, data: Partial<Omit<VehicleService, 'id' | 'createdAt'>>) => Promise<void>;
  onDeleteService: (id: string) => Promise<void>;
  onAddExpense: (data: Omit<VehicleExpense, 'id' | 'createdAt' | 'expenseId'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export function VehiclesPage(props: Props) {
  const { vehicles, vehicleServices, vehicleExpenses, currency } = props;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [quickReminderForVehicleId, setQuickReminderForVehicleId] = useState<string | null>(null);

  const selected = vehicles.find(v => v.id === selectedId);

  if (selected) {
    return <VehicleDetail vehicle={selected} services={vehicleServices.filter(s => s.vehicleId === selected.id)}
      expenses={vehicleExpenses.filter(e => e.vehicleId === selected.id)} currency={currency}
      onBack={() => setSelectedId(null)} {...props} />;
  }

  return (
    <div className="p-4 space-y-4 animate-fade-in min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold gradient-text truncate">My Garage 🚗</h1>
          <p className="text-xs text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-primary shrink-0"><Plus className="w-4 h-4 mr-1" />Add</Button>
          </DialogTrigger>
          <VehicleFormDialog onSubmit={async (d) => { await props.onAddVehicle(d); setAddOpen(false); }} />
        </Dialog>
      </div>

      {vehicles.length === 0 ? (
        <Card className="p-8 text-center glass">
          <div className="text-5xl mb-2">🏍️</div>
          <p className="text-muted-foreground text-sm">No vehicles yet. Add your first ride!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vehicles.map(v => {
            const totalSpent = vehicleExpenses.filter(e => e.vehicleId === v.id).reduce((s, e) => s + e.amount, 0);
            const pendingServices = vehicleServices.filter(s => s.vehicleId === v.id && !s.completed).length;
            const typeMeta = VEHICLE_TYPES.find(t => t.value === v.type);
            return (
              <Card key={v.id} onClick={() => setSelectedId(v.id)}
                className="p-4 cursor-pointer hover:scale-[1.02] transition-all duration-300 glass hover:shadow-lg hover:shadow-primary/20 group">
                <div className="flex gap-3">
                  {v.imageUrl ? (
                    <img src={v.imageUrl} alt={v.name} className="w-20 h-20 rounded-lg object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-lg gradient-primary flex items-center justify-center text-3xl">
                      {typeMeta?.emoji}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-foreground truncate">{v.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{v.regNumber || typeMeta?.label}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {currency}{totalSpent.toLocaleString()}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-semibold flex items-center gap-1">
                        <Gauge className="w-2.5 h-2.5" />{v.currentKm.toLocaleString()} km
                      </span>
                      {pendingServices > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 font-semibold flex items-center gap-1">
                          <Wrench className="w-2.5 h-2.5" />{pendingServices}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setQuickReminderForVehicleId(v.id); }}
                      className="mt-2 w-full text-[10px] font-bold flex items-center justify-center gap-1 py-2.5 min-h-10 rounded-xl bg-gradient-to-r from-[hsl(var(--brand-blue))] to-[hsl(var(--brand-teal))] text-white shadow-pop tap-shrink"
                    >
                      <Bell className="w-3 h-3" /> Quick Reminder
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick reminder dialog */}
      <Dialog open={!!quickReminderForVehicleId} onOpenChange={(o) => !o && setQuickReminderForVehicleId(null)}>
        <ServiceFormDialog
          vehicleId={quickReminderForVehicleId || ''}
          onSubmit={async (d: any) => {
            await props.onAddService(d);
            setQuickReminderForVehicleId(null);
          }}
        />
      </Dialog>
    </div>
  );
}

function VehicleDetail({ vehicle, services, expenses, currency, onBack, ...props }: any) {
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  const totalSpent = expenses.reduce((s: number, e: VehicleExpense) => s + e.amount, 0);
  const fuelSpent = expenses.filter((e: VehicleExpense) => e.category === 'Fuel').reduce((s: number, e: VehicleExpense) => s + e.amount, 0);
  const typeMeta = VEHICLE_TYPES.find(t => t.value === vehicle.type);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ChevronLeft className="w-4 h-4 mr-1" />Back
      </Button>

      {/* Hero */}
      <Card className="overflow-hidden glass">
        {vehicle.imageUrl ? (
          <img src={vehicle.imageUrl} alt={vehicle.name} className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-32 gradient-primary flex items-center justify-center text-6xl">{typeMeta?.emoji}</div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">{vehicle.name}</h2>
              <p className="text-xs text-muted-foreground">{vehicle.regNumber || '—'} · {typeMeta?.label}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={async () => {
              if (confirm(`Delete ${vehicle.name}? This removes all its services & expenses.`)) {
                await props.onDeleteVehicle(vehicle.id); onBack();
              }
            }}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="Spent" value={`${currency}${totalSpent.toLocaleString()}`} />
            <Stat label="Fuel" value={`${currency}${fuelSpent.toLocaleString()}`} />
            <Stat label="Mileage" value={`${vehicle.currentKm.toLocaleString()} km`} />
          </div>
        </div>
      </Card>

      <Tabs defaultValue="services">
        <TabsList className="w-full glass">
          <TabsTrigger value="services" className="flex-1">🔧 Services</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1">💸 Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-3 space-y-2">
          <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gradient-primary"><Plus className="w-4 h-4 mr-1" />Add Service Reminder</Button>
            </DialogTrigger>
            <ServiceFormDialog vehicleId={vehicle.id}
              onSubmit={async (d: any) => { await props.onAddService(d); setAddServiceOpen(false); }} />
          </Dialog>
          {services.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No service reminders</p>
          ) : services.sort((a: VehicleService, b: VehicleService) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1)).map((s: VehicleService) => {
            const days = s.dueDate ? differenceInDays(parseISO(s.dueDate), new Date()) : null;
            const overdue = days !== null && days < 0 && !s.completed;
            const soon = days !== null && days >= 0 && days <= 7 && !s.completed;
            return (
              <Card key={s.id} className={cn('p-3 glass flex items-center gap-3 transition-all',
                s.completed && 'opacity-60',
                overdue && 'border-destructive/50',
                soon && 'border-orange-500/50')}>
                <button onClick={() => props.onUpdateService(s.id, { completed: !s.completed })}
                  className={cn('w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                    s.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground hover:border-primary')}>
                  {s.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={cn('font-semibold text-sm', s.completed && 'line-through')}>{s.title}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground mt-0.5">
                    {s.dueDate && (
                      <span className={cn('flex items-center gap-1', overdue && 'text-destructive font-semibold', soon && 'text-orange-600 font-semibold')}>
                        {(overdue || soon) && <AlertTriangle className="w-3 h-3" />}
                        <Calendar className="w-3 h-3" />{format(parseISO(s.dueDate), 'd MMM yyyy')}
                        {overdue && ' (overdue)'}{soon && days !== null && ` (${days}d)`}
                      </span>
                    )}
                    {s.dueKm && <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{s.dueKm.toLocaleString()} km</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => props.onDeleteService(s.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="expenses" className="mt-3 space-y-2">
          <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gradient-primary"><Plus className="w-4 h-4 mr-1" />Add Expense</Button>
            </DialogTrigger>
            <ExpenseFormDialog vehicleId={vehicle.id} currency={currency}
              onSubmit={async (d: any) => { await props.onAddExpense(d); setAddExpenseOpen(false); }} />
          </Dialog>
          {expenses.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No expenses logged. Auto-syncs to main Expenses.</p>
          ) : expenses.map((e: VehicleExpense) => {
            const cat = VEHICLE_EXPENSE_CATEGORIES.find(c => c.value === e.category);
            return (
              <Card key={e.id} className="p-3 glass flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">{cat?.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{cat?.label}</p>
                  <p className="text-[11px] text-muted-foreground">{format(parseISO(e.date), 'd MMM yyyy')}{e.notes ? ` · ${e.notes}` : ''}</p>
                </div>
                <p className="font-bold text-sm">{currency}{e.amount.toLocaleString()}</p>
                <Button variant="ghost" size="icon" onClick={() => props.onDeleteExpense(e.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/40">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}

function VehicleFormDialog({ onSubmit }: { onSubmit: (d: Omit<Vehicle, 'id' | 'createdAt'>) => Promise<void> }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleType>('car');
  const [regNumber, setRegNumber] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [currentKm, setCurrentKm] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({ name: name.trim(), type, regNumber, imageUrl, purchaseDate, currentKm: Number(currentKm) || 0, notes });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><Label>Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Royal Enfield" required /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Reg. Number</Label><Input value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="HR-26-XX-1234" /></div>
        </div>
        <div><Label>Image URL</Label><Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Purchase Date</Label><Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} /></div>
          <div><Label>Current km</Label><Input type="number" value={currentKm} onChange={e => setCurrentKm(e.target.value)} placeholder="0" /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        <Button type="submit" className="w-full gradient-primary">Add Vehicle</Button>
      </form>
    </DialogContent>
  );
}

function ServiceFormDialog({ vehicleId, onSubmit }: { vehicleId: string; onSubmit: (d: any) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueKm, setDueKm] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({ vehicleId, title: title.trim(), dueDate, dueKm: Number(dueKm) || undefined, completed: false, notes });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Service Reminder</DialogTitle></DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Oil change, Insurance renewal..." required /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
          <div><Label>Due at km</Label><Input type="number" value={dueKm} onChange={e => setDueKm(e.target.value)} placeholder="optional" /></div>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
        <Button type="submit" className="w-full gradient-primary">Add Reminder</Button>
      </form>
    </DialogContent>
  );
}

function ExpenseFormDialog({ vehicleId, currency, onSubmit }: { vehicleId: string; currency: string; onSubmit: (d: any) => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<VehicleExpenseCategory>('Fuel');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    await onSubmit({ vehicleId, amount: Number(amount), category, date, notes });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Add Vehicle Expense</DialogTitle></DialogHeader>
      <p className="text-[11px] text-muted-foreground -mt-2">Auto-syncs to main Expenses page.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><Label>Amount ({currency}) *</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></div>
        <div><Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as VehicleExpenseCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{VEHICLE_EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="e.g. 15L petrol @ ₹100" /></div>
        <Button type="submit" className="w-full gradient-primary">Add Expense</Button>
      </form>
    </DialogContent>
  );
}
