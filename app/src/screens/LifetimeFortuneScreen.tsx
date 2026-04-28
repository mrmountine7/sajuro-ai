import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, MessageCircle, Send, Share2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import Header from '@/components/layout/Header'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const MAX_QA = 10

/* ─── 딥 퍼플 디자인 토큰 ─── */
const L = {
  primary:  '#4C1D95',
  soft:     '#7C3AED',
  light:    '#8B5CF6',
  bg:       '#F5F3FF',
  bgMid:    '#EDE9FE',
  border:   '#C4B5FD',
  text:     '#2E1065',
  textSoft: '#4C1D95',
  gradient: 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)',
} as const

/* ─── 점수 색상 ─── */
function scoreColor(s: number) {
  return s >= 80 ? '#059669' : s >= 65 ? '#7C3AED' : s >= 50 ? '#D97706' : '#DC2626'
}
function scoreLabel(s: number) {
  return s >= 80 ? '매우 좋음' : s >= 65 ? '좋음' : s >= 50 ? '보통' : '주의 필요'
}

/* ─── 타입 ─── */
interface SectionData {
  id: string; title: string; icon: string; score: number
  summary: string; analysis: string; tags: string[]
}
interface LifetimeResult {
  reading_id: string | null
  profile_name: string
  saju_context: string
  overall_score: number
  overall_summary: string
  sections: SectionData[]
}
interface QAMessage { question: string; answer: string }

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
function QAThread({ section, readingId, sajuContext, totalQA, onQACountChange }: {
  section: SectionData; readingId: string | null; sajuContext: string
  totalQA: number; onQACountChange: (delta: number) => void
}) {
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const latestRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  useLayoutEffect(() => {
    const cur = messages.filter(m => m.answer).length
    if (cur > prevCountRef.current) {
      prevCountRef.current = cur
      latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [messages])

  const remainingQA = MAX_QA - totalQA
  const canAsk = remainingQA > 0 && !loading

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || !canAsk) return
    setInput('')
    const pending = [...messages, { question: q, answer: '' }]
    setMessages(pending)
    setLoading(true)
    onQACountChange(1)
    try {
      const res = await fetch(`${API_BASE}/api/saju/lifetime/qa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading_id: readingId,
          device_id: getDeviceId(),
          section_id: section.id,
          section_title: section.title,
          section_context: section.analysis,
          saju_context: sajuContext,
          question: q,
          round_number: pending.length,
          conversation_history: messages.filter(m => m.answer),
        }),
      })
      const data = await res.json()
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: data.answer } : m))
    } catch {
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: '답변 오류가 발생했습니다.' } : m))
      onQACountChange(-1)
    } finally {
      setLoading(false)
    }
    requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  }, [input, messages, loading, canAsk, readingId, section, sajuContext, onQACountChange])

  const answeredCount = messages.filter(m => m.answer).length

  return (
    <div style={{ borderTop: `1px solid ${L.border}`, background: L.bgMid }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 8px' }}>
        <MessageCircle size={12} color={L.soft} />
        <span style={{ fontSize: 11, fontWeight: 700, color: L.soft }}>질문하기</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          이 섹션 {answeredCount}회 · 전체 {totalQA}/{MAX_QA}회
        </span>
      </div>

      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1
        return (
          <div key={i} style={{ padding: '0 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', background: L.soft, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
                {msg.question}
              </div>
            </div>
            {msg.answer ? (
              <div style={{ display: 'flex' }}>
                <div ref={isLast ? latestRef : null} style={{ maxWidth: '90%', padding: '10px 12px', borderRadius: '2px 12px 12px 12px', background: 'var(--bg-surface)', border: `1px solid ${L.border}`, fontSize: 13, color: L.text, lineHeight: 1.8 }}>
                  {msg.answer}
                </div>
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

      {remainingQA <= 0 ? (
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: '#92400E', textAlign: 'center' }}>
          전체 {MAX_QA}회 질문이 완료되었습니다
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`${section.title}에 대해 궁금한 점...`}
            disabled={!canAsk}
            style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${L.border}`, background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || !canAsk} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && canAsk ? L.soft : 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && canAsk ? 'pointer' : 'default' }}>
            <Send size={14} color={input.trim() && canAsk ? '#fff' : 'var(--text-tertiary)'} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── 섹션 카드 ─── */
function SectionCard({ section, readingId, sajuContext, totalQA, onQACountChange, person1, person2 }: {
  section: SectionData; readingId: string | null; sajuContext: string
  totalQA: number; onQACountChange: (delta: number) => void
  person1: string; person2: string
}) {
  const [open, setOpen] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const sc = scoreColor(section.score)

  async function handleShare() {
    const text = [
      `평생운세 분석 결과`,
      `${person1}`,
      ``,
      `━━━ ${section.title} (${section.score}점) ━━━`,
      section.summary,
      ``,
      section.analysis.slice(0, 200) + '...',
      ``,
      `📱 사주로(sajuro.ai)에서 내 평생운세를 확인해보세요`,
    ].join('\n')
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      alert('클립보드에 복사됐습니다!')
    }
    setShareDone(true); setTimeout(() => setShareDone(false), 2500)
  }

  return (
    <div style={{ margin: '0 20px 14px', borderRadius: 16, background: 'var(--bg-surface)', border: `1px solid ${open ? L.border : 'var(--border-1)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* 섹션 헤더 */}
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

      {/* 펼쳐진 상세 */}
      {open && (
        <>
          <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${L.border}`, background: L.bg }}>
            {/* 태그 */}
            {section.tags?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12, marginBottom: 10 }}>
                {section.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: L.bgMid, color: L.soft, border: `1px solid ${L.border}` }}>{tag}</span>
                ))}
              </div>
            )}
            {/* 본문 분석 */}
            <div style={{ fontSize: 13, color: L.text, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
              {section.analysis}
            </div>
            {/* 하단 버튼 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowQA(v => !v)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: showQA ? L.bgMid : 'var(--bg-surface-3)', color: showQA ? L.soft : 'var(--text-secondary)', border: `1px solid ${showQA ? L.border : 'var(--border-1)'}` }}>
                <MessageCircle size={13} />
                {showQA ? '질문 닫기' : '이 섹션 질문하기'}
              </button>
              <button onClick={handleShare} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: shareDone ? '#ECFDF5' : L.bgMid, color: shareDone ? '#059669' : L.soft, border: `1px solid ${shareDone ? '#6EE7B7' : L.border}`, transition: 'all 0.2s' }}>
                {shareDone ? <Check size={13} /> : <Share2 size={13} />}
                공유
              </button>
            </div>
          </div>
          {showQA && (
            <QAThread
              section={section}
              readingId={readingId}
              sajuContext={sajuContext}
              totalQA={totalQA}
              onQACountChange={onQACountChange}
            />
          )}
        </>
      )}
    </div>
  )
}

/* ─── 메인 화면 ─── */
export default function LifetimeFortuneScreen() {
  const nav = useNavigate()
  const { state } = useLocation() as { state: { profile: any } | null }
  const [result, setResult] = useState<LifetimeResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [totalQA, setTotalQA] = useState(0)

  useEffect(() => {
    if (!state?.profile) { setError('프로필 정보가 없습니다.'); setLoading(false); return }
    async function analyze() {
      try {
        const kakaoUser = await getUser()
        const res = await fetch(`${API_BASE}/api/saju/lifetime`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...state.profile,
            device_id: getDeviceId(),
            user_id: kakaoUser?.id || null,
          }),
        })
        if (!res.ok) throw new Error(`API 오류: ${res.status}`)
        const data = await res.json()
        setResult(data)
      } catch (e: any) {
        setError(e.message || '분석 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
    analyze()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="평생운세" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '40px 20px' }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: L.soft }}>平生運</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: L.text, textAlign: 'center' }}>
          {state?.profile?.name}님의 평생운세를<br />정밀 분석하고 있습니다
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.7 }}>
          타고난 원국 · 대운 흐름 · 전환점 · 행운기<br />고전문헌에 근거한 깊이 있는 분석 중...
        </div>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: L.soft }} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="평생운세" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#DC2626' }}>!</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{error}</div>
        <button onClick={() => nav(-1)} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: L.bg, color: L.soft, fontSize: 14, fontWeight: 700, border: `1px solid ${L.border}`, cursor: 'pointer' }}>
          돌아가기
        </button>
      </div>
    </div>
  )

  if (!result) return null

  const sections = result.sections || []
  const sectionScores = sections.map(s => s.score).filter(Boolean)
  const avgScore = sectionScores.length ? Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length) : result.overall_score

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="평생운세" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 헤더 카드 ─── */}
        <div style={{ margin: '0 20px 16px', padding: '22px 18px', borderRadius: 18, background: L.gradient }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
            {result.profile_name}님의 평생운세
            {result.reading_id && <span style={{ marginLeft: 10, fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.2)' }}>저장됨</span>}
          </div>
          <div style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 6 }}>{avgScore}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>평생운 종합 점수</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.8, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
            {result.overall_summary}
          </div>
        </div>

        {/* ─── 섹션별 점수 요약 ─── */}
        <div style={{ margin: '0 20px 16px', padding: '16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${L.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: L.soft, marginBottom: 12, letterSpacing: 0.3 }}>8대 영역 점수</div>
          {sections.map(s => <ScoreBar key={s.id} label={s.title} score={s.score} />)}
        </div>

        {/* ─── Q&A 현황 ─── */}
        <div style={{ margin: '0 20px 12px', padding: '10px 14px', borderRadius: 10, background: L.bg, border: `1px solid ${L.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: L.text }}>섹션별 질문하기 (전체 합산 최대 {MAX_QA}회)</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: L.soft }}>{totalQA}/{MAX_QA}회 사용</span>
        </div>

        {/* ─── 8개 섹션 카드 ─── */}
        {sections.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            readingId={result.reading_id}
            sajuContext={result.saju_context}
            totalQA={totalQA}
            onQACountChange={delta => setTotalQA(v => Math.max(0, v + delta))}
            person1={result.profile_name}
            person2=""
          />
        ))}

        {/* 하단 안내 */}
        <div style={{ margin: '8px 20px 20px', padding: '12px 16px', borderRadius: 12, background: L.bgMid, border: `1px solid ${L.border}` }}>
          <div style={{ fontSize: 12, color: L.textSoft, lineHeight: 1.7 }}>
            이 분석은 적천수(滴天髓), 자평진전(子平眞詮), 궁통보감(窮通寶鑑) 등 고전문헌에 근거하여
            사주원국과 대운의 흐름을 종합 분석한 결과입니다.
            분석 결과는 <strong>분석 기록</strong> 메뉴에서 다시 확인할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  )
}
