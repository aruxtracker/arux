import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GroceryListItem,
  GROCERY_CATEGORIES,
  GROCERY_UNITS,
  GroceryUnit,
  GroceryCategory,
} from '@/types/grocery';
import { Plus, Sparkles, Tag, Layers } from 'lucide-react';

interface GroceryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  item?: GroceryListItem | null;
  currency?: string;
  onSave: (data: {
    listId: string;
    itemName: string;
    category: string;
    quantity: number;
    unit: GroceryUnit;
    estimatedPrice: number;
    notes?: string;
  }) => void;
}

const FREQUENT_GROCERIES = [
  { name: 'Rice', category: 'Rice & Grains', unit: 'kg' as GroceryUnit, defaultQty: 5 },
  { name: 'Atta / Wheat', category: 'Rice & Grains', unit: 'kg' as GroceryUnit, defaultQty: 5 },
  { name: 'Toor Dal', category: 'Pulses & Dal', unit: 'kg' as GroceryUnit, defaultQty: 1 },
  { name: 'Onion', category: 'Vegetables', unit: 'kg' as GroceryUnit, defaultQty: 2 },
  { name: 'Potato', category: 'Vegetables', unit: 'kg' as GroceryUnit, defaultQty: 2 },
  { name: 'Tomato', category: 'Vegetables', unit: 'kg' as GroceryUnit, defaultQty: 1 },
  { name: 'Milk', category: 'Dairy Products', unit: 'litre' as GroceryUnit, defaultQty: 1 },
  { name: 'Eggs', category: 'Dairy Products', unit: 'dozen' as GroceryUnit, defaultQty: 1 },
  { name: 'Cooking Oil', category: 'Cooking Essentials', unit: 'litre' as GroceryUnit, defaultQty: 1 },
  { name: 'Chicken', category: 'Chicken & Meat', unit: 'kg' as GroceryUnit, defaultQty: 1 },
  { name: 'Salt', category: 'Spices & Masala', unit: 'packet' as GroceryUnit, defaultQty: 1 },
  { name: 'Maggi / Noodles', category: 'Snacks', unit: 'packet' as GroceryUnit, defaultQty: 4 },
  { name: 'Tea Powder', category: 'Cooking Essentials', unit: 'packet' as GroceryUnit, defaultQty: 1 },
];

export function GroceryItemDialog({
  open,
  onOpenChange,
  listId,
  item,
  currency = '₹',
  onSave,
}: GroceryItemDialogProps) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>('Rice & Grains');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<GroceryUnit>('kg');
  const [estimatedPrice, setEstimatedPrice] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setItemName(item.item_name);
      setCategory(item.category);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setEstimatedPrice(item.estimated_price ? String(item.estimated_price) : '');
      setNotes(item.notes || '');
    } else {
      setItemName('');
      setCategory('Rice & Grains');
      setQuantity('1');
      setUnit('kg');
      setEstimatedPrice('');
      setNotes('');
    }
  }, [item, open]);

  const handleQuickAdd = (preset: typeof FREQUENT_GROCERIES[0]) => {
    setItemName(preset.name);
    setCategory(preset.category);
    setUnit(preset.unit);
    setQuantity(String(preset.defaultQty));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    onSave({
      listId,
      itemName: itemName.trim(),
      category,
      quantity: parseFloat(quantity) || 1,
      unit,
      estimatedPrice: parseFloat(estimatedPrice) || 0,
      notes: notes.trim() || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5 md:p-6 bg-card border-border/80 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
            <Plus className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
            {item ? 'Edit Grocery Item' : 'Add Grocery Item'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add items to your shared hostel / flat shopping checklist.
          </p>
        </DialogHeader>

        {/* Quick Add presets (only when adding new) */}
        {!item && (
          <div className="pt-1">
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Quick pick common items</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {FREQUENT_GROCERIES.slice(0, 8).map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleQuickAdd(preset)}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium bg-muted/60 hover:bg-muted text-foreground border border-border/50 shrink-0 tap-shrink transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Item Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Item Name *</Label>
            <Input
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Basmati Rice, Onion, Eggs"
              className="h-11 rounded-xl bg-muted/40 font-semibold"
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Category</span>
            </Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {GROCERY_CATEGORIES.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Quantity *</Label>
              <Input
                type="number"
                step="any"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>Unit</span>
              </Label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as GroceryUnit)}
                className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {GROCERY_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Price */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Estimated Price ({currency})
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                {currency}
              </span>
              <Input
                type="number"
                step="any"
                min="0"
                value={estimatedPrice}
                onChange={(e) => setEstimatedPrice(e.target.value)}
                placeholder="Optional budget estimate"
                className="pl-8 h-11 rounded-xl bg-muted/40 font-semibold"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Notes / Brand</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Daawat Rozana, check expiry date"
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
              className="w-full sm:flex-1 h-11 rounded-xl gradient-primary text-xs font-bold gap-1.5 shadow-pop tap-shrink"
            >
              {item ? 'Save Changes' : 'Add to List'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

