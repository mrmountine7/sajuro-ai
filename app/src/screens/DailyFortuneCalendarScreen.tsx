import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import { getDailyFortune, getDayPillar, type DailyFortune } from '@/lib/daily-fortune'

/* ─── 십성 상세 데이터 ─── */
const TEN_GOD_DATA: Record<string, { hanja: string; desc: string; message: string; keyword: string; goodFor: string; cautionFor: string }> = {
  '비견': {
    hanja: '比肩', desc: '자립과 경쟁의 별',
    message: '자신의 힘으로 해결하는 날입니다. 협업보다 독립적 판단이 빛나는 시기입니다.',
    keyword: '독립 · 자존 · 경쟁',
    goodFor: '혼자 집중해야 하는 업무, 개인 프로젝트 진행, 자기 계발',
    cautionFor: '지나친 고집, 타인과의 불필요한 경쟁 자제',
  },
  '겁재': {
    hanja: '劫財', desc: '도전과 과감한 결단의 별',
    message: '주변의 유혹에 흔들리기 쉬운 날입니다. 지출과 약속에 신중하세요.',
    keyword: '도전 · 과감함 · 변동',
    goodFor: '새로운 시도, 빠른 결단이 필요한 순간',
    cautionFor: '충동적 지출, 감정적 다툼, 무리한 약속',
  },
  '식신': {
    hanja: '食神', desc: '타고난 재능과 표현력의 별',
    message: '창의적인 에너지가 활발한 날입니다. 떠오르는 아이디어를 꼭 메모해 두세요.',
    keyword: '창의 · 표현 · 여유',
    goodFor: '창작 활동, 맛집 탐방, 취미 생활, 아이디어 발산',
    cautionFor: '게으름과 미루기, 과식이나 과소비',
  },
  '상관': {
    hanja: '傷官', desc: '날카로운 통찰과 변화의 별',
    message: '날카로운 직감이 살아나는 날입니다. 다만 말실수에 주의하세요.',
    keyword: '통찰 · 변화 · 예민함',
    goodFor: '분석적 사고, 문제 해결, 창의적 발상',
    cautionFor: '언쟁, 윗사람과의 마찰, 충동적 발언',
  },
  '편재': {
    hanja: '偏財', desc: '예상치 못한 기회와 사교의 별',
    message: '예상치 못한 기회가 찾아올 수 있습니다. 적극적으로 움직여 보세요.',
    keyword: '기회 · 사교 · 유동',
    goodFor: '네트워킹, 투자 기회 탐색, 활발한 대외 활동',
    cautionFor: '과도한 투기, 즉흥적 지출, 산만함',
  },
  '정재': {
    hanja: '正財', desc: '안정적 재물과 계획의 별',
    message: '안정적인 계획 실행에 유리한 날입니다. 저축이나 정리가 좋은 날입니다.',
    keyword: '안정 · 성실 · 계획',
    goodFor: '재정 계획, 저축, 꼼꼼한 업무 처리',
    cautionFor: '지나친 소심함, 기회를 놓치는 과도한 신중함',
  },
  '편관': {
    hanja: '偏官', desc: '긴장과 결단력의 별',
    message: '긴장감이 높지만 결단력도 강한 날입니다. 미루던 일을 처리하기 좋습니다.',
    keyword: '결단 · 긴장 · 도전',
    goodFor: '미루던 일 처리, 강한 추진력이 필요한 순간',
    cautionFor: '과도한 스트레스, 압박감으로 인한 실수',
  },
  '정관': {
    hanja: '正官', desc: '질서와 인정의 별',
    message: '질서와 원칙을 따를 때 좋은 결과를 얻습니다. 윗사람의 인정이 있을 수 있어요.',
    keyword: '질서 · 원칙 · 명예',
    goodFor: '공식적인 자리, 규칙적인 업무, 평가나 심사',
    cautionFor: '틀에 박힌 사고, 융통성 부족',
  },
  '편인': {
    hanja: '偏印', desc: '직감과 색다른 관점의 별',
    message: '독특한 관점이 열리는 날입니다. 새로운 학습이나 취미에 도전해 보세요.',
    keyword: '직감 · 독창 · 탐구',
    goodFor: '새로운 분야 학습, 영적 탐구, 창의적 사고',
    cautionFor: '고독감, 현실 도피, 지나친 내면 집중',
  },
  '정인': {
    hanja: '正印', desc: '지혜와 내면 안정의 별',
    message: '마음이 안정되는 날입니다. 공부나 깊은 사색에 집중하면 큰 성과가 있습니다.',
    keyword: '지혜 · 안정 · 학문',
    goodFor: '공부, 명상, 독서, 장기 계획 수립',
    cautionFor: '의존성, 결단 미루기, 지나친 안전 지향',
  },
}

