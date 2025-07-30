export interface GroceryItem {
  name: string;
  unit: string;
  total_quantity: number;
  price_per_unit: number;
  category: string;
}

export interface GroceryList {
  plan_id: string;
  items: GroceryItem[];
  total_cost?: number | null;
}

export interface Retailer {
  id: string;
  name: string;
  available: boolean;
  logo_url?: string;
} 