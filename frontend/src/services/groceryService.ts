import { GroceryList } from '@/types/grocery';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const groceryService = {
  async getGroceryList(planId: string): Promise<GroceryList> {
    const token = localStorage.getItem('sb-access-token');
    const res = await fetch(`${API_URL}/grocery/${planId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch grocery list');
    return res.json();
  },
}; 