/* ─── 십성별 색상 ─── */
const TEN_GOD_BG: Record<string, { bg: string; color: string; emoji: string }> = {
  '비견': { bg: '#EEF2FF', color: '#4F46E5', emoji: '⚔️' },
  '겁재': { bg: '#FEF3C7', color: '#D97706', emoji: '🔥' },
  '식신': { bg: '#ECFDF5', color: '#059669', emoji: '✨' },
  '상관': { bg: '#FFF1F2', color: '#E11D48', emoji: '💫' },
  '편재': { bg: '#FFF7ED', color: '#EA580C', emoji: '💰' },
  '정재': { bg: '#FEFCE8', color: '#CA8A04', emoji: '🌟' },
  '편관': { bg: '#FEF2F2', color: '#DC2626', emoji: '⚡' },
  '정관': { bg: '#F0F9FF', color: '#0369A1', emoji: '🏛️' },
  '편인': { bg: '#FDF4FF', color: '#9333EA', emoji: '🔮' },
  '정인': { bg: '#F0FDF4', color: '#15803D', emoji: '📚' },
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

interface Profile {
  birth_year: number; birth_month: number; birth_day: number; calendar_type: string
}

function calcForDate(date: Date, profile: Profile): DailyFortune {
  // getDailyFortune을 특정 날짜 기준으로 계산하기 위해 오버라이드
  const todayPillar = getDayPillar(date)
  const ref = new Date(2024, 0, 1)
  ref.setHours(0, 0, 0, 0)
  const bd = profile.calendar_type !== 'solar'
    ? new Date(profile.birth_year, profile.birth_month - 1, profile.birth_day)
    : new Date(profile.birth_year, profile.birth_month - 1, profile.birth_day)
  bd.setHours(0, 0, 0, 0)
  const userPillar = getDayPillar(bd)

  const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
  const wd = WEEKDAYS[date.getDay()]
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  // getDailyFortune 내부 로직 재현
  return getDailyFortune(
    profile.birth_year, profile.birth_month, profile.birth_day, profile.calendar_type
  )
}

/* getDailyFortune은 항상 "오늘" 기준이라 날짜별 계산을 위한 별도 함수 */
function getFortuneForDate(date: Date, profile: Profile): ReturnType<typeof getDailyFortune> {
  const todayPillar = getDayPillar(date)
  const userPillar  = getDayPillar(
    new Date(profile.birth_year, profile.birth_month - 1, profile.birth_day)
  )

  const STEMS_KR  = ['갑','을','병','정','무','기','경','신','임','계'] as const
  const BRANCHES_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해'] as const
  const FIVE_ELEMENTS = ['목','화','토','금','수'] as const
  const WEEKDAYS_KR = ['일','월','화','수','목','금','토'] as const

  const TEN_GOD_DATA = [
    { name: '비견', hanja: '比肩', desc: '자립과 경쟁의 별',
      message: '자신의 힘으로 해결하는 날입니다. 협업보다 독립적 판단이 빛나는 시기입니다.' },
    { name: '겁재', hanja: '劫財', desc: '도전과 과감한 결단의 별',
      message: '주변의 유혹에 흔들리기 쉬운 날입니다. 지출과 약속에 신중하세요.' },
    { name: '식신', hanja: '食神', desc: '타고난 재능과 표현력의 별',
      message: '창의적인 에너지가 활발한 날입니다. 떠오르는 아이디어를 꼭 메모해 두세요.' },
    { name: '상관', hanja: '傷官', desc: '날카로운 통찰과 변화의 별',
      message: '날카로운 직감이 살아나는 날입니다. 다만 말실수에 주의하세요.' },
    { name: '편재', hanja: '偏財', desc: '예상치 못한 기회와 사교의 별',
      message: '예상치 못한 기회가 찾아올 수 있습니다. 적극적으로 움직여 보세요.' },
    { name: '정재', hanja: '正財', desc: '안정적 재물과 계획의 별',
      message: '안정적인 계획 실행에 유리한 날입니다. 저축이나 정리가 좋은 날입니다.' },
    { name: '편관', hanja: '偏官', desc: '긴장과 결단력의 별',
      message: '긴장감이 높지만 결단력도 강한 날입니다. 미루던 일을 처리하기 좋습니다.' },
    { name: '정관', hanja: '正官', desc: '질서와 인정의 별',
      message: '질서와 원칙을 따를 때 좋은 결과를 얻습니다. 윗사람의 인정이 있을 수 있어요.' },
    { name: '편인', hanja: '偏印', desc: '직감과 색다른 관점의 별',
      message: '독특한 관점이 열리는 날입니다. 새로운 학습이나 취미에 도전해 보세요.' },
    { name: '정인', hanja: '正印', desc: '지혜와 내면 안정의 별',
      message: '마음이 안정되는 날입니다. 공부나 깊은 사색에 집중하면 큰 성과가 있습니다.' },
  ]

  function getTenGodIndex(myStem: number, todayStem: number) {
    const myEl    = Math.floor(myStem / 2)
    const otherEl = Math.floor(todayStem / 2)
    const sameYY  = (myStem % 2) === (todayStem % 2)
    const diff    = (otherEl - myEl + 5) % 5
    return diff * 2 + (sameYY ? 0 : 1)
  }

  const godIdx = getTenGodIndex(userPillar.stem, todayPillar.stem)
  const tenGod = TEN_GOD_DATA[godIdx]
  const wd = WEEKDAYS_KR[date.getDay()]
  const y  = date.getFullYear()
  const m  = String(date.getMonth() + 1).padStart(2, '0')
  const d  = String(date.getDate()).padStart(2, '0')

  return {
    dateLabel: `${y}.${m}.${d} (${wd})`,
    dayPillar: todayPillar,
    tenGod,
    userDayPillar: userPillar,
    userElement: FIVE_ELEMENTS[Math.floor(userPillar.stem / 2)],
  }
}

/* ─── 십성 상세 설명 팝업 ─── */
function TenGodInfoModal({ name, onClose }: { name: string; onClose: () => void }) {
  const meta = TEN_GOD_BG[name] || { bg: '#F1F5F9', color: '#64748B', emoji: '⭐' }
  const info = TEN_GOD_DATA[name]
  if (!info) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, backdropFilter: 'blur(2px)' }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, background: 'var(--bg-surface)',
        borderRadius: '24px 24px 0 0', zIndex: 501,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>
        {/* 상단 컬러 배너 */}
        <div style={{
          background: `linear-gradient(135deg, ${meta.bg} 0%, white 100%)`,
          borderBottom: `1px solid ${meta.color}20`,
          padding: '20px 20px 16px',
        }}>
          {/* 핸들 */}
          <div style={{ width: 36, height: 4, borderRadius: 2, background: `${meta.color}30`, margin: '0 auto 16px' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: `${meta.bg}`, border: `2px solid ${meta.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, boxShadow: `0 4px 12px ${meta.color}20`,
              }}>
                {meta.emoji}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: meta.color, letterSpacing: '-0.3px' }}>
                  {name}
                  <span style={{ fontSize: 13, fontWeight: 500, color: `${meta.color}80`, marginLeft: 6 }}>
                    {info.hanja}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: `${meta.color}90`, marginTop: 2, fontWeight: 600 }}>
                  {info.desc}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="var(--text-tertiary)" />
            </button>
          </div>

          {/* 키워드 태그 */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {info.keyword.split(' · ').map(kw => (
              <span key={kw} style={{
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                background: `${meta.color}15`, border: `1px solid ${meta.color}25`,
                fontSize: 11, fontWeight: 700, color: meta.color,
              }}>
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* 본문 */}
        <div style={{ padding: '16px 20px 36px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 오늘의 메시지 */}
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: `${meta.bg}`, border: `1px solid ${meta.color}20`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>✦</span> 에너지 메시지
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.7 }}>
              "{info.message}"
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* 좋은 것 */}
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: '#F0FDF4', border: '1px solid #BBF7D0',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span>✅</span> 잘 맞는 일
              </div>
              <div style={{ fontSize: 11, color: '#166534', lineHeight: 1.6 }}>
                {info.goodFor}
              </div>
            </div>

            {/* 조심할 것 */}
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: '#FFF7ED', border: '1px solid #FED7AA',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#C2410C', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span>⚠️</span> 주의할 점
              </div>
              <div style={{ fontSize: 11, color: '#9A3412', lineHeight: 1.6 }}>
                {info.cautionFor}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── 날짜 선택 팝업 ─── */
function FortuneModal({ date, fortune, onClose }: {
  date: Date; fortune: ReturnType<typeof getFortuneForDate>; onClose: () => void
}) {
  const meta = TEN_GOD_BG[fortune.tenGod.name] || { bg: '#F1F5F9', color: '#64748B', emoji: '⭐' }
  const isToday = (() => {
    const t = new Date(); return t.getFullYear() === date.getFullYear() && t.getMonth() === date.getMonth() && t.getDate() === date.getDate()
  })()
  const isFuture = date > new Date()

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, background: 'var(--bg-surface)',
        borderRadius: '20px 20px 0 0', zIndex: 401, padding: '20px 20px 36px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
      }}>
        {/* 핸들 */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-2)', margin: '0 auto 16px' }} />

        {/* 날짜 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
              {date.getMonth() + 1}월 {date.getDate()}일 ({WEEKDAY_LABELS[date.getDay()]})
              {isToday && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: '#FEE500', color: '#3C1E1E' }}>오늘</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
              {fortune.dayPillar.label}일 · 나의 일주 {fortune.userDayPillar.label}
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: 'var(--bg-surface-3)', border: 'none', cursor: 'pointer' }}>
            <X size={16} color="var(--text-tertiary)" />
          </button>
        </div>

        {/* 십성 배너 */}
        <div style={{
          padding: '16px 18px', borderRadius: 14,
          background: meta.bg, border: `1px solid ${meta.color}30`,
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 28 }}>{meta.emoji}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>
                {fortune.tenGod.name}({fortune.tenGod.hanja})
              </div>
              <div style={{ fontSize: 11, color: meta.color, opacity: 0.8 }}>
                {fortune.tenGod.desc}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: meta.color, lineHeight: 1.65 }}>
            {isFuture ? `"${fortune.tenGod.message}"` : `"${fortune.tenGod.message}"`}
          </div>
        </div>

        {isFuture && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#F1F5F9', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
            미래 날짜의 에너지를 미리 확인하는 것입니다
          </div>
        )}
      </div>
    </>
  )
}

/* ─── 메인 화면 ─── */
export default function DailyFortuneCalendarScreen() {
  const nav = useNavigate()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTenGod, setSelectedTenGod] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  /* 프로필 로드 */
  useEffect(() => {
    async function load() {
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('birth_year, birth_month, birth_day, calendar_type')
        .eq('device_id', getDeviceId())
        .eq('is_primary', true)
        .single()
      if (data) setProfile(data as Profile)
    }
    load()
  }, [])

  /* 달력 데이터 계산 */
  const calendarData = useMemo(() => {
    if (!profile) return []
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay  = new Date(viewYear, viewMonth + 1, 0)
    const startDow = firstDay.getDay() // 0=일

    const cells: { date: Date | null; fortune: ReturnType<typeof getFortuneForDate> | null }[] = []

    // 앞 빈칸
    for (let i = 0; i < startDow; i++) cells.push({ date: null, fortune: null })

    // 날짜 채우기
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(viewYear, viewMonth, d)
      cells.push({ date, fortune: getFortuneForDate(date, profile) })
    }

    return cells
  }, [viewYear, viewMonth, profile])

  /* 월 통계: 십성별 빈도 */
  const monthStats = useMemo(() => {
    const counts: Record<string, number> = {}
    calendarData.forEach(c => {
      if (!c.fortune) return
      const name = c.fortune.tenGod.name
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [calendarData])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  }
  const isFuture = (date: Date | null) => date ? date > today : false
  const isPast   = (date: Date | null) => date ? date < new Date(today.getFullYear(), today.getMonth(), today.getDate()) : false

  const selectedFortune = selectedDate && profile ? getFortuneForDate(selectedDate, profile) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="오늘의 한마디" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>

        {/* ─── 월 네비게이션 ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
          <button onClick={prevMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={18} color="var(--text-secondary)" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
              {viewYear}년 {MONTH_NAMES[viewMonth]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              날짜를 탭하면 그날의 한마디를 볼 수 있어요
            </div>
          </div>
          <button onClick={nextMonth} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={18} color="var(--text-secondary)" />
          </button>
        </div>

        {/* ─── 이달의 에너지 요약 ─── */}
        {profile && monthStats.length > 0 && (
          <div style={{ margin: '0 20px 14px', padding: '12px 16px', borderRadius: 14, background: 'linear-gradient(135deg, #FFF8E1 0%, #FFF0F6 100%)', border: '1px solid #FFE4CC' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginBottom: 8 }}>
              {viewYear}년 {MONTH_NAMES[viewMonth]} 에너지 분포
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {monthStats.map(([name, count]) => {
                const meta = TEN_GOD_BG[name] || { bg: '#F1F5F9', color: '#64748B', emoji: '⭐' }
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedTenGod(name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 'var(--radius-full)',
                      background: meta.bg, border: `1px solid ${meta.color}30`,
                      cursor: 'pointer', transition: 'filter 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}
                  >
                    <span style={{ fontSize: 12 }}>{meta.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{name}</span>
                    <span style={{ fontSize: 11, color: meta.color, opacity: 0.7 }}>{count}일</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── 요일 헤더 ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 12px', marginBottom: 4 }}>
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={w} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : 'var(--text-tertiary)', padding: '4px 0' }}>
              {w}
            </div>
          ))}
        </div>

        {/* ─── 달력 그리드 ─── */}
        {!profile ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            프로필을 등록하면 개인화된 한마디를 볼 수 있습니다
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '0 12px' }}>
            {calendarData.map((cell, idx) => {
              if (!cell.date || !cell.fortune) {
                return <div key={`empty-${idx}`} />
              }
              const meta = TEN_GOD_BG[cell.fortune.tenGod.name] || { bg: '#F1F5F9', color: '#64748B', emoji: '⭐' }
              const today_ = isToday(cell.date)
              const future_ = isFuture(cell.date)
              const dow = cell.date.getDay()

              return (
                <button
                  key={cell.date.getDate()}
                  onClick={() => setSelectedDate(cell.date)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 3, padding: '6px 2px', borderRadius: 10,
                    border: today_ ? '2px solid #D97706' : '1px solid transparent',
                    background: today_ ? '#FFF8E1' : 'transparent',
                    cursor: 'pointer', opacity: future_ ? 0.5 : 1,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* 날짜 숫자 */}
                  <span style={{
                    fontSize: 13, fontWeight: today_ ? 800 : 500,
                    color: today_ ? '#D97706' : dow === 0 ? '#EF4444' : dow === 6 ? '#3B82F6' : 'var(--text-primary)',
                  }}>
                    {cell.date.getDate()}
                  </span>
                  {/* 십성 색상 도트 */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: meta.bg, border: `1px solid ${meta.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11,
                  }}>
                    {meta.emoji}
                  </div>
                  {/* 십성 이름 */}
                  <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, lineHeight: 1 }}>
                    {cell.fortune.tenGod.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ─── 범례 ─── */}
        {profile && (
          <div style={{ margin: '16px 20px 0', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)' }}>십성 범례</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', opacity: 0.7 }}>탭하면 자세히 보기 →</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {Object.entries(TEN_GOD_BG).map(([name, meta]) => (
                <button
                  key={name}
                  onClick={() => setSelectedTenGod(name)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '8px 4px', borderRadius: 10,
                    background: 'transparent', border: `1px solid transparent`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = meta.bg
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${meta.color}30`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: meta.bg, border: `1px solid ${meta.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, boxShadow: `0 2px 6px ${meta.color}15`,
                  }}>
                    {meta.emoji}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── 날짜 선택 팝업 ─── */}
      {selectedDate && selectedFortune && (
        <FortuneModal
          date={selectedDate}
          fortune={selectedFortune}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* ─── 십성 상세 설명 팝업 ─── */}
      {selectedTenGod && (
        <TenGodInfoModal
          name={selectedTenGod}
          onClose={() => setSelectedTenGod(null)}
        />
      )}
    </div>
  )
}
