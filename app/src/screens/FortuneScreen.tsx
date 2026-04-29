import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, MessageCircle, Send, Share2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import Header from '@/components/layout/Header'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const MAX_QA = 10

/* ─── 서비스별 색상 테마 ─── */
const THEMES: Record<string, { primary: string; soft: string; bg: string; bgMid: string; border: string; text: string; textSoft: string; gradient: string }> = {
  flow:     { primary: '#0369A1', soft: '#0EA5E9', bg: '#F0F9FF', bgMid: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E', textSoft: '#0369A1', gradient: 'linear-gradient(135deg, #0369A1 0%, #0EA5E9 100%)' },
  tojeong:  { primary: '#92400E', soft: '#D97706', bg: '#FFFBEB', bgMid: '#FEF3C7', border: '#FCD34D', text: '#78350F', textSoft: '#92400E', gradient: 'linear-gradient(135deg, #92400E 0%, #D97706 100%)' },
  wealth:   { primary: '#14532D', soft: '#16A34A', bg: '#F0FDF4', bgMid: '#DCFCE7', border: '#86EFAC', text: '#14532D', textSoft: '#15803D', gradient: 'linear-gradient(135deg, #14532D 0%, #16A34A 100%)' },
  love:     { primary: '#9D174D', soft: '#DB2777', bg: '#FFF0F6', bgMid: '#FCE7F3', border: '#F9A8D4', text: '#831843', textSoft: '#9D174D', gradient: 'linear-gradient(135deg, #9D174D 0%, #DB2777 100%)' },
  career:   { primary: '#1E3A8A', soft: '#2563EB', bg: '#EFF6FF', bgMid: '#DBEAFE', border: '#93C5FD', text: '#1E3A8A', textSoft: '#1D4ED8', gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' },
  business: { primary: '#1E293B', soft: '#475569', bg: '#F1F5F9', bgMid: '#E2E8F0', border: '#94A3B8', text: '#0F172A', textSoft: '#334155', gradient: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)' },
  health:   { primary: '#065F46', soft: '#059669', bg: '#ECFDF5', bgMid: '#D1FAE5', border: '#6EE7B7', text: '#064E3B', textSoft: '#047857', gradient: 'linear-gradient(135deg, #065F46 0%, #059669 100%)' },
  friend:   { primary: '#5B21B6', soft: '#7C3AED', bg: '#F5F3FF', bgMid: '#EDE9FE', border: '#C4B5FD', text: '#3B0764', textSoft: '#6D28D9', gradient: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)' },
  newyear:  { primary: '#92400E', soft: '#D97706', bg: '#FFFBEB', bgMid: '#FEF3C7', border: '#FCD34D', text: '#78350F', textSoft: '#92400E', gradient: 'linear-gradient(135deg, #78350F 0%, #D97706 100%)' },
}

const DEFAULT_THEME = THEMES.flow

/* ─── 타입 ─── */
interface SectionData { id: string; title: string; score: number; summary: string; analysis: string; tags: string[] }
interface FortuneResult {
  reading_id: string | null; fortune_type: string; fortune_title: string
  profile_name: string; saju_context: string
  overall_score: number; overall_summary: string; sections: SectionData[]
}
interface QAMessage { question: string; answer: string }

function scoreColor(s: number) {
  return s >= 80 ? '#059669' : s >= 65 ? '#2563EB' : s >= 50 ? '#D97706' : '#DC2626'
}
function scoreLabel(s: number) {
  return s >= 80 ? '매우 좋음' : s >= 65 ? '좋음' : s >= 50 ? '보통' : '주의 필요'
}

/* ─── 점수 바 ─── */
function ScoreBar({ label, score }: { label: string; score: number }) {
  const c = scoreColor(score)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{score}점</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--border-1)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: c, borderRadius: 3, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  )
}

