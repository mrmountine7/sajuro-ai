import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getCurrentIdentity, applyUserFilter } from '@/lib/user-filter'

/* ─── 타입 ─── */
interface PrecisionRecord {
  id: string
  profile_name: string
  saju_summary: string
  sections: any[]
  selected_items: string[]
  created_at: string
}

interface LifetimeRecord {
  id: string
  profile_name: string
  overall_score: number
  overall_summary: string
  sections: any[]
  created_at: string
}

interface MarriageRecord {
  id: string
  profile_name: string
  saju_summary: string
  sections: any[]
  created_at: string
}

interface CompatRecord {
  id: string
  result: string  // JSON string
  created_at: string
}

interface DreamRecord {
  id: string
  dream_date: string
  dream_text: string
  overall_sentiment: string
  overall_summary: string
  main_interpretation: string
  domains: { name: string; rating: string; summary: string }[]
  todays_advice: string
  lucky_color: string
  detected_symbols: string[]
  created_at: string
}

interface NameRecord {
  id: string
  full_name: string
  full_hanja: string
  total_strokes: number
  score: number
  name_reading: string
  created_at: string
}

/* ─── 상수 ─── */
const SENTIMENT_COLORS: Record<string, { bg: string; color: string }> = {
  '대길': { bg: '#ECFDF5', color: '#059669' },
  '길':   { bg: '#F0FFF4', color: '#16A34A' },
  '중길': { bg: '#FFF8E1', color: '#D97706' },
  '평':   { bg: '#F1F5F9', color: '#64748B' },
  '주의': { bg: '#FFF7ED', color: '#EA580C' },
  '흉':   { bg: '#FEF2F2', color: '#DC2626' },
}
const SC_DEFAULT = { bg: '#F1F5F9', color: '#64748B' }

const filters = ['전체', '평생운세', '정밀분석', '꿈해몽', '이름풀이', '연인/결혼궁합', '기타궁합', '저장한 결과']

/* ─── 날짜 포맷 ─── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/* ─── 이름풀이 카드 ─── */
function NameCard({ r }: { r: NameRecord }) {
  const scoreColor = r.score >= 80 ? '#059669' : r.score >= 60 ? '#D97706' : '#DC2626'
  return (
    <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EFF6FF', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#2563EB' }}>✍️</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{r.full_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{r.full_hanja} · 총 {r.total_strokes}획</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor }}>{r.score}</div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>종합점수</div>
        </div>
      </div>
      {r.name_reading && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-surface-2)' }}>
          {r.name_reading.slice(0, 80)}{r.name_reading.length > 80 ? '...' : ''}
        </div>
      )}
      <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'right' }}>{fmtDate(r.created_at)}</div>
    </div>
  )
}

/* ─── 빈 상태 ─── */
function EmptyState({ emoji, title, desc, label, path }: {
  emoji: string; title: string; desc: string; label: string; path: string
}) {
  const nav = useNavigate()
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>{desc}</div>
      <button onClick={() => nav(path)} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: 'var(--bg-accent)', color: '#1F2937', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
        {label}
      </button>
    </div>
  )
}

