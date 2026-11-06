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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {/* Total In Stock */}
        <div
          onClick={() => onNavigateTab('stock')}
          className="p-4 rounded-3xl bg-card border border-border/60 card-shadow cursor-pointer hover:border-primary/40 transition-all tap-shrink"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Box className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Stock
            </span>
          </div>
          <p className="text-2xl font-black text-foreground tracking-tight">{activeStockCount}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {stock.length} total tracked items
          </p>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => onNavigateTab('lowstock')}
          className={`p-4 rounded-3xl border card-shadow cursor-pointer transition-all tap-shrink ${
            lowStockItems.length > 0
              ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
              : 'bg-card border-border/60 hover:border-border'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                lowStockItems.length > 0
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </span>
            {lowStockItems.length > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider animate-pulse">
                Action
              </span>
            )}
          </div>
          <p
            className={`text-2xl font-black tracking-tight ${
              lowStockItems.length > 0 ? 'text-amber-500' : 'text-foreground'
            }`}
          >
            {lowStockItems.length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Need restock soon</p>
        </div>

        {/* Pending Shopping Items */}
        <div
          onClick={() => onNavigateTab('lists')}
          className="p-4 rounded-3xl bg-card border border-border/60 card-shadow cursor-pointer hover:border-primary/40 transition-all tap-shrink"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Shopping
            </span>
          </div>
          <p className="text-2xl font-black text-foreground tracking-tight">{pendingItems.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Items in checklist</p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => onNavigateTab('stock')}
          className={`p-4 rounded-3xl border card-shadow cursor-pointer transition-all tap-shrink ${
            expiringSoonItems.length > 0
              ? 'bg-rose-500/10 border-rose-500/30'
              : 'bg-card border-border/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                expiringSoonItems.length > 0
                  ? 'bg-rose-500/20 text-rose-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Expiry
            </span>
          </div>
          <p
            className={`text-2xl font-black tracking-tight ${
              expiringSoonItems.length > 0 ? 'text-rose-500' : 'text-foreground'
            }`}
          >
            {expiringSoonItems.length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Expiring ≤ 5 days</p>
        </div>

        {/* Monthly Grocery Spending */}
        <div className="col-span-2 md:col-span-2 p-4 rounded-3xl bg-card border border-border/60 card-shadow flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl gradient-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <TrendingDown className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Monthly Grocery Spend
              </p>
              <h3 className="text-2xl font-black text-foreground tracking-tight mt-0.5">
                {currency}
                {purchasedThisMonth.toLocaleString()}
              </h3>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateTab('lists')}
            className="rounded-xl text-xs font-bold gap-1 tap-shrink"
          >
            <span>Lists</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-4 rounded-3xl bg-card border border-border/60 card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-extrabold text-foreground tracking-tight">Quick Actions</h4>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button
            onClick={onOpenAddItem}
            className="h-11 rounded-2xl gradient-primary text-xs font-bold gap-1.5 shadow-pop tap-shrink"
          >
            <Plus className="w-4 h-4" />
            <span>Add Grocery</span>
          </Button>
          <Button
            onClick={onOpenRecordConsumption}
            variant="outline"
            className="h-11 rounded-2xl border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 text-xs font-bold gap-1.5 tap-shrink"
          >
            <Utensils className="w-4 h-4" />
            <span>Use / Consume</span>
          </Button>
          <Button
            onClick={() => onNavigateTab('lowstock')}
            variant="outline"
            className="h-11 rounded-2xl text-xs font-bold gap-1.5 tap-shrink"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Low Stock</span>
          </Button>
          <Button
            onClick={onOpenCreateList}
            variant="outline"
            className="h-11 rounded-2xl text-xs font-bold gap-1.5 tap-shrink"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <span>New List</span>
          </Button>
        </div>
      </div>

      {/* Urgent Low Stock Alert Card (if any) */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-foreground">Items Running Low</h4>
                <p className="text-[11px] text-muted-foreground">
                  {lowStockItems.length} groceries are below minimum hostel threshold
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('lowstock')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 hover:underline tap-shrink"
            >
              <span>Restock all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {lowStockItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-2xl bg-card border border-border/60 shrink-0 min-w-[130px]"
              >
                <p className="text-xs font-bold text-foreground truncate">{item.item_name}</p>
                <p className="text-[11px] text-amber-500 font-semibold mt-0.5">
                  {item.current_quantity} {item.unit} left
                </p>
                <p className="text-[10px] text-muted-foreground">Min: {item.minimum_stock}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      <div className="p-4 md:p-5 rounded-3xl bg-card border border-border/60 card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-extrabold text-foreground tracking-tight">
              Roommate Activity
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">Live updates</span>
        </div>

        {activities.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <p className="text-xs">No recent grocery movements logged yet.</p>
            <p className="text-[11px] opacity-75 mt-0.5">
              Purchases and kitchen consumption will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {activities.slice(0, 5).map((act) => (
              <div key={act.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-muted/80 flex items-center justify-center shrink-0 text-foreground font-bold text-[11px]">
                    {act.actor_name?.[0]?.toUpperCase() || 'R'}
                  </div>
                  <div className="min-w-0">
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

