export interface Income {
  id: string;
  amount: number;
  source: string;
  category: IncomeCategory;
  date: string;
  bankAccountId?: string;
  notes?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName?: string;
  accountType: string;
  lastFour?: string;
  color: string;
  createdAt: string;
}

export type LentBorrowDirection = 'lent' | 'borrowed';

export interface LentBorrowEntry {
  id: string;
  direction: LentBorrowDirection;
  personName: string;
  amount: number;
  settledAmount: number;
  date: string;
  dueDate?: string;
  notes?: string;
  settled: boolean;
  createdAt: string;
}

export type IncomeCategory = 'Salary' | 'Freelance' | 'Business' | 'Investment' | 'Rental' | 'Interest' | 'Dividends' | 'Commission' | 'Gifts' | 'Refund' | 'Side Hustle' | 'YouTube' | 'Crypto' | 'Other';

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Rental', 'Interest', 'Dividends', 'Commission', 'Gifts', 'Refund', 'Side Hustle', 'YouTube', 'Crypto', 'Other'
];

export const INCOME_CATEGORY_EMOJI: Record<IncomeCategory, string> = {
  Salary: '💼', Freelance: '🎯', Business: '📈', Investment: '📊', Rental: '🏘️', Interest: '🏦', Dividends: '💹', Commission: '🤝', Gifts: '🎁', Refund: '🔄', 'Side Hustle': '🔥', YouTube: '▶️', Crypto: '₿', Other: '💰',
};

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory = 'Food' | 'Fuel' | 'Rent' | 'Travel' | 'Business' | 'Personal' | 'Shopping' | 'Entertainment' | 'Health' | 'Education' | 'Groceries' | 'Bills' | 'EMI' | 'Insurance' | 'Subscriptions' | 'Transport' | 'Clothing' | 'Gifts' | 'Charity' | 'Maintenance' | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food', 'Groceries', 'Fuel', 'Rent', 'Bills', 'EMI', 'Travel', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Education', 'Insurance', 'Subscriptions', 'Business', 'Personal', 'Clothing', 'Gifts', 'Charity', 'Maintenance', 'Other'
];

export const EXPENSE_CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  Food: '🍔', Groceries: '🛒', Fuel: '⛽', Rent: '🏠', Bills: '📃', EMI: '💳', Travel: '✈️', Transport: '🚌', Shopping: '🛍️', Entertainment: '🎬', Health: '🏥', Education: '📚', Insurance: '🛡️', Subscriptions: '📱', Business: '📈', Personal: '👤', Clothing: '👕', Gifts: '🎁', Charity: '🤲', Maintenance: '🔧', Other: '📦',
};

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  notes?: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  title: string;
  type: ReminderType;
  date: string;
  time?: string;
  recurring?: string;
  notes?: string;
  completed: boolean;
  createdAt: string;
}

export type ReminderType = 'meeting' | 'rent' | 'emi' | 'general';

export const REMINDER_TYPES: { value: ReminderType; label: string; emoji: string }[] = [
  { value: 'meeting', label: 'Meeting', emoji: '📅' },
  { value: 'rent', label: 'Rent', emoji: '🏠' },
  { value: 'emi', label: 'EMI', emoji: '💳' },
  { value: 'general', label: 'General', emoji: '🔔' },
];

export type ThemeId =
  | 'purple' | 'ocean' | 'sunset' | 'forest' | 'rose' | 'mono'
  | 'candy' | 'cyber' | 'sand' | 'arctic';

export interface AppSettings {
  darkMode: boolean;
  currency: string;
  theme?: ThemeId;
}

export const CURRENCIES = [
  { symbol: '₹', code: 'INR', label: 'Indian Rupee (₹)' },
  { symbol: '$', code: 'USD', label: 'US Dollar ($)' },
  { symbol: '€', code: 'EUR', label: 'Euro (€)' },
  { symbol: '£', code: 'GBP', label: 'British Pound (£)' },
  { symbol: '¥', code: 'JPY', label: 'Japanese Yen (¥)' },
];

