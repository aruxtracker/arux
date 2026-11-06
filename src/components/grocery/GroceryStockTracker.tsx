import { useState, useMemo } from 'react';
import {
  GroceryStockItem,
  GroceryStockMovement,
  GROCERY_CATEGORIES,
  GROCERY_CATEGORY_EMOJI,
} from '@/types/grocery';
import {
  Box,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Utensils,
  MapPin,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  History,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface GroceryStockTrackerProps {
  stock: GroceryStockItem[];
  movements: GroceryStockMovement[];
  currency?: string;
  onAddStock: () => void;
  onEditStock: (item: GroceryStockItem) => void;
  onDeleteStock: (id: string) => void;
  onRecordConsumption: (item: GroceryStockItem) => void;
  onAddLowStockToList: (item: GroceryStockItem) => void;
}

export function GroceryStockTracker({
  stock,
  movements,
  currency = '₹',
  onAddStock,
  onEditStock,
  onDeleteStock,
  onRecordConsumption,
  onAddLowStockToList,
}: GroceryStockTrackerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'inventory' | 'movements'>('inventory');

  // Filtered Stock
  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const matchSearch =
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.storage_location && item.storage_location.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [stock, search, selectedCategory]);

  const now = new Date();

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Search & Action Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pantry or storage location..."
            className="pl-9 h-11 rounded-2xl bg-card border-border/70 text-xs font-semibold"
          />
        </div>

        <Button
          onClick={onAddStock}
          className="h-11 px-4 rounded-2xl gradient-primary text-xs font-bold gap-1.5 shadow-pop shrink-0 tap-shrink"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Stock</span>
        </Button>
      </div>

      {/* View Toggle: Inventory vs Movements */}
      <div className="flex items-center justify-between gap-2">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 flex-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-shrink border',
              selectedCategory === 'all'
                ? 'bg-foreground text-background border-transparent'
                : 'bg-card border-border/60 text-muted-foreground hover:text-foreground'
            )}
          >
            All Items ({stock.length})
          </button>
          {GROCERY_CATEGORIES.map((cat) => {
            const count = stock.filter((s) => s.category === cat.name).length;
            if (count === 0 && selectedCategory !== cat.name) return null;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all tap-shrink border flex items-center gap-1',
                  selectedCategory === cat.name
                    ? 'bg-foreground text-background border-transparent'
                    : 'bg-card border-border/60 text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* View Switch */}
        <div className="flex p-0.5 rounded-xl bg-muted/60 border border-border/50 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('inventory')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all tap-shrink',
              viewMode === 'inventory' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            )}
          >
            Stock
          </button>
          <button
            type="button"
            onClick={() => setViewMode('movements')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-bold transition-all tap-shrink flex items-center gap-1',
              viewMode === 'movements' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'
            )}
          >
            <History className="w-3 h-3" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: INVENTORY CARDS */}
      {viewMode === 'inventory' && (
        <div className="space-y-3">
          {filteredStock.length === 0 ? (
            <div className="p-8 text-center rounded-3xl bg-card border border-border/60 card-shadow text-muted-foreground space-y-2">
              <Box className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-bold text-foreground">No stock items found</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {search || selectedCategory !== 'all'
                  ? 'No items match your search or filter.'
                  : 'Start tracking what groceries you have at home or hostel.'}
              </p>
              <Button
                onClick={onAddStock}
                className="mt-2 h-9 rounded-xl gradient-primary text-xs font-bold"
              >
                Add Your First Stock Item
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredStock.map((item) => {
                const isLowStock = item.current_quantity <= item.minimum_stock;

                // Expiry calculation
                let expiryStatus: 'normal' | 'soon' | 'expired' = 'normal';
                let daysLeft = null;
                if (item.expiry_date) {
                  const expDate = new Date(item.expiry_date);
                  daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysLeft < 0) expiryStatus = 'expired';
                  else if (daysLeft <= 5) expiryStatus = 'soon';
                }

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 rounded-3xl bg-card border card-shadow transition-all space-y-3',
                      isLowStock
                        ? 'border-amber-500/40 hover:border-amber-500'
                        : 'border-border/60 hover:border-border'
                    )}
                  >
                    {/* Top Row: Name, Category, Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">
                            {GROCERY_CATEGORY_EMOJI[item.category] || '🛒'}
                          </span>
                          <h4 className="text-sm font-extrabold text-foreground truncate">
                            {item.item_name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.category}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isLowStock && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Low Stock</span>
                          </span>
                        )}
                        {expiryStatus === 'expired' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-destructive/15 text-destructive border border-destructive/30">
                            Expired
                          </span>
                        )}
                        {expiryStatus === 'soon' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                            Exp in {daysLeft}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Level Counter */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Current Stock
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-black text-foreground">
                            {item.current_quantity}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground">{item.unit}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Min Level
                        </span>
                        <span className="text-xs font-extrabold text-muted-foreground mt-0.5 block">
                          {item.minimum_stock} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Meta info: Storage location, Expiry */}
                    {(item.storage_location || item.expiry_date || item.purchase_price) && (
                      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        {item.storage_location && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span>{item.storage_location}</span>
                          </span>
                        )}
                        {item.purchase_price && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                            <span>Price: {currency}{item.purchase_price}</span>
                          </span>
                        )}
                        {item.expiry_date && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                            <Calendar className="w-3 h-3 text-rose-400" />
                            <span>Exp: {item.expiry_date}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Controls */}
                    <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => onRecordConsumption(item)}
                          className="h-8 px-2.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-xs font-bold gap-1 tap-shrink"
                        >
                          <Utensils className="w-3 h-3" />
                          <span>Consume</span>
                        </Button>

                        {isLowStock && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddLowStockToList(item)}
                            className="h-8 px-2 rounded-xl text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10 tap-shrink"
                            title="Add to shopping list"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span className="hidden sm:inline">Restock</span>
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditStock(item)}
                          className="text-[11px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStock(item.id)}
                          aria-label="Delete stock item"
                          className="text-muted-foreground/50 hover:text-destructive p-1 rounded-lg hover:bg-muted transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MOVEMENT HISTORY */}
      {viewMode === 'movements' && (
        <div className="p-4 md:p-5 rounded-3xl bg-card border border-border/60 card-shadow space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-foreground tracking-tight">
              Stock Movement History
            </h4>
            <span className="text-[11px] text-muted-foreground">Past 50 records</span>
          </div>

          {movements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-1">
              <History className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs font-semibold">No stock movements recorded yet</p>
              <p className="text-[11px] opacity-75">
                Every purchase, consumption, and adjustment is tracked here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {movements.map((mov) => {
                const isPurchase = mov.movement_type === 'purchase';
                const isConsumption = mov.movement_type === 'consumption';

                return (
                  <div key={mov.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          'w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[11px]',
                          isPurchase
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : isConsumption
                            ? 'bg-orange-500/15 text-orange-500'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isPurchase ? '+' : isConsumption ? '−' : '•'}
                      </span>
                      <div>
                        <p className="font-bold text-foreground capitalize">
                          {mov.movement_type}: {mov.quantity} {mov.unit}
                        </p>
                        {mov.notes && (
                          <p className="text-[11px] text-muted-foreground">{mov.notes}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(mov.created_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

