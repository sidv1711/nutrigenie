import { api } from './api'

export interface Ingredient {
  id: string
  name: string
  category: string
  unit: string
  price_per_unit?: number
  embedding?: number[]
}

export interface IngredientSearchResult {
  ingredient: Ingredient
  similarity: number
}

export interface IngredientStats {
  total_ingredients: number
  categories: string[]
  price_coverage: number
}

export const ingredientService = {
  // Search ingredients using semantic search
  searchIngredients: async (
    query: string, 
    options: { 
      similarity_threshold?: number
      limit?: number
      category_filter?: string 
    } = {}
  ): Promise<IngredientSearchResult[]> => {
    const response = await api.get<IngredientSearchResult[]>('/ingredients/search', {
      params: {
        q: query,
        similarity_threshold: options.similarity_threshold || 0.7,
        limit: options.limit || 10,
        category_filter: options.category_filter
      }
    })
    return response.data
  },

  // Embed a new ingredient
  embedIngredient: async (name: string, category?: string): Promise<{ ingredient_id: string }> => {
    const response = await api.post<{ ingredient_id: string }>('/ingredients/embed', {
      name,
      category
    })
    return response.data
  },

  // Get ingredient by ID
  getIngredient: async (id: string): Promise<Ingredient> => {
    const response = await api.get<Ingredient>(`/ingredients/${id}`)
    return response.data
  },

  // Get ingredient statistics
  getStats: async (): Promise<IngredientStats> => {
    const response = await api.get<IngredientStats>('/ingredients/stats')
    return response.data
  }
}