import { GroceryStockItem } from '@/types/grocery';
import { AlertTriangle, ShoppingCart, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LowStockSectionProps {
  lowStockItems: GroceryStockItem[];
  currency?: string;
  onAddToList: (item: GroceryStockItem, suggestedQty?: number) => void;
  onRestockAll: () => void;
}

export function LowStockSection({
  lowStockItems,
  currency = '₹',
  onAddToList,
  onRestockAll,
}: LowStockSectionProps) {
  if (lowStockItems.length === 0) {
    return (
      <div className="p-8 text-center rounded-3xl bg-card border border-border/60 card-shadow space-y-2 animate-in fade-in duration-300">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="text-base font-extrabold text-foreground tracking-tight">
          All Stocks Well-Supplied!
        </h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          None of your hostel or household supplies are running low. All items are above their
          minimum threshold.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-foreground tracking-tight">
              Low Stock Warnings ({lowStockItems.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              These items are at or below their minimum required quantities.
            </p>
          </div>
        </div>

        <Button
          onClick={onRestockAll}
          className="h-10 px-3.5 rounded-xl gradient-primary text-xs font-bold gap-1.5 shadow-pop shrink-0 tap-shrink"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Add All to List</span>
        </Button>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {lowStockItems.map((item) => {
          const suggestedRestock = Math.max(1, item.minimum_stock * 2 - item.current_quantity);

          return (
            <div
              key={item.id}
              className="p-4 rounded-3xl bg-card border border-border/60 card-shadow flex items-center justify-between gap-3 tap-shrink hover:border-primary/40 transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-foreground truncate">{item.item_name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    Low Stock
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>
                    Current: <strong className="text-amber-500">{item.current_quantity} {item.unit}</strong>
                  </span>
                  <span>•</span>
                  <span>Min: <strong>{item.minimum_stock} {item.unit}</strong></span>
                  {item.storage_location && (
                    <>
                      <span>•</span>
                      <span className="truncate">{item.storage_location}</span>
                    </>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => onAddToList(item, suggestedRestock)}
                className="h-9 px-3 rounded-xl gradient-primary text-xs font-bold gap-1.5 shadow-xs shrink-0 tap-shrink"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ {suggestedRestock} {item.unit}</span>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

