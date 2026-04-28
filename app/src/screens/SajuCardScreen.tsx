import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Share2, Check } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import {
  calculateFullSaju, calculateDaeun, getTenGodIndex, TEN_GODS,
} from '@/lib/saju-engine'

/* ─── 오행 테마 ─── */
const EL_THEME: Record<string, { primary: string; light: string; dark: string; bg: string; char: string; emoji: string }> = {
  '목': { primary: '#059669', light: '#D1FAE5', dark: '#064E3B', bg: '#ECFDF5', char: '木', emoji: '🌿' },
  '화': { primary: '#DC2626', light: '#FEE2E2', dark: '#7F1D1D', bg: '#FFF1F2', char: '火', emoji: '🔥' },
  '토': { primary: '#D97706', light: '#FEF3C7', dark: '#78350F', bg: '#FFFBEB', char: '土', emoji: '🌍' },
  '금': { primary: '#4F46E5', light: '#E0E7FF', dark: '#1E1B4B', bg: '#EEF2FF', char: '金', emoji: '⚡' },
  '수': { primary: '#0284C7', light: '#E0F2FE', dark: '#0C4A6E', bg: '#F0F9FF', char: '水', emoji: '🌊' },
}
const DEFAULT_THEME = { primary: '#64748B', light: '#F1F5F9', dark: '#1E293B', bg: '#F8FAFC', char: '?', emoji: '✨' }

/* ─── 오행 키워드 ─── */
const EL_KEYWORDS: Record<string, string[]> = {
  '목': ['성장력', '진취적'],
  '화': ['열정적', '표현력'],
  '토': ['포용력', '안정감'],
  '금': ['결단력', '완벽주의'],
  '수': ['통찰력', '유연함'],
}

/* ─── 십성 키워드 ─── */
const TEN_GOD_KEYWORDS: Record<string, string[]> = {
  '비견': ['자립심', '자존감'],
  '겁재': ['승부욕', '도전적'],
  '식신': ['창의적', '여유로움'],
  '상관': ['총명함', '변화추구'],
  '편재': ['사교적', '기회포착'],
  '정재': ['성실함', '계획적'],
  '편관': ['리더십', '결단력'],
  '정관': ['원칙적', '책임감'],
  '편인': ['직감력', '독창적'],
  '정인': ['지혜로움', '내면깊음'],
}

/* ─── 십성 설명 ─── */
const TEN_GODS_DESC: Record<string, string> = {
  '비견': '독립적·자존감 강함',
  '겁재': '도전적·추진력 강함',
  '식신': '창의적·표현력 뛰어남',
  '상관': '총명함·변화를 즐김',
  '편재': '사교적·기회 포착 능함',
  '정재': '성실함·안정 추구',
  '편관': '결단력·리더십 강함',
  '정관': '원칙적·책임감 강함',
  '편인': '직감력·독창적 사고',
  '정인': '지혜롭고 내면 깊음',
}

