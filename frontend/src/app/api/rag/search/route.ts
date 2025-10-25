import { NextRequest, NextResponse } from 'next/server'
import { SearchRequest, SearchResponse } from '@/types/rag'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || '4f5793c108119abe'

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json()

    // VPS RAG APIを呼び出し
    const response = await fetch(`${VPS_RAG_ENDPOINT}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000) // 8秒タイムアウト
    })

    if (!response.ok) {
      throw new Error(`VPS API error: ${response.status}`)
    }

    const data: SearchResponse = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('RAG search proxy error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout', results: [], total: 0 },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Search service unavailable', results: [], total: 0 },
      { status: 503 }
    )
  }
}

// Vercelのタイムアウト制限
export const maxDuration = 10
