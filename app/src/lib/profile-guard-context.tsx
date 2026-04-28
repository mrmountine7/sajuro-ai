import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { getDeviceId } from './device-id'

/* ─── 기본사주 없을 때 표시할 모달 ─── */
function NoPrimaryModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)',
        padding: '0 32px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%', maxWidth: 320,
          borderRadius: 20, background: 'var(--bg-surface)',
          padding: '28px 24px 20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          textAlign: 'center',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 40, marginBottom: 14 }}>📜</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
          기본 사주가 등록되지 않았습니다
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          분석을 이용하려면 먼저 기본 사주를 등록해야 합니다.<br />
          지금 새 사주 추가 화면으로 이동할까요?
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              fontSize: 14, fontWeight: 600,
              background: 'var(--bg-surface-3)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-1)', cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 12,
              fontSize: 14, fontWeight: 700,
              background: 'var(--bg-accent)', color: '#1F2937',
              border: 'none', cursor: 'pointer',
            }}
          >
            사주 추가하기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Context ─── */
interface ProfileGuardCtx {
  hasPrimary: boolean | null  // null = 아직 로딩 중
  safeNav: (path: string, opts?: any) => void
  refreshPrimary: () => void
}

const ProfileGuardContext = createContext<ProfileGuardCtx>({
  hasPrimary: null,
  safeNav: () => {},
  refreshPrimary: () => {},
})

export function ProfileGuardProvider({ children }: { children: React.ReactNode }) {
  const nav = useNavigate()
  const [hasPrimary, setHasPrimary] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false)
  const pendingPath = useRef<{ path: string; opts?: any } | null>(null)

  const checkPrimary = useCallback(async () => {
    try {
      if (!supabase) { setHasPrimary(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('device_id', getDeviceId())
        .eq('is_primary', true)
        .limit(1)
      setHasPrimary(!!(data && data.length > 0))
    } catch {
      setHasPrimary(false)
    }
  }, [])

  useEffect(() => { checkPrimary() }, [checkPrimary])

  const safeNav = useCallback((path: string, opts?: any) => {
    // 기본사주 불필요 경로: 추가·마이페이지·보관소 등
    const FREE_PATHS = ['/add-profile', '/vault', '/mypage', '/records', '/onboarding', '/']
    if (FREE_PATHS.some(fp => path === fp || path.startsWith(fp + '?'))) {
      nav(path, opts)
      return
    }
    if (hasPrimary === false) {
      pendingPath.current = { path, opts }
      setShowModal(true)
      return
    }
    nav(path, opts)
  }, [hasPrimary, nav])

  const handleConfirm = () => {
    setShowModal(false)
    pendingPath.current = null
    nav('/add-profile')
  }
  const handleCancel = () => {
    setShowModal(false)
    pendingPath.current = null
  }

  return (
    <ProfileGuardContext.Provider value={{ hasPrimary, safeNav, refreshPrimary: checkPrimary }}>
      {children}
      {showModal && <NoPrimaryModal onConfirm={handleConfirm} onCancel={handleCancel} />}
    </ProfileGuardContext.Provider>
  )
}

export function useProfileGuard() {
  return useContext(ProfileGuardContext)
}
