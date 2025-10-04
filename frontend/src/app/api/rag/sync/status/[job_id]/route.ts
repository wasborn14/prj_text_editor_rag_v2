import { NextRequest, NextResponse } from 'next/server'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || '4f5793c108119abe'

export async function GET(
  request: NextRequest,
  { params }: { params: { job_id: string } }
) {
  try {
    const { job_id } = params

    const response = await fetch(`${VPS_RAG_ENDPOINT}/sync/status/${job_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`VPS API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('RAG sync status proxy error:', error)

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to get sync status'
      },
      { status: 503 }
    )
  }
}
