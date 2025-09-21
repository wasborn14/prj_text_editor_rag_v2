import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 埋め込み生成ヘルパー関数
async function generateEmbedding(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    return null
  }
}

// GET: ノート一覧取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('test_notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ notes: data })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// POST: ノート作成（埋め込み付き）
export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // 埋め込み生成（title + content を結合）
    const textForEmbedding = `${title}\n\n${content || ''}`
    const embedding = await generateEmbedding(textForEmbedding)

    // ノートをDBに保存
    const { data, error } = await supabase
      .from('test_notes')
      .insert([
        {
          title,
          content: content || null,
          embedding: embedding ? JSON.stringify(embedding) : null
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json({
      note: data[0],
      hasEmbedding: !!embedding
    })

  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}