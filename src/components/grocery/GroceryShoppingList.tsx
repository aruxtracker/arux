import { useState, useMemo } from 'react';
import {
  GroceryList,
  GroceryListItem,
  GROCERY_CATEGORY_EMOJI,
} from '@/types/grocery';
import {
  Plus,
  CheckCircle2,
  Circle,
  Copy,
  Trash2,
  Sparkles,
  Archive,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Check,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GroceryShoppingListProps {
  lists: GroceryList[];
  activeListId: string;
  onSelectList: (id: string) => void;
  listItems: GroceryListItem[];
  currency?: string;
  onAddItem: (listId: string) => void;
  onEditItem: (item: GroceryListItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleItem: (item: GroceryListItem) => void;
  onUncheckItem: (id: string) => void;
  onCreateList: () => void;
  onDuplicateList: (id: string) => void;
  onClearCompleted: (listId: string) => void;
  onDeleteList: (id: string) => void;
}

export function GroceryShoppingList({
  lists,
  activeListId,
  onSelectList,
  listItems,
  currency = '₹',
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleItem,
  onUncheckItem,
  onCreateList,
  onDuplicateList,
  onClearCompleted,
  onDeleteList,
}: GroceryShoppingListProps) {
  const [showCompleted, setShowCompleted] = useState(true);

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];
  const currentItems = useMemo(() => {
    if (!activeList) return [];
    return listItems.filter((i) => i.list_id === activeList.id);
  }, [listItems, activeList]);

  const pendingItems = useMemo(() => currentItems.filter((i) => !i.is_purchased), [currentItems]);
  const completedItems = useMemo(() => currentItems.filter((i) => i.is_purchased), [currentItems]);

  const totalItems = currentItems.length;
  const completedCount = completedItems.length;
  const progressPercent = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const estimatedTotal = currentItems.reduce((acc, i) => acc + (i.estimated_price || 0), 0);
  const actualTotal = completedItems.reduce((acc, i) => acc + (i.actual_price || i.estimated_price || 0), 0);

  // Group pending items by category
  const groupedPending = useMemo(() => {
    const groups: Record<string, GroceryListItem[]> = {};
    pendingItems.forEach((item) => {
      const cat = item.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [pendingItems]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Lists Tabs & New List Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 flex-1">
          {lists.map((l) => {
            const isActive = activeList?.id === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onSelectList(l.id)}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-150 flex items-center gap-2 tap-shrink border',
                  isActive
                    ? 'bg-foreground text-background shadow-sm border-transparent'
                    : 'bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: l.color || '#10b981' }}
                />
                <span>{l.name}</span>
              </button>
            );
          })}
        </div>

        <Button
          size="sm"
          onClick={onCreateList}
          className="h-9 px-3 rounded-xl gradient-primary text-xs font-bold gap-1 shadow-xs shrink-0 tap-shrink"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New List</span>
        </Button>
      </div>

      {activeList && (
        <div className="p-4 md:p-5 rounded-3xl bg-card border border-border/60 card-shadow space-y-4">
          {/* Header of Active List */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                  {activeList.name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-bold text-muted-foreground">
                  {completedCount}/{totalItems} done
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check off items as you buy them at the store or market.
              </p>
            </div>

            {/* List Actions (Duplicate / Clear / Delete) */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDuplicateList(activeList.id)}
                title="Duplicate list"
                aria-label="Duplicate list"
                className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground"
              >
                <Copy className="w-4 h-4" />
              </Button>
              {completedCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onClearCompleted(activeList.id)}
                  title="Clear completed items"
                  aria-label="Clear completed items"
                  className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <Archive className="w-4 h-4" />
                </Button>
              )}
              {lists.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteList(activeList.id)}
                  title="Delete list"
                  aria-label="Delete list"
                  className="w-8 h-8 rounded-xl text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar & Financial Summary */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Shopping Progress</span>
              <span className="font-extrabold text-foreground">{progressPercent}% completed</span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Estimated Budget
                </span>
                <span className="font-extrabold text-foreground">
                  {currency}
                  {estimatedTotal.toLocaleString()}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Actual Spent
                </span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  {currency}
                  {actualTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Add Item Button */}
          <Button
            onClick={() => onAddItem(activeList.id)}
            className="w-full h-11 rounded-2xl gradient-primary text-xs font-bold gap-1.5 shadow-pop tap-shrink"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item to {activeList.name}</span>
          </Button>

          {/* PENDING ITEMS: Grouped by Category */}
          {pendingItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-bold text-foreground">All items purchased!</p>
              <p className="text-xs text-muted-foreground">
                Nothing pending in this checklist. Add items above to start shopping.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {Object.entries(groupedPending).map(([cat, items]) => (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                    <span>{GROCERY_CATEGORY_EMOJI[cat] || '🛒'}</span>
                    <span>{cat}</span>
                    <span className="text-[10px] text-muted-foreground/70 font-normal">
                      ({items.length})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group p-3 rounded-2xl bg-card border border-border/70 hover:border-primary/40 flex items-center justify-between gap-3 transition-all tap-shrink"
                      >
                        {/* Checkbox & Item details */}
                        <div
                          onClick={() => onToggleItem(item)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <button
                            type="button"
                            className="w-6 h-6 rounded-lg border-2 border-muted-foreground/40 group-hover:border-primary flex items-center justify-center transition-colors shrink-0"
                          >
                            <span className="sr-only">Mark purchased</span>
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-foreground truncate">
                              {item.item_name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              <span className="font-semibold text-foreground/90">
                                {item.quantity} {item.unit}
                              </span>
                              {item.estimated_price > 0 && (
                                <>
                                  <span>•</span>
                                  <span>~{currency}{item.estimated_price}</span>
                                </>
                              )}
                              {item.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic truncate max-w-[120px]">{item.notes}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Item Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            className="text-muted-foreground/60 hover:text-destructive p-1 rounded-lg hover:bg-muted"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMPLETED ITEMS (Checked off) */}
          {completedItems.length > 0 && (
            <div className="pt-3 border-t border-border/40 space-y-2">
              <button
                type="button"
                onClick={() => setShowCompleted(!showCompleted)}
                className="w-full flex items-center justify-between py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <span>Purchased Items ({completedItems.length})</span>
                {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showCompleted && (
                <div className="space-y-1.5 opacity-75">
                  {completedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div
                        onClick={() => onUncheckItem(item.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground line-through opacity-70 truncate">
                            {item.item_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.purchased_quantity || item.quantity} {item.unit} · {currency}
                            {item.actual_price || item.estimated_price || 0} spent
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="text-muted-foreground/50 hover:text-destructive p-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

