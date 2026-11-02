import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, ShoppingBag, Trash2, PartyPopper, ExternalLink, PiggyBank,
  LayoutGrid, TableIcon, Columns3, CalendarDays, Star, Tag, X
} from 'lucide-react';
import { DreamBucketItem, DREAM_CATEGORIES } from '@/types';
import { cn } from '@/lib/utils';

type ViewMode = 'card' | 'table' | 'board' | 'timeline';

interface DreamBucketPageProps {
  items: DreamBucketItem[];
  currency: string;
  onAdd: (data: Omit<DreamBucketItem, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Omit<DreamBucketItem, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'card', label: 'Cards', icon: LayoutGrid },
  { id: 'table', label: 'Table', icon: TableIcon },
  { id: 'board', label: 'Board', icon: Columns3 },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
];

export function DreamBucketPage({ items, currency, onAdd, onUpdate, onDelete }: DreamBucketPageProps) {
  const [view, setView] = useState<ViewMode>('card');
  const [open, setOpen] = useState(false);
  const [savingsDialogId, setSavingsDialogId] = useState<string | null>(null);
  const [savingsAmount, setSavingsAmount] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState({
    productName: '', productLink: '', imageUrl: '', targetPrice: '', savedAmount: '0',
    targetDate: '', notes: '', category: 'general', tags: [] as string[], priority: false,
  });

  const resetForm = () => setForm({
    productName: '', productLink: '', imageUrl: '', targetPrice: '', savedAmount: '0',
    targetDate: '', notes: '', category: 'general', tags: [], priority: false,
  });

  const handleSubmit = async () => {
    if (!form.productName.trim() || !form.targetPrice) return;
    await onAdd({
      productName: form.productName.trim(),
      productLink: form.productLink.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      targetPrice: Number(form.targetPrice),
      savedAmount: Number(form.savedAmount) || 0,
      targetDate: form.targetDate || undefined,
      achieved: Number(form.savedAmount) >= Number(form.targetPrice),
      notes: form.notes.trim() || undefined,
      category: form.category,
      tags: form.tags,
      priority: form.priority,
    });
    resetForm();
    setOpen(false);
  };

  const handleAddSavings = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || !savingsAmount) return;
    const newAmount = item.savedAmount + Number(savingsAmount);
    await onUpdate(id, { savedAmount: newAmount, achieved: newAmount >= item.targetPrice });
    setSavingsAmount('');
    setSavingsDialogId(null);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const getPct = (item: DreamBucketItem) =>
    item.targetPrice > 0 ? Math.min(100, Math.round((item.savedAmount / item.targetPrice) * 100)) : 0;

  const getCatEmoji = (cat?: string) => DREAM_CATEGORIES.find(c => c.value === cat)?.emoji || '📦';

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Dream Bucket</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex glass rounded-xl p-1 gap-0.5">
            {VIEW_OPTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  'flex items-center gap-1.5 min-h-10 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200',
                  view === id
                    ? 'gradient-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add Dream Item</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                <Input placeholder="Product name *" value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} />
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DREAM_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Product link (optional)" value={form.productLink} onChange={e => setForm(f => ({ ...f, productLink: e.target.value }))} />
                <Input placeholder="Image URL (optional)" value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Target price *" value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} />
                  <Input type="number" placeholder="Already saved" value={form.savedAmount} onChange={e => setForm(f => ({ ...f, savedAmount: e.target.value }))} />
                </div>
                <Input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
                {/* Tags */}
                <div>
                  <div className="flex gap-1.5 flex-wrap mb-1.5">
                    {form.tags.map(t => (
                      <Badge key={t} variant="secondary" className="gap-1 text-xs">
                        {t} <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(t)} />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add tag" value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} className="flex-1" />
                    <Button type="button" variant="outline" size="sm" onClick={addTag}><Tag className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {/* Priority */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.priority} onCheckedChange={v => setForm(f => ({ ...f, priority: !!v }))} />
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">High Priority</span>
                </label>
                <Textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                <Button onClick={handleSubmit} className="w-full gradient-primary text-primary-foreground">Save Dream</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Savings Dialog */}
      <Dialog open={!!savingsDialogId} onOpenChange={v => !v && setSavingsDialogId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Savings</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Amount to add" value={savingsAmount} onChange={e => setSavingsAmount(e.target.value)} />
            <Button onClick={() => savingsDialogId && handleAddSavings(savingsDialogId)} className="w-full gradient-primary text-primary-foreground">
              <PiggyBank className="w-4 h-4 mr-2" /> Add Savings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <Card className="glass"><CardContent className="py-12 text-center text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No dream items yet</p><p className="text-sm">Add your future purchase goals!</p>
        </CardContent></Card>
      ) : (
        <>
          {view === 'card' && <CardView items={items} currency={currency} onUpdate={onUpdate} onDelete={onDelete} getPct={getPct} getCatEmoji={getCatEmoji} onSavings={(id) => { setSavingsDialogId(id); setSavingsAmount(''); }} />}
          {view === 'table' && <TableView items={items} currency={currency} onUpdate={onUpdate} onDelete={onDelete} getPct={getPct} getCatEmoji={getCatEmoji} onSavings={(id) => { setSavingsDialogId(id); setSavingsAmount(''); }} />}
          {view === 'board' && <BoardView items={items} currency={currency} onUpdate={onUpdate} onDelete={onDelete} getPct={getPct} getCatEmoji={getCatEmoji} onSavings={(id) => { setSavingsDialogId(id); setSavingsAmount(''); }} />}
          {view === 'timeline' && <TimelineView items={items} currency={currency} onUpdate={onUpdate} onDelete={onDelete} getPct={getPct} getCatEmoji={getCatEmoji} onSavings={(id) => { setSavingsDialogId(id); setSavingsAmount(''); }} />}
        </>
      )}
    </div>
  );
}

