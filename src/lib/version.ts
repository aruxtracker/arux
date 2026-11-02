/** App version + human readable changelog shown in Settings → What's new. */
export const APP_VERSION = '1.5.1';

export interface ReleaseNote {
  version: string;
  date: string;
  added?: string[];
  improved?: string[];
  fixed?: string[];
}

export const CHANGELOG: ReleaseNote[] = [
  {
    version: '1.5.1',
    date: '5 Oct 2026',
    added: [
      'Lent & Borrow is now live in the menu and All features, with partial repayments and WhatsApp reminders.',
    ],
    improved: ['Profile screen is simpler — the cycle tracker teaser has been removed.'],
  },
  {
    version: '1.5.0',
    date: '1 Oct 2026',
    added: [
      'Lent & Borrow tracker for money given or received, due dates and repayments.',
      'Search everything from Home — expenses, income, tasks, meetings, ideas and alerts in one bar.',
      'Profile you can edit: display name, 12 illustrated preset avatars and gender.',
      'Password change directly inside Profile.',
      'What\'s new and Coming soon sections in Settings.',
    ],
    improved: [
      'Finance navigation now includes a dedicated Lent & Borrow view with receivable and payable totals.',
      'Mobile list and task actions stay usable while scrolling.',
      'Profile avatar replaces the logo on the Home header.',
      'Settings now lives in the bottom bar, with every feature listed inside it.',
      'Monthly summary moved onto the Reports page.',
    ],
    fixed: [
      'Dark mode text contrast on every colour theme.',
      'Tasks add form no longer overflows on small phones.',
    ],
  },
  {
    version: '1.3.0',
    date: 'Jul 2026',
    added: [
      'Budgets, Subscriptions and a unified Calendar.',
      'Task labels, subtasks and recurring tasks.',
      'Smart Insights cards on Home.',
    ],
    fixed: ['Balance reset now clears cached totals and offers a 10 second undo.'],
  },
  {
    version: '1.2.0',
    date: 'Jun 2026',
    added: ['Google style task lists with drag and drop, priorities and app lock (PIN / Face ID).'],
  },
];

export interface RoadmapItem {
  title: string;
  description: string;
  emoji: string;
  status: 'building' | 'planned' | 'idea';
}

export const ROADMAP: RoadmapItem[] = [
  { title: 'Shared team tasks', description: 'Invite a friend to a list and see their updates live.', emoji: '👥', status: 'building' },
  { title: 'Bill splitter', description: 'Split a bill with friends and track who paid you back.', emoji: '🧾', status: 'planned' },
  { title: 'Net worth tracker', description: 'Assets, loans and investments in one net worth timeline.', emoji: '📈', status: 'planned' },
  { title: 'Receipt scanning', description: 'Snap a bill and let AI fill the amount and category.', emoji: '📷', status: 'planned' },
  { title: 'Quick add widget', description: 'Add an expense from your phone home screen in one tap.', emoji: '⚡', status: 'idea' },
  { title: 'Health & fitness log', description: 'Steps, workouts and water intake beside your habits.', emoji: '💪', status: 'idea' },
];
