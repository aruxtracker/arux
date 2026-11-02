import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Income, Expense, Meeting, AppSettings, Habit, HabitLog, Reminder, Idea, MoodEntry, DreamBucketItem, Vehicle, VehicleService, VehicleExpense, Task, TaskList, GroomingEntry, Budget, Subscription, Subtask, LentBorrowEntry, BankAccount } from '@/types';
import { SavingsGoal } from '@/pages/SavingsGoalsPage';
import {
  loadCache, saveCache, isOnline, queueOp, flushQueue, pendingSyncCount, localId,
  setCacheScope, clearCache,
} from '@/lib/offline';
import { toast } from 'sonner';

const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  currency: '₹',
};

export function useAppData() {
  const { user } = useAuth();
  // Offline-first: hydrate instantly from the local cache, then refresh from the server.
  const [incomes, setIncomes] = useState<Income[]>(() => loadCache<Income>('incomes') || []);
  const [expenses, setExpenses] = useState<Expense[]>(() => loadCache<Expense>('expenses') || []);
  const [meetings, setMeetings] = useState<Meeting[]>(() => loadCache<Meeting>('meetings') || []);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [tasks, setTasks] = useState<Task[]>(() => loadCache<Task>('tasks') || []);
  const [taskLists, setTaskLists] = useState<TaskList[]>(() => loadCache<TaskList>('taskLists') || []);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>(() => loadCache<Reminder>('reminders') || []);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [dreamBucket, setDreamBucket] = useState<DreamBucketItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleServices, setVehicleServices] = useState<VehicleService[]>([]);
  const [vehicleExpenses, setVehicleExpenses] = useState<VehicleExpense[]>([]);
  const [groomingEntries, setGroomingEntries] = useState<GroomingEntry[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(() => loadCache<Budget>('budgets') || []);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => loadCache<Subscription>('subscriptions') || []);
  const [subtasks, setSubtasks] = useState<Subtask[]>(() => loadCache<Subtask>('subtasks') || []);
  const [lentBorrowEntries, setLentBorrowEntries] = useState<LentBorrowEntry[]>(() => loadCache<LentBorrowEntry>('lentBorrowEntries') || []);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => loadCache<BankAccount>('bankAccounts') || []);
  const [offline, setOffline] = useState(() => !isOnline());
  const [pendingSync, setPendingSync] = useState(() => pendingSyncCount());
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('mylife_settings');
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });
  // If we already have cached rows there is nothing to block the UI on.
  const [loading, setLoading] = useState(() => (loadCache<Income>('incomes') || []).length === 0);

  const bumpPending = () => setPendingSync(pendingSyncCount());

  // Caches are per-account: when the signed-in user changes (or signs out) drop
  // every locally cached row so stale balances can never linger on the device.
  useEffect(() => {
    const changed = setCacheScope(user?.id);
    if (changed) {
      setIncomes([]); setExpenses([]); setMeetings([]); setTasks([]); setTaskLists([]);
      setSubtasks([]); setReminders([]); setBudgets([]); setSubscriptions([]); setLentBorrowEntries([]); setBankAccounts([]);
    }
  }, [user?.id]);

  /** Optimistic offline insert: keep it locally with a temp id and queue the write. */
  const offlineInsert = <T,>(
    table: string,
    payload: Record<string, unknown>,
    build: (id: string) => T,
    apply: (row: T) => void,
  ) => {
    const id = localId();
    queueOp({ table, action: 'insert', payload, rowId: id });
    apply(build(id));
    bumpPending();
    toast.info('Saved offline — will sync when you are back online');
  };

  const offlineWrite = (
    table: string,
    action: 'update' | 'delete',
    rowId: string,
    payload?: Record<string, unknown>,
  ) => {
    queueOp({ table, action, rowId, payload });
    bumpPending();
    toast.info('Saved offline — will sync when you are back online');
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    if (!isOnline()) {
      // Offline: keep whatever the cache gave us.
      setOffline(true);
      setLoading(false);
      return;
    }
    setLoading(prev => prev);
    try {
      const [incRes, expRes, meetRes, goalRes, taskRes, listRes, habRes, logRes, remRes, ideaRes, moodRes, dreamRes, vehRes, vsRes, veRes, groomRes, budRes, subRes, subtaskRes, lentBorrowRes, bankRes] = await Promise.all([
        supabase.from('incomes').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('meetings').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('savings_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        // Tasks: fetch all accessible (own + shared via RLS)
        supabase.from('tasks').select('*').order('position', { ascending: true }).order('created_at', { ascending: false }),
        supabase.from('task_lists').select('*').order('position', { ascending: true }),
        supabase.from('habits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('habit_logs').select('*').eq('user_id', user.id),
        supabase.from('reminders').select('*').eq('user_id', user.id).order('date', { ascending: true }),
        supabase.from('ideas').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('mood_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('dream_bucket').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('vehicles').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('vehicle_services').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
        supabase.from('vehicle_expenses').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        // Cast — grooming_entries types not yet regenerated
        (supabase.from as any)('grooming_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('budgets').select('*').eq('user_id', user.id).order('category', { ascending: true }),
        supabase.from('subscriptions').select('*').eq('user_id', user.id).order('next_renewal_date', { ascending: true, nullsFirst: false }),
        supabase.from('subtasks').select('*,task:tasks(list_id)').order('position', { ascending: true }),
        supabase.from('lent_borrow_entries').select('*').eq('user_id', user.id).order('lent_or_borrowed_date', { ascending: false }),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      ]);

      if (incRes.data) { const rows = incRes.data.map(mapIncome); setIncomes(rows); saveCache('incomes', rows); }
      if (expRes.data) { const rows = expRes.data.map(mapExpense); setExpenses(rows); saveCache('expenses', rows); }
      if (meetRes.data) { const rows = meetRes.data.map(mapMeeting); setMeetings(rows); saveCache('meetings', rows); }
      if (goalRes.data) setSavingsGoals(goalRes.data.map(mapGoal));
      if (taskRes.data) { const rows = taskRes.data.map(mapTask); setTasks(rows); saveCache('tasks', rows); }
      if (listRes.data) {
        const lists = listRes.data.map(mapTaskList);
        // Auto-create Inbox if user has none
        if (lists.length === 0) {
          const { data: inbox } = await supabase.from('task_lists').insert({
            owner_id: user.id, name: 'Inbox', color: '#a78bfa', position: 0,
          }).select().single();
          if (inbox) lists.push(mapTaskList(inbox));
        }
        setTaskLists(lists);
        saveCache('taskLists', lists);
      }
      if (habRes.data) setHabits(habRes.data.map(mapHabit));
      if (logRes.data) setHabitLogs(logRes.data.map(mapHabitLog));
      if (remRes.data) { const rows = remRes.data.map(mapReminder); setReminders(rows); saveCache('reminders', rows); }
      if (ideaRes.data) setIdeas(ideaRes.data.map(mapIdea));
      if (moodRes.data) setMoodEntries(moodRes.data.map(mapMoodEntry));
      if (dreamRes.data) setDreamBucket(dreamRes.data.map(mapDreamItem));
      if (vehRes.data) setVehicles(vehRes.data.map(mapVehicle));
      if (vsRes.data) setVehicleServices(vsRes.data.map(mapVehicleService));
      if (veRes.data) setVehicleExpenses(veRes.data.map(mapVehicleExpense));
      if ((groomRes as any)?.data) setGroomingEntries((groomRes as any).data.map(mapGroomingEntry));
      if ((budRes as any)?.data) { const rows = (budRes as any).data.map(mapBudget); setBudgets(rows); saveCache('budgets', rows); }
      if ((subRes as any)?.data) { const rows = (subRes as any).data.map(mapSubscription); setSubscriptions(rows); saveCache('subscriptions', rows); }
      if ((subtaskRes as any)?.data) { const rows = (subtaskRes as any).data.map(mapSubtask); setSubtasks(rows); saveCache('subtasks', rows); }
      if ((lentBorrowRes as any)?.data) { const rows = (lentBorrowRes as any).data.map(mapLentBorrow); setLentBorrowEntries(rows); saveCache('lentBorrowEntries', rows); }
      if (bankRes.data) { const rows = bankRes.data.map(mapBankAccount); setBankAccounts(rows); saveCache('bankAccounts', rows); }
      setOffline(false);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Connection watcher: flush queued offline writes, then refresh.
  useEffect(() => {
    const handleOnline = async () => {
      setOffline(false);
      if (pendingSyncCount() > 0) {
        const { synced, failed } = await flushQueue(supabase as any);
        bumpPending();
        if (synced > 0) toast.success(`Synced ${synced} offline change${synced > 1 ? 's' : ''}`);
        if (failed > 0) toast.error(`${failed} change${failed > 1 ? 's' : ''} could not sync`);
      }
      fetchData();
    };
    const handleOffline = () => {
      setOffline(true);
      toast.info('You are offline — changes are saved on this device');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Also flush on load if we came back with a pending queue.
    if (isOnline() && pendingSyncCount() > 0) handleOnline();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchData]);



  // Realtime: keep tasks & lists in sync across devices/teammates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const t = mapTask(payload.new);
          setTasks(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const t = mapTask(payload.new);
          setTasks(prev => prev.map(x => x.id === t.id ? t : x));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setTasks(prev => prev.filter(x => x.id !== (payload.old as any).id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_lists' }, (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const l = mapTaskList(payload.new);
          setTaskLists(prev => prev.some(x => x.id === l.id) ? prev : [...prev, l]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const l = mapTaskList(payload.new);
          setTaskLists(prev => prev.map(x => x.id === l.id ? l : x));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setTaskLists(prev => prev.filter(x => x.id !== (payload.old as any).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    localStorage.setItem('mylife_settings', JSON.stringify(settings));
  }, [settings]);

  // Income CRUD
  const addIncome = async (data: Omit<Income, 'id' | 'createdAt'>) => {
    if (!user) return;
    const payload = {
      user_id: user.id, amount: data.amount, source: data.source, category: data.category || 'Other', date: data.date,
      bank_account_id: data.bankAccountId || null, notes: data.notes || null,
    };
    if (!isOnline()) {
      offlineInsert<Income>('incomes', payload,
        id => ({ ...data, id, createdAt: new Date().toISOString() }),
        row => setIncomes(prev => [row, ...prev]));
      return;
    }
    const { data: row, error } = await supabase.from('incomes').insert(payload).select().single();
    if (error) { toast.error('Failed to add income'); return; }
    if (row) setIncomes(prev => [mapIncome(row), ...prev]);
  };
  const updateIncome = async (id: string, data: Partial<Omit<Income, 'id' | 'createdAt'>>) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...i, ...data } : i));
    const update: Record<string, unknown> = {};
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.source !== undefined) update.source = data.source;
    if (data.category !== undefined) update.category = data.category;
    if (data.date !== undefined) update.date = data.date;
    if (data.bankAccountId !== undefined) update.bank_account_id = data.bankAccountId || null;
    if (data.notes !== undefined) update.notes = data.notes || null;
    if (!isOnline()) { offlineWrite('incomes', 'update', id, update); return; }
    const { error } = await supabase.from('incomes').update(update).eq('id', id);
    if (error) toast.error('Failed to update');
  };
  const deleteIncome = async (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
    if (!isOnline()) { offlineWrite('incomes', 'delete', id); return; }
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
  };

  // Lent & Borrow CRUD
  const addLentBorrow = async (data: Omit<LentBorrowEntry, 'id' | 'createdAt'>) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      direction: data.direction,
      person_name: data.personName,
      amount: data.amount,
      settled_amount: data.settledAmount,
      lent_or_borrowed_date: data.date,
      due_date: data.dueDate || null,
      notes: data.notes || null,
      settled: data.settled,
    };
    const { data: row, error } = await supabase.from('lent_borrow_entries').insert(payload).select().single();
    if (error) { toast.error('Failed to add entry'); return; }
    if (row) setLentBorrowEntries(prev => [mapLentBorrow(row), ...prev]);
  };
  const updateLentBorrow = async (id: string, data: Partial<Omit<LentBorrowEntry, 'id' | 'createdAt'>>) => {
    const update: Record<string, unknown> = {};
    if (data.direction !== undefined) update.direction = data.direction;
    if (data.personName !== undefined) update.person_name = data.personName;
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.settledAmount !== undefined) update.settled_amount = data.settledAmount;
    if (data.date !== undefined) update.lent_or_borrowed_date = data.date;
    if (data.dueDate !== undefined) update.due_date = data.dueDate || null;
    if (data.notes !== undefined) update.notes = data.notes || null;
    if (data.settled !== undefined) update.settled = data.settled;
    const { error } = await supabase.from('lent_borrow_entries').update(update).eq('id', id);
    if (error) { toast.error('Failed to update entry'); return; }
    setLentBorrowEntries(prev => prev.map(entry => entry.id === id ? { ...entry, ...data } : entry));
  };
  const deleteLentBorrow = async (id: string) => {
    const { error } = await supabase.from('lent_borrow_entries').delete().eq('id', id);
    if (error) { toast.error('Failed to delete entry'); return; }
    setLentBorrowEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const addBankAccount = async (data: Omit<BankAccount, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('bank_accounts').insert({
      user_id: user.id, name: data.name, bank_name: data.bankName || null,
      account_type: data.accountType, last_four: data.lastFour || null, color: data.color,
    }).select().single();
    if (error) { toast.error('Could not add account'); return; }
    if (row) setBankAccounts(prev => { const next = [...prev, mapBankAccount(row)]; saveCache('bankAccounts', next); return next; });
  };
  const updateBankAccount = async (id: string, data: Partial<Omit<BankAccount, 'id' | 'createdAt'>>) => {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.bankName !== undefined) update.bank_name = data.bankName || null;
    if (data.accountType !== undefined) update.account_type = data.accountType;
    if (data.lastFour !== undefined) update.last_four = data.lastFour || null;
    if (data.color !== undefined) update.color = data.color;
    const { error } = await supabase.from('bank_accounts').update(update).eq('id', id);
    if (error) { toast.error('Could not update account'); return; }
    setBankAccounts(prev => { const next = prev.map(account => account.id === id ? { ...account, ...data } : account); saveCache('bankAccounts', next); return next; });
  };
  const deleteBankAccount = async (id: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
    if (error) { toast.error('Could not delete account'); return; }
    setBankAccounts(prev => { const next = prev.filter(account => account.id !== id); saveCache('bankAccounts', next); return next; });
    setIncomes(prev => prev.map(income => income.bankAccountId === id ? { ...income, bankAccountId: undefined } : income));
    toast.success('Account removed; income entries were kept');
  };

  // Expense CRUD
  const addExpense = async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!user) return;
    const payload = {
      user_id: user.id, amount: data.amount, category: data.category, date: data.date, notes: data.notes || null,
    };
    if (!isOnline()) {
      offlineInsert<Expense>('expenses', payload,
        id => ({ ...data, id, createdAt: new Date().toISOString() }),
        row => setExpenses(prev => [row, ...prev]));
      return;
    }
    const { data: row, error } = await supabase.from('expenses').insert(payload).select().single();
    if (error) { toast.error('Failed to add expense'); return; }
    if (row) setExpenses(prev => [mapExpense(row), ...prev]);
  };
  const updateExpense = async (id: string, data: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    if (!isOnline()) { offlineWrite('expenses', 'update', id, data as any); return; }
    const { error } = await supabase.from('expenses').update(data).eq('id', id);
    if (error) toast.error('Failed to update');
  };
  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    if (!isOnline()) { offlineWrite('expenses', 'delete', id); return; }
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
  };

  // Meeting CRUD
  const addMeeting = async (data: Omit<Meeting, 'id' | 'createdAt'>) => {
    if (!user) return;
    const payload = {
      user_id: user.id, title: data.title, date: data.date, time: data.time, notes: data.notes || null,
    };
    if (!isOnline()) {
      offlineInsert<Meeting>('meetings', payload,
        id => ({ ...data, id, createdAt: new Date().toISOString() }),
        row => setMeetings(prev => [row, ...prev]));
      return;
    }
    const { data: row, error } = await supabase.from('meetings').insert(payload).select().single();
    if (error) { toast.error('Failed to add meeting'); return; }
    if (row) setMeetings(prev => [mapMeeting(row), ...prev]);
  };
  const updateMeeting = async (id: string, data: Partial<Omit<Meeting, 'id' | 'createdAt'>>) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    if (!isOnline()) { offlineWrite('meetings', 'update', id, data as any); return; }
    const { error } = await supabase.from('meetings').update(data).eq('id', id);
    if (error) toast.error('Failed to update');
  };
  const deleteMeeting = async (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
    if (!isOnline()) { offlineWrite('meetings', 'delete', id); return; }
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
  };

  const updateSettings = (data: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...data }));
  };

  // Savings Goals CRUD
  const addSavingsGoal = async (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('savings_goals').insert({
      user_id: user.id, title: data.title, target_amount: data.targetAmount,
      saved_amount: data.savedAmount, deadline: data.deadline || null, notes: data.notes || null,
    }).select().single();
    if (error) { toast.error('Failed to add goal'); return; }
    if (row) setSavingsGoals(prev => [mapGoal(row), ...prev]);
  };
  const updateSavingsGoal = async (id: string, data: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.targetAmount !== undefined) update.target_amount = data.targetAmount;
    if (data.savedAmount !== undefined) update.saved_amount = data.savedAmount;
    if (data.deadline !== undefined) update.deadline = data.deadline || null;
    if (data.notes !== undefined) update.notes = data.notes || null;
    const { error } = await supabase.from('savings_goals').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
  };
  const deleteSavingsGoal = async (id: string) => {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
  };

  // Task List CRUD
  const addTaskList = async (data: { name: string; color?: string }) => {
    if (!user) return;
    const maxPos = taskLists.reduce((m, l) => Math.max(m, l.position), -1);
    const { data: row, error } = await supabase.from('task_lists').insert({
      owner_id: user.id, name: data.name, color: data.color || '#a78bfa', position: maxPos + 1,
    }).select().single();
    if (error) { toast.error('Failed to create list'); return; }
    if (row) setTaskLists(prev => [...prev, mapTaskList(row)]);
  };
  const updateTaskList = async (id: string, data: Partial<{ name: string; color: string; position: number }>) => {
    const { error } = await supabase.from('task_lists').update(data).eq('id', id);
    if (error) { toast.error('Failed to update list'); return; }
    setTaskLists(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
  };
  const deleteTaskList = async (id: string) => {
    const { error } = await supabase.from('task_lists').delete().eq('id', id);
    if (error) { toast.error('Failed to delete list'); return; }
    setTaskLists(prev => prev.filter(l => l.id !== id));
    setTasks(prev => prev.filter(t => t.listId !== id));
  };

  // Task CRUD (Google-style: due_date optional, list-based)
  const addTask = async (data: Partial<Omit<Task, 'id' | 'createdAt'>> & { title: string; listId?: string }) => {
    if (!user) return;
    const listId = data.listId || taskLists[0]?.id || null;
    const maxPos = tasks.filter(t => t.listId === listId).reduce((m, t) => Math.max(m, t.position), -1);
    const payload = {
      user_id: user.id,
      title: data.title,
      completed: data.completed ?? false,
      starred: data.starred ?? false,
      position: maxPos + 1,
      priority: data.priority ?? 0,
      tags: data.tags || [],
      list_id: listId,
      due_date: data.dueDate || null,
      meeting_id: data.meetingId || null,
      notes: data.notes || null,
      recurring: data.recurring || null,
    };
    if (!isOnline()) {
      offlineInsert<Task>('tasks', payload,
        id => ({
          id, title: data.title, completed: data.completed ?? false, starred: data.starred ?? false,
          position: maxPos + 1, priority: data.priority ?? 0, tags: data.tags || [],
          listId: listId || undefined, dueDate: data.dueDate, meetingId: data.meetingId,
          notes: data.notes || '', recurring: data.recurring || null,
          createdAt: new Date().toISOString(),
        }),
        row => setTasks(prev => [...prev, row]));
      return;
    }
    const { data: row, error } = await supabase.from('tasks').insert(payload).select().single();
    if (error) { toast.error('Failed to add task'); return; }
    if (row) setTasks(prev => [...prev, mapTask(row)]);
  };
  const updateTask = async (id: string, data: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.completed !== undefined) {
      update.completed = data.completed;
      update.completed_by = data.completed ? user?.id : null;
    }
    if (data.starred !== undefined) update.starred = data.starred;
    if (data.position !== undefined) update.position = data.position;
    if (data.priority !== undefined) update.priority = data.priority;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.listId !== undefined) update.list_id = data.listId || null;
    if (data.dueDate !== undefined) update.due_date = data.dueDate || null;
    if (data.meetingId !== undefined) update.meeting_id = data.meetingId || null;
    if (data.notes !== undefined) update.notes = data.notes || null;
    if (data.recurring !== undefined) update.recurring = data.recurring || null;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    if (!isOnline()) { offlineWrite('tasks', 'update', id, update); return; }
    const { error } = await supabase.from('tasks').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }


    // Auto-create next recurring task when a recurring task is completed
    if (data.completed === true) {
      const task = tasks.find(t => t.id === id);
      if (task?.recurring) {
        const nextDate = new Date();
        if (task.recurring === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (task.recurring === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (task.recurring === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        const { data: newRow } = await supabase.from('tasks').insert({
          user_id: user.id, title: task.title, completed: false, starred: task.starred,
          position: task.position, priority: task.priority, list_id: task.listId || null,
          due_date: nextDate.toISOString().slice(0, 10), meeting_id: task.meetingId || null,
          notes: task.notes || null, recurring: task.recurring,
        }).select().single();
        if (newRow) setTasks(prev => [...prev, mapTask(newRow)]);
      }
    }
  };
  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSubtasks(prev => prev.filter(s => s.taskId !== id));
    if (!isOnline()) { offlineWrite('tasks', 'delete', id); return; }
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
  };


  // Subtask CRUD
  const addSubtask = async (taskId: string, title: string) => {
    const maxPos = subtasks.filter(s => s.taskId === taskId).reduce((m, s) => Math.max(m, s.position), -1);
    const { data: row, error } = await supabase.from('subtasks').insert({
      task_id: taskId, title, completed: false, position: maxPos + 1,
    }).select().single();
    if (error) { toast.error('Failed to add subtask'); return; }
    if (row) setSubtasks(prev => [...prev, mapSubtask(row)]);
  };
  const updateSubtask = async (id: string, data: Partial<Pick<Subtask, 'title' | 'completed' | 'position'>>) => {
    const { error } = await supabase.from('subtasks').update(data).eq('id', id);
    if (error) { toast.error('Failed to update subtask'); return; }
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };
  const deleteSubtask = async (id: string) => {
    const { error } = await supabase.from('subtasks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete subtask'); return; }
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  // Budget CRUD
  const addBudget = async (category: string, monthlyLimit: number) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('budgets').insert({
      user_id: user.id, category, monthly_limit: monthlyLimit,
    }).select().single();
    if (error) { toast.error('Failed to add budget'); return; }
    if (row) setBudgets(prev => [...prev, mapBudget(row)]);
  };
  const updateBudget = async (id: string, data: Partial<Pick<Budget, 'category' | 'monthlyLimit'>>) => {
    const update: any = {};
    if (data.category !== undefined) update.category = data.category;
    if (data.monthlyLimit !== undefined) update.monthly_limit = data.monthlyLimit;
    const { error } = await supabase.from('budgets').update(update).eq('id', id);
    if (error) { toast.error('Failed to update budget'); return; }
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
  };
  const deleteBudget = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) { toast.error('Failed to delete budget'); return; }
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  // Subscription CRUD
  const addSubscription = async (data: Omit<Subscription, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('subscriptions').insert({
      user_id: user.id, name: data.name, amount: data.amount, billing_cycle: data.billingCycle,
      next_renewal_date: data.nextRenewalDate || null, category: data.category || null,
      notes: data.notes || null, active: data.active ?? true,
    }).select().single();
    if (error) { toast.error('Failed to add subscription'); return; }
    if (row) setSubscriptions(prev => [mapSubscription(row), ...prev]);
  };
  const updateSubscription = async (id: string, data: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => {
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.amount !== undefined) update.amount = data.amount;
    if (data.billingCycle !== undefined) update.billing_cycle = data.billingCycle;
    if (data.nextRenewalDate !== undefined) update.next_renewal_date = data.nextRenewalDate || null;
    if (data.category !== undefined) update.category = data.category || null;
    if (data.notes !== undefined) update.notes = data.notes || null;
    if (data.active !== undefined) update.active = data.active;
    const { error } = await supabase.from('subscriptions').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };
  const deleteSubscription = async (id: string) => {
    const { error } = await supabase.from('subscriptions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setSubscriptions(prev => prev.filter(s => s.id !== id));
  };


  // Habit CRUD
  const addHabit = async (data: Omit<Habit, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('habits').insert({
      user_id: user.id, title: data.title, emoji: data.emoji,
    }).select().single();
    if (error) { toast.error('Failed to add habit'); return; }
    if (row) setHabits(prev => [mapHabit(row), ...prev]);
  };
  const deleteHabit = async (id: string) => {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setHabits(prev => prev.filter(h => h.id !== id));
    setHabitLogs(prev => prev.filter(l => l.habitId !== id));
  };
  const toggleHabitLog = async (habitId: string, date: string) => {
    if (!user) return;
    const existing = habitLogs.find(l => l.habitId === habitId && l.date === date);
    if (existing) {
      const { error } = await supabase.from('habit_logs').delete().eq('id', existing.id);
      if (error) { toast.error('Failed to update'); return; }
      setHabitLogs(prev => prev.filter(l => l.id !== existing.id));
    } else {
      const { data: row, error } = await supabase.from('habit_logs').insert({
        habit_id: habitId, user_id: user.id, date,
      }).select().single();
      if (error) { toast.error('Failed to log habit'); return; }
      if (row) setHabitLogs(prev => [...prev, mapHabitLog(row)]);
    }
  };

  // Reminder CRUD
  const addReminder = async (data: Omit<Reminder, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('reminders').insert({
      user_id: user.id, title: data.title, type: data.type, date: data.date,
      time: data.time || null, recurring: data.recurring || null, notes: data.notes || null, completed: data.completed,
    }).select().single();
    if (error) { toast.error('Failed to add reminder'); return; }
    if (row) setReminders(prev => [...prev, mapReminder(row)].sort((a, b) => a.date.localeCompare(b.date)));
  };
  const updateReminder = async (id: string, data: Partial<Omit<Reminder, 'id' | 'createdAt'>>) => {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.type !== undefined) update.type = data.type;
    if (data.date !== undefined) update.date = data.date;
    if (data.time !== undefined) update.time = data.time || null;
    if (data.recurring !== undefined) update.recurring = data.recurring || null;
    if (data.notes !== undefined) update.notes = data.notes || null;
    if (data.completed !== undefined) update.completed = data.completed;
    const { error } = await supabase.from('reminders').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setReminders(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };
  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  // Idea CRUD
  const addIdea = async (data: Omit<Idea, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('ideas').insert({
      user_id: user.id, title: data.title, description: data.description || null,
      category: data.category, tags: data.tags,
    }).select().single();
    if (error) { toast.error('Failed to add idea'); return; }
    if (row) setIdeas(prev => [mapIdea(row), ...prev]);
  };
  const deleteIdea = async (id: string) => {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  // Mood CRUD
  const addMoodEntry = async (data: Omit<MoodEntry, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('mood_entries').insert({
      user_id: user.id, date: data.date, mood: data.mood, energy: data.energy,
      sleep_quality: data.sleepQuality, productivity: data.productivity, notes: data.notes || null,
    }).select().single();
    if (error) { toast.error('Failed to add entry'); return; }
    if (row) setMoodEntries(prev => [mapMoodEntry(row), ...prev]);
  };
  const deleteMoodEntry = async (id: string) => {
    const { error } = await supabase.from('mood_entries').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setMoodEntries(prev => prev.filter(e => e.id !== id));
  };

  // Dream Bucket CRUD
  const addDreamItem = async (data: Omit<DreamBucketItem, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('dream_bucket').insert({
      user_id: user.id, product_name: data.productName, product_link: data.productLink || null,
      image_url: data.imageUrl || null, target_price: data.targetPrice, saved_amount: data.savedAmount,
      target_date: data.targetDate || null, achieved: data.achieved, notes: data.notes || null,
      category: data.category || 'general', tags: data.tags || [], priority: data.priority || false,
    }).select().single();
    if (error) { toast.error('Failed to add item'); return; }
    if (row) setDreamBucket(prev => [mapDreamItem(row), ...prev]);
  };
  const updateDreamItem = async (id: string, data: Partial<Omit<DreamBucketItem, 'id' | 'createdAt'>>) => {
    const update: any = {};
    if (data.productName !== undefined) update.product_name = data.productName;
    if (data.productLink !== undefined) update.product_link = data.productLink || null;
    if (data.imageUrl !== undefined) update.image_url = data.imageUrl || null;
    if (data.targetPrice !== undefined) update.target_price = data.targetPrice;
    if (data.savedAmount !== undefined) update.saved_amount = data.savedAmount;
    if (data.targetDate !== undefined) update.target_date = data.targetDate || null;
    if (data.achieved !== undefined) update.achieved = data.achieved;
    if (data.notes !== undefined) update.notes = data.notes || null;
    if (data.category !== undefined) update.category = data.category;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.priority !== undefined) update.priority = data.priority;
    const { error } = await supabase.from('dream_bucket').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setDreamBucket(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
  };
  const deleteDreamItem = async (id: string) => {
    const { error } = await supabase.from('dream_bucket').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setDreamBucket(prev => prev.filter(d => d.id !== id));
  };

  // Vehicle CRUD
  const addVehicle = async (data: Omit<Vehicle, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('vehicles').insert({
      user_id: user.id, name: data.name, type: data.type, reg_number: data.regNumber || null,
      image_url: data.imageUrl || null, purchase_date: data.purchaseDate || null,
      current_km: data.currentKm || 0, notes: data.notes || null,
    }).select().single();
    if (error) { toast.error('Failed to add vehicle'); return; }
    if (row) setVehicles(prev => [mapVehicle(row), ...prev]);
  };
  const updateVehicle = async (id: string, data: Partial<Omit<Vehicle, 'id' | 'createdAt'>>) => {
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.type !== undefined) update.type = data.type;
    if (data.regNumber !== undefined) update.reg_number = data.regNumber || null;
    if (data.imageUrl !== undefined) update.image_url = data.imageUrl || null;
    if (data.purchaseDate !== undefined) update.purchase_date = data.purchaseDate || null;
    if (data.currentKm !== undefined) update.current_km = data.currentKm;
    if (data.notes !== undefined) update.notes = data.notes || null;
    const { error } = await supabase.from('vehicles').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
  };
  const deleteVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setVehicles(prev => prev.filter(v => v.id !== id));
    setVehicleServices(prev => prev.filter(s => s.vehicleId !== id));
    setVehicleExpenses(prev => prev.filter(e => e.vehicleId !== id));
  };

  // Vehicle service CRUD
  const addVehicleService = async (data: Omit<VehicleService, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { data: row, error } = await supabase.from('vehicle_services').insert({
      user_id: user.id, vehicle_id: data.vehicleId, title: data.title,
      due_date: data.dueDate || null, due_km: data.dueKm || null,
      completed: data.completed, notes: data.notes || null,
    }).select().single();
    if (error) { toast.error('Failed to add service'); return; }
    if (row) setVehicleServices(prev => [...prev, mapVehicleService(row)]);
  };
  const updateVehicleService = async (id: string, data: Partial<Omit<VehicleService, 'id' | 'createdAt'>>) => {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.dueDate !== undefined) update.due_date = data.dueDate || null;
    if (data.dueKm !== undefined) update.due_km = data.dueKm || null;
    if (data.completed !== undefined) update.completed = data.completed;
    if (data.notes !== undefined) update.notes = data.notes || null;
    const { error } = await supabase.from('vehicle_services').update(update).eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setVehicleServices(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  };
  const deleteVehicleService = async (id: string) => {
    const { error } = await supabase.from('vehicle_services').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setVehicleServices(prev => prev.filter(s => s.id !== id));
  };

  // Vehicle expense CRUD (auto-syncs to main expenses)
  const addVehicleExpense = async (data: Omit<VehicleExpense, 'id' | 'createdAt' | 'expenseId'>) => {
    if (!user) return;
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const noteLabel = `🚗 ${vehicle?.name || 'Vehicle'} • ${data.category}${data.notes ? ` — ${data.notes}` : ''}`;
    // 1. Insert into main expenses (category Fuel for fuel, else Maintenance)
    const mainCategory = data.category === 'Fuel' ? 'Fuel' : data.category === 'Insurance' ? 'Insurance' : 'Maintenance';
    const { data: expRow, error: expErr } = await supabase.from('expenses').insert({
      user_id: user.id, amount: data.amount, category: mainCategory, date: data.date, notes: noteLabel,
    }).select().single();
    if (expErr) { toast.error('Failed to add expense'); return; }
    // 2. Insert into vehicle_expenses with link
    const { data: row, error } = await supabase.from('vehicle_expenses').insert({
      user_id: user.id, vehicle_id: data.vehicleId, amount: data.amount,
      category: data.category, date: data.date, notes: data.notes || null,
      expense_id: expRow?.id || null,
    }).select().single();
    if (error) { toast.error('Failed to add'); return; }
    if (expRow) setExpenses(prev => [mapExpense(expRow), ...prev]);
    if (row) setVehicleExpenses(prev => [mapVehicleExpense(row), ...prev]);
  };
  const deleteVehicleExpense = async (id: string) => {
    const item = vehicleExpenses.find(e => e.id === id);
    const { error } = await supabase.from('vehicle_expenses').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setVehicleExpenses(prev => prev.filter(e => e.id !== id));
    // Also delete linked main expense
    if (item?.expenseId) {
      await supabase.from('expenses').delete().eq('id', item.expenseId);
      setExpenses(prev => prev.filter(e => e.id !== item.expenseId));
    }
  };

  // Grooming CRUD (auto-syncs to main expenses if amount > 0)
  const addGroomingEntry = async (data: Omit<GroomingEntry, 'id' | 'createdAt'>) => {
    if (!user) return;
    const typeLabel = data.type.charAt(0).toUpperCase() + data.type.slice(1);
    // Mirror to main expenses for finance tracking when there is a cost
    if (data.amount > 0) {
      const { data: expRow, error: expErr } = await supabase.from('expenses').insert({
        user_id: user.id, amount: data.amount, category: 'Personal',
        date: data.date, notes: `💇 ${typeLabel}${data.place ? ` @ ${data.place}` : ''}`,
      }).select().single();
      if (expErr) { toast.error('Failed to log expense'); return; }
      if (expRow) setExpenses(prev => [mapExpense(expRow), ...prev]);
    }
    const { data: row, error } = await (supabase.from as any)('grooming_entries').insert({
      user_id: user.id, type: data.type, date: data.date, amount: data.amount,
      place: data.place || null, next_due: data.nextDue || null, notes: data.notes || null,
    }).select().single();
    if (error) { toast.error('Failed to add grooming entry'); return; }
    if (row) setGroomingEntries(prev => [mapGroomingEntry(row), ...prev]);
  };
  const deleteGroomingEntry = async (id: string) => {
    const { error } = await (supabase.from as any)('grooming_entries').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setGroomingEntries(prev => prev.filter(g => g.id !== id));
  };

  // Monthly stats
  const getMonthlyStats = (year: number, month: number) => {
    const totalIncome = incomes
      .filter(i => { const d = new Date(i.date); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses
      .filter(e => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; })
      .reduce((sum, e) => sum + e.amount, 0);
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  };

  // All-time cumulative balance
  const getAllTimeBalance = () => {
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  };

  /** Re-inserts a snapshot of incomes / expenses taken before a balance reset. */
  const restoreFinances = async (snapshot: { incomes: Income[]; expenses: Expense[] }) => {
    if (!user) return false;
    const incRows = snapshot.incomes.map(i => ({
      user_id: user.id, amount: i.amount, source: i.source,
      category: i.category || 'Other', date: i.date, notes: i.notes || null,
    }));
    const expRows = snapshot.expenses.map(e => ({
      user_id: user.id, amount: e.amount, category: e.category, date: e.date, notes: e.notes || null,
    }));
    const [{ error: incErr }, { error: expErr }] = await Promise.all([
      incRows.length ? supabase.from('incomes').insert(incRows) : Promise.resolve({ error: null } as any),
      expRows.length ? supabase.from('expenses').insert(expRows) : Promise.resolve({ error: null } as any),
    ]);
    if (incErr || expErr) { toast.error('Could not restore your data'); return false; }
    await fetchData();
    toast.success('Restored — your income and expenses are back');
    return true;
  };

  /**
   * Wipes every income and expense for the signed in user and clears the local
   * cache, so the dashboard balance truly restarts from zero. A short Undo
   * window lets the user recover everything if it was a mistake.
   */
  const resetFinances = async () => {
    if (!user) return false;
    if (!isOnline()) { toast.error('You need to be online to reset your balance'); return false; }
    const snapshot = { incomes: [...incomes], expenses: [...expenses] };
    const [{ error: incErr }, { error: expErr }] = await Promise.all([
      supabase.from('incomes').delete().eq('user_id', user.id),
      supabase.from('expenses').delete().eq('user_id', user.id),
    ]);
    if (incErr || expErr) { toast.error('Could not reset your balance'); return false; }
    setIncomes([]);
    setExpenses([]);
    saveCache('incomes', []);
    saveCache('expenses', []);
    clearCache();
    await fetchData();
    const total = snapshot.incomes.length + snapshot.expenses.length;
    toast.success('Balance reset to zero', {
      description: total > 0 ? `${total} entries deleted. Undo within 10 seconds.` : undefined,
      duration: 10000,
      action: total > 0
        ? { label: 'Undo', onClick: () => { void restoreFinances(snapshot); } }
        : undefined,
    });
    return true;
  };

  const upcomingMeetings = meetings
    .filter(m => new Date(`${m.date}T${m.time}`) >= new Date())
    .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  return {
    incomes, expenses, meetings, savingsGoals, tasks, taskLists, habits, habitLogs, reminders,
    ideas, moodEntries, dreamBucket, vehicles, vehicleServices, vehicleExpenses, groomingEntries,
    budgets, subscriptions, subtasks, lentBorrowEntries, bankAccounts,
    settings, loading,
    addIncome, updateIncome, deleteIncome,
    addLentBorrow, updateLentBorrow, deleteLentBorrow,
    addBankAccount, updateBankAccount, deleteBankAccount,
    addExpense, updateExpense, deleteExpense,
    addMeeting, updateMeeting, deleteMeeting,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addTask, updateTask, deleteTask,
    addSubtask, updateSubtask, deleteSubtask,
    addTaskList, updateTaskList, deleteTaskList,
    addBudget, updateBudget, deleteBudget,
    addSubscription, updateSubscription, deleteSubscription,
    addHabit, deleteHabit, toggleHabitLog,
    addReminder, updateReminder, deleteReminder,
    addIdea, deleteIdea,
    addMoodEntry, deleteMoodEntry,
    addDreamItem, updateDreamItem, deleteDreamItem,
    addVehicle, updateVehicle, deleteVehicle,
    addVehicleService, updateVehicleService, deleteVehicleService,
    addVehicleExpense, deleteVehicleExpense,
    addGroomingEntry, deleteGroomingEntry,
    updateSettings, getMonthlyStats, getAllTimeBalance, upcomingMeetings,
    resetFinances,
    refreshData: fetchData,
  };
}

