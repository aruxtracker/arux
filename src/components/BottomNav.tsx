import { useState } from 'react';
import {
  LayoutDashboard, ShoppingBag, Settings, CheckSquare, Grid2X2,
  TrendingUp, Wallet, ArrowLeftRight, BarChart3, CreditCard, CalendarDays,
  Calendar, Flame, Bell, Scissors, Car, Lightbulb, ShoppingCart, FileBarChart, X, UtensilsCrossed,
} from 'lucide-react';
import { TabId } from '@/types';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }> }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'expenses', label: 'Spend', icon: ShoppingBag },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const MORE_ITEMS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }>; tint: string }[] = [
  { id: 'groceries', label: 'Groceries', icon: UtensilsCrossed, tint: 'hsl(var(--brand-orange))' },
  { id: 'income', label: 'Income', icon: TrendingUp, tint: 'hsl(var(--income))' },
  { id: 'lentborrow', label: 'Lent & Borrow', icon: ArrowLeftRight, tint: 'hsl(var(--brand-teal))' },
  { id: 'budgets', label: 'Budgets', icon: BarChart3, tint: 'hsl(var(--brand-blue))' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, tint: 'hsl(var(--brand-purple))' },
  { id: 'reports', label: 'Reports', icon: FileBarChart, tint: 'hsl(var(--brand-blue))' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, tint: 'hsl(var(--meeting))' },
  { id: 'meetings', label: 'Meetings', icon: Calendar, tint: 'hsl(var(--meeting))' },
  { id: 'habits', label: 'Habits', icon: Flame, tint: 'hsl(var(--brand-orange))' },
  { id: 'reminders', label: 'Reminders', icon: Bell, tint: 'hsl(var(--brand-yellow))' },
  { id: 'grooming', label: 'Grooming', icon: Scissors, tint: 'hsl(var(--brand-pink))' },
  { id: 'vehicles', label: 'Garage', icon: Car, tint: 'hsl(var(--brand-teal))' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, tint: 'hsl(var(--brand-yellow))' },
  { id: 'dreambucket', label: 'Dream Bucket', icon: ShoppingCart, tint: 'hsl(var(--brand-blue))' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_ITEMS.some((item) => item.id === activeTab);

  const openTab = (tab: TabId) => {
    setMoreOpen(false);
    onTabChange(tab);
  };

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 glass rounded-t-[28px] px-4 pt-3 pb-4 max-h-[75vh] overflow-y-auto card-enter">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-sm font-bold text-foreground">All features</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map(({ id, label, icon: Icon, tint }) => (
                <button
                  key={id}
                  onClick={() => openTab(id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl py-3 px-1 transition-all active:scale-95',
                    activeTab === id ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-secondary/60'
                  )}
                >
                  <span
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${tint} 18%, transparent)`, color: tint }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-semibold text-foreground leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
            <div className="h-safe-bottom" />
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
        <div className="px-3 pb-2 pointer-events-auto">
          <div className="glass rounded-[30px] px-2 py-2 flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={cn(
                    'flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 rounded-[24px] transition-all duration-200 active:scale-95',
                    isActive ? 'bg-primary text-primary-foreground shadow-pop' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="w-[21px] h-[21px]" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-bold leading-tight truncate max-w-full">{label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 rounded-[24px] transition-all duration-200 active:scale-95',
                moreActive ? 'bg-primary text-primary-foreground shadow-pop' : 'text-muted-foreground'
              )}
            >
              <Grid2X2 className="w-[21px] h-[21px]" strokeWidth={moreActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold leading-tight truncate max-w-full">More</span>
            </button>
          </div>
          <div className="h-safe-bottom" />
        </div>
      </nav>
    </>
  );
}
