import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Loader2, ChevronDown, ChevronUp, Send, MessageCircle,
  Copy, Check as CheckIcon, ArrowUpRight, Share2,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const MAX_QA_ROUNDS = 10

/* ─── 에메랄드 그린 디자인 토큰 ─── */
const M = {
  primary:   '#065F46',
  soft:      '#059669',
  bg:        '#ECFDF5',
  bgMid:     '#D1FAE5',
  border:    '#6EE7B7',
  text:      '#064E3B',
  textSoft:  '#047857',
  gradient:  'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
} as const

interface QAMessage { question: string; answer: string }

interface SectionItem {
  id: string; label: string; summary: string; score: number
  detail?: string; detailLoading?: boolean; detailLoaded?: boolean; detailError?: boolean
  qaMessages: QAMessage[]; qaLoading: boolean
}

interface Section {
  group_id: string; group_label: string; icon: string; items: SectionItem[]
}

interface FamilyResult {
  person1_name: string; person2_name: string
  overall_score: number; outer_score: number; inner_score: number
  family_summary: string; saju_context: string; sections: Section[]
}

function scoreColor(s: number) {
  return s >= 80 ? '#059669' : s >= 65 ? M.soft : s >= 50 ? '#D97706' : '#DC2626'
}
function scoreLabel(s: number) {
  return s >= 80 ? '매우 좋음' : s >= 65 ? '좋음' : s >= 50 ? '보통' : '주의 필요'
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const c = scoreColor(score)
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--border-1)', overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, height: '100%', borderRadius: 4, background: c, transition: 'width 0.7s ease' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: c, minWidth: 28, textAlign: 'right' }}>{score}</span>
      </div>
    </div>
  )
}

function DetailContent({ detail, label }: { detail: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(`[${label}]\n\n${detail}`) }
    catch {
      const el = document.createElement('textarea')
      el.value = `[${label}]\n\n${detail}`
      document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', padding: '10px 14px', paddingRight: 36, borderRadius: 10, background: M.bgMid, border: `1px solid ${M.border}` }}>
        {detail}
      </div>
      <button onClick={handleCopy} title="내용 복사" style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 6, background: copied ? '#ECFDF5' : 'var(--bg-surface)', border: `1px solid ${copied ? '#6EE7B7' : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
        {copied ? <CheckIcon size={13} color="#059669" strokeWidth={2.5} /> : <Copy size={13} color="var(--text-tertiary)" />}
      </button>
    </div>
  )
}

function QAThread({ item, sajuContext, onMessagesUpdate }: {
  item: SectionItem; sajuContext: string; onMessagesUpdate: (id: string, msgs: QAMessage[]) => void
}) {
  const [input, setInput] = useState('')
  const latestRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(item.qaMessages.filter(m => m.answer).length)
  const roundNumber = item.qaMessages.filter(m => m.answer).length + 1
  const canAsk = roundNumber <= MAX_QA_ROUNDS && !item.qaLoading

  useLayoutEffect(() => {
    const cur = item.qaMessages.filter(m => m.answer).length
    if (cur > prevCountRef.current) {
      prevCountRef.current = cur
      latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [item.qaMessages])

  const handleSend = async () => {
    const q = input.trim()
    if (!q || !canAsk) return
    setInput('')
    const pending: QAMessage[] = [...item.qaMessages, { question: q, answer: '' }]
    onMessagesUpdate(item.id, pending)
    try {
      const res = await fetch(`${API_BASE}/api/saju/precision/qa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: getDeviceId(), item_id: `family_${item.id}`, item_label: item.label,
          saju_context: sajuContext, item_detail: item.detail || '',
          conversation_history: item.qaMessages.filter(m => m.answer),
          question: q, round_number: roundNumber,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '오류')
      const done = pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: data.answer } : m)
      onMessagesUpdate(item.id, done)
    } catch (e) {
      const err = pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: `답변 오류: ${e}` } : m)
      onMessagesUpdate(item.id, err)
    }
    requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  }

  return (
    <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${M.border}`, background: M.bgMid }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0 8px' }}>
        <MessageCircle size={13} color={M.primary} />
        <span style={{ fontSize: 12, fontWeight: 700, color: M.primary }}>질문하기</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {item.qaMessages.filter(m => m.answer).length}/{MAX_QA_ROUNDS}회
        </span>
      </div>
      {item.qaMessages.map((msg, i) => {
        const isLast = i === item.qaMessages.length - 1
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', background: M.primary, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>{msg.question}</div>
            </div>
            {msg.answer ? (
              <div style={{ display: 'flex' }}>
                <div ref={isLast ? latestRef : null} style={{ maxWidth: '90%', padding: '10px 12px', borderRadius: '2px 12px 12px 12px', background: 'var(--bg-surface)', border: `1px solid ${M.border}`, fontSize: 13, color: M.text, lineHeight: 1.7 }}>{msg.answer}</div>
              </div>
            ) : (
              <div ref={isLast ? latestRef : null} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', color: 'var(--text-tertiary)' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11 }}>가족궁합 전문가가 답변을 작성하고 있습니다...</span>
              </div>
            )}
          </div>
        )
      })}
      {roundNumber > MAX_QA_ROUNDS ? (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FFF8E1', fontSize: 12, color: '#92400E', textAlign: 'center' }}>10회 질문이 완료되었습니다</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`${item.label}에 대해 궁금한 점...`} disabled={!canAsk}
            style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${M.border}`, background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }} />
          <button onClick={handleSend} disabled={!input.trim() || !canAsk} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && canAsk ? M.primary : 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && canAsk ? 'pointer' : 'default' }}>
            <Send size={14} color={input.trim() && canAsk ? '#fff' : 'var(--text-tertiary)'} />
          </button>
        </div>
      )}
    </div>
  )
}