// Map DB rows to app types
function mapIncome(row: any): Income {
  return { id: row.id, amount: Number(row.amount), source: row.source, category: row.category || 'Other', date: row.date, bankAccountId: row.bank_account_id || undefined, notes: row.notes || '', createdAt: row.created_at };
}
function mapBankAccount(row: any): BankAccount {
  return { id: row.id, name: row.name, bankName: row.bank_name || undefined, accountType: row.account_type, lastFour: row.last_four || undefined, color: row.color, createdAt: row.created_at };
}
function mapExpense(row: any): Expense {
  return { id: row.id, amount: Number(row.amount), category: row.category, date: row.date, notes: row.notes || '', createdAt: row.created_at };
}
function mapMeeting(row: any): Meeting {
  return { id: row.id, title: row.title, date: row.date, time: row.time, notes: row.notes || '', createdAt: row.created_at };
}
function mapGoal(row: any): SavingsGoal {
  return { id: row.id, title: row.title, targetAmount: Number(row.target_amount), savedAmount: Number(row.saved_amount), deadline: row.deadline || undefined, notes: row.notes || '', createdAt: row.created_at };
}
function mapTask(row: any): Task {
  return {
    id: row.id,
    listId: row.list_id || undefined,
    title: row.title,
    completed: row.completed,
    starred: !!row.starred,
    position: row.position ?? 0,
    priority: (row.priority ?? 0) as Task['priority'],
    tags: Array.isArray(row.tags) ? row.tags : [],
    dueDate: row.due_date || undefined,
    date: row.date || undefined,
    meetingId: row.meeting_id || undefined,
    notes: row.notes || '',
    assignedTo: row.assigned_to || undefined,
    completedBy: row.completed_by || undefined,
    recurring: row.recurring || undefined,
    createdAt: row.created_at,
  };
}
function mapTaskList(row: any): TaskList {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    color: row.color,
    position: row.position ?? 0,
    isShared: !!row.is_shared,
    createdAt: row.created_at,
  };
}
function mapHabit(row: any): Habit {
  return { id: row.id, title: row.title, emoji: row.emoji, createdAt: row.created_at };
}
function mapHabitLog(row: any): HabitLog {
  return { id: row.id, habitId: row.habit_id, date: row.date, completed: row.completed, createdAt: row.created_at };
}
function mapReminder(row: any): Reminder {
  return { id: row.id, title: row.title, type: row.type, date: row.date, time: row.time || undefined, recurring: row.recurring || undefined, notes: row.notes || '', completed: row.completed, createdAt: row.created_at };
}
function mapIdea(row: any): Idea {
  return { id: row.id, title: row.title, description: row.description || undefined, category: row.category, tags: row.tags || [], createdAt: row.created_at };
}
function mapMoodEntry(row: any): MoodEntry {
  return { id: row.id, date: row.date, mood: row.mood, energy: row.energy, sleepQuality: row.sleep_quality, productivity: row.productivity, notes: row.notes || undefined, createdAt: row.created_at };
}
function mapDreamItem(row: any): DreamBucketItem {
  return { id: row.id, productName: row.product_name, productLink: row.product_link || undefined, imageUrl: row.image_url || undefined, targetPrice: Number(row.target_price), savedAmount: Number(row.saved_amount), targetDate: row.target_date || undefined, achieved: row.achieved, notes: row.notes || undefined, category: row.category || 'general', tags: row.tags || [], priority: row.priority || false, createdAt: row.created_at };
}
function mapVehicle(row: any): Vehicle {
  return { id: row.id, name: row.name, type: row.type, regNumber: row.reg_number || undefined, imageUrl: row.image_url || undefined, purchaseDate: row.purchase_date || undefined, currentKm: Number(row.current_km || 0), notes: row.notes || undefined, createdAt: row.created_at };
}
function mapVehicleService(row: any): VehicleService {
  return { id: row.id, vehicleId: row.vehicle_id, title: row.title, dueDate: row.due_date || undefined, dueKm: row.due_km ? Number(row.due_km) : undefined, completed: row.completed, notes: row.notes || undefined, createdAt: row.created_at };
}
function mapVehicleExpense(row: any): VehicleExpense {
  return { id: row.id, vehicleId: row.vehicle_id, amount: Number(row.amount), category: row.category, date: row.date, notes: row.notes || undefined, expenseId: row.expense_id || undefined, createdAt: row.created_at };
}
function mapGroomingEntry(row: any): GroomingEntry {
  return { id: row.id, type: row.type, date: row.date, amount: Number(row.amount), place: row.place || undefined, nextDue: row.next_due || undefined, notes: row.notes || undefined, createdAt: row.created_at };
}
function mapBudget(row: any): Budget {
  return { id: row.id, category: row.category, monthlyLimit: Number(row.monthly_limit), createdAt: row.created_at };
}
function mapSubscription(row: any): Subscription {
  return { id: row.id, name: row.name, amount: Number(row.amount), billingCycle: row.billing_cycle || 'monthly', nextRenewalDate: row.next_renewal_date || undefined, category: row.category || undefined, notes: row.notes || undefined, active: row.active ?? true, createdAt: row.created_at };
}
function mapSubtask(row: any): Subtask {
  return { id: row.id, taskId: row.task_id, title: row.title, completed: !!row.completed, position: row.position ?? 0, createdAt: row.created_at };
}
function mapLentBorrow(row: any): LentBorrowEntry {
  return {
    id: row.id,
    direction: row.direction === 'borrowed' ? 'borrowed' : 'lent',
    personName: row.person_name,
    amount: Number(row.amount),
    settledAmount: Number(row.settled_amount || 0),
    date: row.lent_or_borrowed_date,
    dueDate: row.due_date || undefined,
    notes: row.notes || undefined,
    settled: !!row.settled,
    createdAt: row.created_at,
  };
}
