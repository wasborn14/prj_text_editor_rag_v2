import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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

// Supabaseクライアント作成ヘルパー
async function createSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component で呼ばれた場合は無視
          }
        },
      },
    }
  );
}

// GET: ファイル一覧取得
export async function GET() {
  try {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('type', { ascending: false }) // フォルダを先に
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({ files: data })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    )
  }
}

// POST: ファイル作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { path, name, type, content } = await request.json()

    if (!path || !name || !type) {
      return NextResponse.json(
        { error: 'Path, name, and type are required' },
        { status: 400 }
      )
    }

    // 埋め込み生成（ファイルの場合のみ）
    let embedding = null
    if (type === 'file' && content) {
      const textForEmbedding = `${name}\n\n${content}`
      embedding = await generateEmbedding(textForEmbedding)
    }

    const { data, error } = await supabase
      .from('files')
      .insert([
        {
          path,
          name,
          type,
          content: type === 'file' ? content : null,
          embedding: embedding ? JSON.stringify(embedding) : null
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json({
      file: data[0],
      hasEmbedding: !!embedding
    })

  } catch (error) {
    console.error('Error creating file:', error)
    return NextResponse.json(
      { error: 'Failed to create file' },
      { status: 500 }
    )
  }
}

// PUT: ファイル更新
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, content } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      )
    }

    // 既存ファイル情報を取得
    const { data: existingFile, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingFile) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // 埋め込み生成（ファイルの場合のみ）
    let embedding = null
    if (existingFile.type === 'file' && content) {
      const textForEmbedding = `${existingFile.name}\n\n${content}`
      embedding = await generateEmbedding(textForEmbedding)
    }

    const updateData: any = {
      content,
      updated_at: new Date().toISOString()
    }

    if (embedding) {
      updateData.embedding = JSON.stringify(embedding)
    }

    const { data, error } = await supabase
      .from('files')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json({
      file: data[0],
      hasEmbedding: !!embedding
    })

  } catch (error) {
    console.error('Error updating file:', error)
    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    )
  }
}