function SectionCard({ section, sajuContext, person1Name, person2Name, onDetailLoad, onMessagesUpdate }: {
  section: Section; sajuContext: string
  person1Name: string; person2Name: string
  onDetailLoad: (id: string, content: string | null, error?: boolean) => void
  onMessagesUpdate: (id: string, msgs: QAMessage[]) => void
}) {
  const item = section.items[0]
  const [open, setOpen] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const fetchingRef = useRef(false)
  const sc = scoreColor(item.score)

  const fetchDetail = useCallback(async () => {
    if (item.detailLoading || fetchingRef.current) return
    fetchingRef.current = true
    onDetailLoad(item.id, '')
    try {
      const res = await fetch(`${API_BASE}/api/compatibility/family/detail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saju_context: sajuContext, item_id: item.id, item_label: item.label }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      onDetailLoad(item.id, data.content)
    } catch { onDetailLoad(item.id, null, true) }
    finally { fetchingRef.current = false }
  }, [item.id, item.label, item.detailLoading, sajuContext, onDetailLoad])

  const handleToggle = useCallback(async () => {
    const next = !open; setOpen(next)
    if (!next || item.detail || item.detailLoading || fetchingRef.current) return
    await fetchDetail()
  }, [open, item.detail, item.detailLoading, fetchDetail])

  useEffect(() => { if (item.qaMessages.length > 0) setShowQA(true) }, [item.qaMessages.length])

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    const text = [`가족궁합 분석 결과`, `${person1Name} x ${person2Name}`, ``, `${section.group_label} (${item.score}점)`, item.summary, ``, `사주로(sajuro.ai)에서 확인해보세요`].join('\n')
    if (navigator.share) { try { await navigator.share({ text }) } catch {} } else { await navigator.clipboard.writeText(text) }
    setShareDone(true); setTimeout(() => setShareDone(false), 2500)
  }

  return (
    <div style={{ margin: '0 20px 14px', borderRadius: 16, background: 'var(--bg-surface)', border: `1px solid ${open ? M.border : 'var(--border-1)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <button onClick={handleToggle} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--bg-surface)', textAlign: 'left' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: M.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: M.primary }}>{item.score}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{section.group_label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: sc }}>{item.score}점</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: M.bg, color: M.textSoft }}>{scoreLabel(item.score)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.summary}</div>
          {!item.detail && !open && <div style={{ marginTop: 5, fontSize: 11, color: M.soft, fontWeight: 600 }}>탭해서 상세 분석 보기 ›</div>}
          {item.qaMessages.length > 0 && <div style={{ marginTop: 4, fontSize: 11, color: M.primary, fontWeight: 600 }}>Q&A {item.qaMessages.filter(m => m.answer).length}회</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}>
          <button onClick={handleShare} title="공유" style={{ width: 28, height: 28, borderRadius: 8, background: shareDone ? '#ECFDF5' : M.bg, border: `1px solid ${shareDone ? '#6EE7B7' : M.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
            {shareDone ? <CheckIcon size={13} color="#059669" strokeWidth={2.5} /> : <Share2 size={13} color={M.primary} />}
          </button>
          {item.detailLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: M.primary }} />
            : open ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
        </div>
      </button>

      <div style={{ padding: '0 16px 12px', borderTop: `1px solid ${M.border}`, background: M.bgMid }}>
        <div style={{ paddingTop: 10 }}><ScoreBar score={item.score} label={section.group_label} /></div>
      </div>

      {open && (
        <>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${M.border}` }}>
            {item.detailLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--text-tertiary)' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12 }}>고전문헌에서 가족 관계 근거를 찾는 중...</span>
              </div>
            ) : item.detailError ? (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#92400E' }}>상세 분석을 불러오지 못했습니다</span>
                <button onClick={e => { e.stopPropagation(); fetchDetail() }} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, background: '#EA580C', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>다시 시도</button>
              </div>
            ) : item.detail ? (
              <>
                <DetailContent detail={item.detail} label={item.label} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowQA(v => !v)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: showQA ? M.bg : 'var(--bg-surface-3)', border: `1px solid ${showQA ? M.border : 'var(--border-1)'}`, fontSize: 12, fontWeight: 600, color: M.primary, cursor: 'pointer' }}>
                    <MessageCircle size={13} />
                    {showQA ? '질문 닫기' : '이 항목 질문하기'}
                    {item.qaMessages.length > 0 && <span style={{ background: M.primary, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.qaMessages.filter(m => m.answer).length}</span>}
                  </button>
                  <button onClick={handleShare} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, background: shareDone ? '#ECFDF5' : '#FEF9C3', color: shareDone ? '#059669' : '#92400E', border: `1px solid ${shareDone ? '#6EE7B7' : '#FCD34D'}`, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {shareDone ? <><CheckIcon size={13} /> 완료</> : <><Share2 size={13} /> 공유</>}
                  </button>
                </div>
              </>
            ) : null}
          </div>
          {showQA && item.detail && <QAThread item={item} sajuContext={sajuContext} onMessagesUpdate={onMessagesUpdate} />}
        </>
      )}
    </div>
  )
}

