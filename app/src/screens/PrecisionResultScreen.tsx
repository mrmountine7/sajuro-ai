import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ChevronDown, ChevronUp, Send, MessageCircle, Copy, Check as CheckIcon } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const MAX_QA_ROUNDS = 10

interface QAMessage { question: string; answer: string }

interface SummaryItem {
  id: string
  label: string
  summary: string
  detail?: string
  detailLoading?: boolean
  detailLoaded?: boolean
  detailError?: boolean
  qaMessages: QAMessage[]
  qaLoading: boolean
}

interface SummarySection {
  group_id: string
  group_label: string
  icon: string
  items: SummaryItem[]
}

interface SummaryResult {
  name: string
  saju_summary: string
  saju_context: string
  sections: SummarySection[]
}

/* ─── 상세 내용 + 복사 버튼 ─── */
function DetailContent({ detail, label }: { detail: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`[${label}]\n\n${detail}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 미지원 시 fallback
      const el = document.createElement('textarea')
      el.value = `[${label}]\n\n${detail}`
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', padding: '10px 14px', paddingRight: 36, borderRadius: 10, background: '#F8F9FF', border: '1px solid #E0E7FF' }}>
        {detail}
      </div>
      <button
        onClick={handleCopy}
        title="내용 복사"
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 26, height: 26, borderRadius: 6,
          background: copied ? '#ECFDF5' : 'var(--bg-surface)',
          border: `1px solid ${copied ? '#6EE7B7' : 'var(--border-2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        {copied
          ? <CheckIcon size={13} color="#059669" strokeWidth={2.5} />
          : <Copy size={13} color="var(--text-tertiary)" />}
      </button>
    </div>
  )
}

