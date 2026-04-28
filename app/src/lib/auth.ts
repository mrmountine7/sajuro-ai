import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

/** Kakao OAuth 로그인 */
export async function signInWithKakao(): Promise<void> {
  if (!supabase) throw new Error('Supabase 미연결')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'login' },
    },
  })
  if (error) throw error
}

/** 로그아웃 */
export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/** 현재 로그인 사용자 */
export async function getUser(): Promise<User | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Kakao 닉네임/이메일 추출 */
export function getKakaoDisplayName(user: User | null): string | null {
  if (!user) return null
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.preferred_username ||
    user.email?.split('@')[0] ||
    null
  )
}

/** Kakao 프로필 이미지 */
export function getKakaoAvatar(user: User | null): string | null {
  if (!user) return null
  return user.user_metadata?.avatar_url || user.user_metadata?.picture || null
}
