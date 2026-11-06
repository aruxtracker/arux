import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GroceryStockItem,
  GROCERY_CATEGORIES,
  GROCERY_UNITS,
  GroceryUnit,
} from '@/types/grocery';
import { Box, Tag, Calendar, MapPin, AlertCircle } from 'lucide-react';

interface StockItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: GroceryStockItem | null;
  currency?: string;
  onSave: (data: {
    itemName: string;
    category: string;
    currentQuantity: number;
    unit: GroceryUnit;
    minimumStock: number;
    purchasePrice?: number;
    expiryDate?: string;
    storageLocation?: string;
    notes?: string;
  }) => void;
}

export function StockItemDialog({
  open,
  onOpenChange,
  item,
  currency = '₹',
  onSave,
}: StockItemDialogProps) {
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<string>('Rice & Grains');
  const [currentQuantity, setCurrentQuantity] = useState<string>('1');
  const [unit, setUnit] = useState<GroceryUnit>('kg');
  const [minimumStock, setMinimumStock] = useState<string>('1');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [storageLocation, setStorageLocation] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setItemName(item.item_name);
      setCategory(item.category);
      setCurrentQuantity(String(item.current_quantity));
      setUnit(item.unit);
      setMinimumStock(String(item.minimum_stock));
      setPurchasePrice(item.purchase_price ? String(item.purchase_price) : '');
      setExpiryDate(item.expiry_date || '');
      setStorageLocation(item.storage_location || '');
      setNotes(item.notes || '');
    } else {
      setItemName('');
      setCategory('Rice & Grains');
      setCurrentQuantity('1');
      setUnit('kg');
      setMinimumStock('1');
      setPurchasePrice('');
      setExpiryDate('');
      setStorageLocation('');
      setNotes('');
    }
  }, [item, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    onSave({
      itemName: itemName.trim(),
      category,
      currentQuantity: parseFloat(currentQuantity) || 0,
      unit,
      minimumStock: parseFloat(minimumStock) || 1,
      purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
      expiryDate: expiryDate || undefined,
      storageLocation: storageLocation.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5 md:p-6 bg-card border-border/80 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
            <Box className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
            {item ? 'Edit Stock Item' : 'Add Stock Item'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track supplies currently available at home or in the hostel.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Item Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Item Name *</Label>
            <Input
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Rice, Mustard Oil, Tea Bags"
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
              <Label className="text-xs font-semibold text-muted-foreground">Current Stock *</Label>
              <Input
                type="number"
                step="any"
                min="0"
                required
                value={currentQuantity}
                onChange={(e) => setCurrentQuantity(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Unit</Label>
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

          {/* Minimum Stock Level (Low Stock trigger) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>Minimum Stock Alert Level *</span>
            </Label>
            <Input
              type="number"
              step="any"
              min="0.1"
              required
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              placeholder="e.g. 2"
              className="h-11 rounded-xl bg-muted/40 font-semibold"
            />
            <p className="text-[11px] text-muted-foreground">
              Item will trigger a low-stock alert when available quantity falls below this level.
            </p>
          </div>

          {/* Optional: Expiry Date & Purchase Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Expiry Date</span>
              </Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="h-11 rounded-xl bg-muted/40 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Purchase Price ({currency})
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="Optional"
                className="h-11 rounded-xl bg-muted/40 font-semibold text-xs"
              />
            </div>
          </div>

          {/* Storage Location & Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Storage Location</span>
            </Label>
            <Input
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Top Shelf, Fridge, Room Cupboard"
              className="h-11 rounded-xl bg-muted/40 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details"
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
              {item ? 'Update Stock' : 'Add to Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

