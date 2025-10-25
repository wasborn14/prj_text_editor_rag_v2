'use client'

import React, { useState } from 'react'
import { Search, Loader2, FileText } from 'lucide-react'
import { useRAGSearch } from '@/hooks/rag/useRAGSearch'
import { SearchResult } from '@/types/rag'

interface RAGSearchProps {
  repository?: string
}

export const RAGSearch = ({ repository = 'wasborn14/test-editor-docs' }: RAGSearchProps) => {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const { searchDocuments, isSearching, error } = useRAGSearch()

  const handleSearch = async () => {
    if (!query.trim()) return
    const results = await searchDocuments(query, repository, 10)
    setSearchResults(results)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search in documentation..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Searching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>Search</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        {searchResults.length === 0 && !isSearching && !error && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Search className="w-16 h-16 mb-4" />
            <p className="text-sm">Enter a query to search documentation</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-2">
              {searchResults.length} results found
            </div>
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start space-x-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="font-medium text-sm text-blue-700 truncate">
                    {result.metadata?.path || 'Unknown file'}
                  </div>
                </div>
                <div className="text-sm text-gray-700 line-clamp-3 mb-2">
                  {result.content}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Chunk: {result.metadata?.chunk_index ?? 'N/A'}</span>
                  <span>Score: {result.score?.toFixed(3) ?? 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
