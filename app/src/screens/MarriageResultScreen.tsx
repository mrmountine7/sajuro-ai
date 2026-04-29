import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Loader2, ChevronDown, ChevronUp, Send, MessageCircle,
  Copy, Check as CheckIcon, ArrowUpRight, Share2,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const MAX_QA_ROUNDS = 10

/* ─── 카카오톡 공유 (Web Share API → 클립보드 폴백) ─── */
async function shareSection(
  sectionLabel: string, score: number,
  detail: string | undefined, qaMessages: QAMessage[],
  person1: string, person2: string,
): Promise<void> {
  const qaBlock = qaMessages
    .filter(m => m.answer)
    .map((m, i) => `\n💬 Q${i + 1}. ${m.question}\n   ${m.answer.slice(0, 100)}${m.answer.length > 100 ? '...' : ''}`)
    .join('\n')

  const text = [
    `💍 결혼궁합 분석 결과`,
    `${person1} × ${person2}`,
    ``,
    `━━━ ${sectionLabel} (${score}점) ━━━`,
    detail ? `\n${detail.slice(0, 200)}${detail.length > 200 ? '...' : ''}` : '',
    qaBlock || '',
    ``,
    `📱 사주로(sajuro.ai)에서 내 결혼궁합을 확인해보세요`,
  ].filter(Boolean).join('\n')

  if (navigator.share) {
    try { await navigator.share({ text }); return } catch {}
  }
  await navigator.clipboard.writeText(text)
  alert('클립보드에 복사되었습니다!\n카카오톡을 열어 붙여넣기 해주세요.')
}

/* ─── 보라색 디자인 토큰 ─── */
const M = {
  primary:   '#7C3AED',
  soft:      '#8B5CF6',
  bg:        '#EDE9FE',
  bgMid:     '#F5F3FF',
  border:    '#DDD6FE',
  text:      '#4C1D95',
  textSoft:  '#6D28D9',
  gradient:  'linear-gradient(135deg, #EDE9FE 0%, #FDF4FF 100%)',
} as const

/* ─── 타입 ─── */
interface QAMessage { question: string; answer: string }

interface SectionItem {
  id: string
  label: string
  summary: string
  score: number
  detail?: string
  detailLoading?: boolean
  detailLoaded?: boolean
  detailError?: boolean
  qaMessages: QAMessage[]
  qaLoading: boolean
}

interface Section {
  group_id: string
  group_label: string
  icon: string
  items: SectionItem[]
}

interface MarriageResult {
  person1_name: string
  person2_name: string
  overall_score: number
  outer_score: number
  inner_score: number
  marriage_summary: string
  saju_context: string
  sections: Section[]
}

/* ─── 점수 색상 ─── */
function scoreColor(s: number) {
  return s >= 80 ? '#059669' : s >= 65 ? M.soft : s >= 50 ? '#D97706' : '#DC2626'
}
function scoreLabel(s: number) {
  return s >= 80 ? '매우 좋음' : s >= 65 ? '좋음' : s >= 50 ? '보통' : '주의 필요'
}

/* ─── 점수 바 ─── */
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

/* ─── 복사 버튼 포함 상세 내용 ─── */
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

