import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, Sparkles, AlertTriangle } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getCurrentIdentity, applyUserFilter } from '@/lib/user-filter'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/* ─── 블루 디자인 토큰 ─── */
const B = {
  primary:  '#2563EB',
  soft:     '#3B82F6',
  bg:       '#EFF6FF',
  bgMid:    '#F0F9FF',
  border:   '#BFDBFE',
  text:     '#1E3A8A',
  textSoft: '#1D4ED8',
  gradient: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
} as const

/* ─── 점수 색상 ─── */
function scoreColor(s: number) {
  return s >= 80 ? '#059669' : s >= 65 ? B.soft : s >= 50 ? '#D97706' : '#DC2626'
}
function scoreLabel(s: number) {
  return s >= 80 ? '매우 좋음 ✨' : s >= 65 ? '좋음 👍' : s >= 50 ? '평범 ➡️' : '주의 ⚠️'
}

/* ─── 월 데이터 타입 ─── */
interface MonthSummary {
  score: number
  keyword: string
  summary: string
}

interface DomainDetail {
  score: number
  summary: string
}

interface MonthDetail {
  overall: string
  career: DomainDetail
  wealth: DomainDetail
  health: DomainDetail
  relation: DomainDetail
  creative: DomainDetail
  lucky_tip: string
  caution: string
  month_pillar?: { label: string }
}

interface FortuneData {
  year_summary: string
  months: Record<string, MonthSummary>
  target_month: number
  target_year: number
  target_month_detail: MonthDetail
  month_pillar: { label: string }
  saju_context: string
}

/* ─── 점수 원형 표시 ─── */
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const c = scoreColor(score)
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-1)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={c} strokeWidth={6}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%' }}
        fill={c} fontSize={size * 0.22} fontWeight={800}>
        {score}
      </text>
    </svg>
  )
}

/* ─── 점수 바 ─── */
function ScoreBar({ score, label, emoji }: { score: number; label: string; emoji: string }) {
  const c = scoreColor(score)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>{emoji}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{score}점</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: 'var(--border-1)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 4, background: c, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  )
}

