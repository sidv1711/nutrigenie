import { GroceryList } from '@/types/grocery';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Retailer {
  id: string;
  name: string;
  url?: string;
  available: boolean;
}

export interface RetailersResponse {
  retailers: Retailer[];
}

export const groceryService = {
  async getGroceryList(planId: string): Promise<GroceryList> {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/grocery/${planId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch grocery list');
      return res.json();
    } catch (error) {
      console.warn('Grocery endpoint not available, returning mock data');
      return { items: [], total_cost: 0 } as GroceryList;
    }
  },

  async exportCart(planId: string, retailer = 'instacart'): Promise<string> {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/cart/${planId}?retailer=${retailer}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to create cart');
      const json = await res.json();
      return json.checkout_url;
    } catch (error) {
      console.warn('Cart export endpoint not available');
      throw new Error('Cart export functionality not available yet');
    }
  },

  async getAvailableRetailers(): Promise<Retailer[]> {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/cart/retailers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch retailers');
      const json = await res.json();
      return json.retailers;
    } catch (error) {
      console.warn('Retailers endpoint not available, returning mock data');
      return [
        { id: 'instacart', name: 'Instacart', available: false },
        { id: 'walmart', name: 'Walmart', available: false }
      ];
    }
  },

  async getCartUrlsForAllRetailers(planId: string): Promise<Retailer[]> {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/cart/${planId}/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch cart URLs');
      const json = await res.json();
      return json.retailers;
    } catch (error) {
      console.warn('Cart URLs endpoint not available, returning empty array');
      return [];
    }
  },
}; 