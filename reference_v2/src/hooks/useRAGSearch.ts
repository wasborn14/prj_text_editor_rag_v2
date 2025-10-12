import { useState } from 'react'
import { SearchResult, SearchResponse } from '@/types/rag'

export const useRAGSearch = () => {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchDocuments = async (
    query: string,
    repository: string,
    limit = 10
  ): Promise<SearchResult[]> => {
    setIsSearching(true)
    setError(null)

    try {
      // 自サーバーのAPI Routeを呼び出し（VPSに直接アクセスしない）
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, repository, limit })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data: SearchResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data.results || []

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Search error:', errorMessage)
      return []
    } finally {
      setIsSearching(false)
    }
  }

  return { searchDocuments, isSearching, error }
}
