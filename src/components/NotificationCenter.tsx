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
  Trash2,
  ChevronRight,
  BellOff,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
        return <Sun className="w-4 h-4 text-amber-400" />;
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

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'rose':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/20';
      case 'amber':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
      case 'purple':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/20';
      case 'emerald':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
      case 'teal':
        return 'bg-teal-500/15 text-teal-400 border-teal-500/20';
      case 'blue':
        return 'bg-sky-500/15 text-sky-400 border-sky-500/20';
      default:
        return 'bg-primary/15 text-primary border-primary/20';
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
              'relative w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-card/80 hover:bg-card border border-border/60 flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm tap-shrink',
              className
            )}
          >
            <Bell className="w-5 h-5 text-foreground/80 transition-transform group-hover:scale-110" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center shadow-md animate-in zoom-in-75">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col bg-background/95 backdrop-blur-2xl border-l border-border/60 z-50 overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/50 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
                <Bell className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-base font-bold text-foreground">
                    Notifications
                  </SheetTitle>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Greetings, updates, tips & dynamic alerts
                </p>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  title="Clear all"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto scrollbar-hide">
            {(
              [
                { id: 'all', label: 'All', count: notifications.length },
                { id: 'alert', label: 'Alerts', count: alertsCount },
                { id: 'update', label: 'Updates', count: updatesCount },
                { id: 'info', label: 'Tips & Info', count: infoCount },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      activeCategory === cat.id
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted-foreground/15 text-muted-foreground'
                    )}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
          {filteredNotifications.length === 0 ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mb-3">
                <BellOff className="w-6 h-6 opacity-40 text-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground max-w-[240px] mt-1 leading-relaxed">
                {activeCategory === 'all'
                  ? 'No notifications right now. Check back later for updates and daily tips.'
                  : `No ${activeCategory} notifications at this time.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification, idx) => {
              const isUnread = !notification.isRead;
              return (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  style={{ animationDelay: `${idx * 40}ms` }}
                  className={cn(
                    'group relative rounded-2xl p-4 transition-all duration-200 border card-enter cursor-pointer',
                    isUnread
                      ? 'bg-card border-primary/25 shadow-sm shadow-primary/5 hover:border-primary/40'
                      : 'bg-card/60 border-border/50 hover:bg-card/90'
                  )}
                >
                  {/* Unread indicator dot */}
                  {isUnread && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-primary ring-2 ring-primary/20 animate-pulse" />
                  )}

                  <div className="flex items-start gap-3">
                    {/* Icon bubble */}
                    <div className="w-9 h-9 rounded-xl bg-muted/70 border border-border/60 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {renderIcon(notification.iconType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4
                          className={cn(
                            'text-xs font-bold truncate leading-tight',
                            isUnread ? 'text-foreground' : 'text-foreground/80'
                          )}
                        >
                          {notification.title}
                        </h4>
                        {notification.badge && (
                          <span
                            className={cn(
                              'text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md border',
                              getBadgeStyle(notification.badgeColor)
                            )}
                          >
                            {notification.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {notification.message}
                      </p>

                      {/* Footer: timestamp + action button */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground/80 font-medium">
                          {notification.timestamp}
                        </span>

                        {notification.actionLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notification);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors group/btn"
                          >
                            <span>{notification.actionLabel}</span>
                            <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-0.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      title="Dismiss"
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded-md transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-border/50 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>ARUX Notification Center</span>
          <span className="font-semibold text-primary/80">v1.5.1</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