export interface TaskList {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  position: number;
  isShared: boolean;
  createdAt: string;
}

/** 0 = none, 1 = low, 2 = medium, 3 = high */
export type TaskPriority = 0 | 1 | 2 | 3;

export const TASK_PRIORITIES: { value: TaskPriority; label: string; color: string; short: string }[] = [
  { value: 0, label: 'No priority', color: 'hsl(var(--muted-foreground))', short: 'None' },
  { value: 1, label: 'Low', color: '#38bdf8', short: 'Low' },
  { value: 2, label: 'Medium', color: '#f59e0b', short: 'Med' },
  { value: 3, label: 'High', color: '#ef4444', short: 'High' },
];

/** Colour-coded task labels (Trello style). */
export const TASK_TAGS: { id: string; label: string; color: string }[] = [
  { id: 'urgent', label: 'Urgent', color: '#ef4444' },
  { id: 'errand', label: 'Errand', color: '#f59e0b' },
  { id: 'call', label: 'Call', color: '#0ea5e9' },
  { id: 'work', label: 'Work', color: '#8b5cf6' },
  { id: 'personal', label: 'Personal', color: '#22c55e' },
  { id: 'money', label: 'Money', color: '#14b8a6' },
  { id: 'waiting', label: 'Waiting', color: '#a1a1aa' },
];

export function getTaskTag(id: string) {
  return TASK_TAGS.find(t => t.id === id) || { id, label: id, color: '#a1a1aa' };
}

