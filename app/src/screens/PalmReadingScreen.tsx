import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Camera, Upload, ChevronDown, ChevronUp, Send, MessageCircle } from 'lucide-react'
import Header from '@/components/layout/Header'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const MAX_QA = 5

/* ─── 디자인 토큰 (따뜻한 로즈골드/스킨) ─── */
const P = {
  primary:  '#C2185B',
  soft:     '#E91E8C',
  bg:       '#FFF0F6',
  bgMid:    '#FCE4EC',
  border:   '#F48FB1',
  text:     '#880E4F',
  textSoft: '#AD1457',
  gradient: 'linear-gradient(135deg, #C2185B 0%, #880E4F 100%)',
} as const

/* ─── 점수 색상 ─── */
function scoreColor(s: number) {
  return s >= 80 ? '#059669' : s >= 65 ? '#2563EB' : s >= 50 ? '#D97706' : '#DC2626'
}

/* ─── 타입 ─── */
interface LineData { score: number; features: string; analysis: string; keywords: string[] }
interface PalmResult {
  reading_id: string | null
  overall_score: number
  overall_summary: string
  life_line: LineData
  heart_line: LineData
  head_line: LineData
  fate_line: LineData
  finance_line: LineData
  minor_signs: string
  vitality_score: number; emotion_score: number; intellect_score: number; fortune_score: number
  personality: string; love_tendency: string; career_tendency: string; health_tendency: string
  lucky_keywords: string[]
}

interface QAMessage { question: string; answer: string }

/* ─── 점수 바 ─── */
function ScoreBar({ label, score, emoji }: { label: string; score: number; emoji: string }) {
  const c = scoreColor(score)
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 15 }}>{emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: c }}>{score}점</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--border-1)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', borderRadius: 3, background: c, transition: 'width 0.7s ease' }} />
      </div>
    </div>
  )
}

/* ─── 손금선 카드 ─── */
const LINE_META: Record<string, { label: string; emoji: string; desc: string; section: string }> = {
  life_line:    { label: '생명선(生命線)', emoji: '🌱', desc: '건강·생명력·활력', section: 'life' },
  heart_line:   { label: '감정선(感情線)', emoji: '❤️', desc: '애정·감성·인간관계', section: 'heart' },
  head_line:    { label: '지능선(知能線)', emoji: '🧠', desc: '지성·사고력·판단', section: 'head' },
  fate_line:    { label: '운명선(運命線)', emoji: '⭐', desc: '사회운·직업·성취', section: 'fate' },
  finance_line: { label: '재물선(財物線)', emoji: '💰', desc: '금전운·재물·사업', section: 'finance' },
}

