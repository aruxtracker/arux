import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GroceryListItem } from '@/types/grocery';
import { CheckCircle2, ShoppingBag, Box, ArrowRight } from 'lucide-react';

interface GroceryPurchaseModalProps {
  item: GroceryListItem | null;
  currency?: string;
  onConfirm: (options: {
    actualPrice: number;
    actualQuantity: number;
    addToStock: boolean;
    syncToExpenses: boolean;
  }) => void;
  onCancel: () => void;
}

export function GroceryPurchaseModal({
  item,
  currency = '₹',
  onConfirm,
  onCancel,
}: GroceryPurchaseModalProps) {
  const [actualPrice, setActualPrice] = useState<string>('');
  const [actualQuantity, setActualQuantity] = useState<string>('');
  const [addToStock, setAddToStock] = useState<boolean>(true);
  const [syncToExpenses, setSyncToExpenses] = useState<boolean>(true);

  useEffect(() => {
    if (item) {
      setActualPrice(item.estimated_price ? String(item.estimated_price) : '');
      setActualQuantity(item.quantity ? String(item.quantity) : '1');
      setAddToStock(true);
      setSyncToExpenses(true);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      actualPrice: parseFloat(actualPrice) || 0,
      actualQuantity: parseFloat(actualQuantity) || item.quantity,
      addToStock,
      syncToExpenses,
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md rounded-3xl p-5 md:p-6 bg-card border-border/80">
        <DialogHeader className="text-left">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
            Confirm Purchase
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Purchasing <span className="font-bold text-foreground">{item.item_name}</span> ({item.quantity} {item.unit})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Actual Price */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Actual Price Spent ({currency})
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                {currency}
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                required
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                placeholder={item.estimated_price ? String(item.estimated_price) : '0'}
                className="pl-8 h-11 rounded-xl bg-muted/40 font-bold text-base"
                autoFocus
              />
            </div>
            {item.estimated_price > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Estimated budget was: {currency}{item.estimated_price}
              </p>
            )}
          </div>

          {/* Actual Quantity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Actual Quantity Purchased
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                min="0.1"
                required
                value={actualQuantity}
                onChange={(e) => setActualQuantity(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 font-bold flex-1"
              />
              <div className="h-11 px-4 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center font-bold text-sm text-foreground">
                {item.unit}
              </div>
            </div>
          </div>

          {/* Smart Integration Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-border/40">
            {/* Stock Integration */}
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={addToStock}
                onChange={(e) => setAddToStock(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-primary border-border focus:ring-primary accent-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">Add to Grocery Stock Tracker</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Automatically updates your hostel/home stock quantity without duplicate entries.
                </p>
              </div>
            </label>

            {/* Expense Integration */}
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={syncToExpenses}
                onChange={(e) => setSyncToExpenses(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-primary border-border focus:ring-primary accent-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Log to Arux Expense Tracker</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                  Adds to your monthly budget and Groceries expense category without double-counting.
                </p>
              </div>
            </label>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto h-11 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-1 h-11 rounded-xl gradient-primary text-xs font-bold gap-1.5 shadow-pop tap-shrink"
            >
              <span>Confirm & Record</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

