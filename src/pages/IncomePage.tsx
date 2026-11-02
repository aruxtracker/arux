import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { SwipeRow } from '@/components/SwipeRow';
import { Plus, Pencil, Trash2, TrendingUp, Filter, Wallet, Landmark, CreditCard, Banknote } from 'lucide-react';
import { BankAccount, Income, INCOME_CATEGORIES, IncomeCategory, INCOME_CATEGORY_EMOJI } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface IncomePageProps {
  incomes: Income[];
  bankAccounts: BankAccount[];
  currency: string;
  onAdd: (data: Omit<Income, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, data: Partial<Omit<Income, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
  onAddAccount: (data: Omit<BankAccount, 'id' | 'createdAt'>) => void;
  onUpdateAccount: (id: string, data: Partial<Omit<BankAccount, 'id' | 'createdAt'>>) => void;
  onDeleteAccount: (id: string) => void;
}

const EMPTY_FORM = { amount: '', source: '', category: 'Salary' as IncomeCategory, date: format(new Date(), 'yyyy-MM-dd'), notes: '', bankAccountId: '' };
const EMPTY_ACCOUNT = { name: '', bankName: '', accountType: 'Savings', lastFour: '', color: 'hsl(var(--income))' };
const ACCOUNT_COLORS = [
  { label: 'Green', value: 'hsl(var(--income))' },
  { label: 'Blue', value: 'hsl(var(--brand-blue))' },
  { label: 'Teal', value: 'hsl(var(--brand-teal))' },
  { label: 'Orange', value: 'hsl(var(--brand-orange))' },
  { label: 'Pink', value: 'hsl(var(--brand-pink))' },
  { label: 'Purple', value: 'hsl(var(--brand-purple))' },
];
const ACCOUNT_TYPES = ['Savings', 'Current', 'Cash', 'Credit Card', 'Wallet', 'Other'];
const NO_ACCOUNT = '__no_account__';
const ALL_ACCOUNTS = '__all_accounts__';

const formatMoney = (amount: number, currency: string) => `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function accountLabel(account?: BankAccount) {
  if (!account) return 'Unassigned';
  const title = account.bankName ? `${account.bankName} · ${account.name}` : account.name;
  return account.lastFour ? `${title} ···· ${account.lastFour}` : title;
}

export function IncomePage({ incomes, bankAccounts, currency, onAdd, onUpdate, onDelete, onAddAccount, onUpdateAccount, onDeleteAccount }: IncomePageProps) {
  const [showForm, setShowForm] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);
  const [filterCategory, setFilterCategory] = useState<IncomeCategory | 'All'>('All');
  const [filterAccount, setFilterAccount] = useState(ALL_ACCOUNTS);

  const categoryFiltered = useMemo(() => filterCategory === 'All' ? incomes : incomes.filter(i => i.category === filterCategory), [filterCategory, incomes]);
  const filtered = useMemo(() => {
    if (filterAccount === ALL_ACCOUNTS) return categoryFiltered;
    if (filterAccount === NO_ACCOUNT) return categoryFiltered.filter(i => !i.bankAccountId);
    return categoryFiltered.filter(i => i.bankAccountId === filterAccount);
  }, [categoryFiltered, filterAccount]);
  const totalIncome = filtered.reduce((sum, income) => sum + income.amount, 0);
  const accountTotals = useMemo(() => bankAccounts.map(account => ({
    account,
    total: incomes.filter(income => income.bankAccountId === account.id).reduce((sum, income) => sum + income.amount, 0),
  })), [bankAccounts, incomes]);
  const unassignedTotal = incomes.filter(income => !income.bankAccountId).reduce((sum, income) => sum + income.amount, 0);

  const handleOpen = (income?: Income) => {
    if (income) {
      setEditingId(income.id);
      setForm({ amount: String(income.amount), source: income.source, category: income.category || 'Other', date: income.date, notes: income.notes || '', bankAccountId: income.bankAccountId || '' });
    } else {
      setEditingId(null);
      setForm({ ...EMPTY_FORM, date: format(new Date(), 'yyyy-MM-dd') });
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.amount || !form.source || !form.date || !Number.isFinite(Number(form.amount))) return;
    const data = { amount: Number(form.amount), source: form.source.trim(), category: form.category, date: form.date, notes: form.notes, bankAccountId: form.bankAccountId && form.bankAccountId !== NO_ACCOUNT ? form.bankAccountId : undefined };
    if (editingId) onUpdate(editingId, data);
    else onAdd(data);
    setShowForm(false);
  };

  const openAccountForm = (account?: BankAccount) => {
    if (account) {
      setEditingAccountId(account.id);
      setAccountForm({ name: account.name, bankName: account.bankName || '', accountType: account.accountType, lastFour: account.lastFour || '', color: account.color });
    } else {
      setEditingAccountId(null);
      setAccountForm(EMPTY_ACCOUNT);
    }
    setAccountFormOpen(true);
  };

  const saveAccount = () => {
    if (!accountForm.name.trim()) return;
    const data = { name: accountForm.name.trim(), bankName: accountForm.bankName.trim() || undefined, accountType: accountForm.accountType, lastFour: accountForm.lastFour.trim() || undefined, color: accountForm.color };
    if (editingAccountId) onUpdateAccount(editingAccountId, data);
    else onAddAccount(data);
    setAccountFormOpen(false);
  };

  const accountFor = (id?: string) => bankAccounts.find(account => account.id === id);

  return (
    <div className="flex flex-col gap-4 pb-2 min-w-0">
      <div className="flex items-center justify-between px-4 md:px-0 pt-2 gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Income</h1>
          <p className="text-sm text-muted-foreground">Total: <span className="income-text font-semibold">{formatMoney(totalIncome, currency)}</span></p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAccountsOpen(true)} className="gap-1.5 rounded-xl">
            <Wallet className="h-4 w-4" /><span>Accounts</span>
          </Button>
          <Button onClick={() => handleOpen()} size="sm" className="gap-1.5 rounded-xl gradient-primary border-0 text-white hover:opacity-90">
            <Plus className="w-4 h-4" /><span>Add</span>
          </Button>
        </div>
      </div>

      {(bankAccounts.length > 0 || unassignedTotal > 0) && (
        <div className="flex gap-2 overflow-x-auto px-4 md:px-0 pb-1 touch-pan-x" aria-label="Income totals by account">
          {accountTotals.map(({ account, total }) => (
            <button key={account.id} onClick={() => setFilterAccount(account.id)} className={`min-w-[158px] shrink-0 rounded-2xl border bg-card/70 px-3 py-2.5 text-left transition-colors ${filterAccount === account.id ? 'ring-2 ring-primary/40' : ''}`} style={{ borderColor: account.color }}>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: account.color }} />{account.name}</span>
              <span className="mt-1 block truncate text-sm font-bold">{formatMoney(total, currency)}</span>
            </button>
          ))}
          {unassignedTotal > 0 && (
            <button onClick={() => setFilterAccount(NO_ACCOUNT)} className={`min-w-[145px] shrink-0 rounded-2xl border border-border bg-card/70 px-3 py-2.5 text-left ${filterAccount === NO_ACCOUNT ? 'ring-2 ring-primary/40' : ''}`}>
              <span className="text-xs text-muted-foreground">Unassigned</span>
              <span className="mt-1 block text-sm font-bold">{formatMoney(unassignedTotal, currency)}</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 px-4 md:grid-cols-2 md:px-0">
        <Select value={filterCategory} onValueChange={value => setFilterCategory(value as IncomeCategory | 'All')}>
          <SelectTrigger className="w-full rounded-xl glass"><Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" /><SelectValue placeholder="Filter by category" /></SelectTrigger>
          <SelectContent><SelectItem value="All">All Categories</SelectItem>{INCOME_CATEGORIES.map(category => <SelectItem key={category} value={category}>{INCOME_CATEGORY_EMOJI[category]} {category}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-full rounded-xl glass"><Wallet className="mr-2 h-3.5 w-3.5 text-muted-foreground" /><SelectValue placeholder="Filter by account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ACCOUNTS}>All Accounts</SelectItem>
            <SelectItem value={NO_ACCOUNT}>Unassigned</SelectItem>
            {bankAccounts.map(account => <SelectItem key={account.id} value={account.id}>{accountLabel(account)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-4 md:mx-0 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl income-bg flex items-center justify-center mb-4"><TrendingUp className="w-8 h-8 income-text" /></div>
          <p className="text-muted-foreground text-sm">{incomes.length === 0 ? 'No income entries yet' : 'No matching income entries'}</p>
          <p className="text-muted-foreground text-xs mt-1">Tap “Add” to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 md:px-0">
          {filtered.map((income, index) => {
            const account = accountFor(income.bankAccountId);
            return <SwipeRow key={income.id} onEdit={() => handleOpen(income)} onDelete={() => setDeleteId(income.id)} radiusClass="rounded-2xl" className="card-enter" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
              <div className="glass rounded-2xl p-4 flex items-center gap-3 card-press">
                <div className="w-10 h-10 rounded-xl income-bg flex items-center justify-center flex-shrink-0 text-lg">{INCOME_CATEGORY_EMOJI[income.category] || '💰'}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{income.source}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{income.category}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(income.date), 'd MMM yyyy')}</span>
                  </div>
                  <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground">
                    {account?.accountType === 'Cash' ? <Banknote className="h-3 w-3 shrink-0" /> : account?.accountType === 'Credit Card' ? <CreditCard className="h-3 w-3 shrink-0" /> : <Landmark className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{accountLabel(account)}</span>
                  </span>
                  {income.notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{income.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="text-sm font-bold income-text">{formatMoney(income.amount, currency)}</p>
                  <div className="hidden md:flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpen(income)} aria-label="Edit income" className="tap-target rounded-xl"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(income.id)} aria-label="Delete income" className="tap-target rounded-xl hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </div>
            </SwipeRow>;
          })}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl glass max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Income' : 'Add Income'}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5"><Label>Amount *</Label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{currency}</span><Input type="number" placeholder="0.00" step="0.01" min="0" className="pl-8" value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} /></div></div>
            <div className="flex flex-col gap-1.5"><Label>Source *</Label><Input placeholder="e.g. Salary, Freelance" value={form.source} onChange={event => setForm(current => ({ ...current, source: event.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Category *</Label><Select value={form.category} onValueChange={value => setForm(current => ({ ...current, category: value as IncomeCategory }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INCOME_CATEGORIES.map(category => <SelectItem key={category} value={category}>{INCOME_CATEGORY_EMOJI[category]} {category}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5"><Label>Bank account</Label><Select value={form.bankAccountId || NO_ACCOUNT} onValueChange={value => setForm(current => ({ ...current, bankAccountId: value === NO_ACCOUNT ? '' : value }))}><SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger><SelectContent><SelectItem value={NO_ACCOUNT}>No account</SelectItem>{bankAccounts.map(account => <SelectItem key={account.id} value={account.id}>{accountLabel(account)}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5"><Label>Date *</Label><Input type="date" value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Notes</Label><Textarea placeholder="Optional notes..." value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={handleSave} disabled={!form.amount || !form.source.trim() || !form.date || Number(form.amount) <= 0} className="gradient-primary border-0 text-white">{editingId ? 'Update' : 'Add Income'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountsOpen} onOpenChange={setAccountsOpen}>
        <DialogContent className="max-w-md mx-auto rounded-2xl glass max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Bank accounts & wallets</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {bankAccounts.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No accounts yet. Add a bank account, cash wallet, or card.</p> : bankAccounts.map(account => (
              <div key={account.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-3">
                <span className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: `color-mix(in srgb, ${account.color} 16%, transparent)`, color: account.color }}><Wallet className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{account.name}</p><p className="truncate text-xs text-muted-foreground">{[account.bankName, account.accountType, account.lastFour ? `••${account.lastFour}` : ''].filter(Boolean).join(' · ')}</p></div>
                <Button variant="ghost" size="icon" aria-label={`Edit ${account.name}`} onClick={() => openAccountForm(account)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${account.name}`} onClick={() => setDeleteAccountId(account.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
          <DialogFooter><Button onClick={() => openAccountForm()} className="w-full gap-2 gradient-primary border-0 text-white"><Plus className="h-4 w-4" /> Add account</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountFormOpen} onOpenChange={setAccountFormOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl glass">
          <DialogHeader><DialogTitle>{editingAccountId ? 'Edit account' : 'Add account'}</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5"><Label>Account name *</Label><Input placeholder="e.g. Daily expenses" value={accountForm.name} onChange={event => setAccountForm(current => ({ ...current, name: event.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Bank or provider</Label><Input placeholder="e.g. HDFC, SBI, Paytm" value={accountForm.bankName} onChange={event => setAccountForm(current => ({ ...current, bankName: event.target.value }))} /></div>
            <div className="flex flex-col gap-1.5"><Label>Account type</Label><Select value={accountForm.accountType} onValueChange={value => setAccountForm(current => ({ ...current, accountType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCOUNT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex flex-col gap-1.5"><Label>Last four digits</Label><Input inputMode="numeric" maxLength={4} placeholder="Optional" value={accountForm.lastFour} onChange={event => setAccountForm(current => ({ ...current, lastFour: event.target.value.replace(/\D/g, '').slice(0, 4) }))} /></div>
            <div className="flex flex-col gap-2"><Label>Account color</Label><div className="flex items-center gap-3">{ACCOUNT_COLORS.map(color => <button key={color.label} type="button" aria-label={`${color.label} account color`} aria-pressed={accountForm.color === color.value} onClick={() => setAccountForm(current => ({ ...current, color: color.value }))} className={`h-8 w-8 rounded-full border-2 ${accountForm.color === color.value ? 'border-foreground ring-2 ring-primary/30' : 'border-transparent'}`} style={{ backgroundColor: color.value }} />)}</div></div>
          </div>
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setAccountFormOpen(false)}>Cancel</Button><Button onClick={saveAccount} disabled={!accountForm.name.trim()} className="gradient-primary border-0 text-white">{editingAccountId ? 'Save changes' : 'Add account'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}><AlertDialogContent className="max-w-sm mx-auto"><AlertDialogHeader><AlertDialogTitle>Delete Income?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (deleteId) { onDelete(deleteId); setDeleteId(null); } }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!deleteAccountId} onOpenChange={open => !open && setDeleteAccountId(null)}><AlertDialogContent className="max-w-sm mx-auto"><AlertDialogHeader><AlertDialogTitle>Remove account?</AlertDialogTitle><AlertDialogDescription>Income entries linked to it will be kept and marked as unassigned.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (deleteAccountId) { onDeleteAccount(deleteAccountId); setDeleteAccountId(null); } }}>Remove account</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}