function LineCard({ lineKey, data, readingId, sajuContext }: {
  lineKey: string; data: LineData; readingId: string | null; sajuContext: string
}) {
  const meta = LINE_META[lineKey]
  const [open, setOpen] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([])
  const [input, setInput] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const latestRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const sc = scoreColor(data.score)

  useLayoutEffect(() => {
    const cur = qaMessages.filter(m => m.answer).length
    if (cur > prevCountRef.current) {
      prevCountRef.current = cur
      latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [qaMessages])

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || qaLoading || qaMessages.filter(m => m.answer).length >= MAX_QA) return
    setInput('')
    const pending = [...qaMessages, { question: q, answer: '' }]
    setQaMessages(pending)
    setQaLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/palm/qa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading_id: readingId || '',
          device_id: getDeviceId(),
          section: meta.section,
          question: q,
          round_number: pending.length,
          context: `${meta.label}: ${data.features}\n${data.analysis}`,
        }),
      })
      const d = await res.json()
      setQaMessages(pending.map((m, i) =>
        i === pending.length - 1 ? { ...m, answer: d.answer } : m
      ))
    } catch {
      setQaMessages(pending.map((m, i) =>
        i === pending.length - 1 ? { ...m, answer: '답변 오류가 발생했습니다.' } : m
      ))
    } finally {
      setQaLoading(false)
    }
    requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  }, [input, qaMessages, qaLoading, readingId, meta, data])

  return (
    <div style={{ marginBottom: 10, borderRadius: 14, border: `1px solid ${open ? P.border : 'var(--border-1)'}`, overflow: 'hidden' }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: open ? P.bg : 'var(--bg-surface)', textAlign: 'left' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: `${sc}15`, border: `1px solid ${sc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 20 }}>{meta.emoji}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{meta.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: sc }}>{data.score}점</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{data.features}</div>
          {qaMessages.filter(m => m.answer).length > 0 && (
            <div style={{ marginTop: 3, fontSize: 10, color: P.primary, fontWeight: 600 }}>
              Q&A {qaMessages.filter(m => m.answer).length}회
            </div>
          )}
        </div>
        {open ? <ChevronUp size={14} color="var(--text-tertiary)" /> : <ChevronDown size={14} color="var(--text-tertiary)" />}
      </button>

      {open && (
        <>
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${P.border}`, background: P.bgMid }}>
            {/* 키워드 */}
            {data.keywords?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {data.keywords.map((k, i) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: P.bg, color: P.primary, border: `1px solid ${P.border}` }}>{k}</span>
                ))}
              </div>
            )}
            {/* 분석 내용 */}
            <div style={{ fontSize: 13, color: P.text, lineHeight: 1.8 }}>{data.analysis}</div>
            {/* Q&A 토글 버튼 */}
            <button
              onClick={() => setShowQA(v => !v)}
              style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: showQA ? P.bg : 'var(--bg-surface-3)', border: `1px solid ${showQA ? P.border : 'var(--border-1)'}`, fontSize: 12, fontWeight: 600, color: P.primary, cursor: 'pointer' }}
            >
              <MessageCircle size={13} />
              {showQA ? '질문 닫기' : '이 항목에 대해 질문하기'}
              {qaMessages.filter(m => m.answer).length > 0 && (
                <span style={{ background: P.primary, color: '#fff', borderRadius: '50%', width: 15, height: 15, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {qaMessages.filter(m => m.answer).length}
                </span>
              )}
            </button>
          </div>

          {/* Q&A 스레드 */}
          {showQA && (
            <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${P.border}`, background: P.bgMid }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0 8px' }}>
                <MessageCircle size={12} color={P.primary} />
                <span style={{ fontSize: 11, fontWeight: 700, color: P.primary }}>질문하기</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                  {qaMessages.filter(m => m.answer).length}/{MAX_QA}회
                </span>
              </div>
              {qaMessages.map((msg, i) => {
                const isLast = i === qaMessages.length - 1
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                      <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', background: P.primary, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>{msg.question}</div>
                    </div>
                    {msg.answer ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div ref={isLast ? latestRef : null} style={{ maxWidth: '90%', padding: '10px 12px', borderRadius: '2px 12px 12px 12px', background: 'var(--bg-surface)', border: `1px solid ${P.border}`, fontSize: 13, color: P.text, lineHeight: 1.7 }}>{msg.answer}</div>
                      </div>
                    ) : (
                      <div ref={isLast ? latestRef : null} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', color: 'var(--text-tertiary)' }}>
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 11 }}>손금 전문가가 답변 중...</span>
                      </div>
                    )}
                  </div>
                )
              })}
              {qaMessages.filter(m => m.answer).length >= MAX_QA ? (
                <div style={{ padding: '8px 12px', borderRadius: 10, background: '#FFF8E1', fontSize: 12, color: '#92400E', textAlign: 'center' }}>{MAX_QA}회 질문이 완료되었습니다</div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={`${meta.label}에 대해 궁금한 점...`}
                    disabled={qaLoading}
                    style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${P.border}`, background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }}
                  />
                  <button onClick={handleSend} disabled={!input.trim() || qaLoading} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && !qaLoading ? P.primary : 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && !qaLoading ? 'pointer' : 'default' }}>
                    <Send size={14} color={input.trim() && !qaLoading ? '#fff' : 'var(--text-tertiary)'} />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── 업로드 박스 ─── */
