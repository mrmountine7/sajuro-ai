import { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Camera, Upload, ChevronDown, ChevronUp, Send, MessageCircle, Check } from 'lucide-react'
import Header from '@/components/layout/Header'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const MAX_QA = 5

/* ─── 디자인 토큰 (다크 인디고 — 고전 관상학 분위기) ─── */
const F = {
  primary:  '#312E81',
  soft:     '#4338CA',
  light:    '#6366F1',
  bg:       '#EEF2FF',
  bgMid:    '#E0E7FF',
  border:   '#A5B4FC',
  text:     '#1E1B4B',
  textSoft: '#3730A3',
  gradient: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)',
} as const

function scoreColor(s: number) {
  return s >= 80 ? '#059669' : s >= 65 ? F.light : s >= 50 ? '#D97706' : '#DC2626'
}
function scoreLabel(s: number) {
  return s >= 80 ? '매우 좋음' : s >= 65 ? '좋음' : s >= 50 ? '보통' : '주의'
}

/* ─── 섹션 메타 ─── */
const SECTION_META = {
  samjeong:   { label: '삼정(三停)', sub: '이마·코·턱으로 보는 청년·중년·말년운', color: '#7C3AED' },
  ogwan:      { label: '오관(五官)', sub: '눈·코·입·귀·눈썹의 관상학적 의미', color: '#0369A1' },
  gisaek:     { label: '기색(氣色)', sub: '피부색·광택으로 보는 현재 건강·운기', color: '#059669' },
  golsang:    { label: '골상(骨相)', sub: '얼굴형·뼈대로 보는 타고난 기질', color: '#B45309' },
  myeonggung: { label: '명궁(命宮)', sub: '미간·인중으로 보는 운명 종합', color: '#DC2626' },
}

interface QAMessage { question: string; answer: string }

/* ─── 섹션 Q&A 스레드 ─── */
function SectionQA({ section, readingId, context, T }: {
  section: string; readingId: string | null; context: string; T: typeof F
}) {
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const latestRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const meta = SECTION_META[section as keyof typeof SECTION_META]

  useLayoutEffect(() => {
    const cur = messages.filter(m => m.answer).length
    if (cur > prevCountRef.current) { prevCountRef.current = cur; latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  }, [messages])

  const canAsk = messages.filter(m => m.answer).length < MAX_QA && !loading

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || !canAsk) return
    setInput('')
    const pending = [...messages, { question: q, answer: '' }]
    setMessages(pending)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/face/qa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading_id: readingId, device_id: getDeviceId(),
          section, question: q,
          round_number: pending.length, context,
        }),
      })
      const data = await res.json()
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: data.answer } : m))
    } catch {
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: '답변 오류가 발생했습니다.' } : m))
    } finally { setLoading(false) }
    requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  }, [input, messages, loading, canAsk, readingId, section, context])

  return (
    <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgMid }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 8px' }}>
        <MessageCircle size={12} color={T.soft} />
        <span style={{ fontSize: 11, fontWeight: 700, color: T.soft }}>질문하기</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {messages.filter(m => m.answer).length}/{MAX_QA}회
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
                <span style={{ fontSize: 11 }}>관상 전문가가 분석 중...</span>
              </div>
            )}
          </div>
        )
      })}
      {messages.filter(m => m.answer).length >= MAX_QA ? (
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: '#92400E', textAlign: 'center' }}>{MAX_QA}회 질문이 완료되었습니다</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`${meta?.label || section}에 대해 궁금한 점...`} disabled={!canAsk}
            style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${T.border}`, background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }} />
          <button onClick={handleSend} disabled={!input.trim() || !canAsk} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && canAsk ? T.soft : 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && canAsk ? 'pointer' : 'default' }}>
            <Send size={14} color={input.trim() && canAsk ? '#fff' : 'var(--text-tertiary)'} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── 관상 섹션 카드 ─── */
function FaceSectionCard({ sectionKey, data, readingId }: {
  sectionKey: string; data: Record<string, any>; readingId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [showQA, setShowQA] = useState(false)
  const meta = SECTION_META[sectionKey as keyof typeof SECTION_META]
  const score = data?.score || 70
  const sc = scoreColor(score)

  if (!data || !meta) return null

  // 섹션별 세부 항목
  const detailFields: Record<string, { fields: { key: string; label: string }[] }> = {
    samjeong:   { fields: [{ key: 'upper', label: '상정(이마)' }, { key: 'middle', label: '중정(눈~코)' }, { key: 'lower', label: '하정(코~턱)' }] },
    ogwan:      { fields: [{ key: 'eyes', label: '눈(감찰관)' }, { key: 'nose', label: '코(심변관)' }, { key: 'mouth', label: '입(출납관)' }, { key: 'ears', label: '귀(채청관)' }, { key: 'eyebrows', label: '눈썹(보수관)' }] },
    gisaek:     { fields: [{ key: 'color', label: '기색(피부색)' }, { key: 'luster', label: '광택·생기' }, { key: 'current_energy', label: '현재 운기' }] },
    golsang:    { fields: [{ key: 'face_shape', label: '얼굴형' }, { key: 'cheekbone', label: '광대' }, { key: 'chin', label: '턱' }, { key: 'forehead', label: '이마 골격' }] },
    myeonggung: { fields: [{ key: 'indang', label: '인당(미간)' }, { key: 'injoong', label: '인중' }, { key: 'balance', label: '균형·비율' }, { key: 'destiny', label: '운명 종합' }] },
  }

  const details = detailFields[sectionKey]?.fields || []
  const context = [data.analysis, ...details.map(f => `${f.label}: ${data[f.key] || ''}`).filter(Boolean)].join('\n')

  return (
    <div style={{ margin: '0 20px 14px', borderRadius: 16, background: 'var(--bg-surface)', border: `1px solid ${open ? F.border : 'var(--border-1)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <button onClick={() => setOpen(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--bg-surface)', textAlign: 'left' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${meta.color}15`, border: `1px solid ${meta.color}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 8, color: meta.color, opacity: 0.7 }}>점</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{meta.label}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: sc }}>{scoreLabel(score)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{meta.sub}</div>
          {data.analysis && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{data.analysis.slice(0, 50)}...</div>}
        </div>
        {open ? <ChevronUp size={15} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 4 }} /> : <ChevronDown size={15} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 4 }} />}
      </button>

      {open && (
        <>
          <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${F.border}`, background: F.bg }}>
            {/* 태그 */}
            {data.keywords?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12, marginBottom: 12 }}>
                {data.keywords.map((k: string, i: number) => (
                  <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: F.bgMid, color: F.soft, border: `1px solid ${F.border}` }}>{k}</span>
                ))}
              </div>
            )}
            {/* 세부 항목 */}
            {details.map(({ key, label }) => data[key] && (
              <div key={key} style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 10, background: `${meta.color}08`, border: `1px solid ${meta.color}20` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: F.text, lineHeight: 1.7 }}>{data[key]}</div>
              </div>
            ))}
            {/* 종합 해석 */}
            {data.analysis && (
              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, background: F.bgMid, border: `1px solid ${F.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: F.soft, marginBottom: 4 }}>종합 해석</div>
                <div style={{ fontSize: 13, color: F.text, lineHeight: 1.8 }}>{data.analysis}</div>
              </div>
            )}
            {/* 질문 버튼 */}
            <button onClick={() => setShowQA(v => !v)} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: showQA ? F.bgMid : 'var(--bg-surface-3)', border: `1px solid ${showQA ? F.border : 'var(--border-1)'}`, fontSize: 12, fontWeight: 600, color: showQA ? F.soft : 'var(--text-secondary)', cursor: 'pointer' }}>
              <MessageCircle size={13} />
              {showQA ? '질문 닫기' : '이 섹션 질문하기'}
            </button>
          </div>
          {showQA && <SectionQA section={sectionKey} readingId={readingId} context={context} T={F} />}
        </>
      )}
    </div>
  )
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

