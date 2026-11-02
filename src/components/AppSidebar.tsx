import { LayoutDashboard, TrendingUp, ShoppingBag, Calendar, Settings, LogOut, CheckSquare, Flame, Bell, Lightbulb, ShoppingCart, Car, FileBarChart, Scissors, Wallet, CreditCard, CalendarDays, ArrowLeftRight } from 'lucide-react';
import { TabId } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark } from '@/components/BrandMark';

interface AppSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const SECTIONS: { title: string; tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }> }[] }[] = [
  {
    title: 'Overview',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    title: 'Money',
    tabs: [
      { id: 'income', label: 'Income', icon: TrendingUp },
      { id: 'expenses', label: 'Expenses', icon: ShoppingBag },
      { id: 'lentborrow', label: 'Lent & Borrow', icon: ArrowLeftRight },
      { id: 'budgets', label: 'Budgets', icon: Wallet },
      { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    ],
  },
  {
    title: 'Life',
    tabs: [
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
      { id: 'habits', label: 'Habits', icon: Flame },
      { id: 'grooming', label: 'Grooming', icon: Scissors },
      { id: 'meetings', label: 'Meetings', icon: Calendar },
      { id: 'reminders', label: 'Reminders', icon: Bell },
      { id: 'vehicles', label: 'My Garage', icon: Car },
    ],
  },
  {
    title: 'Mind',
    tabs: [
      { id: 'ideas', label: 'Ideas', icon: Lightbulb },
      { id: 'dreambucket', label: 'Dream Bucket', icon: ShoppingCart },
    ],
  },
  {
    title: 'System',
    tabs: [
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-border/60 bg-sidebar/70 backdrop-blur-xl px-3 py-4 gap-1 sticky top-0 max-h-screen">
      <div className="flex items-center px-2 py-2 mb-3">
        <div className="w-32 shrink-0 px-1">
          <BrandMark className="w-full" />
        </div>
      </div>

      <nav className="flex flex-col gap-4 flex-1 overflow-y-auto scrollbar-hide px-1">
        {SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] px-3 mb-1">
              {section.title}
            </p>
            {section.tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => onTabChange(id)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )}
                >
                  <Icon className={cn('w-[18px] h-[18px] transition-colors', isActive && 'text-primary')} strokeWidth={isActive ? 2.4 : 2} />
                  <span className={cn('truncate', isActive && 'font-semibold')}>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-2 px-3 py-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3">
        {user && (
          <>
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground font-semibold truncate">{user.email}</p>
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors mt-0.5"
              >
                <LogOut className="w-3 h-3" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