/* ─── Q&A 스레드 ─── */
function QAThread({ item, analysisId, sajuContext, onMessagesUpdate }: {
  item: SectionItem; analysisId: string | null
  sajuContext: string; onMessagesUpdate: (id: string, msgs: QAMessage[]) => void
}) {
  const [input, setInput] = useState('')
  const latestAnswerRef = useRef<HTMLDivElement>(null)
  const prevAnsweredCountRef = useRef(item.qaMessages.filter(m => m.answer).length)
  const roundNumber = item.qaMessages.filter(m => m.answer).length + 1
  const canAsk = roundNumber <= MAX_QA_ROUNDS && !item.qaLoading

  useLayoutEffect(() => {
    const current = item.qaMessages.filter(m => m.answer).length
    if (current > prevAnsweredCountRef.current) {
      prevAnsweredCountRef.current = current
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
          item_id: `marriage_${item.id}`,
          item_label: item.label,
          saju_context: sajuContext,
          item_detail: item.detail || '',
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
    requestAnimationFrame(() => latestAnswerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
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
              <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', background: M.primary, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
                {msg.question}
              </div>
            </div>
            {msg.answer ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div ref={isLast ? latestAnswerRef : null} style={{ maxWidth: '90%', padding: '10px 12px', borderRadius: '2px 12px 12px 12px', background: 'var(--bg-surface)', border: `1px solid ${M.border}`, fontSize: 13, color: M.text, lineHeight: 1.7 }}>
                  {msg.answer}
                </div>
              </div>
            ) : (
              <div ref={isLast ? latestAnswerRef : null} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', color: 'var(--text-tertiary)' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11 }}>결혼궁합 전문가가 답변을 작성하고 있습니다...</span>
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
            placeholder={`${item.label}에 대해 궁금한 점...`}
            disabled={!canAsk}
            style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${M.border}`, background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || !canAsk} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && canAsk ? M.primary : 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && canAsk ? 'pointer' : 'default' }}>
            <Send size={14} color={input.trim() && canAsk ? '#fff' : 'var(--text-tertiary)'} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── 섹션 카드 ─── */
function SectionCard({ section, sajuContext, analysisId, person1Name, person2Name, onDetailLoad, onMessagesUpdate }: {
  section: Section; sajuContext: string; analysisId: string | null
  person1Name: string; person2Name: string
  onDetailLoad: (id: string, content: string | null, error?: boolean) => void
  onMessagesUpdate: (id: string, msgs: QAMessage[]) => void
}) {
  const item = section.items[0]
  const [open, setOpen] = useState(false)
  const [showQA, setShowQA] = useState(item.qaMessages.length > 0)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareDone, setShareDone] = useState(false)
  const fetchingRef = useRef(false)
  const sc = scoreColor(item.score)

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    setShareLoading(true)
    try {
      await shareSection(section.group_label, item.score, item.detail, item.qaMessages, person1Name, person2Name)
      setShareDone(true)
      setTimeout(() => setShareDone(false), 2500)
    } finally {
      setShareLoading(false)
    }
  }

  const fetchDetail = useCallback(async () => {
    if (item.detailLoading || fetchingRef.current) return
    fetchingRef.current = true
    onDetailLoad(item.id, '')
    try {
      const res = await fetch(`${API_BASE}/api/marriage/detail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saju_context: sajuContext, item_id: item.id, item_label: item.label }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      onDetailLoad(item.id, data.content)
    } catch {
      onDetailLoad(item.id, null, true)
    } finally {
      fetchingRef.current = false
    }
  }, [item.id, item.label, item.detailLoading, sajuContext, onDetailLoad])

  const handleToggle = useCallback(async () => {
    const next = !open
    setOpen(next)
    if (!next || item.detail || item.detailLoading || fetchingRef.current) return
    await fetchDetail()
  }, [open, item.detail, item.detailLoading, fetchDetail])

  useEffect(() => { if (item.qaMessages.length > 0) setShowQA(true) }, [item.qaMessages.length])

  return (
    <div style={{ margin: '0 20px 14px', borderRadius: 16, background: 'var(--bg-surface)', border: `1px solid ${open ? M.border : 'var(--border-1)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      {/* 섹션 헤더 버튼 */}
      <button onClick={handleToggle} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--bg-surface)', textAlign: 'left' }}>
        {/* 아이콘 */}
        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: M.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {section.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{section.group_label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: sc }}>{item.score}점</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: M.bg, color: M.textSoft }}>{scoreLabel(item.score)}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.summary}</div>
          {!item.detail && !open && (
            <div style={{ marginTop: 5, fontSize: 11, color: M.soft, fontWeight: 600 }}>탭해서 상세 분석 보기 ›</div>
          )}
          {item.qaMessages.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: M.primary, fontWeight: 600 }}>💬 Q&A {item.qaMessages.filter(m => m.answer).length}회</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 2 }}>
          {/* 공유 버튼 */}
          <button
            onClick={handleShare}
            disabled={shareLoading}
            title="카카오톡으로 공유"
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: shareDone ? '#ECFDF5' : M.bg,
              border: `1px solid ${shareDone ? '#6EE7B7' : M.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {shareDone
              ? <CheckIcon size={13} color="#059669" strokeWidth={2.5} />
              : <Share2 size={13} color={M.primary} />}
          </button>
          {item.detailLoading
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: M.primary }} />
            : open ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
        </div>
      </button>

      {/* 점수 바 */}
      <div style={{ padding: '0 16px 12px', borderTop: `1px solid ${M.border}`, background: M.bgMid }}>
        <div style={{ paddingTop: 10 }}>
          <ScoreBar score={item.score} label={section.group_label} />
        </div>
      </div>

      {/* 상세 내용 */}
      {open && (
        <>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${M.border}` }}>
            {item.detailLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--text-tertiary)' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12 }}>고전문헌에서 결혼 관점 근거를 찾는 중...</span>
              </div>
            ) : item.detailError ? (
              <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#92400E' }}>상세 분석을 불러오지 못했습니다</span>
                <button onClick={e => { e.stopPropagation(); fetchDetail() }} style={{ flexShrink: 0, padding: '4px 10px', borderRadius: 8, background: '#EA580C', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>다시 시도</button>
              </div>
            ) : item.detail ? (
              <>
                <DetailContent detail={item.detail} label={item.label} />
                {/* 질문하기 + 공유 버튼 행 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowQA(v => !v)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: showQA ? M.bg : 'var(--bg-surface-3)', border: `1px solid ${showQA ? M.border : 'var(--border-1)'}`, fontSize: 12, fontWeight: 600, color: M.primary, cursor: 'pointer' }}>
                    <MessageCircle size={13} />
                    {showQA ? '질문 닫기' : '이 항목 질문하기'}
                    {item.qaMessages.length > 0 && (
                      <span style={{ background: M.primary, color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.qaMessages.filter(m => m.answer).length}
                      </span>
                    )}
                  </button>
                  {/* 카카오 공유 버튼 (detail 있을 때만) */}
                  <button
                    onClick={handleShare}
                    disabled={shareLoading}
                    style={{
                      flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                      padding: '6px 14px', borderRadius: 8,
                      background: shareDone ? '#ECFDF5' : '#FEF9C3',
                      color: shareDone ? '#059669' : '#92400E',
                      border: `1px solid ${shareDone ? '#6EE7B7' : '#FCD34D'}`,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {shareDone
                      ? <><CheckIcon size={13} /> 완료</>
                      : <><Share2 size={13} /> 공유</>}
                  </button>
                </div>
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

/* ─── 메인 화면 ─── */
export default function MarriageResultScreen() {
  const nav = useNavigate()
  const { state } = useLocation() as {
    state: {
      analysisData?: MarriageResult
      analysisId?: string
    } | null
  }

  const [result, setResult] = useState<MarriageResult | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!state) { setError('분석 데이터가 없습니다.'); setLoading(false); return }

    /* ── 기존 기록 다시 보기 ── */
    if ('analysisId' in state && state.analysisId) {
      async function loadExisting() {
        try {
          if (!supabase) throw new Error('Supabase 미연결')
          const { data: aData, error: aErr } = await supabase
            .from('precision_analyses')
            .select('*')
            .eq('id', (state as any).analysisId)
            .single()
          if (aErr || !aData) throw new Error('분석 기록을 찾을 수 없습니다.')

          const { data: qaData } = await supabase
            .from('precision_qa')
            .select('item_id, question, answer')
            .eq('analysis_id', (state as any).analysisId)
            .order('created_at', { ascending: true })

          const qaByItem: Record<string, QAMessage[]> = {}
          if (qaData) {
            for (const qa of qaData as any[]) {
              // marriage_ prefix 제거
              const realId = qa.item_id?.replace(/^marriage_/, '') || qa.item_id
              if (!qaByItem[realId]) qaByItem[realId] = []
              if (qa.answer) qaByItem[realId].push({ question: qa.question, answer: qa.answer })
            }
          }

          let rawSections = aData.sections
          if (typeof rawSections === 'string') rawSections = JSON.parse(rawSections)
          const merged: Section[] = (rawSections || []).map((s: any) => ({
            ...s,
            items: (s.items || []).map((i: any) => ({
              ...i,
              qaMessages: qaByItem[i.id] || i.qaMessages || [],
              qaLoading: false,
            }))
          }))

          setResult({
            person1_name: aData.profile_name?.split(' × ')?.[0] || '',
            person2_name: aData.profile_name?.split(' × ')?.[1]?.replace(' 결혼궁합', '') || '',
            overall_score: 0,
            outer_score: 0,
            inner_score: 0,
            marriage_summary: aData.saju_summary,
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

    /* ── 새 분석 결과 표시 ── */
    if ('analysisData' in state && state.analysisData) {
      const data = state.analysisData
      const initSections: Section[] = data.sections.map(s => ({
        ...s,
        items: s.items.map(i => ({ ...i, qaMessages: [], qaLoading: false }))
      }))
      setResult(data)
      setSections(initSections)
      setLoading(false)

      // 자동 저장
      async function autoSave() {
        try {
          const kakaoUser = await getUser()
          const res = await fetch(`${API_BASE}/api/saju/precision/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_id: getDeviceId(),
              user_id: kakaoUser?.id || null,
              profile_name: `${data.person1_name} × ${data.person2_name} 결혼궁합`,
              saju_context: data.saju_context,
              saju_summary: data.marriage_summary,
              sections: initSections,
              selected_items: Object.keys({
                spouse_palace: 1, home_life: 1, values_life: 1,
                wealth_economy: 1, parenting_family: 1, time_axis: 1,
              }),
            }),
          })
          const saveData = await res.json()
          if (saveData.id) { setAnalysisId(saveData.id); setSaved(true) }
        } catch (e) { console.warn('[MarriageResult] 저장 실패:', e) }
      }
      autoSave()
    } else {
      setError('분석 데이터 형식이 올바르지 않습니다.')
      setLoading(false)
    }
  }, [])

  /* ─── 상세 내용 업데이트 ─── */
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

  /* ─── Q&A 업데이트 + DB 저장 ─── */
  const handleMessagesUpdate = useCallback((itemId: string, messages: QAMessage[]) => {
    const isLoading = messages.length > 0 && !messages[messages.length - 1].answer
    setSections(prev => {
      const updated = prev.map(s => ({
        ...s,
        items: s.items.map(i => i.id === itemId ? { ...i, qaMessages: messages, qaLoading: isLoading } : i),
      }))
      if (!isLoading && analysisId && supabase) {
        supabase.from('precision_analyses')
          .update({ sections: JSON.stringify(updated) })
          .eq('id', analysisId)
          .then(() => {}).catch(e => console.warn('[MarriageResult]', e))
      }
      return updated
    })
  }, [analysisId])

  const totalQA = sections.reduce((s, sec) => s + sec.items.reduce((ss, i) => ss + i.qaMessages.filter(m => m.answer).length, 0), 0)
  const detailedCount = sections.reduce((s, sec) => s + sec.items.filter(i => i.detail).length, 0)
  const sectionScores = sections.flatMap(s => s.items.map(i => i.score)).filter(Boolean)
  const displayScore = sectionScores.length > 0
    ? Math.round(sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length)
    : result?.overall_score || 0

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="결혼궁합 분석" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 20 }}>
        <div style={{ fontSize: 52 }}>💍</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: M.text, textAlign: 'center' }}>결혼궁합을 분석하고 있습니다</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
          배우자궁, 가정생활, 가치관, 경제관<br/>부모 역할, 시간축을 종합 분석 중...
        </div>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: M.primary }} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="결혼궁합 분석" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{error}</div>
        <button onClick={() => nav(-1)} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: M.bg, color: M.text, fontSize: 14, fontWeight: 700, border: `1px solid ${M.border}`, cursor: 'pointer' }}>돌아가기</button>
      </div>
    </div>
  )

  if (!result) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="결혼궁합 결과" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 종합 점수 카드 ─── */}
        <div style={{ margin: '0 20px 12px', padding: 22, borderRadius: 18, background: M.gradient, border: `1px solid ${M.border}`, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: M.textSoft, marginBottom: 6, fontWeight: 600 }}>
            {result.person1_name} 💍 {result.person2_name}
          </div>
          <div style={{ fontSize: 60, fontWeight: 900, color: M.primary, lineHeight: 1 }}>
            {displayScore}
          </div>
          <div style={{ fontSize: 12, color: M.textSoft, marginTop: 4, marginBottom: 16 }}>종합 결혼궁합 점수</div>

          <div style={{ display: 'flex', gap: 12 }}>
            <ScoreBar score={result.outer_score} label="겉궁합" />
            <ScoreBar score={result.inner_score} label="속궁합" />
          </div>
        </div>

        {/* ─── 상태 배지 ─── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 20px', marginBottom: 12 }}>
          {saved && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#ECFDF5', color: '#065F46' }}>✅ 저장됨</span>}
          {detailedCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: M.bg, color: M.textSoft }}>📖 {detailedCount}/{sections.length} 상세</span>}
          {totalQA > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#FFF0F6', color: '#EC4899' }}>💬 Q&A {totalQA}회</span>}
        </div>

        {/* ─── 결혼 총평 ─── */}
        <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${M.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: M.primary, marginBottom: 6 }}>💍 결혼궁합 종합 평가</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{result.marriage_summary}</div>
        </div>

        {/* ─── 안내 ─── */}
        {detailedCount === 0 && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', borderRadius: 10, background: '#FFF8E1', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 12, color: '#92400E' }}>💡 각 항목 탭 → 상세분석 → 질문하기 (최대 10회)</span>
          </div>
        )}

        {/* ─── 섹션 카드 목록 ─── */}
        {sections.map(section => (
          <SectionCard
            key={section.group_id}
            section={section}
            sajuContext={result.saju_context}
            analysisId={analysisId}
            person1Name={result.person1_name}
            person2Name={result.person2_name}
            onDetailLoad={handleDetailLoad}
            onMessagesUpdate={handleMessagesUpdate}
          />
        ))}

        {/* ─── 분석 기록 바로가기 ─── */}
        {saved && (
          <button
            onClick={() => nav('/records')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 20px 20px', padding: '12px 0', borderRadius: 12, background: M.bg, border: `1px solid ${M.border}`, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: M.primary }}>분석 기록에서 확인하기</span>
            <ArrowUpRight size={14} color={M.primary} />
          </button>
        )}
      </div>
    </div>
  )
}
