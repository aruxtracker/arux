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
        if (hour >= 18 || hour < 5) return <Moon className="w-4 h-4 text-amber-300" />;
        if (hour < 12) return <Sunrise className="w-4 h-4 text-amber-500" />;
        return <Sun className="w-4 h-4 text-amber-500" />;
      }
      case 'update':
        return <Rocket className="w-4 h-4 text-purple-400" />;
      case 'tip':
        return <Lightbulb className="w-4 h-4 text-sky-400" />;
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-purple-400" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-teal-400" />;
      case 'budget':
        return <BarChart3 className="w-4 h-4 text-rose-400" />;
      case 'subscription':
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case 'lentborrow':
        return <ArrowLeftRight className="w-4 h-4 text-teal-400" />;
      case 'habit':
        return <Flame className="w-4 h-4 text-orange-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const getIconBackground = (type: NotificationIconType) => {
    switch (type) {
      case 'greeting':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'update':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'tip':
        return 'bg-sky-500/10 border-sky-500/20';
      case 'security':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'task':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'meeting':
        return 'bg-teal-500/10 border-teal-500/20';
      case 'budget':
        return 'bg-rose-500/10 border-rose-500/20';
      case 'subscription':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'lentborrow':
        return 'bg-teal-500/10 border-teal-500/20';
      case 'habit':
        return 'bg-orange-500/10 border-orange-500/20';
      default:
        return 'bg-primary/10 border-primary/20';
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
              'relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-card/80 hover:bg-card border border-border/60 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm tap-shrink',
              className
            )}
          >
            <Bell className="w-5 h-5 text-foreground/80 transition-transform group-hover:scale-105" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-md animate-in zoom-in-75">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        hideClose={true}
        className="w-full sm:max-w-md p-0 flex flex-col bg-background/95 backdrop-blur-2xl border-l border-border/60 z-50 overflow-hidden"
      >
        {/* Safe-Area Aware Header */}
        <div className="pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))] px-4 sm:px-5 pb-3 border-b border-border/40 bg-background/80 backdrop-blur-md">
          {/* Top Bar: Title & Actions */}
          <div className="flex items-center justify-between min-h-[40px]">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/20">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}

              {/* Explicit, clean circular close button that never overlaps status bar */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notification center"
                className="w-8 h-8 rounded-full bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors tap-shrink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto scrollbar-hide py-0.5">
            {(
              [
                { id: 'all', label: 'All', count: notifications.length },
                { id: 'alert', label: 'Alerts', count: alertsCount },
                { id: 'update', label: 'Updates', count: updatesCount },
                { id: 'info', label: 'Tips & Info', count: infoCount },
              ] as const
            ).map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 tap-shrink',
                    active
                      ? 'bg-foreground text-background font-semibold shadow-xs'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                        active
                          ? 'bg-background/25 text-background'
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
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-hide">
          {filteredNotifications.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center mb-3 text-muted-foreground">
                <BellOff className="w-5 h-5 opacity-60" />
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground max-w-[220px] mt-1 leading-relaxed">
                {activeCategory === 'all'
                  ? 'No notifications right now.'
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
                    'group relative rounded-2xl p-3.5 transition-all duration-150 border cursor-pointer',
                    isUnread
                      ? 'bg-card border-border shadow-xs hover:border-primary/40'
                      : 'bg-card/50 border-border/40 hover:bg-card/80 opacity-90 hover:opacity-100'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon Bubble */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 shadow-xs',
                        getIconBackground(notification.iconType)
                      )}
                    >
                      {renderIcon(notification.iconType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: Title + Timestamp */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4
                            className={cn(
                              'text-xs font-semibold truncate',
                              isUnread ? 'text-foreground' : 'text-foreground/80'
                            )}
                          >
                            {notification.title}
                          </h4>
                          {notification.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-muted/80 text-muted-foreground shrink-0 uppercase tracking-wide">
                              {notification.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {notification.timestamp}
                          </span>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(notification.id);
                            }}
                            title="Dismiss"
                            aria-label="Dismiss notification"
                            className="p-1 -mr-1 text-muted-foreground/50 hover:text-foreground rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Body Message */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Action Button */}
                      {notification.actionLabel && (
                        <div className="mt-2.5 pt-2 border-t border-border/30 flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notification);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
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

        {/* Clean Footer Bar with Safe-Area */}
        <div className="pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] pt-2.5 px-4 sm:px-5 border-t border-border/40 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <span className="text-[11px] font-medium">ARUX • v1.5.1</span>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