/* ─── 월별 미니 카드 ─── */
function MonthChip({ m, month, isSelected, isLoaded, onSelect }: {
  m: MonthSummary | undefined; month: number; isSelected: boolean
  isLoaded: boolean; onSelect: () => void
}) {
  const c = m ? scoreColor(m.score) : 'var(--text-tertiary)'
  const score = m?.score ?? 0

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 8px', borderRadius: 14, minWidth: 60, flexShrink: 0,
        border: isSelected ? `2px solid ${B.primary}` : '1px solid var(--border-1)',
        background: isSelected ? B.bg : 'var(--bg-surface)',
        cursor: 'pointer', transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: isSelected ? 800 : 500, color: isSelected ? B.text : 'var(--text-secondary)' }}>
        {month}월
      </span>
      {m ? (
        <>
          {/* 점수 원 */}
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${c}20`, border: `2px solid ${c}60`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: c }}>{score}</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: c, lineHeight: 1, textAlign: 'center', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.keyword}
          </span>
        </>
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>-</span>
        </div>
      )}
      {isLoaded && !isSelected && (
        <div style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: '50%', background: B.primary }} />
      )}
    </button>
  )
}

/* ─── 메인 화면 ─── */
export default function MonthlyFortuneScreen() {
  const nav = useNavigate()
  const today = new Date()
  const [targetYear, setTargetYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [fortuneData, setFortuneData] = useState<FortuneData | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, MonthDetail>>({})
  const [currentDetail, setCurrentDetail] = useState<MonthDetail | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const monthScrollRef = useRef<HTMLDivElement>(null)

  /* 프로필 로드 */
  useEffect(() => {
    async function loadProfile() {
      if (!supabase) { setError('Supabase 미연결'); setLoading(false); return }
      const identity = await getCurrentIdentity()
      const { data } = await applyUserFilter(
        supabase.from('profiles').select('name, gender, birth_year, birth_month, birth_day, birth_hour, calendar_type'),
        identity
      ).eq('is_primary', true).single()
      if (!data) { setError('등록된 사주 프로필이 없습니다. 사주 보관소에서 프로필을 먼저 등록해주세요.'); setLoading(false); return }
      setProfile(data)
    }
    loadProfile()
  }, [])

  /* 초기 분석 로드 */
  useEffect(() => {
    if (!profile) return
    fetchInitial()
  }, [profile, targetYear])

  async function buildProfileRequest(tYear: number, tMonth: number) {
    const [h, mi] = profile.birth_hour === 'unknown' ? [12, 0] : profile.birth_hour.split(':').map(Number)
    return {
      name: profile.name,
      gender: profile.gender,
      year: profile.birth_year,
      month: profile.birth_month,
      day: profile.birth_day,
      hour: h, minute: mi || 0,
      is_lunar: profile.calendar_type !== 'solar',
      target_year: tYear,
      target_month: tMonth,
    }
  }

  async function fetchInitial() {
    setLoading(true)
    setError('')
    try {
      const body = await buildProfileRequest(targetYear, today.getMonth() + 1)
      const res = await fetch(`${API_BASE}/api/saju/monthly-fortune`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`API 오류: ${res.status}`)
      const data: FortuneData = await res.json()
      setFortuneData(data)
      // 이번 달 상세는 초기 응답에 포함
      const key = `${targetYear}-${today.getMonth() + 1}`
      setDetailCache(prev => ({ ...prev, [key]: data.target_month_detail }))
      setCurrentDetail(data.target_month_detail)
      setSelectedMonth(today.getMonth() + 1)
    } catch (e: any) {
      setError(e.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  /* 월 선택 시 상세 로드 */
  const handleMonthSelect = useCallback(async (month: number) => {
    setSelectedMonth(month)
    const key = `${targetYear}-${month}`
    // 캐시 있으면 즉시
    if (detailCache[key]) { setCurrentDetail(detailCache[key]); return }
    // 아니면 API 호출
    setDetailLoading(true)
    setCurrentDetail(null)
    try {
      const body = await buildProfileRequest(targetYear, month)
      const res = await fetch(`${API_BASE}/api/saju/monthly-fortune/detail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`API 오류: ${res.status}`)
      const detail: MonthDetail = await res.json()
      setDetailCache(prev => ({ ...prev, [key]: detail }))
      setCurrentDetail(detail)
    } catch {
      setCurrentDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }, [targetYear, detailCache, profile])

  /* 연도 변경 */
  function changeYear(delta: number) {
    setTargetYear(y => y + delta)
    setDetailCache({})
    setCurrentDetail(null)
    setFortuneData(null)
    setSelectedMonth(1)
  }

  const months = fortuneData?.months || {}
  const currentMonthData = months[String(selectedMonth)]
  const isThisMonth = targetYear === today.getFullYear() && selectedMonth === today.getMonth() + 1

  /* 월 탭 스크롤: 선택 월로 이동 */
  useEffect(() => {
    if (monthScrollRef.current) {
      const el = monthScrollRef.current.children[selectedMonth - 1] as HTMLElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedMonth])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="이번 달 운세" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '40px 20px' }}>
        <div style={{ fontSize: 52 }}>📅</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: B.text, textAlign: 'center' }}>
          {targetYear}년 운세를 분석하고 있습니다
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
          사주팔자와 세운·월운을 종합 분석 중...<br />잠시만 기다려주세요 (약 20초)
        </div>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: B.primary }} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="이번 달 운세" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{error}</div>
        <button onClick={() => nav('/vault')} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: B.bg, color: B.text, fontSize: 14, fontWeight: 700, border: `1px solid ${B.border}`, cursor: 'pointer' }}>
          사주 보관소로 이동
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="월별 운세" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>

        {/* ─── 연도 네비게이션 ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
          <button onClick={() => changeYear(-1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={18} color="var(--text-secondary)" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: B.text }}>{targetYear}년</div>
            {fortuneData?.month_pillar && (
              <div style={{ fontSize: 11, color: B.soft, marginTop: 2 }}>
                {fortuneData.month_pillar.label ? `${selectedMonth}월 월운: ${currentDetail?.month_pillar?.label || fortuneData.month_pillar.label}` : ''}
              </div>
            )}
          </div>
          <button onClick={() => changeYear(1)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* ─── 연도 총평 ─── */}
        {fortuneData?.year_summary && (
          <div style={{ margin: '0 20px 14px', padding: '14px 16px', borderRadius: 14, background: B.gradient, border: `1px solid ${B.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, marginBottom: 6 }}>
              📌 {targetYear}년 전체 흐름
            </div>
            <div style={{ fontSize: 13, color: B.text, lineHeight: 1.7 }}>{fortuneData.year_summary}</div>
          </div>
        )}

        {/* ─── 12개월 탭 ─── */}
        <div
          ref={monthScrollRef}
          style={{ display: 'flex', gap: 8, padding: '0 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <MonthChip
              key={m}
              month={m}
              m={months[String(m)]}
              isSelected={selectedMonth === m}
              isLoaded={!!detailCache[`${targetYear}-${m}`]}
              onSelect={() => handleMonthSelect(m)}
            />
          ))}
        </div>

        {/* ─── 선택 월 헤더 카드 ─── */}
        <div style={{ margin: '0 20px 16px', padding: '20px', borderRadius: 18, background: B.gradient, border: `1.5px solid ${B.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {currentMonthData && <ScoreRing score={currentMonthData.score} size={80} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: B.text }}>{selectedMonth}월</span>
                {isThisMonth && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: B.primary, color: '#fff' }}>이번 달</span>}
                {currentMonthData && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(currentMonthData.score) }}>
                    {scoreLabel(currentMonthData.score)}
                  </span>
                )}
              </div>
              {currentMonthData && (
                <div style={{ fontSize: 14, fontWeight: 700, color: B.primary, marginBottom: 4 }}>
                  {currentMonthData.keyword}
                </div>
              )}
              {currentMonthData && (
                <div style={{ fontSize: 12, color: B.textSoft, lineHeight: 1.6 }}>
                  {currentMonthData.summary}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 월 상세 분석 ─── */}
        {detailLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '30px 0', color: 'var(--text-tertiary)' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: B.primary }} />
            <span style={{ fontSize: 13 }}>{selectedMonth}월 상세 분석 중...</span>
          </div>
        )}

        {!detailLoading && currentDetail && (
          <>
            {/* 전체 흐름 */}
            <div style={{ margin: '0 20px 14px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${B.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, marginBottom: 8 }}>
                📖 {selectedMonth}월 전체 흐름
                {currentDetail.month_pillar && (
                  <span style={{ marginLeft: 8, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                    월운: {currentDetail.month_pillar.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {currentDetail.overall}
              </div>
            </div>

            {/* 5개 영역 점수 바 */}
            <div style={{ margin: '0 20px 14px', padding: '16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${B.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.primary, marginBottom: 14 }}>🌟 영역별 운세</div>
              <ScoreBar score={currentDetail.career?.score ?? 0} label="직업·커리어" emoji="💼" />
              <ScoreBar score={currentDetail.wealth?.score ?? 0} label="재물·금전" emoji="💰" />
              <ScoreBar score={currentDetail.health?.score ?? 0} label="건강·체력" emoji="❤️" />
              <ScoreBar score={currentDetail.relation?.score ?? 0} label="관계·인간관계" emoji="🤝" />
              <ScoreBar score={currentDetail.creative?.score ?? 0} label="창의·학습" emoji="✨" />
            </div>

            {/* 영역별 상세 */}
            {[
              { key: 'career',   label: '직업·커리어',  emoji: '💼', color: '#6366F1', bg: '#EEF2FF' },
              { key: 'wealth',   label: '재물·금전',    emoji: '💰', color: '#D97706', bg: '#FFF8E1' },
              { key: 'health',   label: '건강·체력',    emoji: '❤️', color: '#DC2626', bg: '#FEF2F2' },
              { key: 'relation', label: '관계·인간관계', emoji: '🤝', color: '#0891B2', bg: '#ECFEFF' },
              { key: 'creative', label: '창의·학습',    emoji: '✨', color: '#7C3AED', bg: '#F5F3FF' },
            ].map(({ key, label, emoji, color, bg }) => {
              const domain = currentDetail[key as keyof MonthDetail] as DomainDetail | undefined
              if (!domain) return null
              return (
                <div key={key} style={{ margin: '0 20px 10px', padding: '14px 16px', borderRadius: 12, background: bg, border: `1px solid ${color}20` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 16 }}>{emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(domain.score) }}>{domain.score}점</span>
                  </div>
                  <div style={{ fontSize: 13, color, lineHeight: 1.7, opacity: 0.85 }}>{domain.summary}</div>
                </div>
              )
            })}

            {/* 행운 팁 + 주의 */}
            <div style={{ display: 'flex', gap: 10, margin: '0 20px 20px' }}>
              {currentDetail.lucky_tip && (
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <TrendingUp size={13} color="#059669" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>행운 포인트</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#065F46', lineHeight: 1.5 }}>{currentDetail.lucky_tip}</div>
                </div>
              )}
              {currentDetail.caution && (
                <div style={{ flex: 1, padding: '12px 14px', borderRadius: 12, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <AlertTriangle size={13} color="#EA580C" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#EA580C' }}>주의 사항</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9A3412', lineHeight: 1.5 }}>{currentDetail.caution}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 아직 로드 안 된 달: 탭 안내 */}
        {!detailLoading && !currentDetail && fortuneData && (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              위 달력에서 원하는 달을 탭하면<br />상세 분석을 불러옵니다
            </div>
          </div>
        )}

        {/* 하단 안내 */}
        {!detailLoading && currentDetail && (
          <div style={{ margin: '0 20px', padding: '12px 16px', borderRadius: 12, background: B.bgMid, border: `1px solid ${B.border}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Sparkles size={14} color={B.soft} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: B.textSoft, lineHeight: 1.6 }}>
              이 분석은 사주팔자의 원국(原局)과 {targetYear}년 세운·월운의 천간지지(天干地支) 상호작용을 고전문헌에 근거하여 분석한 결과입니다. 월을 탭하면 해당 월의 상세 분석을 새로 불러옵니다.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