/* ─── Q&A 스레드 ─── */
function QAThread({ section, readingId, fortuneType, sajuContext, totalQA, onQACountChange, T }: {
  section: SectionData; readingId: string | null; fortuneType: string; sajuContext: string
  totalQA: number; onQACountChange: (d: number) => void; T: typeof DEFAULT_THEME
}) {
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const latestRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  useLayoutEffect(() => {
    const cur = messages.filter(m => m.answer).length
    if (cur > prevCountRef.current) { prevCountRef.current = cur; latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  }, [messages])

  const canAsk = (MAX_QA - totalQA) > 0 && !loading
  const answeredCount = messages.filter(m => m.answer).length

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || !canAsk) return
    setInput('')
    const pending = [...messages, { question: q, answer: '' }]
    setMessages(pending)
    setLoading(true); onQACountChange(1)
    try {
      const res = await fetch(`${API_BASE}/api/saju/fortune/qa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading_id: readingId, device_id: getDeviceId(), fortune_type: fortuneType,
          section_id: section.id, section_title: section.title, section_context: section.analysis,
          saju_context: sajuContext, question: q, round_number: pending.length,
          conversation_history: messages.filter(m => m.answer),
        }),
      })
      const data = await res.json()
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: data.answer } : m))
    } catch {
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: '답변 오류가 발생했습니다.' } : m))
      onQACountChange(-1)
    } finally { setLoading(false) }
    requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  }, [input, messages, loading, canAsk, readingId, fortuneType, section, sajuContext, onQACountChange])

  return (
    <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgMid }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 8px' }}>
        <MessageCircle size={12} color={T.soft} />
        <span style={{ fontSize: 11, fontWeight: 700, color: T.soft }}>질문하기</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          이 섹션 {answeredCount}회 · 전체 {totalQA}/{MAX_QA}회
        </span>
      </div>
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1
        return (
          <div key={i} style={{ padding: '0 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', background: T.soft, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>{msg.question}</div>
            </div>
            {msg.answer ? (
              <div style={{ display: 'flex' }}>
                <div ref={isLast ? latestRef : null} style={{ maxWidth: '90%', padding: '10px 12px', borderRadius: '2px 12px 12px 12px', background: 'var(--bg-surface)', border: `1px solid ${T.border}`, fontSize: 13, color: T.text, lineHeight: 1.8 }}>{msg.answer}</div>
              </div>
            ) : (
              <div ref={isLast ? latestRef : null} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11 }}>명리학 전문가가 분석 중...</span>
              </div>
            )}
          </div>
        )
      })}
      {(MAX_QA - totalQA) <= 0 ? (
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: '#92400E', textAlign: 'center' }}>전체 {MAX_QA}회 질문이 완료되었습니다</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`${section.title}에 대해 궁금한 점...`} disabled={!canAsk}
            style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }} />
          <button onClick={handleSend} disabled={!input.trim() || !canAsk} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && canAsk ? T.soft : 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && canAsk ? 'pointer' : 'default' }}>
            <Send size={14} color={input.trim() && canAsk ? '#fff' : 'var(--text-tertiary)'} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── 월별 달력 파서 (신년운세 전용) ─── */
function MonthCalendar({ analysis, T }: { analysis: string; T: typeof DEFAULT_THEME }) {
  // "1월(계묘): 좋음 - 메시지" 패턴 파싱
  const months = Array.from({ length: 12 }, (_, i) => {
    const mo = i + 1
    const patterns = [
      new RegExp(`${mo}월[^:：]*[:：]\\s*(좋음|매우좋음|보통|주의|나쁨)[^\\-–—]*[-–—]?\\s*([^/\\n]+)`),
    ]
    for (const p of patterns) {
      const m = analysis.match(p)
      if (m) {
        const grade = m[1]?.trim() || '보통'
        const msg = m[2]?.trim().slice(0, 30) || ''
        return { mo, grade, msg }
      }
    }
    return { mo, grade: '보통', msg: '' }
  })

  const gradeColor: Record<string, { bg: string; color: string }> = {
    '좋음':    { bg: '#ECFDF5', color: '#059669' },
    '매우좋음':{ bg: '#D1FAE5', color: '#047857' },
    '보통':    { bg: '#F1F5F9', color: '#64748B' },
    '주의':    { bg: '#FFF7ED', color: '#EA580C' },
    '나쁨':    { bg: '#FEF2F2', color: '#DC2626' },
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
        {months.map(({ mo, grade, msg }) => {
          const gc = gradeColor[grade] || gradeColor['보통']
          return (
            <div key={mo} style={{ padding: '8px 6px', borderRadius: 10, background: gc.bg, border: `1px solid ${gc.color}30`, textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: gc.color }}>{mo}월</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: gc.color, marginTop: 2 }}>{grade}</div>
              {msg && <div style={{ fontSize: 9, color: gc.color, opacity: 0.8, marginTop: 3, lineHeight: 1.3 }}>{msg}</div>}
            </div>
          )
        })}
      </div>
      {/* 원문 전체 */}
      <div style={{ fontSize: 12, color: T.text, lineHeight: 1.8, padding: '10px 12px', borderRadius: 10, background: T.bgMid, border: `1px solid ${T.border}`, whiteSpace: 'pre-wrap' }}>
        {analysis}
      </div>
    </div>
  )
}

/* ─── 섹션 카드 ─── */
function SectionCard({ section, readingId, fortuneType, sajuContext, totalQA, onQACountChange, fortuneTitle, profileName, T }: {
  section: SectionData; readingId: string | null; fortuneType: string; sajuContext: string
  totalQA: number; onQACountChange: (d: number) => void
  fortuneTitle: string; profileName: string; T: typeof DEFAULT_THEME
}) {
  const [open, setOpen] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const sc = scoreColor(section.score)

  async function handleShare() {
    const text = [`${fortuneTitle} 분석 결과`, `${profileName}`, ``, `${section.title} (${section.score}점)`, section.summary, ``, section.analysis.slice(0, 150) + '...', ``, `사주로(sajuro.ai)에서 확인해보세요`].join('\n')
    if (navigator.share) { try { await navigator.share({ text }) } catch {} } else { await navigator.clipboard.writeText(text); alert('클립보드에 복사됐습니다!') }
    setShareDone(true); setTimeout(() => setShareDone(false), 2500)
  }

  return (
    <div style={{ margin: '0 20px 14px', borderRadius: 16, background: 'var(--bg-surface)', border: `1px solid ${open ? T.border : 'var(--border-1)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--bg-surface)', textAlign: 'left' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: `${sc}15`, border: `1px solid ${sc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: sc }}>
          {section.score}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{section.title}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: sc }}>{section.score}점</span>
            <span style={{ fontSize: 10, color: sc, fontWeight: 600 }}>{scoreLabel(section.score)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{section.summary}</div>
        </div>
        {open ? <ChevronUp size={15} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 4 }} /> : <ChevronDown size={15} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 4 }} />}
      </button>

      {open && (
        <>
          <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${T.border}`, background: T.bg }}>
            {section.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12, marginBottom: 10 }}>
                {section.tags.map((tag, i) => <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: T.bgMid, color: T.soft, border: `1px solid ${T.border}` }}>{tag}</span>)}
              </div>
            )}
            {section.id === 'monthly_guide' ? (
              <MonthCalendar analysis={section.analysis} T={T} />
            ) : (
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{section.analysis}</div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowQA(v => !v)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: showQA ? T.bgMid : 'var(--bg-surface-3)', color: showQA ? T.soft : 'var(--text-secondary)', border: `1px solid ${showQA ? T.border : 'var(--border-1)'}` }}>
                <MessageCircle size={13} />
                {showQA ? '질문 닫기' : '이 섹션 질문하기'}
              </button>
              <button onClick={handleShare} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: shareDone ? '#ECFDF5' : T.bgMid, color: shareDone ? '#059669' : T.soft, border: `1px solid ${shareDone ? '#6EE7B7' : T.border}`, transition: 'all 0.2s' }}>
                {shareDone ? <Check size={13} /> : <Share2 size={13} />}
                공유
              </button>
            </div>
          </div>
          {showQA && (
            <QAThread section={section} readingId={readingId} fortuneType={fortuneType} sajuContext={sajuContext}
              totalQA={totalQA} onQACountChange={onQACountChange} T={T} />
          )}
        </>
      )}
    </div>
  )
}

