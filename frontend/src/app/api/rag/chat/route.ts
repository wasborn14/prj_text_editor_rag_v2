import { NextRequest, NextResponse } from 'next/server'
import { ChatRequest, ChatResponse } from '@/types/rag'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || '4f5793c108119abe'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()

    const response = await fetch(`${VPS_RAG_ENDPOINT}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000) // チャットは15秒
    })

    if (!response.ok) {
      throw new Error(`VPS API error: ${response.status}`)
    }

    const data: ChatResponse = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('RAG chat proxy error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Chat request timeout',
          answer: 'リクエストがタイムアウトしました。',
          sources: [],
          context_used: 0,
          repository: ''
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        error: 'Chat service unavailable',
        answer: 'チャットサービスが利用できません。',
        sources: [],
        context_used: 0,
        repository: ''
      },
      { status: 503 }
    )
  }
}

export const maxDuration = 20