function UploadBox({ label, preview, onFile, onDrop, inputRef, placeholder }: {
  label: string; preview: string | null
  onFile: (f: File) => void; onDrop: (e: React.DragEvent) => void
  inputRef: React.RefObject<HTMLInputElement>; placeholder: string
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, marginBottom: 6 }}>{label}</div>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop} onDragOver={e => e.preventDefault()}
        style={{
          borderRadius: 14, border: `2px dashed ${preview ? P.border : 'var(--border-2)'}`,
          background: preview ? P.bg : 'var(--bg-surface)',
          minHeight: preview ? 'auto' : 130, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          padding: 0, overflow: 'hidden', transition: 'all 0.2s',
        }}
      >
        {preview ? (
          <img src={preview} alt={label} style={{ width: '100%', borderRadius: 12, display: 'block' }} />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>🤚</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{placeholder}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: P.bg, color: P.primary, fontSize: 11, fontWeight: 600 }}>
                <Camera size={12} /> 촬영
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }}>
                <Upload size={12} /> 갤러리
              </span>
            </div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>
  )
}

/* ─── 비교 결과 섹션 ─── */
function CompareResult({ compare }: { compare: any }) {
  const { change_score, change_score_desc, change_summary, improved_aspects, unchanged_aspects, advice } = compare
  const barColor = change_score >= 70 ? '#059669' : change_score >= 40 ? '#2563EB' : '#D97706'
  return (
    <div style={{ margin: '0 20px 16px', padding: '18px 16px', borderRadius: 16, background: 'var(--bg-surface)', border: `1.5px solid ${P.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, marginBottom: 14 }}>운명의 변화량 분석</div>
      {/* 변화 점수 */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: barColor, lineHeight: 1 }}>{change_score}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>변화 점수 / 100</div>
        <div style={{ height: 8, borderRadius: 4, background: 'var(--border-1)', overflow: 'hidden', margin: '8px 0' }}>
          <div style={{ width: `${change_score}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: barColor, fontWeight: 600 }}>{change_score_desc}</div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>{change_summary}</div>
      {improved_aspects?.length > 0 && (
        <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginBottom: 6 }}>노력으로 좋아진 부분</div>
          {improved_aspects.map((a: string, i: number) => <div key={i} style={{ fontSize: 12, color: '#065F46', lineHeight: 1.6, paddingLeft: 8, borderLeft: '2px solid #6EE7B7', marginBottom: 4 }}>{a}</div>)}
        </div>
      )}
      {unchanged_aspects?.length > 0 && (
        <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: '#F0F9FF', border: '1px solid #7DD3FC' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', marginBottom: 6 }}>변하지 않는 숙명적 부분</div>
          {unchanged_aspects.map((a: string, i: number) => <div key={i} style={{ fontSize: 12, color: '#0C4A6E', lineHeight: 1.6, paddingLeft: 8, borderLeft: '2px solid #7DD3FC', marginBottom: 4 }}>{a}</div>)}
        </div>
      )}
      {advice && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: P.bgMid, border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, marginBottom: 4 }}>앞으로의 조언</div>
          <div style={{ fontSize: 13, color: P.text, lineHeight: 1.75 }}>{advice}</div>
        </div>
      )}
    </div>
  )
}

type Mode = 'left' | 'right' | 'both'

const MODE_INFO: Record<Mode, { title: string; subtitle: string; badge: string; guide: string; tip: string }> = {
  left: {
    title: '왼손 · 태생운',
    subtitle: '타고난 잠재력과 원래의 숙명',
    badge: '태생운(胎生運)',
    guide: '왼손에는 태어날 때 정해진 운명이 담겨 있습니다. 부모로부터 물려받은 기질, 원래의 잠재력, 전생의 인연이 새겨져 있습니다.',
    tip: '손을 쫙 펼친 상태로 밝은 곳에서 촬영하세요. 손금이 선명하게 보일수록 분석 정확도가 높아집니다.',
  },
  right: {
    title: '오른손 · 현재운',
    subtitle: '노력과 환경으로 달라진 현재 운명',
    badge: '현재운(現在運)',
    guide: '오른손은 살아온 경험, 노력, 환경에 의해 달라진 현재의 운명을 보여줍니다. 오른손잡이는 특히 오른손이 실제 삶을 잘 반영합니다.',
    tip: '손을 쫙 펼친 상태로 밝은 곳에서 촬영하세요. 손금이 선명하게 보일수록 분석 정확도가 높아집니다.',
  },
  both: {
    title: '두 손 비교 · 운명의 변화',
    subtitle: '태생운과 현재운을 비교해 변화량 측정',
    badge: '비교 분석',
    guide: '왼손(태어날 때)과 오른손(현재)을 함께 분석합니다. 두 손의 차이를 통해 당신이 얼마나, 어떻게 운명을 바꿔왔는지를 알 수 있습니다.',
    tip: '왼손과 오른손을 각각 촬영해서 업로드하세요. 두 사진 모두 선명해야 정확한 비교가 가능합니다.',
  },
}