/* ─── 메인 화면 ─── */
export default function FortuneScreen() {
  const nav = useNavigate()
  const { state } = useLocation() as { state: { profile: any; fortuneType: string; fortuneTitle: string } | null }
  const [result, setResult] = useState<FortuneResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalQA, setTotalQA] = useState(0)

  const fortuneType = state?.fortuneType || 'flow'
  const fortuneTitle = state?.fortuneTitle || '운세 분석'
  const T = THEMES[fortuneType] || DEFAULT_THEME

  useEffect(() => {
    if (!state?.profile) { setError('프로필 정보가 없습니다.'); setLoading(false); return }
    async function analyze() {
      try {
        const kakaoUser = await getUser()
        const res = await fetch(`${API_BASE}/api/saju/fortune`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...state.profile, fortune_type: fortuneType, device_id: getDeviceId(), user_id: kakaoUser?.id || null }),
        })
        if (!res.ok) throw new Error(`API 오류: ${res.status}`)
        setResult(await res.json())
      } catch (e: any) { setError(e.message || '분석 오류') }
      finally { setLoading(false) }
    }
    analyze()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title={fortuneTitle} showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '40px 20px' }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: T.soft }}>{fortuneTitle}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, textAlign: 'center', whiteSpace: 'nowrap' }}>
          {state?.profile?.name}님의 {fortuneTitle} 분석 중
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.7 }}>
          고전문헌에 근거한 정밀 분석 중...<br />잠시만 기다려주세요
        </div>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: T.soft }} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title={fortuneTitle} showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#DC2626' }}>!</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{error}</div>
        <button onClick={() => nav(-1)} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: T.bg, color: T.soft, fontSize: 14, fontWeight: 700, border: `1px solid ${T.border}`, cursor: 'pointer' }}>돌아가기</button>
      </div>
    </div>
  )

  if (!result) return null
  const sections = result.sections || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title={fortuneTitle} showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* 헤더 카드 */}
        <div style={{ margin: '0 20px 16px', padding: '22px 18px', borderRadius: 18, background: T.gradient }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
            {result.profile_name}님의 {fortuneTitle}
            {result.reading_id && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.2)' }}>저장됨</span>}
          </div>
          <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 6 }}>{result.overall_score}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>종합 점수</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.8, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
            {result.overall_summary}
          </div>
        </div>

        {/* 섹션별 점수 요약 */}
        <div style={{ margin: '0 20px 16px', padding: '16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.soft, marginBottom: 12, letterSpacing: 0.3 }}>4개 분석 영역 점수</div>
          {sections.map(s => <ScoreBar key={s.id} label={s.title} score={s.score} />)}
        </div>

        {/* Q&A 현황 */}
        <div style={{ margin: '0 20px 12px', padding: '10px 14px', borderRadius: 10, background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: T.text }}>섹션별 질문하기 (전체 최대 {MAX_QA}회)</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.soft }}>{totalQA}/{MAX_QA}회 사용</span>
        </div>

        {/* 섹션 카드들 */}
        {sections.map(section => (
          <SectionCard key={section.id} section={section} readingId={result.reading_id}
            fortuneType={fortuneType} sajuContext={result.saju_context}
            totalQA={totalQA} onQACountChange={d => setTotalQA(v => Math.max(0, v + d))}
            fortuneTitle={fortuneTitle} profileName={result.profile_name} T={T} />
        ))}

        {/* 하단 안내 */}
        <div style={{ margin: '8px 20px 20px', padding: '12px 16px', borderRadius: 12, background: T.bgMid, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, color: T.textSoft, lineHeight: 1.7 }}>
            이 분석은 적천수(滴天髓), 자평진전(子平眞詮), 궁통보감(窮通寶鑑) 등 고전문헌에 근거하여 분석한 결과입니다.
            결과는 <strong>분석 기록</strong> 메뉴에서 다시 확인할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  )
}
