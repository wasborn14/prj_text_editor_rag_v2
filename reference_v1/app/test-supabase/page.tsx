'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TestNote {
  id: string
  title: string
  content: string | null
  created_at: string
}

export default function TestSupabasePage() {
  const [notes, setNotes] = useState<TestNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // ノート一覧取得
  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/notes')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoading(false)
    }
  }

  // ノート作成（埋め込み付き）
  const createNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTitle,
          content: newContent
        })
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      console.log('Note created with embedding:', data.hasEmbedding)

      setNewTitle('')
      setNewContent('')
      fetchNotes() // リロード
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  // セマンティック検索
  const performSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 5
        })
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setSearchResults(data.results || [])
      console.log('Search results:', data)
    } catch (error) {
      console.error('Error searching:', error)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Supabase Connection Test</h1>

      {/* ノート作成フォーム */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
        <form onSubmit={createNote} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full p-2 border rounded-md h-24"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Create Note
          </button>
        </form>
      </div>

      {/* セマンティック検索 */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">🔍 Semantic Search (RAG)</h2>
        <form onSubmit={performSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Search Query</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="例: Hello Supabase"
              required
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* 検索結果 */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">
            Search Results ({searchResults.length})
            {searchResults.length === 0 && searchQuery && " - No matches found"}
          </h3>
          {searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((result, index) => (
                <div key={result.id} className="bg-white border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold">{result.title}</h4>
                    <span className="text-sm text-green-600 font-mono">
                      {(result.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>
                  {result.content && (
                    <p className="text-gray-700 text-sm">{result.content}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(result.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : searchQuery && (
            <p className="text-gray-500 mt-2">No matching notes found. Try different keywords.</p>
          )}
        </div>
      </div>

      {/* ノート一覧 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Notes from Supabase</h2>
        {notes.length === 0 ? (
          <p className="text-gray-500">No notes found.</p>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg">{note.title}</h3>
                {note.content && (
                  <p className="text-gray-700 mt-2">{note.content}</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Created: {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}