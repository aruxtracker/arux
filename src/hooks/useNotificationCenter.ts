import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, isToday, isPast, parseISO, differenceInDays } from 'date-fns';
import { Task, Meeting, Budget, Subscription, LentBorrowEntry, Habit, HabitLog, Expense } from '@/types';
import { AppNotification } from '@/types/notifications';
import { APP_VERSION, CHANGELOG } from '@/lib/version';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';

const READ_STORAGE_KEY = 'arux_notifications_read_v1';
const DISMISSED_STORAGE_KEY = 'arux_notifications_dismissed_v1';

interface UseNotificationCenterProps {
  tasks?: Task[];
  meetings?: Meeting[];
  budgets?: Budget[];
  subscriptions?: Subscription[];
  lentBorrowEntries?: LentBorrowEntry[];
  habits?: Habit[];
  habitLogs?: HabitLog[];
  expenses?: Expense[];
  currency?: string;
}

export function useNotificationCenter({
  tasks = [],
  meetings = [],
  budgets = [],
  subscriptions = [],
  lentBorrowEntries = [],
  habits = [],
  habitLogs = [],
  expenses = [],
  currency = '₹',
}: UseNotificationCenterProps = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Save to localStorage when state updates
  useEffect(() => {
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(readIds)));
    } catch {
      // Storage unavailable or full
    }
  }, [readIds]);

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(dismissedIds)));
    } catch {
      // Storage unavailable or full
    }
  }, [dismissedIds]);

  const firstName = useMemo(() => {
    const raw =
      profile.displayName ||
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email?.split('@')[0] ||
      '';
    const first = raw.trim().split(/[\s._-]+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
  }, [profile.displayName, user]);

  const allNotifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const hour = now.getHours();

    // ==========================================
    // 1. GREETING & MOTIVATION (Dynamic daily)
    // ==========================================
    let greetingPeriod = 'morning';
    let greetingTitle = `Good morning, ${firstName || 'Champion'}! ☀️`;
    let greetingMsg = 'Start your day with clarity. Review your top priorities and keep your momentum going.';
    if (hour >= 12 && hour < 17) {
      greetingPeriod = 'afternoon';
      greetingTitle = `Good afternoon, ${firstName || 'Champion'}! 🌤️`;
      greetingMsg = "You're halfway through the day. Log any expenses and check off completed tasks.";
    } else if (hour >= 17 && hour < 21) {
      greetingPeriod = 'evening';
      greetingTitle = `Good evening, ${firstName || 'Champion'}! 🌆`;
      greetingMsg = "Wrap up your day by reviewing today's progress and setting a quick plan for tomorrow.";
    } else if (hour >= 21 || hour < 5) {
      greetingPeriod = 'night';
      greetingTitle = `Good night, ${firstName || 'Champion'}! 🌙`;
      greetingMsg = 'Rest up and recharge. Your finances, tasks, and habits are safely tracked in ARUX.';
    }

    const greetingId = `greeting-${todayStr}-${greetingPeriod}`;
    list.push({
      id: greetingId,
      category: 'info',
      title: greetingTitle,
      message: greetingMsg,
      timestamp: 'Today',
      iconType: 'greeting',
      badge: 'Greeting',
      badgeColor: 'teal',
      isRead: readIds.has(greetingId),
      priority: 'normal',
    });

    // ==========================================
    // 2. APP UPDATES & CHANGELOG (from version.ts)
    // ==========================================
    const latestRelease = CHANGELOG[0];
    if (latestRelease) {
      const releaseId = `update-${latestRelease.version}`;
      const summary = latestRelease.added?.[0] || `Version ${latestRelease.version} is here with brand new improvements.`;
      list.push({
        id: releaseId,
        category: 'update',
        title: `What's New in v${latestRelease.version} 🚀`,
        message: summary,
        timestamp: latestRelease.date,
        iconType: 'update',
        actionLabel: 'View Changelog',
        actionTab: 'settings',
        badge: `v${latestRelease.version}`,
        badgeColor: 'purple',
        isRead: readIds.has(releaseId),
        priority: 'high',
      });
    }

    const roadmapNotificationId = 'update-roadmap-preview';
    list.push({
      id: roadmapNotificationId,
      category: 'update',
      title: 'Roadmap: Exciting Features Ahead! 🌟',
      message: 'Shared team tasks, Splitwise-style bill splitting, and AI receipt scanning are on the roadmap.',
      timestamp: 'Upcoming',
      iconType: 'update',
      actionLabel: 'See Roadmap',
      actionTab: 'settings',
      badge: 'Preview',
      badgeColor: 'blue',
      isRead: readIds.has(roadmapNotificationId),
      priority: 'low',
    });

    // ==========================================
    // 3. APP INFORMATION & PRO TIPS
    // ==========================================
    const tipSearchId = 'tip-universal-search';
    list.push({
      id: tipSearchId,
      category: 'info',
      title: 'Pro-Tip: Universal Search 🔎',
      message: 'Tap the search bar on Dashboard or press "/" to search across tasks, meetings, expenses, and notes in one spot.',
      timestamp: 'Guide',
      iconType: 'tip',
      actionLabel: 'Go to Home',
      actionTab: 'dashboard',
      badge: 'Tip',
      badgeColor: 'blue',
      isRead: readIds.has(tipSearchId),
      priority: 'low',
    });

    const tipSecurityId = 'tip-app-lock';
    list.push({
      id: tipSecurityId,
      category: 'info',
      title: 'Security: PIN & Face ID App Lock 🛡️',
      message: 'Keep your financial data completely private with Biometric or PIN lock in Settings → Security.',
      timestamp: 'Security',
      iconType: 'security',
      actionLabel: 'Set Up Lock',
      actionTab: 'settings',
      badge: 'Security',
      badgeColor: 'emerald',
      isRead: readIds.has(tipSecurityId),
      priority: 'normal',
    });

    const tipUndoId = 'tip-balance-undo';
    list.push({
      id: tipUndoId,
      category: 'info',
      title: 'Safety Net: 10-Second Balance Undo ⚡',
      message: 'Resetting your balance on Home gives you an instant 10-second Undo button in case it was a mistake.',
      timestamp: 'Tip',
      iconType: 'tip',
      badge: 'Info',
      badgeColor: 'amber',
      isRead: readIds.has(tipUndoId),
      priority: 'low',
    });

    // ==========================================
    // 4. LIVE SMART ALERTS (Based on user data)
    // ==========================================

    // Overdue Tasks Alert
    const overdueTasks = tasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      try {
        const d = parseISO(t.dueDate);
        return isPast(d) && !isToday(d);
      } catch {
        return false;
      }
    });

    if (overdueTasks.length > 0) {
      const overdueId = `alert-overdue-tasks-${overdueTasks.length}-${todayStr}`;
      list.push({
        id: overdueId,
        category: 'alert',
        title: `⚠️ ${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
        message: `"${overdueTasks[0].title}" ${
          overdueTasks.length > 1 ? `and ${overdueTasks.length - 1} other(s)` : ''
        } need your attention.`,
        timestamp: 'Urgent',
        iconType: 'task',
        actionLabel: 'Review Tasks',
        actionTab: 'tasks',
        badge: 'Overdue',
        badgeColor: 'rose',
        isRead: readIds.has(overdueId),
        priority: 'high',
      });
    }

    // Tasks Due Today Alert
    const todayTasks = tasks.filter((t) => {
      if (t.completed || !t.dueDate) return false;
      try {
        return isToday(parseISO(t.dueDate));
      } catch {
        return false;
      }
    });

    if (todayTasks.length > 0) {
      const todayTaskId = `alert-tasks-today-${todayTasks.length}-${todayStr}`;
      list.push({
        id: todayTaskId,
        category: 'alert',
        title: `📋 ${todayTasks.length} Task${todayTasks.length > 1 ? 's' : ''} Due Today`,
        message: `"${todayTasks[0].title}" is scheduled for completion today.`,
        timestamp: 'Today',
        iconType: 'task',
        actionLabel: 'Open Tasks',
        actionTab: 'tasks',
        badge: 'Today',
        badgeColor: 'purple',
        isRead: readIds.has(todayTaskId),
        priority: 'normal',
      });
    }

    // Meetings Scheduled Today
    const todayMeetings = meetings.filter((m) => {
      if (!m.date) return false;
      try {
        return isToday(parseISO(m.date));
      } catch {
        return false;
      }
    });

    if (todayMeetings.length > 0) {
      const meetId = `alert-meeting-today-${todayMeetings[0].id}-${todayStr}`;
      list.push({
        id: meetId,
        category: 'alert',
        title: `📅 Meeting Today: ${todayMeetings[0].title}`,
        message: `Scheduled at ${todayMeetings[0].time || 'today'}. Get ready!`,
        timestamp: todayMeetings[0].time || 'Today',
        iconType: 'meeting',
        actionLabel: 'View Schedule',
        actionTab: 'meetings',
        badge: 'Meeting',
        badgeColor: 'teal',
        isRead: readIds.has(meetId),
        priority: 'high',
      });
    }

    // Subscriptions Renewing Soon (within next 3 days)
    const upcomingSubs = subscriptions.filter((sub) => {
      if (!sub.active || !sub.nextRenewalDate) return false;
      try {
        const renewal = parseISO(sub.nextRenewalDate);
        const days = differenceInDays(renewal, now);
        return days >= 0 && days <= 3;
      } catch {
        return false;
      }
    });

    if (upcomingSubs.length > 0) {
      const sub = upcomingSubs[0];
      const renewalDate = parseISO(sub.nextRenewalDate!);
      const diff = differenceInDays(renewalDate, now);
      const subId = `alert-sub-${sub.id}-${sub.nextRenewalDate}`;
      list.push({
        id: subId,
        category: 'alert',
        title: `💳 Subscription Due: ${sub.name}`,
        message: `${currency}${sub.amount} will renew ${diff === 0 ? 'today' : `in ${diff} day${diff > 1 ? 's' : ''}`}.`,
        timestamp: diff === 0 ? 'Today' : `In ${diff}d`,
        iconType: 'subscription',
        actionLabel: 'Manage Subs',
        actionTab: 'subscriptions',
        badge: 'Renewal',
        badgeColor: 'amber',
        isRead: readIds.has(subId),
        priority: 'high',
      });
    }

    // Budgets High Usage (>80% of limit)
    const currentMonthPrefix = format(now, 'yyyy-MM');
    const monthExpenses = expenses.filter((e) => e.date?.startsWith(currentMonthPrefix));
    for (const budget of budgets) {
      if (!budget.monthlyLimit || budget.monthlyLimit <= 0) continue;
      const spent = monthExpenses
        .filter((e) => e.category === budget.category)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const ratio = spent / budget.monthlyLimit;
      if (ratio >= 0.8) {
        const percent = Math.round(ratio * 100);
        const budgetAlertId = `alert-budget-${budget.id}-${currentMonthPrefix}-${percent >= 100 ? 'exceeded' : 'warning'}`;
        list.push({
          id: budgetAlertId,
          category: 'alert',
          title: `📊 ${budget.category} Budget Alert (${percent}%)`,
          message: `${percent >= 100 ? 'Exceeded limit!' : 'Approaching limit:'} Spent ${currency}${spent.toLocaleString('en-IN')} of ${currency}${budget.monthlyLimit.toLocaleString('en-IN')}.`,
          timestamp: 'This Month',
          iconType: 'budget',
          actionLabel: 'View Budgets',
          actionTab: 'budgets',
          badge: percent >= 100 ? 'Exceeded' : 'Warning',
          badgeColor: percent >= 100 ? 'rose' : 'amber',
          isRead: readIds.has(budgetAlertId),
          priority: 'high',
        });
      }
    }

    // Lent & Borrow Overdue
    const overdueLent = lentBorrowEntries.filter((item) => {
      if (item.settled || !item.dueDate) return false;
      try {
        const due = parseISO(item.dueDate);
        return isPast(due) && !isToday(due);
      } catch {
        return false;
      }
    });

    if (overdueLent.length > 0) {
      const entry = overdueLent[0];
      const remaining = entry.amount - (entry.settledAmount || 0);
      const lbId = `alert-lb-${entry.id}-${entry.dueDate}`;
      list.push({
        id: lbId,
        category: 'alert',
        title: `🤝 Overdue Repayment: ${entry.personName}`,
        message: `${entry.direction === 'lent' ? `${entry.personName} owes you` : `You owe ${entry.personName}`} ${currency}${remaining.toLocaleString('en-IN')}.`,
        timestamp: 'Overdue',
        iconType: 'lentborrow',
        actionLabel: 'Open Lent & Borrow',
        actionTab: 'lentborrow',
        badge: 'Pending',
        badgeColor: 'rose',
        isRead: readIds.has(lbId),
        priority: 'high',
      });
    }

    // Daily Habits Reminder (if incomplete today)
    if (habits.length > 0) {
      const completedTodayIds = new Set(
        habitLogs.filter((log) => log.date === todayStr && log.completed).map((log) => log.habitId)
      );
      const remainingHabits = habits.length - completedTodayIds.size;
      if (remainingHabits > 0 && hour >= 16) {
        const habitAlertId = `alert-habits-${todayStr}-${remainingHabits}`;
        list.push({
          id: habitAlertId,
          category: 'alert',
          title: `🔥 ${remainingHabits} Habit${remainingHabits > 1 ? 's' : ''} Remaining Today`,
          message: "Don't break your streak! Keep your daily discipline strong before the day ends.",
          timestamp: 'Daily',
          iconType: 'habit',
          actionLabel: 'Log Habits',
          actionTab: 'habits',
          badge: 'Streak',
          badgeColor: 'amber',
          isRead: readIds.has(habitAlertId),
          priority: 'normal',
        });
      }
    }

    return list;
  }, [
    firstName,
    readIds,
    tasks,
    meetings,
    subscriptions,
    budgets,
    expenses,
    lentBorrowEntries,
    habits,
    habitLogs,
    currency,
  ]);

  // Filter out dismissed notifications
  const visibleNotifications = useMemo(() => {
    return allNotifications.filter((n) => !dismissedIds.has(n.id));
  }, [allNotifications, dismissedIds]);

  const unreadCount = useMemo(() => {
    return visibleNotifications.filter((n) => !n.isRead).length;
  }, [visibleNotifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      visibleNotifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [visibleNotifications]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      visibleNotifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [visibleNotifications]);

  return {
    notifications: visibleNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  };
}

