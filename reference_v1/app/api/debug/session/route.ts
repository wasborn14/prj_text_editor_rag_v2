import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
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

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // セッション内容を詳細に出力（トークンは隠す）
    const sessionInfo = {
      access_token: session.access_token ? '***HIDDEN***' : null,
      refresh_token: session.refresh_token ? '***HIDDEN***' : null,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      provider_token: session.provider_token ? '***HIDDEN***' : null,
      provider_refresh_token: session.provider_refresh_token ? '***HIDDEN***' : null,
      user: {
        id: session.user.id,
        email: session.user.email,
        identities: session.user.identities?.map(identity => ({
          provider: identity.provider,
          id: identity.id,
          identity_data: identity.identity_data,
          // access_tokenがあるかをチェック
          has_access_token: !!(identity as any).access_token,
        }))
      }
    };

    // 実際のprovider_tokenの有無をチェック
    const hasProviderToken = !!(session.provider_token);
    const hasAccessTokenInIdentity = !!(session.user.identities?.[0] as any)?.access_token;

    return NextResponse.json({
      sessionInfo,
      hasProviderToken,
      hasAccessTokenInIdentity,
      message: 'Session information retrieved successfully'
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}