/* ========= SHARED TYPES ========= */
interface ViewProps {
  items: DreamBucketItem[];
  currency: string;
  onUpdate: (id: string, data: Partial<Omit<DreamBucketItem, 'id' | 'createdAt'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  getPct: (item: DreamBucketItem) => number;
  getCatEmoji: (cat?: string) => string;
  onSavings: (id: string) => void;
}

/* ========= CARD VIEW ========= */
function CardView({ items, currency, onDelete, getPct, getCatEmoji, onSavings }: ViewProps) {
  const active = items.filter(i => !i.achieved);
  const achieved = items.filter(i => i.achieved);

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((item, i) => (
            <DreamCard key={item.id} item={item} currency={currency} onDelete={onDelete} getPct={getPct} getCatEmoji={getCatEmoji} onSavings={onSavings} delay={i * 60} />
          ))}
        </div>
      )}
      {achieved.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><PartyPopper className="w-4 h-4" /> Achieved!</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {achieved.map(item => (
              <Card key={item.id} className="glass border-primary/20 opacity-80">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="gradient-primary text-primary-foreground text-[10px]">✓ Achieved</Badge>
                      <h3 className="font-semibold text-sm line-through">{item.productName}</h3>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-7 w-7" onClick={() => onDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{currency}{item.targetPrice.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DreamCard({ item, currency, onDelete, getPct, getCatEmoji, onSavings, delay }: {
  item: DreamBucketItem; currency: string; onDelete: (id: string) => Promise<void>;
  getPct: (i: DreamBucketItem) => number; getCatEmoji: (c?: string) => string;
  onSavings: (id: string) => void; delay: number;
}) {
  const pct = getPct(item);
  return (
    <Card className="glass hover:card-shadow-hover transition-all duration-300 overflow-hidden animate-scale-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      {item.imageUrl && (
        <div className="h-36 overflow-hidden">
          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
        </div>
      )}
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{getCatEmoji(item.category)}</span>
              {item.priority && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
            </div>
            <h3 className="font-semibold text-sm truncate">{item.productName}</h3>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 h-7 w-7" onClick={() => onDelete(item.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>)}
          </div>
        )}
        {item.productLink && (
          <a href={item.productLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> View Product
          </a>
        )}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">{currency}{item.savedAmount.toLocaleString()} / {currency}{item.targetPrice.toLocaleString()}</span>
            <span className="font-bold text-primary">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>
        {item.targetDate && <p className="text-[10px] text-muted-foreground">Target: {new Date(item.targetDate).toLocaleDateString()}</p>}
        <Button size="sm" variant="outline" className="w-full" onClick={() => onSavings(item.id)}>
          <PiggyBank className="w-3.5 h-3.5 mr-1" /> Add Savings
        </Button>
      </CardContent>
    </Card>
  );
}