/* ─── Q&A 스레드 ─── */
function QAThread({ item, analysisId, sajuContext, onMessagesUpdate }: {
  item: SummaryItem; analysisId: string | null
  sajuContext: string; onMessagesUpdate: (id: string, msgs: QAMessage[]) => void
}) {
  const [input, setInput] = useState('')
  const latestAnswerRef = useRef<HTMLDivElement>(null)
  // 답변 완료 건수를 추적해 새 답변 도착 시점을 감지
  const prevAnsweredCountRef = useRef(item.qaMessages.filter(m => m.answer).length)
  const roundNumber = item.qaMessages.filter(m => m.answer).length + 1
  const canAsk = roundNumber <= MAX_QA_ROUNDS && !item.qaLoading

  // 새 답변이 도착하면 해당 답변 버블을 화면 중앙으로 스크롤
  useLayoutEffect(() => {
    const currentCount = item.qaMessages.filter(m => m.answer).length
    if (currentCount > prevAnsweredCountRef.current) {
      prevAnsweredCountRef.current = currentCount
      latestAnswerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          device_id: getDeviceId(),
          item_id: item.id, item_label: item.label,
          saju_context: sajuContext,
          item_detail: item.detail || '',
          conversation_history: item.qaMessages.filter(m => m.answer),
          question: q, round_number: roundNumber,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || '오류')
      const done = pending.map((m, i) =>
        i === pending.length - 1 ? { ...m, answer: data.answer } : m
      )
      onMessagesUpdate(item.id, done)
    } catch (e) {
      const err = pending.map((m, i) =>
        i === pending.length - 1 ? { ...m, answer: `답변 오류: ${e}` } : m
      )
      onMessagesUpdate(item.id, err)
    }
    // 질문 전송 직후: 로딩 스피너가 보이도록 아래로 스크롤
    requestAnimationFrame(() => {
      latestAnswerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  }

  return (
    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-1)', background: '#FAFBFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0 8px' }}>
        <MessageCircle size={13} color="#6366F1" />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6366F1' }}>질문하기</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {item.qaMessages.filter(m => m.answer).length}/{MAX_QA_ROUNDS}회
        </span>
      </div>
      {item.qaMessages.map((msg, i) => {
        const isLast = i === item.qaMessages.length - 1
        return (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', background: '#6366F1', color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
                {msg.question}
              </div>
            </div>
            {msg.answer ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                {/* 가장 마지막 답변 버블에 ref 부착 → 도착 시 화면 중앙으로 */}
                <div
                  ref={isLast ? latestAnswerRef : null}
                  style={{ maxWidth: '90%', padding: '10px 12px', borderRadius: '2px 12px 12px 12px', background: 'var(--bg-surface)', border: '1px solid #C7D2FE', fontSize: 13, color: '#4338CA', lineHeight: 1.7 }}
                >
                  {msg.answer}
                </div>
              </div>
            ) : (
              /* 로딩 스피너에도 ref — 질문 전송 직후 스피너를 화면에 보이게 */
              <div ref={isLast ? latestAnswerRef : null} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', color: 'var(--text-tertiary)' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11 }}>AI사주가가 답변을 작성하고 있습니다...</span>
              </div>
            )}
          </div>
        )
      })}
      {roundNumber > MAX_QA_ROUNDS ? (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FFF8E1', fontSize: 12, color: '#92400E', textAlign: 'center' }}>10회 질문이 완료되었습니다</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`${item.label}에 대해 궁금한 점...`}
            disabled={!canAsk}
            style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: '1.5px solid var(--border-accent)', background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || !canAsk} style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: input.trim() && canAsk ? '#6366F1' : 'var(--bg-surface-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none',
            cursor: input.trim() && canAsk ? 'pointer' : 'default',
          }}>
            <Send size={14} color={input.trim() && canAsk ? '#fff' : 'var(--text-tertiary)'} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── 항목 카드 ─── */
function ItemCard({ item, sajuContext, profile, analysisId, onDetailLoad, onMessagesUpdate }: {
  item: SummaryItem; sajuContext: string; profile: any
  analysisId: string | null
  onDetailLoad: (id: string, content: string | null, error?: boolean) => void
  onMessagesUpdate: (id: string, msgs: QAMessage[]) => void
}) {
  // 이미 detail이 있으면 열려 있는 상태로 시작 (재마운트 후에도 유지)
  const [open, setOpen] = useState(!!item.detail)
  const [showQA, setShowQA] = useState(item.qaMessages.length > 0)
  // fetchRef: 동일 컴포넌트 생애 동안 중복 호출 방지
  const fetchingRef = useRef(false)

  const fetchDetail = useCallback(async () => {
    if (item.detailLoading || fetchingRef.current) return
    fetchingRef.current = true
    onDetailLoad(item.id, '')
    try {
      const res = await fetch(`${API_BASE}/api/saju/precision/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(profile ?? {}), item_id: item.id, saju_context: sajuContext }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      onDetailLoad(item.id, data.content)
    } catch (e) {
      onDetailLoad(item.id, null, true)
    } finally {
      fetchingRef.current = false
    }
  }, [item.detail, item.detailLoading, item.id, sajuContext, profile, onDetailLoad])

  const handleOpen = useCallback(async () => {
    const next = !open
    setOpen(next)
    // 이미 detail이 있거나 로딩 중이면 재호출 안 함
    if (!next || item.detail || item.detailLoading || fetchingRef.current) return
    await fetchDetail()
  }, [open, item.detail, item.detailLoading, fetchDetail])

  // item.detail이 로드되면 Q&A가 있었던 경우 자동으로 QA 패널 열기
  useEffect(() => {
    if (item.qaMessages.length > 0) setShowQA(true)
  }, [item.qaMessages.length])

  return (
    <div style={{ borderBottom: '1px solid var(--border-1)' }}>
      <button onClick={handleOpen} style={{
        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '13px 16px', background: 'var(--bg-surface)', textAlign: 'left',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366F1', flexShrink: 0, marginTop: 6 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{item.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.summary}</div>
          {!item.detail && !open && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#6366F1', fontWeight: 600 }}>탭해서 상세 분석 보기 ›</div>
          )}
          {item.qaMessages.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#EC4899', fontWeight: 600 }}>💬 Q&A {item.qaMessages.filter(m => m.answer).length}회</div>
          )}
        </div>
        <div style={{ flexShrink: 0, marginTop: 2 }}>
          {item.detailLoading
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#6366F1' }} />
            : open ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
        </div>
      </button>

      {open && (
        <>
          <div style={{ padding: '0 16px 12px 28px' }}>
            {item.detailLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--text-tertiary)' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12 }}>고전문헌에서 근거를 찾는 중...</span>
              </div>
            ) : item.detailError ? (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#92400E' }}>상세 분석을 불러오지 못했습니다</span>
                <button
                  onClick={(e) => { e.stopPropagation(); fetchDetail() }}
                  style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, background: '#EA580C', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  다시 시도
                </button>
              </div>
            ) : item.detail ? (
              <>
                <DetailContent detail={item.detail} label={item.label} />

                <button onClick={() => setShowQA(v => !v)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                  background: showQA ? '#EEF2FF' : 'var(--bg-surface-3)', border: '1px solid var(--border-1)',
                  fontSize: 12, fontWeight: 600, color: '#6366F1', cursor: 'pointer',
                }}>
                  <MessageCircle size={13} />
                  {showQA ? '질문 닫기' : '이 항목에 대해 질문하기'}
                  {item.qaMessages.length > 0 && (
                    <span style={{ background: '#6366F1', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {item.qaMessages.filter(m => m.answer).length}
                    </span>
                  )}
                </button>
              </>
            ) : null}
          </div>
          {showQA && item.detail && (
            <QAThread item={item} analysisId={analysisId} sajuContext={sajuContext} onMessagesUpdate={onMessagesUpdate} />
          )}
        </>
      )}
    </div>
  )
}

/* ─── 섹션 카드 ─── */
function SectionCard({ section, sajuContext, profile, analysisId, onDetailLoad, onMessagesUpdate }: {
  section: SummarySection; sajuContext: string; profile: any; analysisId: string | null
  onDetailLoad: (id: string, content: string | null, error?: boolean) => void
  onMessagesUpdate: (id: string, msgs: QAMessage[]) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const loadedCount = section.items.filter(i => i.detailLoaded || i.detail).length
  const qaCount = section.items.reduce((s, i) => s + i.qaMessages.filter(m => m.answer).length, 0)

  return (
    <div style={{ marginBottom: 10, borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', overflow: 'hidden' }}>
      <button onClick={() => setCollapsed(v => !v)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
        background: 'var(--bg-surface)', textAlign: 'left',
        borderBottom: collapsed ? 'none' : '1px solid var(--border-1)',
      }}>
        <span style={{ fontSize: 18 }}>{section.icon}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{section.group_label}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {loadedCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: '#EEF2FF', color: '#6366F1' }}>
              {loadedCount}/{section.items.length}
            </span>
          )}
          {qaCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: '#FFF0F6', color: '#EC4899' }}>
              Q&A {qaCount}
            </span>
          )}
        </div>
        {collapsed ? <ChevronDown size={15} color="var(--text-tertiary)" /> : <ChevronUp size={15} color="var(--text-tertiary)" />}
      </button>
      {!collapsed && section.items.map(item => (
        <ItemCard key={item.id} item={item} sajuContext={sajuContext} profile={profile}
          analysisId={analysisId} onDetailLoad={onDetailLoad} onMessagesUpdate={onMessagesUpdate} />
      ))}
    </div>
  )
}

/* ─── 메인 화면 ─── */
export default function PrecisionResultScreen() {
  const nav = useNavigate()
  const { state } = useLocation() as {
    state: ({ profile: any; selectedItems: string[] } | { analysisId: string }) | null
  }
  const [result, setResult] = useState<SummaryResult | null>(null)
  const [sections, setSections] = useState<SummarySection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [profileForQA, setProfileForQA] = useState<any>(null)

  useEffect(() => {
    if (!state) { setError('분석 데이터가 없습니다.'); setLoading(false); return }

    // ─── 기존 분석 불러오기 ───
    if ('analysisId' in state) {
      async function loadExisting() {
        try {
          if (!supabase) throw new Error('Supabase 미연결')
          // 분석 결과 로드
          const { data: aData, error: aErr } = await supabase
            .from('precision_analyses')
            .select('*')
            .eq('id', (state as any).analysisId)
            .single()
          if (aErr || !aData) throw new Error('분석 기록을 찾을 수 없습니다.')

          // Q&A 로드
          const { data: qaData } = await supabase
            .from('precision_qa')
            .select('item_id, question, answer, round_number')
            .eq('analysis_id', (state as any).analysisId)
            .order('created_at', { ascending: true })

          // Q&A를 itemId별로 그룹핑
          const qaByItem: Record<string, QAMessage[]> = {}
          if (qaData) {
            for (const qa of qaData) {
              if (qa.item_id) {
                if (!qaByItem[qa.item_id]) qaByItem[qa.item_id] = []
                if (qa.answer) qaByItem[qa.item_id].push({ question: qa.question, answer: qa.answer })
              }
            }
          }

          // sections 복원 + Q&A 병합
          let rawSections = aData.sections
          if (typeof rawSections === 'string') rawSections = JSON.parse(rawSections)
          const merged: SummarySection[] = (rawSections || []).map((s: any) => ({
            ...s,
            items: (s.items || []).map((i: any) => ({
              ...i,
              qaMessages: qaByItem[i.id] || i.qaMessages || [],
              qaLoading: false,
            }))
          }))

          setResult({
            name: aData.profile_name,
            saju_summary: aData.saju_summary,
            saju_context: aData.saju_context,
            sections: merged,
          })
          setSections(merged)
          setAnalysisId((state as any).analysisId)
          setSaved(true)
        } catch (e) {
          setError(`분석 기록 불러오기 실패: ${e instanceof Error ? e.message : String(e)}`)
        } finally {
          setLoading(false)
        }
      }
      loadExisting()
      return
    }

    // ─── 새 분석 ───
    const { profile, selectedItems } = state as { profile: any; selectedItems: string[] }
    setProfileForQA(profile)

    async function fetchSummary() {
      try {
        const res = await fetch(`${API_BASE}/api/saju/precision/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...profile, selected_items: selectedItems }),
        })
        if (!res.ok) throw new Error(`API 오류: ${res.status}`)
        const data: SummaryResult = await res.json()
        setResult(data)

        const initSections: SummarySection[] = data.sections.map(s => ({
          ...s,
          items: s.items.map(i => ({ ...i, qaMessages: [], qaLoading: false })),
        }))
        setSections(initSections)

        // 자동 저장
        const kakaoUser = await getUser()
        const saveRes = await fetch(`${API_BASE}/api/saju/precision/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: getDeviceId(), user_id: kakaoUser?.id || null,
            profile_name: data.name, saju_context: data.saju_context,
            saju_summary: data.saju_summary, sections: initSections,
            selected_items: selectedItems,
          }),
        })
        const saveData = await saveRes.json()
        if (saveData.id) { setAnalysisId(saveData.id); setSaved(true) }
      } catch (e) {
        setError(`분석 오류: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  // 상세 내용 업데이트 (content=null + error=true 이면 에러 상태)
  const handleDetailLoad = useCallback((itemId: string, content: string | null, error = false) => {
    setSections(prev => prev.map(s => ({
      ...s,
      items: s.items.map(i =>
        i.id === itemId
          ? error
            ? { ...i, detailLoading: false, detailLoaded: false, detailError: true }
            : content === ''
              ? { ...i, detailLoading: true, detailLoaded: false, detailError: false }
              : { ...i, detailLoading: false, detailLoaded: true, detailError: false, detail: content! }
          : i
      ),
    })))
  }, [])

  // Q&A 업데이트 + DB 저장
  const handleMessagesUpdate = useCallback((itemId: string, messages: QAMessage[]) => {
    const isLoading = messages.length > 0 && !messages[messages.length - 1].answer
    setSections(prev => {
      const updated = prev.map(s => ({
        ...s,
        items: s.items.map(i =>
          i.id === itemId ? { ...i, qaMessages: messages, qaLoading: isLoading } : i
        ),
      }))
      // Q&A 완료 시 sections 업데이트
      if (!isLoading && analysisId && supabase) {
        void (async () => {
          try {
            await supabase.from('precision_analyses')
              .update({ sections: JSON.stringify(updated) })
              .eq('id', analysisId)
          } catch (e) { console.warn('[PrecisionResult]', e) }
        })()
      }
      return updated
    })
  }, [analysisId])

  const totalItems = sections.reduce((s, g) => s + g.items.length, 0)
  const detailedCount = sections.reduce((s, g) => s + g.items.filter(i => i.detail).length, 0)
  const totalQA = sections.reduce((s, g) => s + g.items.reduce((ss, i) => ss + i.qaMessages.filter(m => m.answer).length, 0), 0)
  const profileData = profileForQA || ('profile' in (state || {}) ? (state as any).profile : null)

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="사주 정밀분석" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 20 }}>
        <div style={{ fontSize: 52 }}>🔮</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
          {'analysisId' in (state || {}) ? '분석 기록을 불러오고 있습니다' : '사주를 정밀 분석하고 있습니다'}
        </div>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366F1' }} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="사주 정밀분석" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{error}</div>
        <button onClick={() => nav(-1)} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: 'var(--bg-accent)', color: '#1F2937', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>돌아가기</button>
      </div>
    </div>
  )

  if (!result) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="사주 정밀분석" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* 요약 카드 */}
        <div style={{ margin: '0 20px 10px', padding: '18px 18px', borderRadius: 16, background: 'linear-gradient(135deg, #EEF2FF 0%, #FFF8E1 100%)', border: '1px solid #E0E7FF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 32 }}>🔮</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{result.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{totalItems}개 항목 · 탭 → 상세분석 · 상세 후 질문 가능</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.saju_summary}</div>
        </div>

        {/* 상태 배지 */}
        <div style={{ margin: '0 20px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {saved && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#ECFDF5', color: '#065F46' }}>✅ 저장됨</span>}
          {detailedCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#EEF2FF', color: '#6366F1' }}>📖 {detailedCount}/{totalItems} 상세</span>}
          {totalQA > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#FFF0F6', color: '#EC4899' }}>💬 Q&A {totalQA}회</span>}
        </div>

        {/* 안내 */}
        {detailedCount === 0 && (
          <div style={{ margin: '0 20px 10px', padding: '10px 14px', borderRadius: 10, background: '#FFF8E1', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 12, color: '#92400E' }}>💡 항목 탭 → 상세분석 → 질문하기 (최대 10회, 앱 재접속 후에도 이어서 가능)</span>
          </div>
        )}

        {/* 섹션 */}
        <div style={{ padding: '0 20px' }}>
          {sections.map(section => (
            <SectionCard key={section.group_id} section={section}
              sajuContext={result.saju_context} profile={profileData}
              analysisId={analysisId}
              onDetailLoad={handleDetailLoad} onMessagesUpdate={handleMessagesUpdate} />
          ))}
        </div>
      </div>
    </div>
  )
}
