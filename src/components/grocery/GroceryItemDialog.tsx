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
} from '@/types/grocery';
import { Plus, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { name: 'Atta', category: 'Rice & Grains', unit: 'kg' as GroceryUnit, defaultQty: 5 },
  { name: 'Toor Dal', category: 'Pulses & Dal', unit: 'kg' as GroceryUnit, defaultQty: 1 },
  { name: 'Onion', category: 'Vegetables', unit: 'kg' as GroceryUnit, defaultQty: 2 },
  { name: 'Potato', category: 'Vegetables', unit: 'kg' as GroceryUnit, defaultQty: 2 },
  { name: 'Tomato', category: 'Vegetables', unit: 'kg' as GroceryUnit, defaultQty: 1 },
  { name: 'Milk', category: 'Dairy Products', unit: 'litre' as GroceryUnit, defaultQty: 1 },
  { name: 'Eggs', category: 'Dairy Products', unit: 'dozen' as GroceryUnit, defaultQty: 1 },
  { name: 'Oil', category: 'Cooking Essentials', unit: 'litre' as GroceryUnit, defaultQty: 1 },
  { name: 'Chicken', category: 'Chicken & Meat', unit: 'kg' as GroceryUnit, defaultQty: 1 },
  { name: 'Salt', category: 'Spices & Masala', unit: 'packet' as GroceryUnit, defaultQty: 1 },
  { name: 'Tea', category: 'Cooking Essentials', unit: 'packet' as GroceryUnit, defaultQty: 1 },
  { name: 'Maggi', category: 'Snacks', unit: 'packet' as GroceryUnit, defaultQty: 4 },
  { name: 'Soap', category: 'Personal Care', unit: 'pieces' as GroceryUnit, defaultQty: 2 },
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
  const [category, setCategory] = useState<string>('Vegetables');
  const [quantity, setQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<GroceryUnit>('kg');
  const [estimatedPrice, setEstimatedPrice] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showExtras, setShowExtras] = useState(false);

  useEffect(() => {
    if (item) {
      setItemName(item.item_name);
      setCategory(item.category);
      setQuantity(String(item.quantity));
      setUnit(item.unit);
      setEstimatedPrice(item.estimated_price ? String(item.estimated_price) : '');
      setNotes(item.notes || '');
      setShowExtras(!!(item.estimated_price || item.notes));
    } else {
      setItemName('');
      setCategory('Vegetables');
      setQuantity('1');
      setUnit('kg');
      setEstimatedPrice('');
      setNotes('');
      setShowExtras(false);
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

  const selectedCategoryData = GROCERY_CATEGORIES.find((c) => c.name === category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-24px)] mx-auto rounded-3xl p-0 bg-card border-border/80 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 shrink-0">
          <DialogHeader className="text-left space-y-0">
            <DialogTitle className="text-lg font-extrabold text-foreground tracking-tight">
              {item ? '✏️ Edit Item' : '+ Add Grocery'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item ? 'Update the item details below.' : 'Add to your shared shopping checklist.'}
            </p>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">

          {/* Quick pick (only on add) */}
          {!item && (
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Quick pick</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
                {FREQUENT_GROCERIES.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleQuickAdd(preset)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border shrink-0 tap-shrink transition-all',
                      itemName === preset.name
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'bg-muted/50 hover:bg-muted text-foreground border-border/50'
                    )}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Item Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Item Name *</Label>
            <Input
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Basmati Rice, Onion, Eggs…"
              className="h-11 rounded-xl bg-muted/40 font-semibold text-sm"
              autoFocus={!item}
            />
          </div>

          {/* Category pills */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Category</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {GROCERY_CATEGORIES.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-center border transition-all tap-shrink',
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold'
                        : 'bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className="text-base leading-none">{cat.emoji}</span>
                    <span className="text-[9px] font-semibold leading-tight line-clamp-2 text-center">
                      {cat.name.replace(' & ', ' &\n')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity + Unit */}
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
                className="h-11 rounded-xl bg-muted/40 font-bold text-center text-base"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Unit</Label>
              <div className="flex flex-wrap gap-1 pt-1">
                {GROCERY_UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all tap-shrink',
                      unit === u
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional fields toggle */}
          <button
            type="button"
            onClick={() => setShowExtras((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors tap-shrink"
          >
            {showExtras ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showExtras ? 'Hide' : 'Add'} price & notes (optional)</span>
          </button>

          {showExtras && (
            <div className="space-y-3 pb-1">
              {/* Estimated Price */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Estimated Price ({currency}) — optional
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
                    placeholder="0"
                    className="pl-8 h-11 rounded-xl bg-muted/40 font-semibold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Notes / Brand — optional</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Daawat Rozana, check expiry"
                  className="h-11 rounded-xl bg-muted/40 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-2 pb-5 shrink-0 border-t border-border/40">
          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl text-xs px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!itemName.trim() || !quantity}
              className="flex-1 h-11 rounded-xl gradient-primary text-sm font-bold gap-1.5 shadow-pop tap-shrink"
            >
              <Plus className="w-4 h-4" />
              {item ? 'Save Changes' : `Add ${selectedCategoryData?.emoji || ''} Item`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
