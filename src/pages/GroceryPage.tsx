import { useState } from 'react';
import { useGroceryData } from '@/hooks/useGroceryData';
import { GroceryDashboard } from '@/components/grocery/GroceryDashboard';
import { GroceryShoppingList } from '@/components/grocery/GroceryShoppingList';
import { GroceryStockTracker } from '@/components/grocery/GroceryStockTracker';
import { LowStockSection } from '@/components/grocery/LowStockSection';
import { GroceryItemDialog } from '@/components/grocery/GroceryItemDialog';
import { StockItemDialog } from '@/components/grocery/StockItemDialog';
import { RecordConsumptionDialog } from '@/components/grocery/RecordConsumptionDialog';
import { GroceryPurchaseModal } from '@/components/grocery/GroceryPurchaseModal';
import { HouseholdDialog } from '@/components/grocery/HouseholdDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TabId } from '@/types';
import {
  GroceryListItem,
  GroceryStockItem,
} from '@/types/grocery';
import {
  LayoutDashboard,
  ShoppingCart,
  Box,
  AlertTriangle,
  Users,
  Plus,
  Utensils,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface GroceryPageProps {
  currency?: string;
  onAddExpense?: (expense: { amount: number; category: any; date: string; notes?: string }) => Promise<void> | void;
  onNavigate?: (tab: TabId) => void;
}

type GroceryTab = 'overview' | 'lists' | 'stock' | 'lowstock' | 'roommates';

export function GroceryPage({
  currency = '₹',
  onAddExpense,
  onNavigate,
}: GroceryPageProps) {
  const [activeTab, setActiveTab] = useState<GroceryTab>('overview');

  const {
    user,
    userName,
    loading,
    households,
    activeHousehold,
    switchHousehold,
    createHousehold,
    inviteMemberByEmail,
    removeHouseholdMember,
    deleteHousehold,
    members,
    lists,
    createList,
    updateList,
    deleteList,
    duplicateList,
    clearCompletedItems,
    listItems,
    addListItem,
    updateListItem,
    deleteListItem,
    markItemPurchased,
    uncheckItem,
    stock,
    addStockItem,
    updateStockItem,
    deleteStockItem,
    recordConsumption,
    addLowStockToList,
    movements,
    activities,
    lowStockItems,
    expiringSoonItems,
  } = useGroceryData({ onAddExpense });

  // Dialog States
  const [activeListId, setActiveListId] = useState<string>('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryListItem | null>(null);

  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<GroceryStockItem | null>(null);

  const [consumptionDialogOpen, setConsumptionDialogOpen] = useState(false);
  const [preselectedStock, setPreselectedStock] = useState<GroceryStockItem | null>(null);

  const [purchaseModalItem, setPurchaseModalItem] = useState<GroceryListItem | null>(null);
  const [householdDialogOpen, setHouseholdDialogOpen] = useState(false);

  // New List Modal State
  const [createListOpen, setCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#10b981');

  const currentListId = activeListId || lists[0]?.id || '';

  const handleCreateListSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    createList(newListName.trim(), newListColor);
    setNewListName('');
    setCreateListOpen(false);
  };

  const handleRestockAllLowStock = () => {
    if (lowStockItems.length === 0) return;
    lowStockItems.forEach((item) => {
      addLowStockToList(item, currentListId);
    });
    toast.success(`Added ${lowStockItems.length} low-stock items to your shopping list!`);
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 md:space-y-6 pb-6 box-border">
      {/* Top Header Card */}
      <div className="w-full max-w-full min-w-0 px-4 md:px-0 pt-2 flex items-center justify-between gap-2.5 box-border card-enter">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground font-semibold tracking-wide uppercase">
            Hostel & Flat Living
          </p>
          <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight flex items-center gap-1.5 truncate">
            <span>Grocery & Pantry</span>
            <span className="text-lg sm:text-xl">🛒</span>
          </h1>
        </div>

        {/* Household selector pill button */}
        <button
          type="button"
          onClick={() => setHouseholdDialogOpen(true)}
          className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-2xl bg-card border border-border/70 card-shadow flex items-center gap-1.5 shrink-0 hover:border-primary/50 transition-all tap-shrink"
        >
          <Building className="w-4 h-4 text-primary shrink-0" />
          <div className="text-left hidden sm:block">
            <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none">
              Group
            </p>
            <p className="text-xs font-extrabold text-foreground leading-snug truncate max-w-[120px]">
              {activeHousehold ? activeHousehold.name : 'Solo / Flat'}
            </p>
          </div>
          <span className="sm:hidden text-xs font-bold text-foreground truncate max-w-[80px]">
            {activeHousehold ? activeHousehold.name : 'Flat'}
          </span>
        </button>
      </div>

      {/* Main Section Navigation Pills */}
      <div className="w-full max-w-full min-w-0 px-4 md:px-0 box-border">
        <div className="w-full max-w-full flex gap-1 p-1 rounded-2xl bg-muted/50 border border-border/40 overflow-x-auto scrollbar-hide box-border">
          {(
            [
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              {
                id: 'lists',
                label: 'Shopping List',
                icon: ShoppingCart,
                badge: listItems.filter((i) => !i.is_purchased).length,
              },
              { id: 'stock', label: 'Stock Tracker', icon: Box, badge: stock.length },
              {
                id: 'lowstock',
                label: 'Low Stock',
                icon: AlertTriangle,
                badge: lowStockItems.length,
                badgeColor: 'amber',
              },
              { id: 'roommates', label: 'Flatmates', icon: Users },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as GroceryTab)}
                className={cn(
                  'shrink-0 sm:flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 tap-shrink',
                  active
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5',
                      tab.badgeColor === 'amber'
                        ? 'bg-amber-500 text-white'
                        : active
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Body */}
      <div className="w-full max-w-full min-w-0 px-4 md:px-0 box-border">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <GroceryDashboard
            lists={lists}
            listItems={listItems}
            stock={stock}
            activities={activities}
            lowStockItems={lowStockItems}
            expiringSoonItems={expiringSoonItems}
            currency={currency}
            onNavigateTab={(tab) => {
              if (tab === 'activity') setActiveTab('roommates');
              else setActiveTab(tab as GroceryTab);
            }}
            onOpenAddItem={() => {
              setEditingItem(null);
              setItemDialogOpen(true);
            }}
            onOpenCreateList={() => setCreateListOpen(true)}
            onOpenRecordConsumption={() => {
              setPreselectedStock(null);
              setConsumptionDialogOpen(true);
            }}
          />
        )}

        {/* TAB 2: SHOPPING LIST */}
        {activeTab === 'lists' && (
          <GroceryShoppingList
            lists={lists}
            activeListId={currentListId}
            onSelectList={setActiveListId}
            listItems={listItems}
            currency={currency}
            onAddItem={(listId) => {
              setActiveListId(listId);
              setEditingItem(null);
              setItemDialogOpen(true);
            }}
            onEditItem={(item) => {
              setEditingItem(item);
              setItemDialogOpen(true);
            }}
            onDeleteItem={deleteListItem}
            onToggleItem={(item) => setPurchaseModalItem(item)}
            onUncheckItem={uncheckItem}
            onCreateList={() => setCreateListOpen(true)}
            onDuplicateList={duplicateList}
            onClearCompleted={clearCompletedItems}
            onDeleteList={deleteList}
          />
        )}

        {/* TAB 3: STOCK TRACKER */}
        {activeTab === 'stock' && (
          <GroceryStockTracker
            stock={stock}
            movements={movements}
            currency={currency}
            onAddStock={() => {
              setEditingStockItem(null);
              setStockDialogOpen(true);
            }}
            onEditStock={(item) => {
              setEditingStockItem(item);
              setStockDialogOpen(true);
            }}
            onDeleteStock={deleteStockItem}
            onRecordConsumption={(item) => {
              setPreselectedStock(item);
              setConsumptionDialogOpen(true);
            }}
            onAddLowStockToList={(item) => addLowStockToList(item, currentListId)}
          />
        )}

        {/* TAB 4: LOW STOCK */}
        {activeTab === 'lowstock' && (
          <LowStockSection
            lowStockItems={lowStockItems}
            currency={currency}
            onAddToList={(item, qty) => addLowStockToList(item, currentListId, qty)}
            onRestockAll={handleRestockAllLowStock}
          />
        )}

        {/* TAB 5: ROOMMATES & ACTIVITY */}
        {activeTab === 'roommates' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-card border border-border/60 card-shadow space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground tracking-tight">
                    {activeHousehold ? activeHousehold.name : 'Personal Household'}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeHousehold
                      ? `${members.length || 1} roommate${(members.length || 1) === 1 ? '' : 's'} sharing groceries`
                      : 'Not connected to a shared flat group.'}
                  </p>
                </div>
                <Button
                  onClick={() => setHouseholdDialogOpen(true)}
                  className="h-9 rounded-xl gradient-primary text-xs font-bold shadow-xs tap-shrink"
                >
                  Manage Group
                </Button>
              </div>

              {activeHousehold && (
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Roommate Permissions
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    All invited roommates can check off groceries, update stock levels,
                    and record daily cooking consumption together in real-time.
                  </p>
                </div>
              )}
            </div>

            {/* Roommate Activity Timeline */}
            <div className="p-5 rounded-3xl bg-card border border-border/60 card-shadow space-y-3">
              <h4 className="text-sm font-extrabold text-foreground tracking-tight">
                Live Household Log
              </h4>
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-border/40">
                  {activities.map((act) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-foreground">
                          {act.actor_name} {act.action} {act.item_name}
                        </p>
                        {act.details && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{act.details}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(act.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Add / Edit Item Dialog */}
      <GroceryItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        listId={currentListId}
        item={editingItem}
        currency={currency}
        onSave={(data) => {
          if (editingItem) {
            updateListItem(editingItem.id, {
              item_name: data.itemName,
              category: data.category,
              quantity: data.quantity,
              unit: data.unit,
              estimated_price: data.estimatedPrice,
              notes: data.notes,
            });
          } else {
            addListItem(data);
          }
        }}
      />

      {/* 2. Add / Edit Stock Item Dialog */}
      <StockItemDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        item={editingStockItem}
        currency={currency}
        onSave={(data) => {
          if (editingStockItem) {
            updateStockItem(editingStockItem.id, {
              item_name: data.itemName,
              category: data.category,
              current_quantity: data.currentQuantity,
              unit: data.unit,
              minimum_stock: data.minimumStock,
              purchase_price: data.purchasePrice,
              expiry_date: data.expiryDate,
              storage_location: data.storageLocation,
              notes: data.notes,
            });
          } else {
            addStockItem(data);
          }
        }}
      />

      {/* 3. Record Consumption Dialog */}
      <RecordConsumptionDialog
        open={consumptionDialogOpen}
        onOpenChange={setConsumptionDialogOpen}
        stockItems={stock}
        preselectedStockItem={preselectedStock}
        onConfirm={recordConsumption}
      />

      {/* 4. Purchase Confirmation Modal (Smart Integration) */}
      <GroceryPurchaseModal
        item={purchaseModalItem}
        currency={currency}
        onConfirm={(options) => {
          if (purchaseModalItem) {
            markItemPurchased(purchaseModalItem.id, options);
            setPurchaseModalItem(null);
          }
        }}
        onCancel={() => setPurchaseModalItem(null)}
      />

      {/* 5. Household Sharing Dialog */}
      <HouseholdDialog
        open={householdDialogOpen}
        onOpenChange={setHouseholdDialogOpen}
        households={households}
        activeHousehold={activeHousehold}
        members={members}
        currentUserId={user?.id}
        currentUserEmail={user?.email}
        onSwitchHousehold={switchHousehold}
        onCreateHousehold={createHousehold}
        onInviteByEmail={inviteMemberByEmail}
        onRemoveMember={removeHouseholdMember}
        onDeleteHousehold={deleteHousehold}
      />

      {/* 6. Create New Shopping List Modal */}
      <Dialog open={createListOpen} onOpenChange={setCreateListOpen}>
        <DialogContent className="max-w-md rounded-3xl p-5 md:p-6 bg-card border-border/80">
          <DialogHeader className="text-left">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
              <Plus className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
              Create Shopping List
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateListSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">List Name *</Label>
              <Input
                required
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Weekly Veggies, Emergency Snacks, Monthly Ration"
                className="h-11 rounded-xl bg-muted/40 font-semibold"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Color Tag</Label>
              <div className="flex gap-2">
                {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewListColor(c)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform tap-shrink',
                      newListColor === c ? 'scale-110 border-foreground' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateListOpen(false)}
                className="w-full sm:w-auto h-11 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:flex-1 h-11 rounded-xl gradient-primary text-xs font-bold shadow-pop tap-shrink"
              >
                Create List
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

