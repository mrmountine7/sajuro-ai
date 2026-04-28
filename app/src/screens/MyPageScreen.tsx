import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, CalendarRange, GitBranch, Heart,
  Archive, BarChart3, MessageCircle, FileText,
  UserPlus, Share2,
  Crown, CreditCard,
  Settings, Headphones,
  ChevronRight, LogOut, IdCard,
  type LucideIcon,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import { getDailyFortune, getDayPillarLabel, type DailyFortune } from '@/lib/daily-fortune'
import { signInWithKakao, signOut, getUser, getKakaoDisplayName, getKakaoAvatar } from '@/lib/auth'
import type { User } from '@supabase/supabase-js'

interface MenuItem {
  Icon: LucideIcon; label: string; path?: string
  bg: string; color: string; desc?: string
}
interface MenuGroup { title: string; items: MenuItem[] }

const menuGroups: MenuGroup[] = [
  { title: '나만의 인사이트', items: [
    { Icon: Sparkles, label: '오늘의 한마디', path: '/daily-fortune-calendar', bg: '#FFF8E1', color: '#D97706', desc: '날짜별 사주 에너지 달력' },
    { Icon: CalendarRange, label: '이번 달 운세 요약', path: '/monthly-fortune', bg: '#F0F4FF', color: '#3B82F6', desc: '월별 운세 상세 분석' },
    { Icon: GitBranch, label: '인생 대운 타임라인', path: '/daeun-timeline', bg: '#ECFDF5', color: '#059669', desc: '10년 단위 내 인생 흐름도' },
    { Icon: Heart, label: '나의 이상형 사주 분석', path: '/ideal-type', bg: '#FFF0F6', color: '#EC4899', desc: '사주로 보는 나의 이상형' },
    { Icon: IdCard, label: '사주 명함', path: '/saju-card', bg: '#EEF2FF', color: '#6366F1', desc: '공유 가능한 나의 사주 카드' },
  ]},
  { title: '분석 관리', items: [
    { Icon: Archive, label: '사주 보관소', path: '/vault', bg: '#EEF2FF', color: '#6366F1', desc: '저장된 사주 프로필 관리' },
    { Icon: BarChart3, label: '분석 기록', path: '/records', bg: '#FFF0F6', color: '#EC4899', desc: '꿈해몽 · 사주분석 · 궁합 기록' },
    { Icon: MessageCircle, label: '질문/답변 내역', path: '/qa-history', bg: '#F5F3FF', color: '#8B5CF6', desc: '분석별 Q&A 기록 모음' },
    { Icon: FileText, label: '결제한 리포트', bg: '#FDF4FF', color: '#A855F7' },
  ]},
  { title: '친구 초대 & 공유', items: [
    { Icon: UserPlus, label: '친구 초대하기', bg: '#EEF2FF', color: '#6366F1', desc: '초대하면 무료 분석 1회' },
    { Icon: Heart, label: '궁합 초대장 보내기', bg: '#FFF0F0', color: '#EF4444', desc: '상대에게 사주 입력 요청' },
    { Icon: Share2, label: '분석 결과 공유하기', bg: '#ECFDF5', color: '#14B8A6' },
  ]},
  { title: '이용권 / 결제', items: [
    { Icon: Crown, label: '이용권/구독', bg: '#FFFBEB', color: '#D97706' },
    { Icon: CreditCard, label: '결제 내역', bg: '#F0FDFA', color: '#14B8A6' },
  ]},
  { title: '설정 & 지원', items: [
    { Icon: Settings, label: '설정', bg: '#F1F5F9', color: '#64748B' },
    { Icon: Headphones, label: '고객센터', bg: '#EFF6FF', color: '#60A5FA' },
  ]},
]

