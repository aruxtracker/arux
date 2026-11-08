import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { loadCache, saveCache } from '@/lib/offline';
import {
  GroceryList,
  GroceryListItem,
  GroceryStockItem,
  GroceryStockMovement,
  GroceryActivity,
  GroceryHousehold,
  GroceryHouseholdMember,
  GroceryUnit,
} from '@/types/grocery';
import { toast } from 'sonner';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface UseGroceryDataProps {
  onAddExpense?: (expense: { amount: number; category: any; date: string; notes?: string }) => Promise<void> | void;
}

export function useGroceryData({ onAddExpense }: UseGroceryDataProps = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const getHouseholdStorageKey = useCallback((userId?: string) => {
    return userId ? `arux_active_grocery_household_${userId}` : 'arux_active_grocery_household';
  }, []);

  // State initialized with offline cache
  const [households, setHouseholds] = useState<GroceryHousehold[]>(() => loadCache<GroceryHousehold>('groceryHouseholds') || []);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('arux_active_grocery_household');
      return stored && stored !== 'solo' ? stored : null;
    } catch {
      return null;
    }
  });

  // When authenticated user changes, synchronize active household from user-scoped storage
  useEffect(() => {
    if (!user) {
      setActiveHouseholdId(null);
      return;
    }
    try {
      const userKey = getHouseholdStorageKey(user.id);
      const stored = localStorage.getItem(userKey);
      if (stored === 'solo') {
        setActiveHouseholdId(null);
      } else if (stored) {
        setActiveHouseholdId(stored);
      }
    } catch {}
  }, [user?.id, getHouseholdStorageKey]);

  const [members, setMembers] = useState<GroceryHouseholdMember[]>([]);
  const [lists, setLists] = useState<GroceryList[]>(() => loadCache<GroceryList>('groceryLists') || []);
  const [listItems, setListItems] = useState<GroceryListItem[]>(() => loadCache<GroceryListItem>('groceryListItems') || []);
  const [stock, setStock] = useState<GroceryStockItem[]>(() => loadCache<GroceryStockItem>('groceryStock') || []);
  const [movements, setMovements] = useState<GroceryStockMovement[]>(() => loadCache<GroceryStockMovement>('groceryStockMovements') || []);
  const [activities, setActivities] = useState<GroceryActivity[]>(() => loadCache<GroceryActivity>('groceryActivity') || []);
  const [loading, setLoading] = useState<boolean>(true);

  const activeHousehold = useMemo(() => {
    if (!activeHouseholdId) return null;
    return households.find((h) => h.id === activeHouseholdId) || null;
  }, [households, activeHouseholdId]);

  const userName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Roommate';

  // Persist caches
  useEffect(() => {
    saveCache('groceryHouseholds', households);
  }, [households]);
  useEffect(() => {
    saveCache('groceryLists', lists);
  }, [lists]);
  useEffect(() => {
    saveCache('groceryListItems', listItems);
  }, [listItems]);
  useEffect(() => {
    saveCache('groceryStock', stock);
  }, [stock]);
  useEffect(() => {
    saveCache('groceryStockMovements', movements);
  }, [movements]);
  useEffect(() => {
    saveCache('groceryActivity', activities);
  }, [activities]);

  // References to prevent unnecessary re-renders during 2-second silent background sync
  const householdsRef = useRef(households);
  const listsRef = useRef(lists);
  const listItemsRef = useRef(listItems);
  const stockRef = useRef(stock);
  const movementsRef = useRef(movements);
  const activitiesRef = useRef(activities);
  const membersRef = useRef(members);

  useEffect(() => { householdsRef.current = households; }, [households]);
  useEffect(() => { listsRef.current = lists; }, [lists]);
  useEffect(() => { listItemsRef.current = listItems; }, [listItems]);
  useEffect(() => { stockRef.current = stock; }, [stock]);
  useEffect(() => { movementsRef.current = movements; }, [movements]);
  useEffect(() => { activitiesRef.current = activities; }, [activities]);
  useEffect(() => { membersRef.current = members; }, [members]);

  const hasDataChanged = (fresh: any, cached: any) => {
    return JSON.stringify(fresh) !== JSON.stringify(cached);
  };

  // Sync with Supabase (supports silent background sync that doesn't trigger UI flicker)
  const fetchData = useCallback(async (isBackground = false) => {
    if (!user) {
      if (!isBackground) setLoading(false);
      return;
    }

    try {
      // 1. Households
      const { data: hData, error: hErr } = await supabase
        .from('grocery_households' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (!hErr && hData) {
        // Defensively filter households so users NEVER see flats they do not belong to
        const memberHouseholdIds = new Set<string>();
        try {
          const { data: myMemberships } = await supabase
            .from('grocery_household_members' as any)
            .select('household_id')
            .eq('user_id', user.id);
          if (myMemberships) {
            myMemberships.forEach((m: any) => memberHouseholdIds.add(m.household_id));
          }
        } catch {}

        const validHouseholds = (hData as GroceryHousehold[]).filter(
          (h) => h.owner_id === user.id || memberHouseholdIds.has(h.id)
        );

        if (hasDataChanged(validHouseholds, householdsRef.current)) {
          setHouseholds(validHouseholds);
        }

        const userKey = getHouseholdStorageKey(user.id);
        const storedPref = typeof localStorage !== 'undefined' ? localStorage.getItem(userKey) : null;

        if (storedPref === 'solo') {
          // Explicitly opted into solo/personal mode - never force into a household
          if (activeHouseholdId !== null) {
            setActiveHouseholdId(null);
          }
        } else if (activeHouseholdId) {
          // If the currently selected household no longer belongs to user, switch to solo
          const stillValid = validHouseholds.some((h) => h.id === activeHouseholdId);
          if (!stillValid) {
            setActiveHouseholdId(null);
            try {
              localStorage.setItem(userKey, 'solo');
              localStorage.setItem('arux_active_grocery_household', 'solo');
            } catch {}
          }
        } else if (!storedPref && validHouseholds.length > 0) {
          // First time user with existing households: pick their first household
          const firstId = validHouseholds[0].id;
          setActiveHouseholdId(firstId);
          try {
            localStorage.setItem(userKey, firstId);
            localStorage.setItem('arux_active_grocery_household', firstId);
          } catch {}
        }
      }

      // 2. Household members if active
      if (activeHouseholdId) {
        // Try getting member info with email & name
        const { data: rpcMembers, error: rpcErr } = await supabase.rpc(
          'get_grocery_household_members' as any,
          { _household_id: activeHouseholdId }
        );
        if (!rpcErr && Array.isArray(rpcMembers) && rpcMembers.length > 0) {
          const mappedMembers = rpcMembers.map((m: any) => ({
            id: m.id,
            household_id: m.household_id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            email: m.email,
            displayName: m.display_name,
          }));
          if (hasDataChanged(mappedMembers, membersRef.current)) {
            setMembers(mappedMembers);
          }
        } else {
          const { data: mData } = await supabase
            .from('grocery_household_members' as any)
            .select('*')
            .eq('household_id', activeHouseholdId);
          if (mData && hasDataChanged(mData, membersRef.current)) {
            setMembers(mData);
          }
        }
      }

      // 3. Lists
      let listQuery = supabase.from('grocery_lists' as any).select('*').order('created_at', { ascending: false });
      if (activeHouseholdId) {
        listQuery = listQuery.eq('household_id', activeHouseholdId);
      } else {
        listQuery = listQuery.eq('user_id', user.id).is('household_id', null);
      }
      const { data: lData } = await listQuery;
      if (lData) {
        if (hasDataChanged(lData, listsRef.current)) {
          setLists(lData);
        }
      } else if (!listsRef.current.length && !isBackground) {
        const defaultList: GroceryList = {
          id: generateUUID(),
          household_id: activeHouseholdId,
          user_id: user.id,
          name: 'Monthly Shopping',
          status: 'active',
          color: '#10b981',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setLists([defaultList]);
      }

      // 4. List Items
      let itemsQuery = supabase.from('grocery_list_items' as any).select('*').order('created_at', { ascending: true });
      if (activeHouseholdId) {
        itemsQuery = itemsQuery.eq('household_id', activeHouseholdId);
      } else {
        itemsQuery = itemsQuery.eq('created_by', user.id).is('household_id', null);
      }
      const { data: iData } = await itemsQuery;
      if (iData && hasDataChanged(iData, listItemsRef.current)) {
        setListItems(iData);
      }

      // 5. Stock
      let stockQuery = supabase.from('grocery_stock' as any).select('*').order('category', { ascending: true });
      if (activeHouseholdId) {
        stockQuery = stockQuery.eq('household_id', activeHouseholdId);
      } else {
        stockQuery = stockQuery.eq('user_id', user.id).is('household_id', null);
      }
      const { data: sData } = await stockQuery;
      if (sData && hasDataChanged(sData, stockRef.current)) {
        setStock(sData);
      }

      // 6. Movements
      let movQuery = supabase.from('grocery_stock_movements' as any).select('*').order('created_at', { ascending: false }).limit(50);
      if (activeHouseholdId) {
        movQuery = movQuery.eq('household_id', activeHouseholdId);
      } else {
        movQuery = movQuery.eq('user_id', user.id).is('household_id', null);
      }
      const { data: movData } = await movQuery;
      if (movData && hasDataChanged(movData, movementsRef.current)) {
        setMovements(movData);
      }

      // 7. Activity
      let actQuery = supabase.from('grocery_activity' as any).select('*').order('created_at', { ascending: false }).limit(40);
      if (activeHouseholdId) {
        actQuery = actQuery.eq('household_id', activeHouseholdId);
      } else {
        actQuery = actQuery.eq('user_id', user.id).is('household_id', null);
      }
      const { data: actData } = await actQuery;
      if (actData && hasDataChanged(actData, activitiesRef.current)) {
        setActivities(actData);
      }
    } catch {
      // Graceful offline fallback
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [user, activeHouseholdId]);

  // Real-time automatic syncing: Supabase Realtime channel + 2-second silent background poll
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;

    // Run initial fetch
    fetchData(false);

    // Silent background sync runner (does not trigger any loading spinner or UI flicker)
    const runSilentSync = async () => {
      if (!isSubscribed) return;
      // Skip background sync when browser tab is hidden to save battery
      if (typeof document !== 'undefined' && document.hidden) return;
      await fetchData(true);
    };

    // 2-second background interval for guaranteed synchronization
    const intervalId = setInterval(runSilentSync, 2000);

    // Sync immediately when returning to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSilentSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Instant WebSocket real-time subscription for 0ms reactivity
    const targetChannelName = 'grocery-realtime-' + (activeHouseholdId || user.id);
    const channel = supabase
      .channel(targetChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_list_items' },
        () => { runSilentSync(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_stock' },
        () => { runSilentSync(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_lists' },
        () => { runSilentSync(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_activity' },
        () => { runSilentSync(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_household_members' },
        () => { runSilentSync(); }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [user, activeHouseholdId, fetchData]);

  const switchHousehold = (id: string | null) => {
    setActiveHouseholdId(id);
    try {
      const userKey = getHouseholdStorageKey(user?.id);
      if (id) {
        localStorage.setItem(userKey, id);
        localStorage.setItem('arux_active_grocery_household', id);
      } else {
        localStorage.setItem(userKey, 'solo');
        localStorage.setItem('arux_active_grocery_household', 'solo');
      }
    } catch {}
  };

  // Helper to log activities
  const logActivity = useCallback(async (action: string, itemName: string, details?: string) => {
    if (!user) return;
    const act: GroceryActivity = {
      id: generateUUID(),
      household_id: activeHouseholdId,
      user_id: user.id,
      actor_name: userName,
      action,
      item_name: itemName,
      details: details || null,
      created_at: new Date().toISOString(),
    };

    setActivities((prev) => [act, ...prev.slice(0, 49)]);

    try {
      await supabase.from('grocery_activity' as any).insert(act);
    } catch {}
  }, [user, activeHouseholdId, userName]);

  // -------------------------------------------------------------
  // LIST ACTIONS
  // -------------------------------------------------------------
  const createList = async (name: string, color: string = '#10b981') => {
    if (!user) return;
    const newList: GroceryList = {
      id: generateUUID(),
      household_id: activeHouseholdId,
      user_id: user.id,
      name,
      status: 'active',
      color,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLists((prev) => [newList, ...prev]);
    toast.success(`Created list "${name}"`);
    logActivity('created list', name);

    try {
      await supabase.from('grocery_lists' as any).insert(newList);
    } catch {}
  };

  const updateList = async (id: string, updates: Partial<GroceryList>) => {
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l)));
    try {
      await supabase.from('grocery_lists' as any).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    } catch {}
  };

  const deleteList = async (id: string) => {
    const listToDelete = lists.find((l) => l.id === id);
    setLists((prev) => prev.filter((l) => l.id !== id));
    setListItems((prev) => prev.filter((item) => item.list_id !== id));
    toast.info(`Deleted list "${listToDelete?.name || ''}"`);

    try {
      await supabase.from('grocery_lists' as any).delete().eq('id', id);
    } catch {}
  };

  const duplicateList = async (listId: string, newName?: string) => {
    const sourceList = lists.find((l) => l.id === listId);
    if (!sourceList || !user) return;

    const newList: GroceryList = {
      id: generateUUID(),
      household_id: activeHouseholdId,
      user_id: user.id,
      name: newName || `${sourceList.name} (Copy)`,
      status: 'active',
      color: sourceList.color,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sourceItems = listItems.filter((i) => i.list_id === listId);
    const copiedItems: GroceryListItem[] = sourceItems.map((item) => ({
      ...item,
      id: generateUUID(),
      list_id: newList.id,
      is_purchased: false,
      actual_price: null,
      purchased_quantity: null,
      purchased_at: null,
      purchased_by: null,
      expense_id: null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setLists((prev) => [newList, ...prev]);
    setListItems((prev) => [...copiedItems, ...prev]);
    toast.success(`Duplicated list as "${newList.name}"`);

    try {
      await supabase.from('grocery_lists' as any).insert(newList);
      if (copiedItems.length > 0) {
        await supabase.from('grocery_list_items' as any).insert(copiedItems);
      }
    } catch {}
  };

  const clearCompletedItems = async (listId: string) => {
    setListItems((prev) => prev.filter((item) => !(item.list_id === listId && item.is_purchased)));
    toast.success('Cleared completed items from list');

    try {
      await supabase.from('grocery_list_items' as any).delete().eq('list_id', listId).eq('is_purchased', true);
    } catch {}
  };

  // -------------------------------------------------------------
  // LIST ITEM ACTIONS
  // -------------------------------------------------------------
  const addListItem = async (item: {
    listId: string;
    itemName: string;
    category: string;
    quantity: number;
    unit: GroceryUnit;
    estimatedPrice: number;
    notes?: string;
  }) => {
    if (!user) return;
    const normalized = item.itemName.trim().toLowerCase();

    // Prevent duplicate active items in the same list
    const existing = listItems.find(
      (i) => i.list_id === item.listId && i.normalized_item_name === normalized && !i.is_purchased
    );
    if (existing) {
      toast.info(`"${item.itemName}" is already in this shopping list.`);
      return;
    }

    const newItem: GroceryListItem = {
      id: generateUUID(),
      list_id: item.listId,
      household_id: activeHouseholdId,
      item_name: item.itemName.trim(),
      normalized_item_name: normalized,
      category: item.category,
      quantity: Number(item.quantity) || 1,
      unit: item.unit,
      estimated_price: Number(item.estimatedPrice) || 0,
      actual_price: null,
      is_purchased: false,
      purchased_quantity: null,
      purchased_at: null,
      purchased_by: null,
      expense_id: null,
      notes: item.notes || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setListItems((prev) => [...prev, newItem]);
    toast.success(`Added ${newItem.item_name} to list`);
    logActivity('added item', newItem.item_name, `${newItem.quantity} ${newItem.unit}`);

    try {
      await supabase.from('grocery_list_items' as any).insert(newItem);
    } catch {}
  };

  const updateListItem = async (id: string, updates: Partial<GroceryListItem>) => {
    setListItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              ...updates,
              normalized_item_name: updates.item_name ? updates.item_name.trim().toLowerCase() : i.normalized_item_name,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );

    try {
      const dbUpdates = { ...updates, updated_at: new Date().toISOString() };
      if (updates.item_name) {
        dbUpdates.normalized_item_name = updates.item_name.trim().toLowerCase();
      }
      await supabase.from('grocery_list_items' as any).update(dbUpdates).eq('id', id);
    } catch {}
  };

  const deleteListItem = async (id: string) => {
    const itemToDelete = listItems.find((i) => i.id === id);
    setListItems((prev) => prev.filter((i) => i.id !== id));
    toast.info(`Removed ${itemToDelete?.item_name || 'item'}`);

    try {
      await supabase.from('grocery_list_items' as any).delete().eq('id', id);
    } catch {}
  };

  // SMART PURCHASE WORKFLOW: Connects purchase -> stock increment -> expense tracker
  const markItemPurchased = async (
    itemId: string,
    options: {
      actualPrice?: number;
      actualQuantity?: number;
      addToStock: boolean;
      syncToExpenses: boolean;
    }
  ) => {
    if (!user) return;
    const item = listItems.find((i) => i.id === itemId);
    if (!item) return;

    const actualPrice = options.actualPrice !== undefined ? Number(options.actualPrice) : item.estimated_price;
    const purchasedQty = options.actualQuantity !== undefined ? Number(options.actualQuantity) : item.quantity;
    const now = new Date().toISOString();

    // 1. Mark item as purchased
    const updatedItem: GroceryListItem = {
      ...item,
      is_purchased: true,
      actual_price: actualPrice,
      purchased_quantity: purchasedQty,
      purchased_at: now,
      purchased_by: user.id,
      updated_at: now,
    };

    setListItems((prev) => prev.map((i) => (i.id === itemId ? updatedItem : i)));
    logActivity('purchased', item.item_name, `${purchasedQty} ${item.unit} for ₹${actualPrice}`);

    // 2. Stock Integration: update existing or create new stock
    if (options.addToStock) {
      const normalized = item.normalized_item_name;
      const existingStock = stock.find(
        (s) => s.normalized_item_name === normalized && s.unit === item.unit
      );

      let targetStockId = existingStock?.id;

      if (existingStock) {
        const newQty = Number(existingStock.current_quantity) + Number(purchasedQty);
        setStock((prev) =>
          prev.map((s) =>
            s.id === existingStock.id
              ? {
                  ...s,
                  current_quantity: newQty,
                  purchase_price: actualPrice,
                  last_purchased_at: now,
                  updated_at: now,
                }
              : s
          )
        );

        try {
          await supabase
            .from('grocery_stock' as any)
            .update({
              current_quantity: newQty,
              purchase_price: actualPrice,
              last_purchased_at: now,
              updated_at: now,
            })
            .eq('id', existingStock.id);
        } catch {}
      } else {
        targetStockId = generateUUID();
        const newStockItem: GroceryStockItem = {
          id: targetStockId,
          household_id: activeHouseholdId,
          user_id: user.id,
          item_name: item.item_name,
          normalized_item_name: normalized,
          category: item.category,
          current_quantity: purchasedQty,
          unit: item.unit,
          minimum_stock: 1,
          purchase_price: actualPrice,
          expiry_date: null,
          last_purchased_at: now,
          storage_location: null,
          notes: item.notes || null,
          created_at: now,
          updated_at: now,
        };

        setStock((prev) => [newStockItem, ...prev]);

        try {
          await supabase.from('grocery_stock' as any).insert(newStockItem);
        } catch {}
      }

      // Log movement record
      if (targetStockId) {
        const movement: GroceryStockMovement = {
          id: generateUUID(),
          stock_id: targetStockId,
          household_id: activeHouseholdId,
          user_id: user.id,
          movement_type: 'purchase',
          quantity: purchasedQty,
          unit: item.unit,
          reference_id: item.id,
          notes: `Purchased via checklist. Actual price: ₹${actualPrice}`,
          created_by: user.id,
          created_at: now,
        };
        setMovements((prev) => [movement, ...prev]);

        try {
          await supabase.from('grocery_stock_movements' as any).insert(movement);
        } catch {}
      }
    }

    // 3. Expense Tracker Integration (No double counting)
    if (options.syncToExpenses && onAddExpense && actualPrice > 0) {
      await onAddExpense({
        amount: actualPrice,
        category: 'Groceries',
        date: now.split('T')[0],
        notes: `Grocery purchase: ${item.item_name} (${purchasedQty} ${item.unit})`,
      });
      toast.success(`Logged ₹${actualPrice} under Groceries expense & added to stock!`);
    } else {
      toast.success(`Marked ${item.item_name} as purchased!`);
    }

    try {
      await supabase.from('grocery_list_items' as any).update(updatedItem).eq('id', itemId);
    } catch {}
  };

  const uncheckItem = async (itemId: string) => {
    const item = listItems.find((i) => i.id === itemId);
    if (!item) return;

    setListItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              is_purchased: false,
              actual_price: null,
              purchased_quantity: null,
              purchased_at: null,
              purchased_by: null,
              updated_at: new Date().toISOString(),
            }
          : i
      )
    );

    try {
      await supabase
        .from('grocery_list_items' as any)
        .update({
          is_purchased: false,
          actual_price: null,
          purchased_quantity: null,
          purchased_at: null,
          purchased_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);
    } catch {}
  };

  // -------------------------------------------------------------
  // STOCK MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  const addStockItem = async (data: {
    itemName: string;
    category: string;
    currentQuantity: number;
    unit: GroceryUnit;
    minimumStock: number;
    purchasePrice?: number;
    expiryDate?: string;
    storageLocation?: string;
    notes?: string;
  }) => {
    if (!user) return;
    const normalized = data.itemName.trim().toLowerCase();

    // Prevent duplicate stock items: add quantity if existing
    const existing = stock.find((s) => s.normalized_item_name === normalized && s.unit === data.unit);
    if (existing) {
      const newQty = Number(existing.current_quantity) + Number(data.currentQuantity);
      await updateStockItem(existing.id, { current_quantity: newQty });
      toast.success(`Updated existing stock for ${data.itemName} to ${newQty} ${data.unit}`);
      return;
    }

    const newStock: GroceryStockItem = {
      id: generateUUID(),
      household_id: activeHouseholdId,
      user_id: user.id,
      item_name: data.itemName.trim(),
      normalized_item_name: normalized,
      category: data.category,
      current_quantity: Number(data.currentQuantity) || 0,
      unit: data.unit,
      minimum_stock: Number(data.minimumStock) || 1,
      purchase_price: data.purchasePrice ? Number(data.purchasePrice) : null,
      expiry_date: data.expiryDate || null,
      last_purchased_at: new Date().toISOString(),
      storage_location: data.storageLocation?.trim() || null,
      notes: data.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setStock((prev) => [newStock, ...prev]);
    toast.success(`Added ${newStock.item_name} to stock`);
    logActivity('added to stock', newStock.item_name, `${newStock.current_quantity} ${newStock.unit}`);

    // Log movement
    const movement: GroceryStockMovement = {
      id: generateUUID(),
      stock_id: newStock.id,
      household_id: activeHouseholdId,
      user_id: user.id,
      movement_type: 'adjustment',
      quantity: newStock.current_quantity,
      unit: newStock.unit,
      notes: 'Initial stock intake',
      created_by: user.id,
      created_at: new Date().toISOString(),
    };
    setMovements((prev) => [movement, ...prev]);

    try {
      await supabase.from('grocery_stock' as any).insert(newStock);
      await supabase.from('grocery_stock_movements' as any).insert(movement);
    } catch {}
  };

  const updateStockItem = async (id: string, updates: Partial<GroceryStockItem>) => {
    setStock((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...updates,
              normalized_item_name: updates.item_name ? updates.item_name.trim().toLowerCase() : s.normalized_item_name,
              updated_at: new Date().toISOString(),
            }
          : s
      )
    );

    try {
      const dbUpdates = { ...updates, updated_at: new Date().toISOString() };
      if (updates.item_name) {
        dbUpdates.normalized_item_name = updates.item_name.trim().toLowerCase();
      }
      await supabase.from('grocery_stock' as any).update(dbUpdates).eq('id', id);
    } catch {}
  };

  const deleteStockItem = async (id: string) => {
    const itemToDelete = stock.find((s) => s.id === id);
    setStock((prev) => prev.filter((s) => s.id !== id));
    toast.info(`Deleted ${itemToDelete?.item_name || 'stock item'}`);

    try {
      await supabase.from('grocery_stock' as any).delete().eq('id', id);
      await supabase.from('grocery_stock_movements' as any).delete().eq('stock_id', id);
    } catch {}
  };

  // SMART CONSUMPTION: Deducts stock, prevents negative, logs movement & activity
  const recordConsumption = async (stockId: string, quantityToUse: number, notes?: string) => {
    if (!user) return;
    const stockItem = stock.find((s) => s.id === stockId);
    if (!stockItem) return;

    const useQty = Math.abs(Number(quantityToUse));
    if (useQty <= 0) {
      toast.error('Please enter a valid quantity greater than zero');
      return;
    }

    if (stockItem.current_quantity < useQty) {
      toast.error(`Not enough stock! Current stock is ${stockItem.current_quantity} ${stockItem.unit}`);
      return;
    }

    const newQty = Math.max(0, Number((stockItem.current_quantity - useQty).toFixed(2)));
    const now = new Date().toISOString();

    setStock((prev) =>
      prev.map((s) =>
        s.id === stockId ? { ...s, current_quantity: newQty, updated_at: now } : s
      )
    );

    // Movement record
    const movement: GroceryStockMovement = {
      id: generateUUID(),
      stock_id: stockItem.id,
      household_id: activeHouseholdId,
      user_id: user.id,
      movement_type: 'consumption',
      quantity: useQty,
      unit: stockItem.unit,
      notes: notes || `Used ${useQty} ${stockItem.unit}`,
      created_by: user.id,
      created_at: now,
    };
    setMovements((prev) => [movement, ...prev]);

    logActivity('consumed', stockItem.item_name, `${useQty} ${stockItem.unit}`);
    toast.success(`Recorded ${useQty} ${stockItem.unit} consumed. Remaining: ${newQty} ${stockItem.unit}`);

    try {
      await supabase.from('grocery_stock' as any).update({ current_quantity: newQty, updated_at: now }).eq('id', stockId);
      await supabase.from('grocery_stock_movements' as any).insert(movement);
    } catch {}
  };

  // 1-TAP ADD LOW STOCK ITEM TO SHOPPING LIST
  const addLowStockToList = async (stockItem: GroceryStockItem, targetListId?: string, suggestedQty?: number) => {
    if (!user) return;
    const listToUse = targetListId || lists.find((l) => l.status === 'active')?.id || lists[0]?.id;
    if (!listToUse) {
      toast.error('Please create a shopping list first');
      return;
    }

    const neededQty = suggestedQty || Math.max(1, (stockItem.minimum_stock * 2) - stockItem.current_quantity);

    await addListItem({
      listId: listToUse,
      itemName: stockItem.item_name,
      category: stockItem.category,
      quantity: Number(neededQty.toFixed(1)),
      unit: stockItem.unit,
      estimatedPrice: stockItem.purchase_price || 0,
      notes: `Restock needed (current: ${stockItem.current_quantity} ${stockItem.unit})`,
    });
  };

  // -------------------------------------------------------------
  // HOUSEHOLD SHARING
  // -------------------------------------------------------------
  // Push a local household to Supabase so others can join it
  const syncHouseholdToCloud = async (h: GroceryHousehold): Promise<boolean> => {
    if (!user) return false;
    try {
      // Upsert household row
      const { error: hErr } = await supabase
        .from('grocery_households' as any)
        .upsert(h, { onConflict: 'id' });

      if (hErr) {
        if (hErr.code === '42P01') {
          toast.error(
            'Grocery database tables are missing. Run the SQL migration in Supabase first.',
            { duration: 6000 }
          );
        } else {
          toast.error(`Could not sync to cloud: ${hErr.message}`);
        }
        return false;
      }

      // Upsert owner membership
      await supabase.from('grocery_household_members' as any).upsert(
        { household_id: h.id, user_id: user.id, role: 'owner' },
        { onConflict: 'household_id,user_id' }
      );

      return true;
    } catch {
      toast.error('Network error while syncing. Check your connection.');
      return false;
    }
  };

  const createHousehold = async (name: string) => {
    if (!user) return;
    const newH: GroceryHousehold = {
      id: generateUUID(),
      name: name.trim(),
      owner_id: user.id,
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save locally first (immediate UI feedback)
    setHouseholds((prev) => [newH, ...prev]);
    switchHousehold(newH.id);

    // Add owner to members list
    const ownerMember: GroceryHouseholdMember = {
      id: generateUUID(),
      household_id: newH.id,
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
      email: user.email || '',
      displayName: userName,
    };
    setMembers([ownerMember]);

    // Sync to Supabase so friends can join
    const synced = await syncHouseholdToCloud(newH);
    if (synced) {
      toast.success(`Shared flat "${newH.name}" created! You can now invite roommates by email.`);
    } else {
      toast.info(`Created "${newH.name}" locally.`);
    }
  };

  // INVITE MEMBER BY REGISTERED ARUX EMAIL
  const inviteMemberByEmail = async (email: string): Promise<boolean> => {
    if (!user) {
      toast.error('You must be logged in to invite roommates');
      return false;
    }
    if (!activeHouseholdId || !activeHousehold) {
      toast.error('Please select an active household first');
      return false;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      toast.error('Please enter a valid email address');
      return false;
    }

    if (user.email && cleanEmail === user.email.toLowerCase()) {
      toast.error('You are already the owner of this household');
      return false;
    }

    // Check if already in member list locally
    if (members.some((m) => m.email?.toLowerCase() === cleanEmail)) {
      toast.info(`${cleanEmail} is already a member of this household`);
      return false;
    }

    try {
      // Call secure Supabase RPC function to find user in auth.users and add to household
      const { data, error } = await supabase.rpc('add_grocery_household_member_by_email' as any, {
        _household_id: activeHouseholdId,
        _email: cleanEmail,
        _role: 'member',
      });

      if (error) {
        if (error.message?.includes('function') || error.code === '42883') {
          toast.error(
            'Database function missing. Please run the SQL migration in Supabase SQL editor.',
            { duration: 8000 }
          );
        } else {
          toast.error(`Invite failed: ${error.message}`);
        }
        return false;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (!result?.success) {
        toast.error(result?.error || 'Could not add roommate');
        return false;
      }

      // Member added successfully!
      const newMember: GroceryHouseholdMember = {
        id: result.member_id || generateUUID(),
        household_id: activeHouseholdId,
        user_id: result.user_id,
        role: 'member',
        joined_at: new Date().toISOString(),
        email: result.email || cleanEmail,
        displayName: result.name || cleanEmail.split('@')[0],
      };

      setMembers((prev) => [...prev, newMember]);
      logActivity('added to household', result.email || cleanEmail);
      toast.success(`Added ${result.email || cleanEmail} to ${activeHousehold.name}! 🎉`);
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Network error while adding roommate');
      return false;
    }
  };

  // REMOVE MEMBER FROM HOUSEHOLD
  const removeHouseholdMember = async (memberId: string): Promise<boolean> => {
    if (!user) return false;
    const memberToRemove = members.find((m) => m.id === memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.info(`Removed ${memberToRemove?.displayName || memberToRemove?.email || 'member'} from household`);

    try {
      await supabase.from('grocery_household_members' as any).delete().eq('id', memberId);
      return true;
    } catch {
      return false;
    }
  };

  const deleteHousehold = async (id: string) => {
    if (!user) return;
    const h = households.find((hh) => hh.id === id);
    if (!h) return;

    // Remove from local state immediately
    setHouseholds((prev) => prev.filter((hh) => hh.id !== id));
    if (activeHouseholdId === id) switchHousehold(null);
    toast.success(`Deleted household "${h.name}"`);

    try {
      await supabase.from('grocery_household_members' as any).delete().eq('household_id', id);
      await supabase.from('grocery_households' as any).delete().eq('id', id).eq('owner_id', user.id);
    } catch {}
  };

  // Derived calculations for Dashboard
  const lowStockItems = useMemo(() => {
    return stock.filter((s) => s.current_quantity <= s.minimum_stock);
  }, [stock]);

  const expiringSoonItems = useMemo(() => {
    const now = new Date();
    return stock.filter((s) => {
      if (!s.expiry_date) return false;
      const exp = new Date(s.expiry_date);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 5; // Expired or expiring within 5 days
    });
  }, [stock]);

  return {
    user,
    userName,
    loading,
    households,
    activeHousehold,
    activeHouseholdId,
    switchHousehold,
    createHousehold,
    syncHouseholdToCloud,
    inviteMemberByEmail,
    removeHouseholdMember,
    deleteHousehold,
    members,
    lists,
    createList,
    updateList,
    deleteList,
    duplicateList,
    clearCompletedItems,
    listItems,
    addListItem,
    updateListItem,
    deleteListItem,
    markItemPurchased,
    uncheckItem,
    stock,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    recordConsumption,
    addLowStockToList,
    movements,
    activities,
    lowStockItems,
    expiringSoonItems,
    refetch: fetchData,
  };
}