/* ─── 오행 오각형 차트 ─── */
function PentagonChart({ counts, theme }: {
  counts: Record<string, number>
  theme: typeof DEFAULT_THEME
}) {
  const elements = ['목', '화', '토', '금', '수']
  const elColors = ['#059669', '#DC2626', '#D97706', '#4F46E5', '#0284C7']
  const cx = 55, cy = 54, R = 32

  const toRad = (deg: number) => deg * Math.PI / 180
  const vertex = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(toRad(-90 + 72 * i)),
    cy + r * Math.sin(toRad(-90 + 72 * i)),
  ]

  const MAX = 4
  const MIN_R = 3

  const dataPoints = elements.map((el, i) => {
    const val = counts[el] || 0
    const r = val === 0 ? MIN_R : MIN_R + (R - MIN_R) * (val / MAX)
    return vertex(i, r).join(',')
  }).join(' ')

  const LABEL_R = R + 14

  return (
    <svg viewBox="0 0 110 108" width={108} height={108}>
      {/* Grid rings */}
      {[0.33, 0.66, 1].map(scale => (
        <polygon key={scale}
          points={elements.map((_, i) => vertex(i, R * scale).join(',')).join(' ')}
          fill="none" stroke="#E2E8F0" strokeWidth={0.6}
        />
      ))}
      {/* Axis lines */}
      {elements.map((_, i) => {
        const [x, y] = vertex(i, R)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E2E8F0" strokeWidth={0.6} />
      })}
      {/* Data fill */}
      <polygon
        points={dataPoints}
        fill={`${theme.primary}22`}
        stroke={theme.primary}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* Data dots */}
      {elements.map((el, i) => {
        const val = counts[el] || 0
        if (val === 0) return null
        const r = MIN_R + (R - MIN_R) * (val / MAX)
        const [x, y] = vertex(i, r)
        return <circle key={el} cx={x} cy={y} r={3} fill={elColors[i]} stroke="white" strokeWidth={1} />
      })}
      {/* Labels */}
      {elements.map((el, i) => {
        const [lx, ly] = vertex(i, LABEL_R)
        const val = counts[el] || 0
        const ch = EL_THEME[el]?.char || el
        return (
          <g key={el}>
            <text x={lx} y={ly - 4.5} textAnchor="middle" dominantBaseline="middle"
              fontSize={8} fontWeight={800}
              fill={val > 0 ? elColors[i] : '#CBD5E1'}>
              {ch}
            </text>
            <text x={lx} y={ly + 5} textAnchor="middle" dominantBaseline="middle"
              fontSize={6.5} fontWeight={600}
              fill={val > 0 ? elColors[i] : '#CBD5E1'}>
              {val}개
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ─── 타입 ─── */
interface Profile {
  name: string; gender: string
  birth_year: number; birth_month: number; birth_day: number
  birth_hour: string; calendar_type: string
}

interface PillarInfo {
  label: string
  stemKr: string; branchKr: string
  stemHj: string; branchHj: string
  isDay?: boolean
}

interface CardData {
  dayMasterEl: string
  pillars: PillarInfo[]
  dayMasterTenGod: string
  innateDesc: string
  elementCounts: Record<string, number>
  currentDaeun: { pillar: string; startAge: number; endAge: number } | null
}

function parseBirthHour(h: string): [number, number] {
  if (!h || h === 'unknown') return [12, 0]
  const m = h.match(/(\d+):(\d+)/)
  return m ? [+m[1], +m[2]] : [12, 0]
}

/* ─── 메인 화면 ─── */
export default function SajuCardScreen() {
  const nav = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shared, setShared] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cardData, setCardData] = useState<CardData | null>(null)

  useEffect(() => {
    async function load() {
      if (!supabase) { setError('Supabase 미연결'); setLoading(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('name, gender, birth_year, birth_month, birth_day, birth_hour, calendar_type')
        .eq('device_id', getDeviceId())
        .eq('is_primary', true)
        .single()
      if (!data) { setError('프로필이 없습니다. 사주 보관소에서 먼저 등록해주세요.'); setLoading(false); return }
      const p = data as Profile
      setProfile(p)

      const [h, mi] = parseBirthHour(p.birth_hour)
      const saju = calculateFullSaju({
        name: p.name, gender: p.gender,
        birthYear: p.birth_year, birthMonth: p.birth_month, birthDay: p.birth_day,
        birthHour: h, birthMinute: mi,
        calendarType: p.calendar_type as any,
      })

      const elCounts: Record<string, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 }
      ;[saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar].forEach(pl => {
        if (pl.element in elCounts) elCounts[pl.element]++
      })

      const innateGodIdx = getTenGodIndex(saju.dayPillar.stem, saju.monthPillar.stem)
      const innateTenGod = TEN_GODS[innateGodIdx]

      const daeuns = calculateDaeun({
        name: p.name, gender: p.gender,
        birthYear: p.birth_year, birthMonth: p.birth_month, birthDay: p.birth_day,
        birthHour: h, birthMinute: mi,
        calendarType: p.calendar_type as any,
      }, saju.monthPillar)
      const curAge = new Date().getFullYear() - p.birth_year + 1
      const currentDaeun = daeuns.find(d => curAge >= d.startAge && curAge <= d.endAge) || null

      setCardData({
        dayMasterEl: saju.dayMasterElement,
        pillars: [
          { label: '시주', stemKr: saju.hourPillar.stemKr, branchKr: saju.hourPillar.branchKr, stemHj: saju.hourPillar.stemHj, branchHj: saju.hourPillar.branchHj },
          { label: '일주', stemKr: saju.dayPillar.stemKr,  branchKr: saju.dayPillar.branchKr,  stemHj: saju.dayPillar.stemHj,  branchHj: saju.dayPillar.branchHj, isDay: true },
          { label: '월주', stemKr: saju.monthPillar.stemKr, branchKr: saju.monthPillar.branchKr, stemHj: saju.monthPillar.stemHj, branchHj: saju.monthPillar.branchHj },
          { label: '연주', stemKr: saju.yearPillar.stemKr,  branchKr: saju.yearPillar.branchKr,  stemHj: saju.yearPillar.stemHj,  branchHj: saju.yearPillar.branchHj },
        ],
        dayMasterTenGod: innateTenGod,
        innateDesc: TEN_GODS_DESC[innateTenGod] || '',
        elementCounts: elCounts,
        currentDaeun: currentDaeun ? {
          pillar: currentDaeun.pillar.label,
          startAge: currentDaeun.startAge,
          endAge: currentDaeun.endAge,
        } : null,
      })
      setLoading(false)
    }
    load()
  }, [])

  async function handleShare() {
    if (!profile || !cardData) return
    const theme = EL_THEME[cardData.dayMasterEl] || DEFAULT_THEME
    const dayP = cardData.pillars.find(p => p.isDay)!
    const text = [
      `🪪 나의 사주 명함 — ${profile.name}`,
      ``,
      `일주: ${dayP.stemKr}${dayP.branchKr}(${dayP.stemHj}${dayP.branchHj}) · ${cardData.dayMasterEl}(${theme.char}) 일간`,
      `사주: ${cardData.pillars.map(p => `${p.stemKr}${p.branchKr}`).join(' ')}`,
      ``,
      `타고난 성향: ${cardData.dayMasterTenGod} — ${cardData.innateDesc}`,
      cardData.currentDaeun ? `현재 대운: ${cardData.currentDaeun.pillar} (${cardData.currentDaeun.startAge}~${cardData.currentDaeun.endAge}세)` : '',
      `오행: ${Object.entries(cardData.elementCounts).filter(([, c]) => c > 0).map(([el, c]) => `${el}${c}`).join(' ')}`,
      ``,
      `📱 사주로(sajuro.ai)에서 내 사주를 더 깊이 분석해보세요`,
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      try { await navigator.share({ text }); setShared(true); setTimeout(() => setShared(false), 2500); return } catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(text)
    setShared(true)
    setTimeout(() => setShared(false), 2500)
    alert('클립보드에 복사되었습니다!\n카카오톡이나 SNS에 붙여넣기 해보세요.')
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="사주 명함" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-tertiary)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>사주 계산 중...</span>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="사주 명함" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{error}</div>
        <button onClick={() => nav('/vault')} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: '#EEF2FF', color: '#4F46E5', fontSize: 14, fontWeight: 700, border: '1px solid #A5B4FC', cursor: 'pointer' }}>
          사주 보관소로 이동
        </button>
      </div>
    </div>
  )

  if (!profile || !cardData) return null

  const theme = EL_THEME[cardData.dayMasterEl] || DEFAULT_THEME
  const dayP = cardData.pillars.find(p => p.isDay)!
  const birthStr = `${profile.birth_year}.${String(profile.birth_month).padStart(2, '0')}.${String(profile.birth_day).padStart(2, '0')}`
  const genderLabel = profile.gender === 'female' ? '여' : '남'
  const godKeywords = TEN_GOD_KEYWORDS[cardData.dayMasterTenGod] || []
  const elKeywords = EL_KEYWORDS[cardData.dayMasterEl] || []
  const allKeywords = [...new Set([...godKeywords, ...elKeywords])].slice(0, 4)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="사주 명함" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* ═══════════════════ CARD ═══════════════════ */}
        <div
          ref={cardRef}
          style={{
            margin: '20px',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: `0 24px 64px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1)`,
          }}
        >

          {/* ── HERO ── */}
          <div style={{
            padding: '32px 24px 28px',
            background: `linear-gradient(155deg, #07080F 0%, ${theme.dark}F0 50%, ${theme.primary}BB 100%)`,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* 배경 큰 한자 워터마크 */}
            <div style={{
              position: 'absolute', right: -18, bottom: -24,
              fontSize: 220, fontWeight: 900, lineHeight: 1,
              color: 'rgba(255,255,255,0.045)',
              userSelect: 'none', pointerEvents: 'none',
              fontFamily: 'serif',
              letterSpacing: -10,
            }}>
              {theme.char}
            </div>

            {/* 별 장식 */}
            {[[12, 16], [58, 10], [82, 28], [28, 48], [92, 14], [45, 38]].map(([lx, ly], i) => (
              <div key={i} style={{
                position: 'absolute', left: `${lx}%`, top: ly,
                width: i % 2 === 0 ? 2.5 : 1.5, height: i % 2 === 0 ? 2.5 : 1.5,
                borderRadius: '50%', background: 'rgba(255,255,255,0.45)',
              }} />
            ))}

            {/* 라벨 */}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 2.5, marginBottom: 20, fontWeight: 700 }}>
              ✦ SAJU CARD
            </div>

            {/* 이름 */}
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1.5, lineHeight: 1, marginBottom: 16 }}>
              {profile.name}
            </div>

            {/* 일주 대형 */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, lineHeight: 1 }}>
                <span style={{ fontSize: 56, fontWeight: 900, color: '#ffffff', letterSpacing: -3 }}>
                  {dayP.stemKr}
                </span>
                <span style={{ fontSize: 56, fontWeight: 900, color: theme.light, letterSpacing: -3 }}>
                  {dayP.branchKr}
                </span>
              </div>
              <div style={{ paddingBottom: 6 }}>
                <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.35)', fontFamily: 'serif', lineHeight: 1, letterSpacing: 2 }}>
                  {dayP.stemHj}{dayP.branchHj}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 3, letterSpacing: 0.5 }}>
                  일주 日柱
                </div>
              </div>
            </div>

            {/* 배지 + 생년 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.22)',
              }}>
                <span style={{ fontSize: 14 }}>{theme.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
                  {cardData.dayMasterEl}({theme.char}) 일간
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', letterSpacing: 0.2 }}>
                {birthStr} · {genderLabel}
              </span>
            </div>
          </div>

          {/* ── 사주팔자 ── */}
          <div style={{ background: '#ffffff', padding: '20px 20px 16px', borderBottom: '1px solid #EDEEF2' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.8, marginBottom: 14 }}>
              사주팔자 四柱八字
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {cardData.pillars.map(({ label, stemKr, branchKr, stemHj, branchHj, isDay }) => (
                <div key={label} style={{
                  textAlign: 'center',
                  padding: isDay ? '14px 4px 12px' : '12px 4px 10px',
                  borderRadius: 14,
                  background: isDay ? theme.light : '#F8FAFC',
                  border: isDay ? `2px solid ${theme.primary}55` : '1px solid #E8EAF0',
                  position: 'relative',
                  boxShadow: isDay ? `0 4px 12px ${theme.primary}18` : 'none',
                }}>
                  {isDay && (
                    <div style={{
                      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 7.5, fontWeight: 800, padding: '2px 8px',
                      background: theme.primary, color: '#fff',
                      borderRadius: '0 0 7px 7px', letterSpacing: 1,
                      whiteSpace: 'nowrap',
                    }}>
                      나 · 일주
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 6, marginTop: isDay ? 10 : 0 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: isDay ? theme.dark : '#2D3748', lineHeight: 1 }}>
                    {stemKr}
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 700, color: isDay ? theme.primary : '#718096', marginTop: 2, lineHeight: 1 }}>
                    {branchKr}
                  </div>
                  <div style={{ fontSize: 9, color: '#CBD5E1', marginTop: 6, fontFamily: 'serif', letterSpacing: 3 }}>
                    {stemHj}{branchHj}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 오행 + 성향 ── */}
          <div style={{
            background: '#FAFBFF',
            padding: '16px 20px 18px',
            borderBottom: '1px solid #EDEEF2',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* 오각형 차트 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5 }}>오행 五行</div>
              <PentagonChart counts={cardData.elementCounts} theme={theme} />
            </div>

            {/* 세로 구분선 */}
            <div style={{ width: 1, alignSelf: 'stretch', background: '#E8EAF0', flexShrink: 0 }} />

            {/* 성향 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, marginBottom: 8 }}>
                타고난 성향
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: theme.dark, lineHeight: 1, marginBottom: 4 }}>
                {cardData.dayMasterTenGod}
              </div>
              <div style={{ fontSize: 11, color: theme.primary, fontWeight: 700, marginBottom: 12 }}>
                {cardData.innateDesc}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {allKeywords.map(kw => (
                  <span key={kw} style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: theme.light,
                    border: `1px solid ${theme.primary}25`,
                    fontSize: 10, fontWeight: 700, color: theme.dark,
                  }}>
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── 현재 대운 ── */}
          {cardData.currentDaeun && (
            <div style={{
              padding: '16px 20px',
              background: `linear-gradient(90deg, ${theme.bg} 0%, #ffffff 100%)`,
              borderBottom: '1px solid #EDEEF2',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: theme.light, border: `1.5px solid ${theme.primary}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                boxShadow: `0 4px 10px ${theme.primary}18`,
              }}>
                🌊
              </div>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, marginBottom: 4 }}>
                  현재 대운 大運
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: theme.dark }}>
                    {cardData.currentDaeun.pillar}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.primary }}>
                    {cardData.currentDaeun.startAge}~{cardData.currentDaeun.endAge}세
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── 브랜딩 푸터 ── */}
          <a
            href="https://sajuro.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '14px 20px',
              background: theme.dark,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.3 }}>
              나의 사주를 더 깊이 알아보세요
            </div>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: 2.5 }}>
              SAJURO.AI ↗
            </div>
          </a>
        </div>

        {/* ─── 공유 버튼 ─── */}
        <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1, padding: '15px 0', borderRadius: 14,
              fontSize: 15, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: shared ? '#ECFDF5' : '#FEE500',
              color: shared ? '#059669' : '#3C1E1E',
              border: shared ? '1px solid #6EE7B7' : 'none',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: shared ? 'none' : '0 2px 8px rgba(254,229,0,0.5)',
            }}
          >
            {shared ? <Check size={18} /> : <Share2 size={18} />}
            {shared ? '공유 완료!' : '💬 카카오톡으로 공유하기'}
          </button>
        </div>

        {/* ─── 안내 ─── */}
        <div style={{ margin: '16px 20px 0', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
            💡 스크린샷을 찍어 인스타그램·카카오톡에 공유해보세요. 공유 버튼을 탭하면 텍스트로도 바로 공유할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  )
}