/* ─── 마지막 분석 날짜 포맷 ─── */
function fmtLastAnalysis(iso: string | null): string {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff < 7) return `${diff}일 전`
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`
  return `${Math.floor(diff / 30)}개월 전`
}

interface PrimaryProfile {
  name: string; birth_year: number; birth_month: number; birth_day: number
  birth_hour: string; calendar_type: string
}

function getKoreanAge(year: number) { return new Date().getFullYear() - year + 1 }
function formatCal(cal: string) { return cal === 'solar' ? '양력' : '음력' }
function formatBirthDate(p: PrimaryProfile) {
  return `${p.birth_year}.${String(p.birth_month).padStart(2,'0')}.${String(p.birth_day).padStart(2,'0')}`
}

interface Stats { analysisCount: number; qaCount: number; favoriteCount: number; lastAnalysis: string | null }

export default function MyPageScreen() {
  const nav = useNavigate()
  const [profile, setProfile] = useState<PrimaryProfile | null>(null)
  const [fortune, setFortune] = useState<DailyFortune | null>(null)
  const [pillarLabel, setPillarLabel] = useState('')
  const [kakaoUser, setKakaoUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [stats, setStats] = useState<Stats>({ analysisCount: 0, qaCount: 0, favoriteCount: 0, lastAnalysis: null })

  // Kakao 로그인 상태 구독
  useEffect(() => {
    getUser().then(setKakaoUser)
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setKakaoUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleKakaoLogin = async () => {
    setAuthLoading(true)
    try { await signInWithKakao() } catch (e) { alert(`카카오 로그인 실패: ${e}`); setAuthLoading(false) }
  }

  const handleLogout = async () => {
    setAuthLoading(true)
    await signOut()
    setKakaoUser(null)
    setAuthLoading(false)
  }

  /* ─── 통계 로드 ─── */
  useEffect(() => {
    async function loadStats() {
      if (!supabase) return
      const deviceId = getDeviceId()
      const userId = kakaoUser?.id

      // device_id 또는 user_id 기반 필터 헬퍼
      const applyFilter = (q: any) => userId
        ? q.or(`device_id.eq.${deviceId},user_id.eq.${userId}`)
        : q.eq('device_id', deviceId)

      try {
        // 병렬로 모든 통계 조회
        const [
          precisionRes, dreamRes, lifetimeRes, fortuneRes, compatRes,
          qaRes, lifetimeQaRes, fortuneQaRes, compatQaRes,
          favRes,
        ] = await Promise.all([
          applyFilter(supabase.from('precision_analyses').select('id,created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(1)),
          applyFilter(supabase.from('dream_records').select('id,created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(1)),
          applyFilter(supabase.from('lifetime_readings').select('id,created_at').order('created_at', { ascending: false }).limit(1)),
          applyFilter(supabase.from('fortune_readings').select('id,created_at').order('created_at', { ascending: false }).limit(1)),
          applyFilter(supabase.from('compatibility_results').select('id,created_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(1)),
          // Q&A 건수
          supabase.from('precision_qa').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
          supabase.from('lifetime_qa').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
          supabase.from('fortune_qa').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
          supabase.from('compatibility_qa').select('id', { count: 'exact', head: true }).eq('device_id', deviceId),
          // 즐겨찾기 프로필 수
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('device_id', deviceId).eq('is_favorite', true),
        ])

        const analysisCount =
          (precisionRes.count ?? 0) +
          (dreamRes.count ?? 0) +
          (compatRes.count ?? 0) +
          (lifetimeRes.data?.length ?? 0) +
          (fortuneRes.data?.length ?? 0)

        const qaCount =
          (qaRes.count ?? 0) +
          (lifetimeQaRes.count ?? 0) +
          (fortuneQaRes.count ?? 0) +
          (compatQaRes.count ?? 0)

        // 가장 최근 분석 날짜 찾기 (Supabase + localStorage 모두 포함)
        const localCompatDates: string[] = (() => {
          try { return (JSON.parse(localStorage.getItem('compat_records_local') || '[]') as any[]).map(r => r.created_at) } catch { return [] }
        })()
        const localDreamDates: string[] = (() => {
          try { return (JSON.parse(localStorage.getItem('dream_records_local') || '[]') as any[]).map(r => r.created_at) } catch { return [] }
        })()

        const lastDates = [
          precisionRes.data?.[0]?.created_at,
          dreamRes.data?.[0]?.created_at,
          lifetimeRes.data?.[0]?.created_at,
          fortuneRes.data?.[0]?.created_at,
          compatRes.data?.[0]?.created_at,
          ...localCompatDates.slice(0, 1),
          ...localDreamDates.slice(0, 1),
        ].filter(Boolean) as string[]
        const lastAnalysis = lastDates.length > 0
          ? lastDates.sort((a, b) => b.localeCompare(a))[0]
          : null

        setStats({
          analysisCount,
          qaCount,
          favoriteCount: favRes.count ?? 0,
          lastAnalysis,
        })
      } catch (e) {
        console.warn('[MyPage] 통계 로드 오류:', e)
      }
    }
    loadStats()
  }, [kakaoUser])

  useEffect(() => {
    async function load() {
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('name, birth_year, birth_month, birth_day, birth_hour, calendar_type')
        .eq('device_id', getDeviceId())
        .eq('is_primary', true)
        .single()
      if (data) {
        const p = data as PrimaryProfile
        setProfile(p)
        setPillarLabel(getDayPillarLabel(p.birth_year, p.birth_month, p.birth_day, p.calendar_type))
        setFortune(getDailyFortune(p.birth_year, p.birth_month, p.birth_day, p.calendar_type))
      }
    }
    load()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="마이페이지" rightActions={['kakao', 'fontSize', 'settings']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 프로필 카드 ─── */}
        <div className="s-profile-card" style={{ margin: '0 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* 아바타 */}
            {kakaoUser && getKakaoAvatar(kakaoUser) ? (
              <img src={getKakaoAvatar(kakaoUser)!} alt="카카오 프로필" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FEE500' }} />
            ) : (
              <div className="s-avatar">{profile?.name?.[0] ?? '?'}</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  {kakaoUser ? (getKakaoDisplayName(kakaoUser) ?? profile?.name ?? '사용자') : (profile?.name ?? '사용자')}
                </span>
                {kakaoUser && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: '#FEE500', color: '#3C1E1E' }}>카카오 연결됨</span>
                )}
                {pillarLabel && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#D97706', background: '#FFF8E1', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>{pillarLabel}일주</span>
                )}
              </div>
              {profile && (
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {getKoreanAge(profile.birth_year)}세 · {formatCal(profile.calendar_type)} {formatBirthDate(profile)} · {profile.birth_hour === 'unknown' ? '시간 모름' : profile.birth_hour}
                </div>
              )}
              {!kakaoUser && (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>비로그인 상태</div>
              )}
            </div>
          </div>

          {/* 카카오 로그인 유도 배너 + 버튼 */}
          {!kakaoUser && (
            <div style={{
              marginTop: 14, padding: '12px 14px', borderRadius: 12,
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FFF8E1 100%)',
              border: '1.5px solid #FCD34D',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>
                  분석 기록이 저장되지 않고 있습니다
                </div>
                <div style={{ fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>
                  카카오 로그인하면 모든 분석 결과·Q&A·꿈해몽이 영구 저장되어 언제든 다시 볼 수 있어요.
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: !kakaoUser ? 10 : 14 }}>
            {kakaoUser ? (
              <button onClick={handleLogout} disabled={authLoading} style={{
                width: '100%', padding: '10px 0', borderRadius: 12,
                fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)',
              }}>
                <LogOut size={15} /> 로그아웃
              </button>
            ) : (
              <button onClick={handleKakaoLogin} disabled={authLoading} style={{
                width: '100%', padding: '14px 0', borderRadius: 12,
                fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#FEE500', color: '#3C1E1E', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(254,229,0,0.5)',
              }}>
                <span style={{ fontSize: 20 }}>💬</span>
                {authLoading ? '로그인 중...' : '카카오 로그인으로 기록 저장하기'}
              </button>
            )}
          </div>

          {/* 스탯 그리드 — 실시간 DB 데이터 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
            {[
              { label: '완료 분석', value: stats.analysisCount > 0 ? `${stats.analysisCount}건` : '—', color: '#6366F1' },
              { label: '질문', value: stats.qaCount > 0 ? `${stats.qaCount}개` : '—', color: '#8B5CF6' },
              { label: '즐겨찾기', value: stats.favoriteCount > 0 ? `${stats.favoriteCount}명` : '—', color: '#F59E0B' },
              { label: '마지막 분석', value: fmtLastAnalysis(stats.lastAnalysis), color: '#059669' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '10px 0', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── 오늘의 한마디 배너 (동적) ─── */}
        {fortune && (
          <div style={{
            margin: '0 20px 20px', padding: '16px 18px', borderRadius: 16,
            background: 'linear-gradient(135deg, #FFF8E1 0%, #FFF0F6 100%)',
            border: '1px solid #FFE4CC',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginBottom: 6 }}>
              오늘의 한마디 · {fortune.tenGod.name}({fortune.tenGod.hanja}: {fortune.tenGod.desc})
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#92400E', lineHeight: 1.6 }}>
              "{fortune.tenGod.message}"
            </div>
            <div style={{ fontSize: 11, color: '#C05600', marginTop: 8, textAlign: 'right' }}>
              {fortune.dateLabel} · {fortune.dayPillar.label}일
            </div>
          </div>
        )}

        {/* ─── 메뉴 그룹 ─── */}
        {menuGroups.map(group => (
          <div key={group.title} style={{ margin: '0 20px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: 0.5, marginBottom: 8, padding: '0 4px' }}>{group.title}</div>
            <div className="s-menu-list">
              {group.items.map(item => (
                <button key={item.label} className="s-menu-item" onClick={() => item.path && nav(item.path)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.bg,
                  }}>
                    <item.Icon size={17} color={item.color} strokeWidth={2.2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                    {item.desc && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{item.desc}</div>
                    )}
                  </div>
                  <ChevronRight size={16} color="var(--text-disabled)" strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
