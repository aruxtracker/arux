import { TabId } from './index';

export type NotificationCategory = 'all' | 'alert' | 'update' | 'info';

export type NotificationIconType =
  | 'greeting'
  | 'update'
  | 'tip'
  | 'task'
  | 'meeting'
  | 'budget'
  | 'subscription'
  | 'lentborrow'
  | 'habit'
  | 'reminder'
  | 'security';

export interface AppNotification {
  id: string;
  category: 'alert' | 'update' | 'info';
  title: string;
  message: string;
  timestamp: string;
  iconType: NotificationIconType;
  actionLabel?: string;
  actionTab?: TabId;
  badge?: string;
  badgeColor?: 'purple' | 'amber' | 'emerald' | 'rose' | 'blue' | 'teal';
  isRead: boolean;
  priority?: 'high' | 'normal' | 'low';
}

