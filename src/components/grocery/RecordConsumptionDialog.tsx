import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GroceryStockItem } from '@/types/grocery';
import { Utensils, Minus, ArrowRight } from 'lucide-react';

interface RecordConsumptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: GroceryStockItem[];
  preselectedStockItem?: GroceryStockItem | null;
  onConfirm: (stockId: string, quantityToUse: number, notes?: string) => void;
}

export function RecordConsumptionDialog({
  open,
  onOpenChange,
  stockItems,
  preselectedStockItem,
  onConfirm,
}: RecordConsumptionDialogProps) {
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (preselectedStockItem) {
      setSelectedStockId(preselectedStockItem.id);
    } else if (stockItems.length > 0 && !selectedStockId) {
      setSelectedStockId(stockItems[0].id);
    }
    setQuantity('');
    setNotes('');
  }, [preselectedStockItem, stockItems, open]);

  const activeItem = stockItems.find((s) => s.id === selectedStockId) || preselectedStockItem;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId) return;
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return;

    onConfirm(selectedStockId, qty, notes.trim() || undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5 md:p-6 bg-card border-border/80">
        <DialogHeader className="text-left">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mb-2">
            <Utensils className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
            Record Consumption
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deduct daily cooking ingredients or shared supplies used at the hostel.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Select Stock Item */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Select Grocery Item *</Label>
            <select
              required
              value={selectedStockId}
              onChange={(e) => setSelectedStockId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {stockItems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.item_name} ({s.current_quantity} {s.unit} available)
                </option>
              ))}
            </select>
          </div>

          {activeItem && (
            <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Available currently:</span>
              <span className="font-extrabold text-foreground">
                {activeItem.current_quantity} {activeItem.unit}
              </span>
            </div>
          )}

          {/* Quantity consumed */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Quantity Used / Consumed *
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                min="0.01"
                max={activeItem ? activeItem.current_quantity : undefined}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 0.5 or 250"
                className="h-11 rounded-xl bg-muted/40 font-bold text-base flex-1"
                autoFocus
              />
              <div className="h-11 px-4 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center font-bold text-sm text-foreground">
                {activeItem?.unit || 'units'}
              </div>
            </div>
          </div>

          {/* Quick preset chips */}
          {activeItem && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              {[0.25, 0.5, 1, 2].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuantity(String(preset))}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 shrink-0 tap-shrink transition-colors"
                >
                  {preset} {activeItem.unit}
                </button>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Notes (Optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dinner cooking for 3 roommates"
              className="h-11 rounded-xl bg-muted/40 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-11 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-1 h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold gap-1.5 shadow-pop tap-shrink"
            >
              <Minus className="w-4 h-4" />
              <span>Deduct from Stock</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

