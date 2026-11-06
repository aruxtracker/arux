import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // State initialized with offline cache
  const [households, setHouseholds] = useState<GroceryHousehold[]>(() => loadCache<GroceryHousehold>('groceryHouseholds') || []);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('arux_active_grocery_household') || null;
    } catch {
      return null;
    }
  });

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

  // Sync with Supabase
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Households
      const { data: hData, error: hErr } = await supabase
        .from('grocery_households' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (!hErr && hData) {
        setHouseholds(hData);
        if (hData.length > 0 && !activeHouseholdId) {
          setActiveHouseholdId(hData[0].id);
        }
      }

      // 2. Household members if active
      if (activeHouseholdId) {
        const { data: mData } = await supabase
          .from('grocery_household_members' as any)
          .select('*')
          .eq('household_id', activeHouseholdId);
        if (mData) setMembers(mData);
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
        setLists(lData);
      } else if (!lists.length) {
        // Create a default initial list if none exists
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
      }
      const { data: iData } = await itemsQuery;
      if (iData) setListItems(iData);

      // 5. Stock
      let stockQuery = supabase.from('grocery_stock' as any).select('*').order('category', { ascending: true });
      if (activeHouseholdId) {
        stockQuery = stockQuery.eq('household_id', activeHouseholdId);
      } else {
        stockQuery = stockQuery.eq('user_id', user.id).is('household_id', null);
      }
      const { data: sData } = await stockQuery;
      if (sData) setStock(sData);

      // 6. Movements
      let movQuery = supabase.from('grocery_stock_movements' as any).select('*').order('created_at', { ascending: false }).limit(50);
      if (activeHouseholdId) {
        movQuery = movQuery.eq('household_id', activeHouseholdId);
      } else {
        movQuery = movQuery.eq('user_id', user.id).is('household_id', null);
      }
      const { data: movData } = await movQuery;
      if (movData) setMovements(movData);

      // 7. Activity
      let actQuery = supabase.from('grocery_activity' as any).select('*').order('created_at', { ascending: false }).limit(40);
      if (activeHouseholdId) {
        actQuery = actQuery.eq('household_id', activeHouseholdId);
      } else {
        actQuery = actQuery.eq('user_id', user.id).is('household_id', null);
      }
      const { data: actData } = await actQuery;
      if (actData) setActivities(actData);
    } catch {
      // Graceful offline fallback
    } finally {
      setLoading(false);
    }
  }, [user, activeHouseholdId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const switchHousehold = (id: string | null) => {
    setActiveHouseholdId(id);
    try {
      if (id) {
        localStorage.setItem('arux_active_grocery_household', id);
      } else {
        localStorage.removeItem('arux_active_grocery_household');
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

    setHouseholds((prev) => [newH, ...prev]);
    switchHousehold(newH.id);
    toast.success(`Created shared household "${newH.name}". Share code: ${newH.code}`);

    try {
      await supabase.from('grocery_households' as any).insert(newH);
      await supabase.from('grocery_household_members' as any).insert({
        household_id: newH.id,
        user_id: user.id,
        role: 'owner',
      });
    } catch {}
  };

  const joinHouseholdByCode = async (code: string) => {
    if (!user) return;
    const cleanCode = code.trim().toUpperCase();

    try {
      const { data: hData, error: hErr } = await supabase
        .from('grocery_households' as any)
        .select('*')
        .eq('code', cleanCode)
        .single();

      if (hErr || !hData) {
        toast.error('Household not found with this invite code');
        return false;
      }

      await supabase.from('grocery_household_members' as any).upsert({
        household_id: hData.id,
        user_id: user.id,
        role: 'member',
      });

      setHouseholds((prev) => (prev.some((h) => h.id === hData.id) ? prev : [hData, ...prev]));
      switchHousehold(hData.id);
      toast.success(`Joined household "${hData.name}"!`);
      return true;
    } catch {
      toast.error('Could not join household');
      return false;
    }
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
    joinHouseholdByCode,
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