export default function FamilyCompatibilityResultScreen() {
  const nav = useNavigate()
  const { state } = useLocation() as { state: { analysisData?: FamilyResult } | null }
  const [result, setResult] = useState<FamilyResult | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!state) { setError('분석 데이터가 없습니다.'); setLoading(false); return }
    if ('analysisData' in state && state.analysisData) {
      const data = state.analysisData
      const initSections: Section[] = data.sections.map(s => ({
        ...s, items: s.items.map(i => ({ ...i, qaMessages: [], qaLoading: false }))
      }))
      setResult(data); setSections(initSections); setLoading(false)
    } else {
      setError('분석 데이터 형식이 올바르지 않습니다.'); setLoading(false)
    }
  }, [])

  const handleDetailLoad = useCallback((itemId: string, content: string | null, error = false) => {
    setSections(prev => prev.map(s => ({
      ...s, items: s.items.map(i =>
        i.id === itemId
          ? error ? { ...i, detailLoading: false, detailLoaded: false, detailError: true }
            : content === '' ? { ...i, detailLoading: true, detailLoaded: false, detailError: false }
              : { ...i, detailLoading: false, detailLoaded: true, detailError: false, detail: content! }
          : i
      ),
    })))
  }, [])

  const handleMessagesUpdate = useCallback((itemId: string, messages: QAMessage[]) => {
    setSections(prev => prev.map(s => ({
      ...s, items: s.items.map(i => i.id === itemId ? { ...i, qaMessages: messages, qaLoading: messages.length > 0 && !messages[messages.length - 1].answer } : i),
    })))
  }, [])

  const totalQA = sections.reduce((s, sec) => s + sec.items.reduce((ss, i) => ss + i.qaMessages.filter(m => m.answer).length, 0), 0)
  const detailedCount = sections.reduce((s, sec) => s + sec.items.filter(i => i.detail).length, 0)
  const sectionScores = sections.flatMap(s => s.items.map(i => i.score)).filter(Boolean)
  const displayScore = sectionScores.length > 0 ? Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length) : result?.overall_score || 0

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="가족궁합 분석" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 20 }}>
        <div style={{ fontSize: 52 }}>👨‍👩‍👧</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: M.text, textAlign: 'center' }}>가족궁합을 분석하고 있습니다</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
          오행 상호작용, 역할 분담, 소통 패턴<br />갈등 요인, 화합 전략을 종합 분석 중...
        </div>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: M.soft }} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="가족궁합 분석" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{error}</div>
        <button onClick={() => nav(-1)} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: M.bg, color: M.text, fontSize: 14, fontWeight: 700, border: `1px solid ${M.border}`, cursor: 'pointer' }}>돌아가기</button>
      </div>
    </div>
  )

  if (!result) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="가족궁합 결과" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        <div style={{ margin: '0 20px 12px', padding: 22, borderRadius: 18, background: M.gradient, border: `1px solid ${M.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: M.textSoft, marginBottom: 6, fontWeight: 600 }}>
            {result.person1_name} x {result.person2_name}
          </div>
          <div style={{ fontSize: 60, fontWeight: 900, color: M.primary, lineHeight: 1 }}>{displayScore}</div>
          <div style={{ fontSize: 12, color: M.textSoft, marginTop: 4, marginBottom: 16 }}>종합 가족궁합 점수</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <ScoreBar score={result.outer_score} label="겉궁합" />
            <ScoreBar score={result.inner_score} label="속궁합" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 20px', marginBottom: 12 }}>
          {detailedCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: M.bg, color: M.textSoft }}>상세 {detailedCount}/{sections.length}</span>}
          {totalQA > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#FFF0F6', color: '#EC4899' }}>Q&A {totalQA}회</span>}
        </div>

        <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${M.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: M.primary, marginBottom: 6 }}>가족궁합 종합 평가</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{result.family_summary}</div>
        </div>

        {detailedCount === 0 && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', borderRadius: 10, background: '#FFF8E1', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 12, color: '#92400E' }}>각 항목 탭 → 상세분석 → 질문하기 (최대 10회)</span>
          </div>
        )}

        {sections.map(section => (
          <SectionCard key={section.group_id} section={section} sajuContext={result.saju_context}
            person1Name={result.person1_name} person2Name={result.person2_name}
            onDetailLoad={handleDetailLoad} onMessagesUpdate={handleMessagesUpdate} />
        ))}

        <button onClick={() => nav('/records')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 20px 20px', padding: '12px 0', borderRadius: 12, background: M.bg, border: `1px solid ${M.border}`, cursor: 'pointer' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: M.primary }}>분석 기록에서 확인하기</span>
          <ArrowUpRight size={14} color={M.primary} />
        </button>
      </div>
    </div>
  )
}
