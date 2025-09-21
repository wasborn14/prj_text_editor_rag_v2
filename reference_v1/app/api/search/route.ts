import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // クエリの埋め込みを生成
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // ベクトル検索を実行（コサイン類似度）
    const { data, error } = await supabase.rpc('search_notes', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.1, // 類似度の閾値を緩くする（0.1 = 10%以上）
      match_count: limit
    })

    if (error) {
      // 関数が存在しない場合は作成が必要
      if (error.message.includes('function search_notes')) {
        return NextResponse.json({
          error: 'Search function not found. Please create the search_notes function in Supabase.',
          createFunction: true
        }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({
      query,
      results: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}