export interface Task {
  id: string;
  listId?: string;
  title: string;
  completed: boolean;
  starred: boolean;
  position: number;
  priority: TaskPriority;
  tags: string[];
  dueDate?: string;
  date?: string; // legacy, kept for backward compat
  meetingId?: string;
  notes?: string;
  assignedTo?: string;
  completedBy?: string;
  recurring?: 'daily' | 'weekly' | 'monthly' | null;
  createdAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  createdAt: string;
}

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export const BILLING_CYCLES: { value: BillingCycle; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextRenewalDate?: string;
  category?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export const LIST_COLORS = [
  '#a78bfa', '#60a5fa', '#34d399', '#fbbf24',
  '#fb7185', '#f472b6', '#22d3ee', '#facc15',
];

export interface Idea {
  id: string;
  title: string;
  description?: string;
  category: IdeaCategory;
  tags: string[];
  createdAt: string;
}

export type IdeaCategory = 'app' | 'reel' | 'business' | 'random';

export const IDEA_CATEGORIES: { value: IdeaCategory; label: string; emoji: string }[] = [
  { value: 'app', label: 'App Idea', emoji: '💡' },
  { value: 'reel', label: 'Reel Idea', emoji: '🎬' },
  { value: 'business', label: 'Business Idea', emoji: '💼' },
  { value: 'random', label: 'Random Thought', emoji: '🧠' },
];

export interface MoodEntry {
  id: string;
  date: string;
  mood: number;
  energy: number;
  sleepQuality: number;
  productivity: number;
  notes?: string;
  createdAt: string;
}

export interface DreamBucketItem {
  id: string;
  productName: string;
  productLink?: string;
  imageUrl?: string;
  targetPrice: number;
  savedAmount: number;
  targetDate?: string;
  achieved: boolean;
  notes?: string;
  category?: string;
  tags?: string[];
  priority?: boolean;
  createdAt: string;
}

export const DREAM_CATEGORIES = [
  { value: 'general', label: 'General', emoji: '📦' },
  { value: 'tech', label: 'Tech & Gadgets', emoji: '💻' },
  { value: 'fashion', label: 'Fashion', emoji: '👗' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'home', label: 'Home & Living', emoji: '🏠' },
  { value: 'vehicle', label: 'Vehicle', emoji: '🚗' },
  { value: 'experience', label: 'Experience', emoji: '🎭' },
  { value: 'health', label: 'Health & Fitness', emoji: '💪' },
];

export type TabId = 'dashboard' | 'income' | 'expenses' | 'groceries' | 'lentborrow' | 'meetings' | 'tasks' | 'reports' | 'habits' | 'reminders' | 'ideas' | 'dreambucket' | 'vehicles' | 'grooming' | 'budgets' | 'subscriptions' | 'calendar' | 'settings';

export * from './grocery';

// Grooming tracker (haircut, beard, spa, etc.)
export type GroomingType = 'haircut' | 'beard' | 'spa' | 'facial' | 'massage' | 'manicure' | 'pedicure' | 'other';

export const GROOMING_TYPES: { value: GroomingType; label: string; emoji: string; defaultIntervalDays: number }[] = [
  { value: 'haircut', label: 'Haircut', emoji: '💇', defaultIntervalDays: 30 },
  { value: 'beard', label: 'Beard Trim', emoji: '🧔', defaultIntervalDays: 14 },
  { value: 'spa', label: 'Spa', emoji: '🧖', defaultIntervalDays: 60 },
  { value: 'facial', label: 'Facial', emoji: '✨', defaultIntervalDays: 30 },
  { value: 'massage', label: 'Massage', emoji: '💆', defaultIntervalDays: 30 },
  { value: 'manicure', label: 'Manicure', emoji: '💅', defaultIntervalDays: 21 },
  { value: 'pedicure', label: 'Pedicure', emoji: '🦶', defaultIntervalDays: 30 },
  { value: 'other', label: 'Other', emoji: '🪒', defaultIntervalDays: 30 },
];

export interface GroomingEntry {
  id: string;
  type: GroomingType;
  date: string;
  amount: number;
  place?: string;
  nextDue?: string;
  notes?: string;
  createdAt: string;
}

// Vehicle types
export type VehicleType = 'car' | 'bike' | 'ev' | 'scooter' | 'truck' | 'other';

export const VEHICLE_TYPES: { value: VehicleType; label: string; emoji: string }[] = [
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'bike', label: 'Bike', emoji: '🏍️' },
  { value: 'ev', label: 'EV', emoji: '⚡' },
  { value: 'scooter', label: 'Scooter', emoji: '🛵' },
  { value: 'truck', label: 'Truck', emoji: '🚚' },
  { value: 'other', label: 'Other', emoji: '🚙' },
];

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  regNumber?: string;
  imageUrl?: string;
  purchaseDate?: string;
  currentKm: number;
  notes?: string;
  createdAt: string;
}

export interface VehicleService {
  id: string;
  vehicleId: string;
  title: string;
  dueDate?: string;
  dueKm?: number;
  completed: boolean;
  notes?: string;
  createdAt: string;
}

export type VehicleExpenseCategory = 'Fuel' | 'Service' | 'Parts' | 'Insurance' | 'Tax' | 'Repair' | 'Wash' | 'Other';

export const VEHICLE_EXPENSE_CATEGORIES: { value: VehicleExpenseCategory; label: string; emoji: string }[] = [
  { value: 'Fuel', label: 'Fuel', emoji: '⛽' },
  { value: 'Service', label: 'Service', emoji: '🔧' },
  { value: 'Parts', label: 'Parts', emoji: '⚙️' },
  { value: 'Insurance', label: 'Insurance', emoji: '🛡️' },
  { value: 'Tax', label: 'Tax', emoji: '📃' },
  { value: 'Repair', label: 'Repair', emoji: '🔨' },
  { value: 'Wash', label: 'Wash', emoji: '🧽' },
  { value: 'Other', label: 'Other', emoji: '📦' },
];

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  amount: number;
  category: VehicleExpenseCategory;
  date: string;
  notes?: string;
  expenseId?: string;
  createdAt: string;
}
