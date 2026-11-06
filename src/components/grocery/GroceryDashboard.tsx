import { useMemo } from 'react';
import {
  GroceryList,
  GroceryListItem,
  GroceryStockItem,
  GroceryActivity,
} from '@/types/grocery';
import {
  ShoppingBag,
  Box,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
  Plus,
  Utensils,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GroceryDashboardProps {
  lists: GroceryList[];
  listItems: GroceryListItem[];
  stock: GroceryStockItem[];
  activities: GroceryActivity[];
  lowStockItems: GroceryStockItem[];
  expiringSoonItems: GroceryStockItem[];
  currency?: string;
  onNavigateTab: (tab: 'overview' | 'lists' | 'stock' | 'lowstock' | 'activity') => void;
  onOpenAddItem: () => void;
  onOpenCreateList: () => void;
  onOpenRecordConsumption: () => void;
}

export function GroceryDashboard({
  lists,
  listItems,
  stock,
  activities,
  lowStockItems,
  expiringSoonItems,
  currency = '₹',
  onNavigateTab,
  onOpenAddItem,
  onOpenCreateList,
  onOpenRecordConsumption,
}: GroceryDashboardProps) {
  // Calculations
  const pendingItems = useMemo(() => {
    return listItems.filter((i) => !i.is_purchased);
  }, [listItems]);

  const purchasedThisMonth = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    return listItems
      .filter((i) => i.is_purchased && i.purchased_at && i.purchased_at.startsWith(currentMonth))
      .reduce((sum, i) => sum + (i.actual_price || i.estimated_price || 0), 0);
  }, [listItems]);

  const activeStockCount = stock.filter((s) => s.current_quantity > 0).length;

  return (
    <div className="w-full max-w-full min-w-0 space-y-3.5 sm:space-y-5 animate-in fade-in duration-300 box-border">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 w-full min-w-0 box-border">
        {/* Total In Stock */}
        <div
          onClick={() => onNavigateTab('stock')}
          className="w-full min-w-0 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-card border border-border/60 card-shadow cursor-pointer hover:border-primary/40 transition-all tap-shrink flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Box className="w-4 h-4" />
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              Stock
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{activeStockCount}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              {stock.length} tracked items
            </p>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => onNavigateTab('lowstock')}
          className={cn(
            'w-full min-w-0 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border card-shadow cursor-pointer transition-all tap-shrink flex flex-col justify-between',
            lowStockItems.length > 0
              ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
              : 'bg-card border-border/60 hover:border-border'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                lowStockItems.length > 0
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
            {lowStockItems.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white uppercase shrink-0">
                Action
              </span>
            )}
          </div>
          <div>
            <p
              className={cn(
                'text-xl sm:text-2xl font-black tracking-tight',
                lowStockItems.length > 0 ? 'text-amber-500' : 'text-foreground'
              )}
            >
              {lowStockItems.length}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              Need restock
            </p>
          </div>
        </div>

        {/* Pending Shopping Items */}
        <div
          onClick={() => onNavigateTab('lists')}
          className="w-full min-w-0 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-card border border-border/60 card-shadow cursor-pointer hover:border-primary/40 transition-all tap-shrink flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              Shopping
            </span>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight">{pendingItems.length}</p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              In checklist
            </p>
          </div>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => onNavigateTab('stock')}
          className={cn(
            'w-full min-w-0 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border card-shadow cursor-pointer transition-all tap-shrink flex flex-col justify-between',
            expiringSoonItems.length > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-card border-border/60'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                expiringSoonItems.length > 0
                  ? 'bg-rose-500/20 text-rose-500'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              Expiry
            </span>
          </div>
          <div>
            <p
              className={cn(
                'text-xl sm:text-2xl font-black tracking-tight',
                expiringSoonItems.length > 0 ? 'text-rose-500' : 'text-foreground'
              )}
            >
              {expiringSoonItems.length}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
              Expiring ≤ 5d
            </p>
          </div>
        </div>

        {/* Monthly Grocery Spending */}
        <div className="col-span-2 md:col-span-3 w-full min-w-0 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-card border border-border/60 card-shadow flex items-center justify-between gap-3 box-border">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                Monthly Grocery Spend
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-0.5 truncate">
                {currency}
                {purchasedThisMonth.toLocaleString()}
              </h3>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateTab('lists')}
            className="h-8 px-2.5 sm:h-9 sm:px-3 rounded-xl text-xs font-bold gap-1 shrink-0 tap-shrink"
          >
            <span>Lists</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-card border border-border/60 card-shadow space-y-2.5 w-full min-w-0 box-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <h4 className="text-sm font-extrabold text-foreground tracking-tight">Quick Actions</h4>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
          <Button
            onClick={onOpenAddItem}
            className="w-full min-w-0 h-10 sm:h-11 px-2 rounded-xl sm:rounded-2xl gradient-primary text-xs font-bold gap-1.5 shadow-pop tap-shrink"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Add Grocery</span>
          </Button>
          <Button
            onClick={onOpenRecordConsumption}
            variant="outline"
            className="w-full min-w-0 h-10 sm:h-11 px-2 rounded-xl sm:rounded-2xl border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-xs font-bold gap-1.5 tap-shrink"
          >
            <Utensils className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Consume</span>
          </Button>
          <Button
            onClick={() => onNavigateTab('lowstock')}
            variant="outline"
            className="w-full min-w-0 h-10 sm:h-11 px-2 rounded-xl sm:rounded-2xl text-xs font-bold gap-1.5 tap-shrink"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Low Stock</span>
          </Button>
          <Button
            onClick={onOpenCreateList}
            variant="outline"
            className="w-full min-w-0 h-10 sm:h-11 px-2 rounded-xl sm:rounded-2xl text-xs font-bold gap-1.5 tap-shrink"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">New List</span>
          </Button>
        </div>
      </div>

      {/* Urgent Low Stock Alert Card (if any) */}
      {lowStockItems.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 space-y-2.5 w-full min-w-0 box-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">Items Running Low</h4>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                  {lowStockItems.length} groceries below minimum
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('lowstock')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 hover:underline tap-shrink shrink-0"
            >
              <span>Restock all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide w-full max-w-full">
            {lowStockItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-2xl bg-card border border-border/60 shrink-0 w-32 min-w-0"
              >
                <p className="text-xs font-bold text-foreground truncate">{item.item_name}</p>
                <p className="text-[11px] text-amber-500 font-semibold mt-0.5 truncate">
                  {item.current_quantity} {item.unit} left
                </p>
                <p className="text-[10px] text-muted-foreground truncate">Min: {item.minimum_stock}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-card border border-border/60 card-shadow space-y-3 w-full min-w-0 box-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary shrink-0" />
            <h4 className="text-sm font-extrabold text-foreground tracking-tight">
              Roommate Activity
            </h4>
          </div>
          <span className="text-[10px] sm:text-[11px] text-muted-foreground">Live updates</span>
        </div>

        {activities.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <p className="text-xs">No recent grocery movements logged yet.</p>
            <p className="text-[11px] opacity-75 mt-0.5">
              Purchases and kitchen consumption will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 w-full min-w-0">
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between gap-2.5 text-xs w-full min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-xl bg-muted/80 flex items-center justify-center shrink-0 text-foreground font-bold text-[11px]">
                    {act.actor_name?.[0]?.toUpperCase() || 'R'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">
                      <span className="font-bold">{act.actor_name}</span>{' '}
                      <span className="text-muted-foreground">{act.action}</span>{' '}
                      <span className="font-semibold text-foreground">{act.item_name}</span>
                    </p>
                    {act.details && (
                      <p className="text-[11px] text-muted-foreground/80 truncate">{act.details}</p>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

