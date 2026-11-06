export type GroceryCategory =
  | 'Rice & Grains'
  | 'Pulses & Dal'
  | 'Vegetables'
  | 'Fruits'
  | 'Chicken & Meat'
  | 'Dairy Products'
  | 'Cooking Essentials'
  | 'Spices & Masala'
  | 'Snacks'
  | 'Cleaning Supplies'
  | 'Personal Care'
  | 'Other';

export const GROCERY_CATEGORIES: { name: GroceryCategory; emoji: string }[] = [
  { name: 'Rice & Grains', emoji: '🍚' },
  { name: 'Pulses & Dal', emoji: '🍲' },
  { name: 'Vegetables', emoji: '🥦' },
  { name: 'Fruits', emoji: '🍎' },
  { name: 'Chicken & Meat', emoji: '🍗' },
  { name: 'Dairy Products', emoji: '🥛' },
  { name: 'Cooking Essentials', emoji: '🍳' },
  { name: 'Spices & Masala', emoji: '🌶️' },
  { name: 'Snacks', emoji: '🍿' },
  { name: 'Cleaning Supplies', emoji: '🧹' },
  { name: 'Personal Care', emoji: '🧴' },
  { name: 'Other', emoji: '🛒' },
];

export const GROCERY_CATEGORY_EMOJI: Record<string, string> = {
  'Rice & Grains': '🍚',
  'Pulses & Dal': '🍲',
  Vegetables: '🥦',
  Fruits: '🍎',
  'Chicken & Meat': '🍗',
  'Dairy Products': '🥛',
  'Cooking Essentials': '🍳',
  'Spices & Masala': '🌶️',
  Snacks: '🍿',
  'Cleaning Supplies': '🧹',
  'Personal Care': '🧴',
  Other: '🛒',
};

export type GroceryUnit = 'kg' | 'g' | 'litre' | 'ml' | 'packet' | 'pieces' | 'dozen';

export const GROCERY_UNITS: GroceryUnit[] = ['kg', 'g', 'litre', 'ml', 'packet', 'pieces', 'dozen'];

export type GroceryListStatus = 'active' | 'completed' | 'archived';

export interface GroceryHousehold {
  id: string;
  name: string;
  owner_id: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryHouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  email?: string;
  displayName?: string;
}

export interface GroceryList {
  id: string;
  household_id?: string | null;
  user_id: string;
  name: string;
  status: GroceryListStatus;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryListItem {
  id: string;
  list_id: string;
  household_id?: string | null;
  item_name: string;
  normalized_item_name: string;
  category: string;
  quantity: number;
  unit: GroceryUnit;
  estimated_price: number;
  actual_price?: number | null;
  is_purchased: boolean;
  purchased_quantity?: number | null;
  purchased_at?: string | null;
  purchased_by?: string | null;
  expense_id?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroceryStockItem {
  id: string;
  household_id?: string | null;
  user_id: string;
  item_name: string;
  normalized_item_name: string;
  category: string;
  current_quantity: number;
  unit: GroceryUnit;
  minimum_stock: number;
  purchase_price?: number | null;
  expiry_date?: string | null;
  last_purchased_at?: string | null;
  storage_location?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'purchase' | 'consumption' | 'adjustment' | 'correction';

export interface GroceryStockMovement {
  id: string;
  stock_id: string;
  household_id?: string | null;
  user_id: string;
  movement_type: MovementType;
  quantity: number;
  unit: GroceryUnit;
  reference_id?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
}

export interface GroceryActivity {
  id: string;
  household_id?: string | null;
  user_id: string;
  actor_name: string;
  action: string;
  item_name: string;
  details?: string | null;
  created_at: string;
}