/* ─── 메인 화면 ─── */
export default function PalmReadingScreen() {
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const leftRef = useRef<HTMLInputElement>(null)
  const rightRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('right')
  const [preview, setPreview] = useState<string | null>(null)       // single mode
  const [leftPreview, setLeftPreview] = useState<string | null>(null)
  const [rightPreview, setRightPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PalmResult | null>(null)
  const [compareResult, setCompareResult] = useState<any>(null)

  function readFile(file: File, cb: (b64: string) => void) {
    if (!file.type.startsWith('image/')) { setError('이미지 파일만 업로드 가능합니다.'); return }
    const reader = new FileReader()
    reader.onload = e => { cb(e.target?.result as string); setError('') }
    reader.readAsDataURL(file)
  }

  const handleFile = (f: File) => readFile(f, b64 => { setPreview(b64); setResult(null) })
  const handleLeftFile = (f: File) => readFile(f, b64 => setLeftPreview(b64))
  const handleRightFile = (f: File) => readFile(f, b64 => setRightPreview(b64))

  const canAnalyze = mode === 'both'
    ? (!!leftPreview && !!rightPreview)
    : !!preview

  async function handleAnalyze() {
    if (!canAnalyze) return
    setLoading(true); setError(''); setResult(null); setCompareResult(null)
    try {
      const kakaoUser = await getUser()
      const deviceId = getDeviceId()
      const userId = kakaoUser?.id || null

      if (mode === 'both') {
        const res = await fetch(`${API_BASE}/api/palm/compare`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ left_image_base64: leftPreview, right_image_base64: rightPreview, device_id: deviceId, user_id: userId }),
        })
        if (!res.ok) throw new Error(`분석 오류: ${res.status}`)
        setCompareResult(await res.json())
      } else {
        const res = await fetch(`${API_BASE}/api/palm/analyze`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: preview, hand_type: mode, device_id: deviceId, user_id: userId }),
        })
        if (!res.ok) throw new Error(`분석 오류: ${res.status}`)
        setResult(await res.json())
      }
    } catch (e: any) {
      setError(e.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function reset() { setPreview(null); setLeftPreview(null); setRightPreview(null); setResult(null); setCompareResult(null); setError('') }

  const modeInfo = MODE_INFO[mode]
  const sajuContext = result ? `손금 종합: ${result.overall_summary}` : ''
  const hasResult = !!(result || compareResult)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="손금 보기" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 모드 선택 & 업로드 ─── */}
        {!hasResult && (
          <div style={{ margin: '14px 20px 16px' }}>
            {/* 3가지 모드 탭 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['left', 'right', 'both'] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); reset() }} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 12, fontSize: 11, fontWeight: 700, textAlign: 'center',
                  border: `1.5px solid ${mode === m ? P.border : 'var(--border-1)'}`,
                  background: mode === m ? P.bg : 'var(--bg-surface)',
                  color: mode === m ? P.primary : 'var(--text-secondary)', cursor: 'pointer',
                  lineHeight: 1.3,
                }}>
                  {m === 'left' ? <>왼손<br />태생운</> : m === 'right' ? <>오른손<br />현재운</> : <>두 손<br />비교</>}
                </button>
              ))}
            </div>

            {/* 설명 배너 */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: P.bgMid, border: `1px solid ${P.border}`, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: P.primary, color: '#fff' }}>{modeInfo.badge}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{modeInfo.title}</span>
              </div>
              <div style={{ fontSize: 12, color: P.text, lineHeight: 1.7, marginBottom: 8 }}>{modeInfo.guide}</div>
              <div style={{ fontSize: 11, color: P.textSoft, lineHeight: 1.6, paddingLeft: 8, borderLeft: `2px solid ${P.border}` }}>
                촬영 팁: {modeInfo.tip}
              </div>
            </div>

            {/* 업로드 영역 */}
            {mode === 'both' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <UploadBox label="왼손 (태생운)" preview={leftPreview} onFile={handleLeftFile}
                  onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleLeftFile(e.dataTransfer.files[0]) }}
                  inputRef={leftRef} placeholder="왼손 사진" />
                <UploadBox label="오른손 (현재운)" preview={rightPreview} onFile={handleRightFile}
                  onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleRightFile(e.dataTransfer.files[0]) }}
                  inputRef={rightRef} placeholder="오른손 사진" />
              </div>
            ) : (
              <>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}
                  onDragOver={e => e.preventDefault()}
                  style={{ borderRadius: 18, border: `2px dashed ${preview ? P.border : 'var(--border-2)'}`, background: preview ? P.bg : 'var(--bg-surface)', minHeight: preview ? 'auto' : 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, overflow: 'hidden', transition: 'all 0.2s', marginBottom: 10 }}
                >
                  {preview ? (
                    <img src={preview} alt="손금" style={{ width: '100%', borderRadius: 16, display: 'block' }} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                      <div style={{ fontSize: 48, marginBottom: 10 }}>{mode === 'left' ? '🤚' : '✋'}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                        {mode === 'left' ? '왼손' : '오른손'} 사진을 업로드하세요
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 14 }}>
                        손을 쫙 펼친 상태로 선명하게 촬영하면<br />분석 정확도가 높아집니다
                      </div>
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, background: P.bg, color: P.primary, fontSize: 13, fontWeight: 600 }}><Camera size={15} /> 카메라</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}><Upload size={15} /> 갤러리</span>
                      </div>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </>
            )}

            {/* 분석 버튼 */}
            {canAnalyze && !loading && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={reset} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)', cursor: 'pointer' }}>
                  다시 선택
                </button>
                <button onClick={handleAnalyze} style={{ flex: 2, padding: '12px 0', borderRadius: 12, fontSize: 15, fontWeight: 800, background: P.gradient, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 2px 10px ${P.primary}50` }}>
                  {mode === 'both' ? '두 손 비교 분석' : '손금 분석 시작'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── 로딩 ─── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 20 }}>
            <div style={{ fontSize: 56 }}>{mode === 'both' ? '🤲' : mode === 'left' ? '🤚' : '✋'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>
              {mode === 'both' ? '두 손을 비교 분석하고 있습니다' : `${modeInfo.badge}를 분석하고 있습니다`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
              {mode === 'both'
                ? '왼손(태생운)과 오른손(현재운)을\n비교하여 변화량을 측정 중...'
                : '생명선·감정선·지능선·운명선·재물선\n5대 주요 손금을 정밀 판독 중...'}
            </div>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: P.primary }} />
          </div>
        )}

        {/* ─── 에러 ─── */}
        {error && !loading && (
          <div style={{ margin: '0 20px', padding: '16px', borderRadius: 14, background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            <div style={{ fontSize: 13, color: '#DC2626' }}>{error}</div>
            {error.includes('OPENAI_API_KEY') && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
                api/.env 파일에 OPENAI_API_KEY를 추가하면 GPT-4o Vision으로 손금을 분석합니다.
              </div>
            )}
          </div>
        )}

        {/* ─── 비교 결과 ─── */}
        {compareResult && !loading && (
          <>
            {/* 비교 헤더 */}
            <div style={{ margin: '0 20px 16px', padding: '20px 18px', borderRadius: 18, background: P.gradient }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>두 손 비교 분석 결과</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {leftPreview && <img src={leftPreview} alt="왼손" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', alignSelf: 'center' }}>vs</div>
                {rightPreview && <img src={rightPreview} alt="오른손" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>변화 점수</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{compareResult.compare?.change_score}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.75, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}>
                {compareResult.compare?.change_summary}
              </div>
            </div>
            <CompareResult compare={compareResult.compare} />
            {/* 왼손 상세 */}
            <div style={{ margin: '0 20px 8px', fontSize: 12, fontWeight: 700, color: P.primary }}>왼손 — 태생운(胎生運) 상세</div>
            {compareResult.left && (
              <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 10 }}>{compareResult.left.destiny_summary}</div>
                {Object.entries(LINE_META).map(([key]) => {
                  const d = compareResult.left[key] as LineData
                  if (!d) return null
                  return <LineCard key={`left-${key}`} lineKey={key} data={d} readingId={compareResult.reading_id} sajuContext={`왼손 ${compareResult.left.overall_summary}`} />
                })}
              </div>
            )}
            {/* 오른손 상세 */}
            <div style={{ margin: '0 20px 8px', fontSize: 12, fontWeight: 700, color: P.primary }}>오른손 — 현재운(現在運) 상세</div>
            {compareResult.right && (
              <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 10 }}>{compareResult.right.destiny_summary}</div>
                {Object.entries(LINE_META).map(([key]) => {
                  const d = compareResult.right[key] as LineData
                  if (!d) return null
                  return <LineCard key={`right-${key}`} lineKey={key} data={d} readingId={compareResult.reading_id} sajuContext={`오른손 ${compareResult.right.overall_summary}`} />
                })}
              </div>
            )}
            <div style={{ margin: '0 20px', display: 'flex' }}>
              <button onClick={reset} style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: P.bg, color: P.primary, fontSize: 14, fontWeight: 700, border: `1px solid ${P.border}`, cursor: 'pointer' }}>새로 분석하기</button>
            </div>
          </>
        )}

        {/* ─── 단일 손 분석 결과 ─── */}
        {result && !loading && (
          <>
            {/* 헤더 요약 카드 */}
            <div style={{ margin: '0 20px 16px', padding: '20px 18px', borderRadius: 18, background: P.gradient }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                {preview && (
                  <img src={preview} alt="손금" style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{modeInfo.badge} 손금 분석</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{result.overall_score}점</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    {result.lucky_keywords?.slice(0, 3).join(' · ')}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.75, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)' }}>
                {result.overall_summary}
              </div>
            </div>

            {/* 4대 점수 */}
            <div style={{ margin: '0 20px 16px', padding: '16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, marginBottom: 12, letterSpacing: 0.3 }}>종합 능력 지표</div>
              <ScoreBar label="생명력·건강" score={result.vitality_score} emoji="💪" />
              <ScoreBar label="감성·애정" score={result.emotion_score} emoji="💝" />
              <ScoreBar label="지성·판단" score={result.intellect_score} emoji="🧠" />
              <ScoreBar label="금전·재물" score={result.fortune_score} emoji="💰" />
            </div>

            {/* 5대 손금선 카드 */}
            <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, marginBottom: 12, letterSpacing: 0.3 }}>5대 손금선 분석</div>
              {Object.entries(LINE_META).map(([key]) => {
                const data = result[key as keyof PalmResult] as LineData
                if (!data || typeof data !== 'object' || !('score' in data)) return null
                return (
                  <LineCard key={key} lineKey={key} data={data} readingId={result.reading_id} sajuContext={sajuContext} />
                )
              })}
            </div>

            {/* 기타 소견 */}
            {result.minor_signs && (
              <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, marginBottom: 8 }}>기타 소견</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{result.minor_signs}</div>
              </div>
            )}

            {/* 성향 분석 */}
            {[
              { key: 'personality', label: '성격·기질', emoji: '✨' },
              { key: 'love_tendency', label: '애정·연애 성향', emoji: '💕' },
              { key: 'career_tendency', label: '직업·커리어 성향', emoji: '💼' },
              { key: 'health_tendency', label: '건강 주의사항', emoji: '🌿' },
            ].map(({ key, label, emoji }) => {
              const val = result[key as keyof PalmResult] as string
              if (!val) return null
              return (
                <div key={key} style={{ margin: '0 20px 10px', padding: '13px 16px', borderRadius: 12, background: P.bg, border: `1px solid ${P.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: P.primary, marginBottom: 6 }}>{emoji} {label}</div>
                  <div style={{ fontSize: 13, color: P.text, lineHeight: 1.75 }}>{val}</div>
                </div>
              )
            })}

            {/* 다시 분석 */}
            <div style={{ margin: '16px 20px 0', display: 'flex', gap: 10 }}>
              <button onClick={reset} style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: P.bg, color: P.primary, fontSize: 14, fontWeight: 700, border: `1px solid ${P.border}`, cursor: 'pointer' }}>
                새로 분석하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
