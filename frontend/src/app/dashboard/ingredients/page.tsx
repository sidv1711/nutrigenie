'use client'

import { useState, useEffect } from 'react'
import { ingredientService } from '../../../services/ingredientService'
import { IngredientSearchResult, IngredientStats } from '../../../services/ingredientService'
import { Button } from '../../../components/ui/button'

export default function IngredientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<IngredientSearchResult[]>([])
  const [stats, setStats] = useState<IngredientStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const ingredientStats = await ingredientService.getStats()
        setStats(ingredientStats)
      } catch (error) {
        console.error('Error fetching ingredient stats:', error)
      }
    }
    fetchStats()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const results = await ingredientService.searchIngredients(searchQuery, {
        similarity_threshold: similarityThreshold,
        limit: 20,
        category_filter: categoryFilter || undefined
      })
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching ingredients:', error)
      alert('Failed to search ingredients. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEmbedIngredient = async (name: string, category: string) => {
    try {
      setLoading(true)
      await ingredientService.embedIngredient(name, category)
      alert('Ingredient embedded successfully! It will now appear in future searches.')
      
      // Refresh search results
      if (searchQuery.trim()) {
        const results = await ingredientService.searchIngredients(searchQuery, {
          similarity_threshold: similarityThreshold,
          limit: 20,
          category_filter: categoryFilter || undefined
        })
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Error embedding ingredient:', error)
      alert('Failed to embed ingredient. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'bg-green-100 text-green-800'
    if (similarity >= 0.8) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.9) return 'Excellent'
    if (similarity >= 0.8) return 'Good'
    return 'Fair'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ingredient Database</h1>
            <p className="text-gray-600">Search our AI-powered ingredient database with semantic matching</p>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary-600">{stats.total_ingredients.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Ingredients</div>
            </div>
            <div className="bg-secondary-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-secondary-600">{stats.categories.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="bg-accent-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-accent-600">{Math.round(stats.price_coverage * 100)}%</div>
              <div className="text-sm text-gray-600">Price Coverage</div>
            </div>
          </div>
        )}
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Semantic Ingredient Search</h2>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for ingredients (e.g., 'red fruit', 'protein source', 'dairy')"
                className="input w-full"
              />
            </div>
            <Button type="submit" disabled={loading} className="bg-primary-500 hover:bg-primary-600">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Filter (optional)
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input w-full"
              >
                <option value="">All Categories</option>
                {stats?.categories.map((category) => (
                  <option key={category} value={category} className="capitalize">
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Similarity Threshold: {similarityThreshold}
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Less Strict</span>
                <span>More Strict</span>
              </div>
            </div>
          </div>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Search Results ({searchResults.length} found)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((result, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{result.ingredient.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(result.similarity)}`}>
                      {getSimilarityLabel(result.similarity)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="capitalize">{result.ingredient.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Unit:</span>
                      <span>{result.ingredient.unit}</span>
                    </div>
                    {result.ingredient.price_per_unit && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price:</span>
                        <span className="font-medium">${result.ingredient.price_per_unit.toFixed(2)}/{result.ingredient.unit}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Similarity:</span>
                      <span className="font-mono">{(result.similarity * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery && !loading && searchResults.length === 0 && (
          <div className="mt-8 text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No ingredients found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No ingredients match your search query &quot;{searchQuery}&quot;.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => handleEmbedIngredient(searchQuery, 'general')}
                disabled={loading}
                variant="outline"
              >
                Add &quot;{searchQuery}&quot; to Database
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 border border-primary-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🤖 How AI-Powered Search Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-primary-700 mb-2">1. Semantic Understanding</div>
            <p className="text-gray-600">
              Our AI understands context and meaning, not just exact word matches. Search &quot;red fruit&quot; to find tomatoes, apples, and strawberries.
            </p>
          </div>
          <div>
            <div className="font-medium text-secondary-700 mb-2">2. Similarity Scoring</div>
            <p className="text-gray-600">
              Each result includes a similarity score showing how well it matches your query. Adjust the threshold to get broader or narrower results.
            </p>
          </div>
          <div>
            <div className="font-medium text-accent-700 mb-2">3. Real-time Pricing</div>
            <p className="text-gray-600">
              See current prices from your selected stores. Our system updates pricing data regularly for accurate meal planning.
            </p>
          </div>
        </div>
      </div>

      {/* Example Searches */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Try These Example Searches</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            'protein source',
            'red vegetables',
            'dairy alternatives',
            'whole grains',
            'leafy greens',
            'citrus fruits',
            'healthy fats',
            'fermented foods'
          ].map((example) => (
            <Button
              key={example}
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery(example)
                handleSearch(new Event('submit') as any)
              }}
              className="text-left justify-start"
            >
              {example}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}