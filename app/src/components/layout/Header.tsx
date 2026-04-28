import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, Bell, Share2, BookmarkIcon, Settings, Plus, X, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import FontSizePopup from '@/components/FontSizePopup'
import { supabase } from '@/lib/supabase'
import { signInWithKakao, signOut, getKakaoDisplayName, getKakaoAvatar } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

type HeaderAction = 'search' | 'bell' | 'share' | 'save' | 'settings' | 'add' | 'fontSize' | 'kakao'

interface HeaderProps {
  title?: string
  titleElement?: ReactNode
  showBack?: boolean
  rightActions?: HeaderAction[]
  onBack?: () => void
  onAction?: (action: string) => void
}

const iconMap: Record<string, typeof Search> = { search: Search, bell: Bell, share: Share2, save: BookmarkIcon, settings: Settings, add: Plus }

function FontSizeIcon() {
  return (
    <span style={{ position: 'relative', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ position: 'absolute', left: 0, bottom: 2, fontSize: 11, fontWeight: 800, color: 'var(--text-tertiary)', lineHeight: 1 }}>가</span>
      <span style={{ position: 'absolute', right: 0, top: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>가</span>
    </span>
  )
}

/* ─── 카카오 로그인 아이콘 ─── */
function KakaoIcon({ user }: { user: User | null }) {
  const avatar = getKakaoAvatar(user)
  const name = getKakaoDisplayName(user)

  if (user) {
    // 로그인 상태: 아바타 또는 이니셜
    return avatar ? (
      <img src={avatar} alt="카카오" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FEE500' }} />
    ) : (
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: '#FEE500',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 800, color: '#3C1E1E',
      }}>
        {name?.[0] ?? 'K'}
      </div>
    )
  }

  // 비로그인: 카카오 말풍선 아이콘
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '1.5px solid var(--border-2)',
      background: 'var(--bg-surface-3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5C4.41 1.5 1.5 3.86 1.5 6.75c0 1.82 1.05 3.43 2.66 4.42L3.5 13.5l2.82-1.41C6.74 12.19 7.36 12.25 8 12.25c3.59 0 6.5-2.36 6.5-5.25S11.59 1.5 8 1.5z" fill="var(--text-tertiary)"/>
      </svg>
    </div>
  )
}

/* ─── 카카오 로그인 팝업 ─── */
function KakaoLoginPopup({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const name = getKakaoDisplayName(user)
  const avatar = getKakaoAvatar(user)

  const handleLogin = async () => {
    setLoading(true)
    try { await signInWithKakao() } catch (e) { alert(`로그인 실패: ${e}`); setLoading(false) }
  }

  const handleLogout = async () => {
    setLoading(true)
    await signOut()
    setLoading(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 280, background: 'var(--bg-surface)', borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.22)', zIndex: 401, overflow: 'hidden',
      }}>
        {/* 닫기 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 12px 0' }}>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}><X size={16} /></button>
        </div>

        {user ? (
          /* 로그인 상태 */
          <div style={{ padding: '4px 20px 20px', textAlign: 'center' }}>
            {avatar ? (
              <img src={avatar} alt="프로필" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '3px solid #FEE500', margin: '0 auto 10px' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEE500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#3C1E1E', margin: '0 auto 10px' }}>
                {name?.[0] ?? 'K'}
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 16 }}>카카오 계정으로 로그인됨</div>
            <div style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8, background: '#ECFDF5', color: '#065F46', marginBottom: 16 }}>
              ✅ 꿈해몽 분석 기록이 자동 저장됩니다
            </div>
            <button onClick={handleLogout} disabled={loading} style={{
              width: '100%', padding: '10px 0', borderRadius: 10,
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)',
            }}>
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        ) : (
          /* 비로그인 상태 */
          <div style={{ padding: '4px 20px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEE500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 12px' }}>
              💬
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>카카오 간편 로그인</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              로그인하면 꿈해몽 분석 기록이<br/>
              안전하게 저장됩니다
            </div>
            <button onClick={handleLogin} disabled={loading} style={{
              width: '100%', padding: '13px 0', borderRadius: 10,
              fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#FEE500', color: '#3C1E1E', border: 'none', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 18 }}>💬</span>
              {loading ? '로그인 중...' : '카카오로 시작하기'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/* ─── 메인 Header ─── */
export default function Header({ title, titleElement, showBack, rightActions = [], onBack, onAction }: HeaderProps) {
  const navigate = useNavigate()
  const handleBack = () => onBack ? onBack() : navigate(-1)
  const [showFontPopup, setShowFontPopup] = useState(false)
  const [showKakaoPopup, setShowKakaoPopup] = useState(false)
  const [kakaoUser, setKakaoUser] = useState<User | null>(null)

  // Kakao 인증 상태 구독
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => setKakaoUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setKakaoUser(session?.user ?? null)
      if (session?.user) setShowKakaoPopup(false) // 로그인 완료 시 팝업 닫기
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', minHeight: 52, flexShrink: 0, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showBack && (
            <button onClick={handleBack} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)' }}>
              <ChevronLeft size={22} />
            </button>
          )}
          {titleElement}
          {!titleElement && title && !showBack && (
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          )}
        </div>
        {showBack && title && !titleElement && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            {title}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {rightActions.map(action => {
            if (action === 'fontSize') {
              return (
                <button key={action} onClick={() => setShowFontPopup(true)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)' }}>
                  <FontSizeIcon />
                </button>
              )
            }
            if (action === 'kakao') {
              return (
                <button key={action} onClick={() => setShowKakaoPopup(v => !v)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-full)', position: 'relative' }}>
                  <KakaoIcon user={kakaoUser} />
                  {kakaoUser && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: '#FEE500', border: '1.5px solid var(--bg-surface)' }} />
                  )}
                </button>
              )
            }
            const Icon = iconMap[action]
            return (
              <button key={action} onClick={() => onAction?.(action)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)' }}>
                <Icon size={22} />
              </button>
            )
          })}
        </div>
      </div>
      {showFontPopup && <FontSizePopup onClose={() => setShowFontPopup(false)} />}
      {showKakaoPopup && (
        <KakaoLoginPopup user={kakaoUser} onClose={() => setShowKakaoPopup(false)} />
      )}
    </>
  )
}