/* ========= TABLE VIEW ========= */
function TableView({ items, currency, onDelete, getPct, getCatEmoji, onSavings }: ViewProps) {
  return (
    <Card className="glass overflow-hidden animate-fade-in">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">⭐</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Saved</TableHead>
              <TableHead className="w-32">Progress</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => {
              const pct = getPct(item);
              return (
                <TableRow key={item.id} className={cn('transition-all duration-200', item.achieved && 'opacity-60')}
                  style={{ animationDelay: `${i * 30}ms` }}>
                  <TableCell>{item.priority ? <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> : null}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getCatEmoji(item.category)}</span>
                      <span className={cn('font-medium text-sm', item.achieved && 'line-through')}>{item.productName}</span>
                      {item.achieved && <Badge className="gradient-primary text-primary-foreground text-[9px] px-1.5">✓</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{item.category || 'general'}</TableCell>
                  <TableCell className="text-right text-sm font-medium">{currency}{item.targetPrice.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-sm text-primary font-medium">{currency}{item.savedAmount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2 flex-1" />
                      <span className="text-xs font-bold text-primary w-8 text-right">{pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.targetDate ? new Date(item.targetDate).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.tags?.slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-[9px] px-1 py-0">{t}</Badge>)}
                      {(item.tags?.length || 0) > 2 && <span className="text-[9px] text-muted-foreground">+{(item.tags?.length || 0) - 2}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!item.achieved && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSavings(item.id)}>
                          <PiggyBank className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ========= BOARD VIEW (Kanban) ========= */
const BOARD_COLUMNS = [
  { id: 'dreaming', label: '💭 Dreaming', filter: (i: DreamBucketItem) => !i.achieved && (i.savedAmount / i.targetPrice) < 0.01 },
  { id: 'saving', label: '💰 Saving', filter: (i: DreamBucketItem) => !i.achieved && (i.savedAmount / i.targetPrice) >= 0.01 },
  { id: 'achieved', label: '🎉 Achieved', filter: (i: DreamBucketItem) => i.achieved },
];

function BoardView({ items, currency, onDelete, getPct, getCatEmoji, onSavings }: ViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
      {BOARD_COLUMNS.map(col => {
        const colItems = items.filter(col.filter);
        return (
          <div key={col.id} className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <Badge variant="secondary" className="text-[10px]">{colItems.length}</Badge>
            </div>
            <div className="space-y-2 min-h-[120px] glass rounded-xl p-2">
              {colItems.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 opacity-50">No items</p>
              ) : (
                colItems.map((item, i) => {
                  const pct = getPct(item);
                  return (
                    <Card key={item.id} className="bg-background/80 border shadow-sm hover:shadow-md transition-all duration-200 animate-scale-in"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs">{getCatEmoji(item.category)}</span>
                            {item.priority && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                            <span className={cn('text-xs font-semibold truncate', item.achieved && 'line-through')}>{item.productName}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onDelete(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{currency}{item.savedAmount.toLocaleString()}</span>
                          <span>{currency}{item.targetPrice.toLocaleString()}</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        {!item.achieved && (
                          <Button size="sm" variant="ghost" className="w-full h-6 text-[10px]" onClick={() => onSavings(item.id)}>
                            <PiggyBank className="w-3 h-3 mr-1" /> Save
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ========= TIMELINE VIEW ========= */
function TimelineView({ items, currency, onDelete, getPct, getCatEmoji, onSavings }: ViewProps) {
  const sorted = useMemo(() =>
    [...items]
      .filter(i => i.targetDate)
      .sort((a, b) => (a.targetDate || '').localeCompare(b.targetDate || '')),
    [items]
  );
  const noDate = items.filter(i => !i.targetDate);

  return (
    <div className="space-y-4 animate-fade-in">
      {sorted.length > 0 && (
        <div className="relative pl-6">
          {/* Timeline line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border rounded-full" />
          <div className="space-y-4">
            {sorted.map((item, i) => {
              const pct = getPct(item);
              return (
                <div key={item.id} className="relative animate-fade-in" style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}>
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute -left-6 top-3 w-3 h-3 rounded-full border-2 border-background',
                    item.achieved ? 'bg-primary' : 'bg-muted-foreground/40'
                  )} />
                  <Card className="glass hover:card-shadow-hover transition-all duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">
                            {new Date(item.targetDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{getCatEmoji(item.category)}</span>
                            {item.priority && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                            <h3 className={cn('font-semibold text-sm', item.achieved && 'line-through')}>{item.productName}</h3>
                            {item.achieved && <Badge className="gradient-primary text-primary-foreground text-[9px]">✓</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex-1">
                              <Progress value={pct} className="h-2" />
                            </div>
                            <span className="text-xs font-bold text-primary">{pct}%</span>
                            <span className="text-xs text-muted-foreground">{currency}{item.targetPrice.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!item.achieved && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSavings(item.id)}>
                              <PiggyBank className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {noDate.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">No Target Date</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {noDate.map(item => {
              const pct = getPct(item);
              return (
                <Card key={item.id} className="glass">
                  <CardContent className="p-3 flex items-center gap-3">
                    <span>{getCatEmoji(item.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-bold text-primary">{pct}%</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!item.achieved && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSavings(item.id)}>
                          <PiggyBank className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {sorted.length === 0 && noDate.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No items to display</p>
      )}
    </div>
  );
}
