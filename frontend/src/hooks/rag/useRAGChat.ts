import { ChatResponse } from '@/types/rag'
import { useState } from 'react'

export const useRAGChat = () => {
  const [isChatting, setIsChatting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const askQuestion = async (
    message: string,
    repository: string,
    contextLimit = 5
  ): Promise<ChatResponse | null> => {
    setIsChatting(true)
    setError(null)

    try {
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          repository,
          context_limit: contextLimit
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chat failed')
      }

      const data: ChatResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Chat error:', errorMessage)
      return null
    } finally {
      setIsChatting(false)
    }
  }

  return { askQuestion, isChatting, error }
}