/* ─── 정밀분석 카드 ─── */
function PrecisionCard({ r, nav }: { r: PrecisionRecord; nav: ReturnType<typeof useNavigate> }) {
  const sections = Array.isArray(r.sections) ? r.sections : []
  const itemCount = sections.reduce((s: number, g: any) => s + (g.items?.length || 0), 0)
  const detailCount = sections.reduce((s: number, g: any) =>
    s + (g.items || []).filter((i: any) => i.detail).length, 0)
  const qaCount = sections.reduce((s: number, g: any) =>
    s + (g.items || []).reduce((ss: number, i: any) =>
      ss + (i.qaMessages || []).filter((m: any) => m.answer).length, 0), 0)

  return (
    <button onClick={() => nav('/precision-result', { state: { analysisId: r.id } })}
      style={{ display: 'block', margin: '0 20px 14px', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', textAlign: 'left', width: 'calc(100% - 40px)', cursor: 'pointer' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🔮 {r.profile_name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: '#EEF2FF', color: '#6366F1' }}>정밀분석</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(r.created_at)}</span>
      </div>

      {/* 핵심 요약 */}
      <div style={{ padding: '8px 12px', borderRadius: 10, background: '#EEF2FF', border: '1px solid #C7D2FE', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4338CA', lineHeight: 1.5 }}>{r.saju_summary}</span>
      </div>

      {/* 하단 배지 + 이동 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>
          {itemCount}개 항목
        </span>
        {detailCount > 0 && (
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: '#EEF2FF', color: '#6366F1' }}>
            📖 {detailCount} 상세
          </span>
        )}
        {qaCount > 0 && (
          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: '#FFF0F6', color: '#EC4899', fontWeight: 600 }}>
            💬 Q&A {qaCount}회
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#6366F1', fontWeight: 600 }}>다시 보기 ›</span>
      </div>
    </button>
  )
}

/* ─── 평생운세 카드 ─── */
function LifetimeCard({ r, nav }: { r: LifetimeRecord; nav: ReturnType<typeof useNavigate> }) {
  const sections = (() => {
    let s = r.sections
    if (typeof s === 'string') { try { s = JSON.parse(s) } catch { s = [] } }
    return Array.isArray(s) ? s : []
  })()
  const sectionCount = sections.length

  return (
    <div style={{ margin: '0 20px 14px', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid #C4B5FD' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🌊 {r.profile_name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: '#F5F3FF', color: '#7C3AED' }}>평생운세</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(r.created_at)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#7C3AED' }}>{r.overall_score}</div>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-1)', overflow: 'hidden' }}>
          <div style={{ width: `${r.overall_score}%`, height: '100%', background: '#7C3AED', borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ padding: '8px 12px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #C4B5FD', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#4C1D95', lineHeight: 1.5 }}>{r.overall_summary?.slice(0, 100)}{(r.overall_summary?.length ?? 0) > 100 ? '...' : ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>{sectionCount}개 섹션</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>다시 보기 준비 중</span>
      </div>
    </div>
  )
}

/* ─── 결혼궁합 카드 ─── */
function MarriageCard({ r, nav }: { r: MarriageRecord; nav: ReturnType<typeof useNavigate> }) {
  const names = r.profile_name?.replace(' 결혼궁합', '') || ''
  const sections = (() => {
    let s = r.sections
    if (typeof s === 'string') { try { s = JSON.parse(s) } catch { s = [] } }
    return Array.isArray(s) ? s : []
  })()
  const sectionScores = sections.flatMap((s: any) => (s.items || []).map((i: any) => i.score || 0)).filter(Boolean)
  const avgScore = sectionScores.length > 0 ? Math.round(sectionScores.reduce((a: number, b: number) => a + b, 0) / sectionScores.length) : 0
  const qaCount = sections.reduce((s: number, sec: any) =>
    s + (sec.items || []).reduce((ss: number, i: any) =>
      ss + (i.qaMessages || []).filter((m: any) => m.answer).length, 0), 0)
  const detailCount = sections.reduce((s: number, sec: any) =>
    s + (sec.items || []).filter((i: any) => i.detail).length, 0)

  return (
    <button
      onClick={() => nav('/marriage-result', { state: { analysisId: r.id } })}
      style={{ display: 'block', margin: '0 20px 14px', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid #DDD6FE', textAlign: 'left', width: 'calc(100% - 40px)', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>💍 {names}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: '#EDE9FE', color: '#7C3AED' }}>결혼궁합</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(r.created_at)}</span>
      </div>
      {avgScore > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#7C3AED' }}>{avgScore}</div>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-1)', overflow: 'hidden' }}>
            <div style={{ width: `${avgScore}%`, height: '100%', background: '#8B5CF6', borderRadius: 3 }} />
          </div>
        </div>
      )}
      <div style={{ padding: '8px 12px', borderRadius: 10, background: '#F5F3FF', border: '1px solid #DDD6FE', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4C1D95', lineHeight: 1.5 }}>{r.saju_summary}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>6개 항목</span>
        {detailCount > 0 && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: '#EDE9FE', color: '#7C3AED' }}>📖 {detailCount} 상세</span>}
        {qaCount > 0 && <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: '#FFF0F6', color: '#EC4899', fontWeight: 600 }}>💬 Q&A {qaCount}회</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>다시 보기 ›</span>
      </div>
    </button>
  )
}

/* ─── 연인궁합 카드 ─── */
function CompatCard({ r, nav }: { r: CompatRecord; nav: ReturnType<typeof useNavigate> }) {
  const result = (() => {
    try { return typeof r.result === 'string' ? JSON.parse(r.result) : r.result } catch { return null }
  })()
  if (!result) return null

  const p1 = result.person1?.name || '?'
  const p2 = result.person2?.name || '?'
  const overall = result.overall_score ?? 0
  const outer   = result.outer_score ?? 0
  const inner   = result.inner_score ?? 0
  const summary = result.overall_summary || ''

  const scoreColor = overall >= 80 ? '#10B981' : overall >= 60 ? '#F2C316' : '#FF5A5F'
  const scoreLabel = overall >= 80 ? '좋은 궁합 ✨' : overall >= 60 ? '보통 궁합 👍' : '주의 필요 ⚠️'

  return (
    <button
      onClick={() => nav('/compatibility-result', { state: { data: result } })}
      style={{ display: 'block', margin: '0 20px 14px', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid #FBCFE8', textAlign: 'left', width: 'calc(100% - 40px)', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>💑 {p1} × {p2}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: '#FFF0F6', color: '#DB2777' }}>연인궁합</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(r.created_at)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{overall}</div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--border-1)', overflow: 'hidden', marginBottom: 3 }}>
            <div style={{ width: `${overall}%`, height: '100%', background: scoreColor, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: scoreColor }}>{scoreLabel}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#FFF0F6', color: '#DB2777', fontWeight: 600 }}>겉궁합 {outer}</span>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#FDF2F8', color: '#9D174D', fontWeight: 600 }}>속궁합 {inner}</span>
      </div>

      {summary && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FFF0F6', border: '1px solid #FBCFE8', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#831843', lineHeight: 1.55 }}>
            {summary.slice(0, 80)}{summary.length > 80 ? '...' : ''}
          </span>
        </div>
      )}

      <span style={{ fontSize: 11, color: '#DB2777', fontWeight: 600 }}>다시 보기 ›</span>
    </button>
  )
}

/* ─── 꿈해몽 카드 ─── */
function DreamCard({ r }: { r: DreamRecord }) {
  const sc = SENTIMENT_COLORS[r.overall_sentiment] || SC_DEFAULT

  return (
    <div style={{ margin: '0 20px 14px', padding: 16, background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🌙 꿈해몽</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: sc.bg, color: sc.color }}>{r.overall_sentiment}</span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{fmtDate(r.created_at)}</span>
      </div>

      {/* 감지 상징 */}
      {r.detected_symbols?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
          {r.detected_symbols.slice(0, 5).map(s => (
            <span key={s} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)' }}>{s}</span>
          ))}
        </div>
      )}

      {/* 분석 핵심 — highlight 역할 */}
      <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FFF8F0', border: '1px solid #FFE4CC', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#C05600', lineHeight: 1.5 }}>{r.overall_summary}</span>
      </div>

      {/* Q&A 핵심 — qa_summary 역할 */}
      {r.main_interpretation && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#F0F4FF', border: '1px solid #D0DCFF', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#3B5998', lineHeight: 1.6 }}>
            {r.main_interpretation.slice(0, 80)}{r.main_interpretation.length > 80 ? '...' : ''}
          </span>
        </div>
      )}

      {/* 사주가 핵심 전달 — expert_note 역할 */}
      {r.todays_advice && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#F0FFF4', border: '1px solid #C6F6D5', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#276749', lineHeight: 1.5 }}>✨ {r.todays_advice}</span>
        </div>
      )}

      {/* 꿈 내용 미리보기 */}
      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
        "{r.dream_text.slice(0, 50)}{r.dream_text.length > 50 ? '...' : ''}"
      </div>
    </div>
  )
}

/* ─── 메인 ─── */
export default function RecordsScreen() {
  const [active, setActive] = useState('전체')
  const nav = useNavigate()
  const [dreamRecords, setDreamRecords] = useState<DreamRecord[]>([])
  const [precisionRecords, setPrecisionRecords] = useState<PrecisionRecord[]>([])
  const [marriageRecords, setMarriageRecords] = useState<MarriageRecord[]>([])
  const [otherCompatRecords, setOtherCompatRecords] = useState<MarriageRecord[]>([])
  const [lifetimeRecords, setLifetimeRecords] = useState<LifetimeRecord[]>([])
  const [compatRecords, setCompatRecords] = useState<CompatRecord[]>([])
  const [nameRecords, setNameRecords] = useState<NameRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecords() {
      setLoading(true)
      try {
        if (!supabase) return
        const identity = await getCurrentIdentity()

        // 꿈해몽 — localStorage 우선, Supabase 보조
        const localDreams: DreamRecord[] = (() => {
          try { return JSON.parse(localStorage.getItem('dream_records_local') || '[]') } catch { return [] }
        })()

        let remoteDreams: DreamRecord[] = []
        try {
          const { data: dData } = await applyUserFilter(
            supabase.from('dream_records')
              .select('id,dream_date,dream_text,overall_sentiment,overall_summary,main_interpretation,domains,todays_advice,lucky_color,detected_symbols,created_at')
              .order('created_at', { ascending: false }).limit(30),
            identity
          )
          if (dData) remoteDreams = dData as DreamRecord[]
        } catch { /* Supabase 테이블 없으면 무시 */ }

        // 중복 제거: id 기준으로 로컬과 원격 합산
        const seenIds = new Set<string>()
        const merged = [...localDreams, ...remoteDreams].filter(r => {
          if (seenIds.has(r.id)) return false
          seenIds.add(r.id)
          return true
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setDreamRecords(merged)

        // precision_analyses — 결혼궁합과 정밀분석 분리
        const { data: pData } = await applyUserFilter(
          supabase.from('precision_analyses')
            .select('id,profile_name,saju_summary,sections,selected_items,created_at')
            .order('created_at', { ascending: false }).limit(50),
          identity
        )
        if (pData) {
          const marriage: MarriageRecord[] = []
          const otherCompat: MarriageRecord[] = []
          const precision: PrecisionRecord[] = []
          for (const r of pData as any[]) {
            if (r.profile_name?.includes('결혼궁합')) marriage.push(r as MarriageRecord)
            else if (r.profile_name?.includes('궁합')) otherCompat.push(r as MarriageRecord)
            else precision.push(r as PrecisionRecord)
          }
          setMarriageRecords(marriage)
          setOtherCompatRecords(otherCompat)
          setPrecisionRecords(precision)
        }

        // 평생운세
        const { data: lData } = await applyUserFilter(
          supabase.from('lifetime_readings')
            .select('id,profile_name,overall_score,overall_summary,sections,created_at')
            .order('created_at', { ascending: false }).limit(20),
          identity
        )
        if (lData) setLifetimeRecords(lData as LifetimeRecord[])

        // 연인궁합 — localStorage 우선, Supabase 보조
        const localCompat: CompatRecord[] = (() => {
          try { return JSON.parse(localStorage.getItem('compat_records_local') || '[]') } catch { return [] }
        })()

        let remoteCompat: CompatRecord[] = []
        try {
          const { data: cData } = await applyUserFilter(
            supabase.from('compatibility_results')
              .select('id,result,created_at')
              .order('created_at', { ascending: false }).limit(30),
            identity
          )
          if (cData) remoteCompat = cData as CompatRecord[]
        } catch { /* 테이블 없으면 무시 */ }

        const seenCompatIds = new Set<string>()
        const mergedCompat = [...localCompat, ...remoteCompat].filter(r => {
          if (seenCompatIds.has(r.id)) return false
          seenCompatIds.add(r.id)
          return true
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setCompatRecords(mergedCompat)

        // 이름풀이 — localStorage
        try {
          const localNames: NameRecord[] = JSON.parse(localStorage.getItem('name_readings_local') || '[]')
          setNameRecords(localNames)
        } catch { /* 무시 */ }
      } catch (e) {
        console.warn('[RecordsScreen]', e)
      } finally {
        setLoading(false)
      }
    }
    fetchRecords()
  }, [])

  const showLifetime  = active === '전체' || active === '평생운세'
  const showPrecision = active === '전체' || active === '정밀분석'
  const showDream     = active === '전체' || active === '꿈해몽'
  const showName      = active === '전체' || active === '이름풀이'
  const showMarriage     = active === '전체' || active === '연인/결혼궁합'
  const showCompat       = active === '전체' || active === '연인/결혼궁합'
  const showOtherCompat  = active === '전체' || active === '기타궁합'
  const showSaved        = active === '전체' || active === '저장한 결과'

  /* ── 드래그 스크롤 ── */
  const tabBarRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0, moved: false })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = tabBarRef.current
    if (!el) return
    dragState.current = { dragging: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const s = dragState.current
    if (!s.dragging) return
    const el = tabBarRef.current
    if (!el) return
    const dx = e.clientX - s.startX
    if (Math.abs(dx) > 3) s.moved = true
    el.scrollLeft = s.scrollLeft - dx
  }, [])

  const onMouseUp = useCallback(() => {
    const el = tabBarRef.current
    if (!el) return
    dragState.current.dragging = false
    el.style.cursor = 'grab'
    el.style.userSelect = ''
  }, [])

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    // 드래그 중이었으면 클릭 이벤트 차단 (버튼 선택 방지)
    if (dragState.current.moved) {
      e.stopPropagation()
      dragState.current.moved = false
    }
  }, [])

  const hasPrecision    = precisionRecords.length > 0
  const hasDream        = dreamRecords.length > 0
  const hasName         = nameRecords.length > 0
  const hasMarriage     = marriageRecords.length > 0
  const hasLifetime     = lifetimeRecords.length > 0
  const hasCompat       = compatRecords.length > 0
  const hasOtherCompat  = otherCompatRecords.length > 0

  // 연인/결혼궁합 탭: 두 타입을 날짜 역순으로 통합
  const mergedCompatList = useMemo(() => [
    ...marriageRecords.map(r => ({ ...r, _type: 'marriage' as const })),
    ...compatRecords.map(r => ({ ...r, _type: 'compat' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [marriageRecords, compatRecords])

  // 전체 탭: 모든 기록 타입 통합 역정렬
  const allRecordsSorted = useMemo(() => [
    ...precisionRecords.map(r => ({ ...r, _type: 'precision' as const })),
    ...lifetimeRecords.map(r => ({ ...r, _type: 'lifetime' as const })),
    ...dreamRecords.map(r => ({ ...r, _type: 'dream' as const })),
    ...nameRecords.map(r => ({ ...r, _type: 'name' as const })),
    ...marriageRecords.map(r => ({ ...r, _type: 'marriage' as const })),
    ...compatRecords.map(r => ({ ...r, _type: 'compat' as const })),
    ...otherCompatRecords.map(r => ({ ...r, _type: 'otherCompat' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [precisionRecords, lifetimeRecords, dreamRecords, nameRecords, marriageRecords, compatRecords, otherCompatRecords])

  const totalRecords = allRecordsSorted.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="분석 기록" showBack onBack={() => nav(-1)} rightActions={['kakao', 'fontSize', 'search']} />

      {/* 필터 탭 — 스크롤에 독립된 고정 영역 (드래그 스크롤 가능) */}
      <div
        ref={tabBarRef}
        style={{
          display: 'flex', gap: 8, padding: '8px 20px 10px',
          overflowX: 'auto', scrollbarWidth: 'none',
          background: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-1)',
          flexShrink: 0,
          cursor: 'grab',
          WebkitOverflowScrolling: 'touch',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClickCapture={onClickCapture}
      >
        {filters.map(f => (
          <button key={f} className={`s-chip ${active === f ? 's-chip-active' : ''}`} onClick={() => setActive(f)}
            style={{ flexShrink: 0 }}
          >{f}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* 로딩 */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 0', color: 'var(--text-tertiary)' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>기록 불러오는 중...</span>
          </div>
        )}

        {/* ─── 전체 탭: 모든 기록 날짜 역순 통합 ─── */}
        {!loading && active === '전체' && allRecordsSorted.map(r => {
          if (r._type === 'precision')   return <PrecisionCard   key={r.id} r={r as any} nav={nav} />
          if (r._type === 'lifetime')    return <LifetimeCard    key={r.id} r={r as any} nav={nav} />
          if (r._type === 'dream')       return <DreamCard       key={r.id} r={r as any} />
          if (r._type === 'name')        return <NameCard        key={r.id} r={r as any} />
          if (r._type === 'marriage')    return <MarriageCard    key={r.id} r={r as any} nav={nav} />
          if (r._type === 'compat')      return <CompatCard      key={r.id} r={r as any} nav={nav} />
          if (r._type === 'otherCompat') return <MarriageCard    key={r.id} r={r as any} nav={nav} />
          return null
        })}
        {!loading && active === '전체' && totalRecords === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>아직 분석 기록이 없습니다</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20, lineHeight: 1.6 }}>
              정밀분석, 꿈해몽 등 다양한 사주 서비스를<br/>이용하면 이곳에 자동으로 기록됩니다
            </div>
            <button onClick={() => nav('/analysis')} style={{ padding: '12px 28px', borderRadius: 'var(--radius-full)', background: 'var(--bg-accent)', color: '#1F2937', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              분석 시작하기
            </button>
          </div>
        )}

        {/* ─── 정밀분석 탭 ─── */}
        {!loading && active === '정밀분석' && precisionRecords.map(r => (
          <PrecisionCard key={r.id} r={r} nav={nav} />
        ))}
        {!loading && active === '정밀분석' && !hasPrecision && (
          <EmptyState emoji="🔮" title="정밀분석 기록이 없습니다" desc="사주 정밀분석을 시작해보세요" label="정밀분석 시작하기" path="/analysis/precision" />
        )}

        {/* ─── 평생운세 탭 ─── */}
        {!loading && active === '평생운세' && lifetimeRecords.map(r => (
          <LifetimeCard key={r.id} r={r} nav={nav} />
        ))}
        {!loading && active === '평생운세' && !hasLifetime && (
          <EmptyState emoji="🌊" title="평생운세 기록이 없습니다" desc="평생운세 분석을 시작해보세요" label="평생운세 시작하기" path="/analysis/lifetime" />
        )}

        {/* ─── 꿈해몽 탭 ─── */}
        {!loading && active === '꿈해몽' && dreamRecords.map(r => (
          <DreamCard key={r.id} r={r} />
        ))}
        {!loading && active === '꿈해몽' && !hasDream && (
          <EmptyState emoji="🌙" title="꿈해몽 기록이 없습니다" desc="꿈을 기록하고 해몽을 받아보세요" label="꿈해몽 시작하기" path="/analysis/dream" />
        )}

        {/* ─── 이름풀이 탭 ─── */}
        {!loading && showName && active === '이름풀이' && nameRecords.map(r => (
          <NameCard key={r.id} r={r} />
        ))}
        {!loading && active === '이름풀이' && !hasName && (
          <EmptyState emoji="✍️" title="이름풀이 기록이 없습니다" desc="이름풀이 분석을 시작해보세요" label="이름풀이 시작하기" path="/analysis/name" />
        )}

        {/* ─── 연인/결혼궁합 탭: 날짜 역순 통합 ─── */}
        {!loading && active === '연인/결혼궁합' && mergedCompatList.map(r =>
          r._type === 'marriage'
            ? <MarriageCard key={r.id} r={r as any} nav={nav} />
            : <CompatCard   key={r.id} r={r as any} nav={nav} />
        )}
        {!loading && active === '연인/결혼궁합' && !hasMarriage && !hasCompat && (
          <EmptyState emoji="💑" title="궁합 기록이 없습니다" desc="연인궁합·결혼궁합을 분석해보세요" label="궁합 시작하기" path="/analysis" />
        )}

        {/* ─── 기타궁합 탭 ─── */}
        {!loading && active === '기타궁합' && otherCompatRecords.map(r => (
          <MarriageCard key={r.id} r={r} nav={nav} />
        ))}
        {!loading && active === '기타궁합' && !hasOtherCompat && (
          <EmptyState emoji="🤝" title="기타궁합 기록이 없습니다" desc="사업궁합·친구궁합 등 분석 결과가 여기에 표시됩니다" label="분석 시작하기" path="/analysis" />
        )}

        {/* ─── 저장한 결과 ─── */}
        {!loading && active === '저장한 결과' && (
          <EmptyState emoji="🔖" title="저장한 결과가 없습니다" desc="분석 결과를 저장하면 이곳에서 확인할 수 있어요" label="분석 시작하기" path="/analysis" />
        )}

      </div>
    </div>
  )
}
