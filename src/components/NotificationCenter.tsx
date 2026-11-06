import React, { useState } from 'react';
import {
  Bell,
  Sparkles,
  CheckCheck,
  CheckSquare,
  Calendar,
  CreditCard,
  ArrowLeftRight,
  Flame,
  ShieldCheck,
  Lightbulb,
  Rocket,
  Sun,
  Moon,
  Sunrise,
  X,
  BarChart3,
  ChevronRight,
  BellOff,
  Trash2,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TabId, Task, Meeting, Budget, Subscription, LentBorrowEntry, Habit, HabitLog, Expense } from '@/types';
import { AppNotification, NotificationCategory, NotificationIconType } from '@/types/notifications';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  tasks?: Task[];
  meetings?: Meeting[];
  budgets?: Budget[];
  subscriptions?: Subscription[];
  lentBorrowEntries?: LentBorrowEntry[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
  expenses?: Expense[];
  currency?: string;
  onNavigate?: (tab: TabId) => void;
  trigger?: React.ReactNode;
  className?: string;
}

export function NotificationCenter({
  tasks,
  meetings,
  budgets,
  subscriptions,
  lentBorrowEntries,
  habits,
  habitLogs,
  expenses,
  currency,
  onNavigate,
  trigger,
  className,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  } = useNotificationCenter({
    tasks,
    meetings,
    budgets,
    subscriptions,
    lentBorrowEntries,
    habits,
    habitLogs,
    expenses,
    currency,
  });

  const filteredNotifications = notifications.filter((n) => {
    if (activeCategory === 'all') return true;
    return n.category === activeCategory;
  });

  const alertsCount = notifications.filter((n) => n.category === 'alert').length;
  const updatesCount = notifications.filter((n) => n.category === 'update').length;
  const infoCount = notifications.filter((n) => n.category === 'info').length;

  const handleActionClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    if (notification.actionTab && onNavigate) {
      onNavigate(notification.actionTab);
      setOpen(false);
    }
  };

  const renderIcon = (type: NotificationIconType) => {
    switch (type) {
      case 'greeting': {
        const hour = new Date().getHours();
        if (hour >= 18 || hour < 5) return <Moon className="w-4 h-4 text-amber-500 dark:text-amber-300" />;
        if (hour < 12) return <Sunrise className="w-4 h-4 text-amber-500" />;
        return <Sun className="w-4 h-4 text-amber-500" />;
      }
      case 'update':
        return <Rocket className="w-4 h-4 text-purple-500" />;
      case 'tip':
        return <Lightbulb className="w-4 h-4 text-sky-500" />;
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-purple-500" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-teal-500" />;
      case 'budget':
        return <BarChart3 className="w-4 h-4 text-rose-500" />;
      case 'subscription':
        return <CreditCard className="w-4 h-4 text-amber-500" />;
      case 'lentborrow':
        return <ArrowLeftRight className="w-4 h-4 text-teal-500" />;
      case 'habit':
        return <Flame className="w-4 h-4 text-orange-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const getIconBackground = (type: NotificationIconType) => {
    switch (type) {
      case 'greeting':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300';
      case 'update':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300';
      case 'tip':
        return 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-300';
      case 'security':
        return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300';
      case 'task':
        return 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300';
      case 'meeting':
        return 'bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-300';
      case 'budget':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-300';
      case 'subscription':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300';
      case 'lentborrow':
        return 'bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-300';
      case 'habit':
        return 'bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-300';
      default:
        return 'bg-primary/15 border-primary/30 text-primary';
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <button
            type="button"
            aria-label="Open notification center"
            className={cn(
              'relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-card/85 hover:bg-card border border-border/70 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm tap-shrink',
              className
            )}
          >
            <Bell className="w-5 h-5 text-foreground/80 transition-transform group-hover:scale-105" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-md animate-in zoom-in-75">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        hideClose={true}
        className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-card border-l border-border z-50 overflow-hidden shadow-2xl"
      >
        {/* Header with Safe Area spacing that clears iPhone Notch & Status Bar */}
        <div className="pt-safe-modal px-4 sm:px-5 pb-3 border-b border-border bg-white dark:bg-card">
          {/* Top Bar: Title, Count & Action Buttons */}
          <div className="flex items-center justify-between min-h-[44px]">
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/15 text-primary border border-primary/25">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5 tap-shrink"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Mark read</span>
                </button>
              )}

              {/* Dedicated, clear circular close button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notification center"
                className="w-9 h-9 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors tap-shrink border border-border/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clean Segmented Filter Chips */}
          <div className="flex items-center gap-2 mt-3.5 overflow-x-auto scrollbar-hide py-0.5">
            {(
              [
                { id: 'all', label: 'All', count: notifications.length },
                { id: 'alert', label: 'Alerts', count: alertsCount },
                { id: 'update', label: 'Updates', count: updatesCount },
                { id: 'info', label: 'Tips', count: infoCount },
              ] as const
            ).map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 tap-shrink',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                        active
                          ? 'bg-primary-foreground/25 text-primary-foreground'
                          : 'bg-muted-foreground/15 text-muted-foreground'
                      )}
                    >
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Notification List */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3 scrollbar-hide bg-slate-50/80 dark:bg-zinc-950">
          {filteredNotifications.length === 0 ? (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/60 flex items-center justify-center mb-3 text-muted-foreground">
                <BellOff className="w-6 h-6 opacity-60" />
              </div>
              <p className="text-base font-bold text-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground max-w-[240px] mt-1 leading-relaxed">
                {activeCategory === 'all'
                  ? 'No notifications right now. Everything is up to date!'
                  : `No ${activeCategory} notifications at this time.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isUnread = !notification.isRead;
              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    'group relative rounded-2xl p-4 transition-all duration-150 border cursor-pointer tap-shrink',
                    isUnread
                      ? 'bg-white dark:bg-card border-primary/30 shadow-sm hover:border-primary/50'
                      : 'bg-white dark:bg-card border-border/70 hover:border-border'
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon Bubble */}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs',
                        getIconBackground(notification.iconType)
                      )}
                    >
                      {renderIcon(notification.iconType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: Title + Relative Timestamp + Unread dot + Dismiss */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4
                            className={cn(
                              'text-sm font-bold leading-snug truncate',
                              isUnread ? 'text-foreground' : 'text-foreground/80'
                            )}
                          >
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {notification.badge && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
                                {notification.badge}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {notification.timestamp}
                            </span>
                          </div>
                        </div>

                        {/* Top-right indicator & dismiss */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {isUnread && (
                            <span
                              className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/25 shrink-0"
                              title="Unread"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                            title="Dismiss notification"
                            aria-label="Dismiss notification"
                            className="w-7 h-7 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors tap-shrink"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Body Message */}
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                        {notification.message}
                      </p>

                      {/* Action Button */}
                      {notification.actionLabel && (
                        <div className="mt-3 pt-2.5 border-t border-border/30 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notification);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors tap-shrink"
                          >
                            <span>{notification.actionLabel}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Bar with Safe-Area clearance */}
        <div className="pb-safe-modal pt-3 px-4 sm:px-5 border-t border-border bg-white dark:bg-card flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-[11px] font-medium text-muted-foreground">
            {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
          </span>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5 tap-shrink py-1 px-2 rounded-lg hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
