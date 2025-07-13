export interface GroceryItem {
  name: string;
  unit: string;
  quantity: number;
  price_per_unit?: number | null;
  cost?: number | null;
}

export interface GroceryList {
  plan_id: string;
  items: GroceryItem[];
  total_cost?: number | null;
} 