/* ─── 메인 화면 ─── */
export default function FaceReadingScreen() {
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('이미지 파일만 업로드 가능합니다.'); return }
    const reader = new FileReader()
    reader.onload = e => { setPreview(e.target?.result as string); setResult(null); setError('') }
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    if (!preview) return
    setLoading(true); setError(''); setResult(null)
    try {
      const kakaoUser = await getUser()
      const res = await fetch(`${API_BASE}/api/face/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: preview, device_id: getDeviceId(), user_id: kakaoUser?.id || null }),
      })
      if (!res.ok) throw new Error(`분석 오류: ${res.status}`)
      setResult(await res.json())
    } catch (e: any) { setError(e.message || '분석 중 오류가 발생했습니다.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="관상 보기" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 업로드 영역 ─── */}
        {!result && (
          <div style={{ margin: '14px 20px 16px' }}>
            {/* 안내 배너 */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: F.bgMid, border: `1px solid ${F.border}`, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: F.primary, marginBottom: 5 }}>촬영 안내</div>
              <div style={{ fontSize: 12, color: F.text, lineHeight: 1.7 }}>
                정면을 바라보는 얼굴 사진을 업로드하세요. 밝은 조명 아래, 표정 없이 자연스럽게 찍은 사진이 가장 정확합니다.
                마의상법·신상전편·유장상법 고전 기준으로 삼정(三停)·오관(五官)·기색(氣色)·골상(骨相)·명궁(命宮) 5대 영역을 분석합니다.
              </div>
            </div>

            {/* 드롭존 */}
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]) }}
              onDragOver={e => e.preventDefault()}
              style={{ borderRadius: 18, border: `2px dashed ${preview ? F.border : 'var(--border-2)'}`, background: preview ? F.bg : 'var(--bg-surface)', minHeight: preview ? 'auto' : 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, overflow: 'hidden', transition: 'all 0.2s', marginBottom: 10 }}
            >
              {preview ? (
                <img src={preview} alt="관상 분석용 사진" style={{ width: '100%', borderRadius: 16, display: 'block' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: F.soft, marginBottom: 10 }}>相</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>얼굴 사진을 업로드하세요</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 14 }}>정면, 밝은 조명, 자연스러운 표정<br />정확한 관상 분석을 위한 필수 조건입니다</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, background: F.bg, color: F.primary, fontSize: 13, fontWeight: 600 }}><Camera size={15} /> 카메라</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 10, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}><Upload size={15} /> 갤러리</span>
                  </div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            {preview && !loading && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setPreview(null); setResult(null) }} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)', cursor: 'pointer' }}>
                  다시 선택
                </button>
                <button onClick={handleAnalyze} style={{ flex: 2, padding: '12px 0', borderRadius: 12, fontSize: 15, fontWeight: 800, background: F.gradient, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: `0 2px 10px ${F.soft}50` }}>
                  관상 분석 시작
                </button>
              </div>
            )}

            {error && <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FCA5A5', fontSize: 13, color: '#DC2626' }}>{error}</div>}
          </div>
        )}

        {/* ─── 로딩 ─── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 20 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: F.soft }}>相</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: F.text }}>당신이 왕이 될 상인지 분석하고 있어요~</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.7 }}>
              삼정·오관·기색·골상·명궁<br />마의상법·유장상법 고전 기준 정밀 판독 중...
            </div>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: F.soft }} />
          </div>
        )}

        {/* ─── 분석 결과 ─── */}
        {result && !loading && (
          <>
            {/* 헤더 카드 */}
            <div style={{ margin: '0 20px 16px', padding: '20px 18px', borderRadius: 18, background: F.gradient }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                {preview && <img src={preview} alt="관상 분석" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                <div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                    관상 분석 결과
                    {result.reading_id && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.2)' }}>저장됨</span>}
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{result.overall_score}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>
                    {result.lucky_keywords?.slice(0, 3).join(' · ')}
                  </div>
                </div>
              </div>
              {/* 고전 분석 */}
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.8, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.12)', marginBottom: result.easy_summary ? 8 : 0 }}>
                {result.overall_summary}
              </div>
              {/* 해석 (쉬운 풀이) */}
              {result.easy_summary && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.18)', borderLeft: '3px solid rgba(255,255,255,0.5)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 5, letterSpacing: 1 }}>해석</div>
                  <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.8, fontWeight: 500 }}>{result.easy_summary}</div>
                </div>
              )}
            </div>

            {/* 4대 능력 점수 */}
            <div style={{ margin: '0 20px 16px', padding: '16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${F.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: F.soft, marginBottom: 12, letterSpacing: 0.3 }}>관상 종합 능력 지표</div>
              <ScoreBar label="활력·생명력" score={result.vitality_score ?? 70} />
              <ScoreBar label="지혜·명석함" score={result.wisdom_score ?? 70} />
              <ScoreBar label="재물·복덕운" score={result.wealth_score ?? 70} />
              <ScoreBar label="카리스마·대인운" score={result.charisma_score ?? 70} />
            </div>

            {/* 5대 섹션 아코디언 */}
            <div style={{ margin: '0 0 4px' }}>
              <div style={{ padding: '0 20px 10px', fontSize: 11, fontWeight: 700, color: F.soft, letterSpacing: 0.3 }}>5대 관상 영역 정밀 분석</div>
              {Object.keys(SECTION_META).map(key => (
                <FaceSectionCard key={key} sectionKey={key} data={result[key]} readingId={result.reading_id} />
              ))}
            </div>

            {/* 성향 분석 */}
            {[
              { key: 'personality',      label: '성격·기질' },
              { key: 'career_tendency',  label: '직업·커리어 성향' },
              { key: 'wealth_tendency',  label: '재물·금전 성향' },
              { key: 'health_tendency',  label: '건강 주의사항' },
              { key: 'love_tendency',    label: '애정·배우자운' },
            ].map(({ key, label }) => result[key] && (
              <div key={key} style={{ margin: '0 20px 10px', padding: '13px 16px', borderRadius: 12, background: F.bg, border: `1px solid ${F.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: F.primary, marginBottom: 6, letterSpacing: 0.3 }}>{label}</div>
                <div style={{ fontSize: 13, color: F.text, lineHeight: 1.75 }}>{result[key]}</div>
              </div>
            ))}

            {/* 다시 분석 */}
            <div style={{ margin: '16px 20px 0' }}>
              <button onClick={() => { setResult(null); setPreview(null) }} style={{ width: '100%', padding: '13px 0', borderRadius: 12, background: F.bg, color: F.primary, fontSize: 14, fontWeight: 700, border: `1px solid ${F.border}`, cursor: 'pointer' }}>
                새로 분석하기
              </button>
            </div>

            {/* 고전 출처 안내 */}
            <div style={{ margin: '12px 20px 20px', padding: '12px 16px', borderRadius: 12, background: F.bgMid, border: `1px solid ${F.border}` }}>
              <div style={{ fontSize: 11, color: F.textSoft, lineHeight: 1.7 }}>
                이 분석은 마의상법(麻衣相法), 신상전편(神相全篇), 유장상법(柳莊相法), 수경집(水鏡集) 등 동양 관상학 고전문헌에 근거한 결과입니다.
                분석 결과는 <strong>분석 기록</strong> 메뉴에서 다시 확인할 수 있습니다.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
