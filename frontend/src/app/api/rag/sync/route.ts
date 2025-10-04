import { NextRequest, NextResponse } from 'next/server'
import { SyncRequest, SyncResponse } from '@/types/rag'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || '4f5793c108119abe'

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json()

    const response = await fetch(`${VPS_RAG_ENDPOINT}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000) // 同期は5分
    })

    if (!response.ok) {
      throw new Error(`VPS API error: ${response.status}`)
    }

    const data: SyncResponse = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('RAG sync proxy error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        {
          error: 'Sync request timeout',
          status: 'error' as const,
          repository: '',
          files_synced: 0,
          message: 'Sync request timed out'
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        error: 'Sync service unavailable',
        status: 'error' as const,
        repository: '',
        files_synced: 0,
        message: 'Sync service is currently unavailable'
      },
      { status: 503 }
    )
  }
}

export const maxDuration = 300
