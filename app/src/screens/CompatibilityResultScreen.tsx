import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Share2, Check, MessageCircle, Send, Loader2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import { getDeviceId } from '@/lib/device-id'
import { getUser } from '@/lib/auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const MAX_QA = 5

/* ─── 핑크 색상 (연인궁합 테마) ─── */
const C = {
  primary: '#DB2777',
  soft:    '#EC4899',
  bg:      '#FFF0F6',
  bgMid:   '#FDF2F8',
  border:  '#FBCFE8',
  text:    '#831843',
}

/* ─── 전체 결과 공유 텍스트 생성 ─── */
function buildShareText(data: any): string {
  const p1 = data.person1?.name || '?'
  const p2 = data.person2?.name || '?'
  const overall = data.overall_score ?? 0
  const outer   = data.outer_score ?? 0
  const inner   = data.inner_score ?? 0

  const scoreBar = (n: number) => '■'.repeat(Math.round(n / 10)) + '□'.repeat(10 - Math.round(n / 10))
  const label = overall >= 80 ? '💚 좋은 궁합' : overall >= 60 ? '💛 보통 궁합' : '❤️ 주의 필요'

  const lines: string[] = [
    `💑 ${p1} × ${p2} 연인궁합 결과`,
    `📊 종합 점수: ${overall}점 ${label}`,
    `겉궁합: ${outer}점 ${scoreBar(outer)}`,
    `속궁합: ${inner}점 ${scoreBar(inner)}`,
    '',
    `📝 ${data.overall_summary || ''}`,
  ]

  const stages: any[] = data.stages || []
  if (stages.length > 0) {
    lines.push('', '─────────────────────')
    stages.forEach((s: any) => {
      const scoreLabel = s.score >= 80 ? '🟢' : s.score >= 60 ? '🟡' : '🔴'
      lines.push(`${scoreLabel} ${s.title} — ${s.score}점`)
      if (s.summary) lines.push(`   ${s.summary}`)
      if (Array.isArray(s.details)) {
        s.details.slice(0, 2).forEach((d: string) => lines.push(`   • ${d}`))
      }
      lines.push('')
    })
  }

  if (data.quick_summary?.lines?.length > 0) {
    lines.push('─────────────────────')
    lines.push('💡 핵심 요약')
    ;(data.quick_summary.lines as string[])
      .filter((l: string) => l.trim())
      .slice(0, 8)
      .forEach((l: string) => lines.push(l))
    lines.push('')
  }

  lines.push('─────────────────────')
  lines.push('🔮 SAJURO.AI — 사주명리 기반 궁합 분석')
  lines.push('https://sajuro.ai')

  return lines.join('\n')
}

/* ─── 공유 실행 (텍스트) ─── */
async function doShare(title: string, text: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return
    } catch (e: any) {
      if (e?.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    alert('📋 클립보드에 복사되었습니다!\n카카오톡을 열어 붙여넣기 해주세요.')
  } catch {
    alert('공유 기능을 사용할 수 없습니다.\n브라우저에서 직접 복사해주세요.')
  }
}

/* ─── 전체 결과 공유 ─── */
async function shareToKakao(data: any): Promise<void> {
  await doShare('연인궁합 결과', buildShareText(data))
}

interface StageData { stage: number; title: string; summary: string; details: string[]; score: number; tags: string[] }
interface QAMessage { question: string; answer: string }

/* ─── 점수 바 ─── */
function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F2C316' : '#FF5A5F'
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--border-1)', overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, height: '100%', borderRadius: 4, background: color, transition: 'width 0.6s ease' }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{score}</span>
      </div>
    </div>
  )
}

/* ─── Q&A 스레드 ─── */
function QAThread({ stage, analysisId, overallContext }: {
  stage: StageData; analysisId: string | null; overallContext: string
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

  const stageContext = [
    stage.summary,
    ...(stage.tags.length ? [`태그: ${stage.tags.join(', ')}`] : []),
    ...stage.details.filter(d => d.trim()),
  ].join('\n')

  const handleSend = useCallback(async () => {
    const q = input.trim()
    if (!q || loading || messages.filter(m => m.answer).length >= MAX_QA) return
    setInput('')
    const pending = [...messages, { question: q, answer: '' }]
    setMessages(pending)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/compatibility/qa`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: analysisId,
          device_id: getDeviceId(),
          stage_number: stage.stage,
          stage_title: stage.title,
          stage_context: stageContext,
          overall_context: overallContext,
          question: q,
          round_number: pending.length,
          conversation_history: messages.filter(m => m.answer),
        }),
      })
      const data = await res.json()
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: data.answer } : m))
    } catch {
      setMessages(pending.map((m, i) => i === pending.length - 1 ? { ...m, answer: '답변 오류가 발생했습니다.' } : m))
    } finally {
      setLoading(false)
    }
    requestAnimationFrame(() => latestRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  }, [input, messages, loading, analysisId, stage, stageContext, overallContext])

  const answeredCount = messages.filter(m => m.answer).length

  return (
    <div style={{ padding: '0 0 0', borderTop: `1px solid ${C.border}`, background: C.bgMid, marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px 8px' }}>
        <MessageCircle size={12} color={C.primary} />
        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>질문하기</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
          {answeredCount}/{MAX_QA}회
        </span>
      </div>
      {messages.map((msg, i) => {
        const isLast = i === messages.length - 1
        return (
          <div key={i} style={{ padding: '0 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <div style={{ maxWidth: '85%', padding: '8px 12px', borderRadius: '12px 12px 2px 12px', background: C.primary, color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
                {msg.question}
              </div>
            </div>
            {msg.answer ? (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div ref={isLast ? latestRef : null} style={{ maxWidth: '90%', padding: '10px 12px', borderRadius: '2px 12px 12px 12px', background: 'var(--bg-surface)', border: `1px solid ${C.border}`, fontSize: 13, color: C.text, lineHeight: 1.7 }}>
                  {msg.answer}
                </div>
              </div>
            ) : (
              <div ref={isLast ? latestRef : null} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', color: 'var(--text-tertiary)' }}>
                <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 11 }}>궁합 전문가가 답변 중...</span>
              </div>
            )}
          </div>
        )
      })}
      {answeredCount >= MAX_QA ? (
        <div style={{ padding: '8px 16px 12px', fontSize: 12, color: '#92400E', textAlign: 'center', background: '#FFF8E1', margin: '0 16px 12px', borderRadius: 10 }}>
          {MAX_QA}회 질문이 완료되었습니다
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={`${stage.title}에 대해 궁금한 점...`}
            disabled={loading}
            style={{ flex: 1, height: 38, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'var(--bg-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text-primary)' }}
          />
          <button onClick={handleSend} disabled={!input.trim() || loading} style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: input.trim() && !loading ? C.primary : 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default' }}>
            <Send size={14} color={input.trim() && !loading ? '#fff' : 'var(--text-tertiary)'} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── 단계 카드 (Q&A + 공유 통합) ─── */
function StageCard({ stage, analysisId, overallContext, person1, person2 }: {
  stage: StageData; analysisId: string | null; overallContext: string
  person1: string; person2: string
}) {
  const [showQA, setShowQA] = useState(false)
  const [shareDone, setShareDone] = useState(false)

  async function handleShare() {
    const tagLine = stage.tags.length > 0 ? `\n🏷️ ${stage.tags.join(' · ')}` : ''
    const detailLines = stage.details.filter(d => d.trim()).map(d => {
      if (d.startsWith('[') && d.endsWith(']')) return `\n◆ ${d.slice(1, -1)}`
      if (d.startsWith('→')) return `  ${d}`
      return `• ${d}`
    }).join('\n')
    const text = [`💑 연인궁합 분석 결과`, `${person1} × ${person2}`, ``, `━━━ ${stage.title} (${stage.score}점) ━━━`, tagLine, detailLines, ``, `📱 사주로(sajuro.ai)에서 내 궁합을 확인해보세요`].join('\n')
    await doShare(`${stage.title} 궁합 분석`, text)
    setShareDone(true); setTimeout(() => setShareDone(false), 2500)
  }

  const scoreColor = stage.score >= 80 ? '#10B981' : stage.score >= 60 ? 'var(--text-accent)' : '#FF5A5F'

  return (
    <div style={{ margin: '0 20px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: `1px solid ${showQA ? C.border : 'var(--border-1)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
      <div style={{ padding: 16 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{stage.title}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor }}>{stage.score}점</span>
        </div>

        {/* 태그 */}
        {stage.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {stage.tags.map(tag => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-2)', color: 'var(--text-accent)', border: '1px solid var(--border-accent)' }}>{tag}</span>
            ))}
          </div>
        )}

        {/* 내용 */}
        <div>
          {stage.details.map((d, j) => {
            if (d === '') return <div key={j} style={{ height: 10 }} />
            if (d.startsWith('[') && d.endsWith(']')) return <div key={j} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', paddingTop: 6, paddingBottom: 4 }}>{d.slice(1, -1)}</div>
            if (d.endsWith(':')) return <div key={j} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', paddingTop: 8, paddingBottom: 2 }}>{d}</div>
            if (d.startsWith('→')) return <div key={j} style={{ fontSize: 13, color: 'var(--text-accent)', lineHeight: 1.6, paddingTop: 2, paddingBottom: 4, fontWeight: 500 }}>{d}</div>
            return <div key={j} className="s-bullet" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 3, paddingBottom: 3 }}>{d}</div>
          })}
        </div>

        {/* 질문하기 + 공유 버튼 행 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setShowQA(v => !v)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: showQA ? C.bg : 'var(--bg-surface-3)',
              color: showQA ? C.primary : 'var(--text-secondary)',
              border: `1px solid ${showQA ? C.border : 'var(--border-1)'}`,
            }}
          >
            <MessageCircle size={13} />
            {showQA ? '질문 닫기' : '이 단계 질문하기'}
          </button>
          <button
            onClick={handleShare}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: shareDone ? '#ECFDF5' : '#FEF9C3',
              color: shareDone ? '#059669' : '#92400E',
              border: `1px solid ${shareDone ? '#6EE7B7' : '#FCD34D'}`,
              transition: 'all 0.2s',
            }}
          >
            {shareDone ? <Check size={13} /> : <Share2 size={13} />}
            공유
          </button>
        </div>
      </div>

      {/* Q&A 영역 */}
      {showQA && (
        <QAThread stage={stage} analysisId={analysisId} overallContext={overallContext} />
      )}
    </div>
  )
}

/* ─── 메인 화면 ─── */
export default function CompatibilityResultScreen() {
  const location = useLocation()
  const nav = useNavigate()
  const data = location.state?.data
  const [activePanel, setActivePanel] = useState<'none' | 'summary' | 'easy'>('none')
  const [analysisId, setAnalysisId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [sharing, setSharing] = useState(false)

  /* 분석 결과 자동 저장 */
  useEffect(() => {
    if (!data || saved) return
    async function save() {
      // ── localStorage에 항상 저장 ──
      try {
        const newRecord = {
          id: crypto.randomUUID(),
          result: JSON.stringify(data),
          created_at: new Date().toISOString(),
        }
        const existing = JSON.parse(localStorage.getItem('compat_records_local') || '[]')
        const updated = [newRecord, ...existing].slice(0, 30)
        localStorage.setItem('compat_records_local', JSON.stringify(updated))
        setAnalysisId(newRecord.id)
        setSaved(true)
      } catch (lsErr) {
        console.warn('[CompatibilityResult] localStorage 저장 실패:', lsErr)
      }

      // ── 백엔드 Supabase 저장도 시도 ──
      try {
        const kakaoUser = await getUser()
        const res = await fetch(`${API_BASE}/api/compatibility/save`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: getDeviceId(),
            user_id: kakaoUser?.id || null,
            result: data,
          }),
        })
        const d = await res.json()
        if (d.id) setAnalysisId(d.id)
      } catch (e) { console.warn('[CompatibilityResult] 백엔드 저장 실패 (localStorage로 대체됨):', e) }
    }
    save()
  }, [data])

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="궁합 결과" showBack onBack={() => nav('/analysis')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          분석 데이터가 없습니다.<br />궁합 분석을 먼저 실행해주세요.
        </div>
      </div>
    )
  }

  const stages: StageData[] = data.stages || []
  const person1 = data.person1?.name || ''
  const person2 = data.person2?.name || ''

  // Q&A에 전달할 전체 궁합 컨텍스트
  const overallContext = [
    `${person1} × ${person2} 연인궁합`,
    `종합 점수: ${data.overall_score}점 (겉궁합 ${data.outer_score}점, 속궁합 ${data.inner_score}점)`,
    `총평: ${data.overall_summary}`,
  ].join('\n')

  const handleAction = async (action: string) => {
    if (action === 'share') {
      setSharing(true)
      await shareToKakao(data)
      setSharing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="연인궁합 결과" showBack onBack={() => nav('/analysis')} rightActions={['save', 'share']} onAction={handleAction} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* 상태 뱃지 */}
        {(saved || sharing) && (
          <div style={{ padding: '8px 20px 0', display: 'flex', gap: 6 }}>
            {saved && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#ECFDF5', color: '#065F46' }}>✅ 저장됨</span>}
            {sharing && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: '#FFF8E1', color: '#92400E' }}>📤 공유 준비 중...</span>}
          </div>
        )}

        {/* Score Summary */}
        <div style={{ margin: '12px 20px 16px', padding: 24, borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', border: '1px solid var(--border-1)', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>{person1} × {person2}</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: 'var(--text-accent)', lineHeight: 1 }}>{data.overall_score}</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>종합 궁합 점수</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <ScoreBar score={data.outer_score} label="겉궁합" />
            <ScoreBar score={data.inner_score} label="속궁합" />
          </div>
        </div>

        {/* Overall Summary */}
        <div style={{ margin: '0 20px 16px', padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-1)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>{data.overall_summary}</p>
        </div>

        {/* 안내 */}
        <div style={{ margin: '0 20px 12px', padding: '10px 14px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, color: C.text }}>
            각 분석 단계에서 <strong>질문하기</strong>를 탭하면 해당 단계에 대해 추가 질문을 할 수 있습니다 (최대 {MAX_QA}회).
          </span>
        </div>

        {/* 6 Stages — Q&A 포함 */}
        {stages.map((stage) => (
          <StageCard
            key={stage.stage}
            stage={stage}
            analysisId={analysisId}
            overallContext={overallContext}
            person1={person1}
            person2={person2}
          />
        ))}

        {/* LLM Analysis */}
        {data.llm_analysis && (
          <div style={{ margin: '0 20px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>AI 상세 풀이</div>
            <div style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-1)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {data.llm_analysis}
            </div>
          </div>
        )}

        {/* Toggle Actions */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px', marginBottom: 12 }}>
          <button onClick={() => setActivePanel(activePanel === 'summary' ? 'none' : 'summary')}
            style={{ flex: 1, textAlign: 'center', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, border: '1px solid var(--border-1)', background: activePanel === 'summary' ? 'var(--bg-accent)' : 'var(--bg-surface)', color: activePanel === 'summary' ? '#1F2937' : 'var(--text-primary)' }}>
            핵심만 요약
          </button>
          <button onClick={() => setActivePanel(activePanel === 'easy' ? 'none' : 'easy')}
            style={{ flex: 1, textAlign: 'center', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, border: '1px solid var(--border-1)', background: activePanel === 'easy' ? 'var(--bg-accent)' : 'var(--bg-surface)', color: activePanel === 'easy' ? '#1F2937' : 'var(--text-primary)' }}>
            쉽게 다시 설명
          </button>
        </div>

        {activePanel === 'summary' && data.quick_summary && (
          <div style={{ margin: '0 20px 16px', padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-accent)' }}>
            {(data.quick_summary.lines as string[]).map((line: string, i: number) => {
              if (line === '') return <div key={i} style={{ height: 8 }} />
              if (line.startsWith('💛') || line.startsWith('💡')) return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', paddingBottom: 4 }}>{line}</div>
              if (line.startsWith('🟢') || line.startsWith('🟡') || line.startsWith('🔴')) return <div key={i} style={{ fontSize: 13, color: 'var(--text-primary)', paddingTop: 2, paddingBottom: 2 }}>{line}</div>
              if (line.startsWith('   ')) return <div key={i} style={{ fontSize: 12, color: 'var(--text-tertiary)', paddingLeft: 16, paddingBottom: 2 }}>{line.trim()}</div>
              if (line.startsWith('·')) return <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 2, paddingBottom: 2, paddingLeft: 8 }}>{line}</div>
              return <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 1 }}>{line}</div>
            })}
          </div>
        )}

        {activePanel === 'easy' && data.easy_explanation && (
          <div style={{ margin: '0 20px 16px', padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-accent)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>사주 용어 없이 쉽게 풀어보면...</div>
            {(data.easy_explanation.sections as any[]).map((sec: any, i: number) => {
              const gradeColor = sec.score >= 80 ? '#10B981' : sec.score >= 65 ? 'var(--text-accent)' : '#FF5A5F'
              return (
                <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < data.easy_explanation.sections.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{sec.title}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: gradeColor }}>{sec.grade}</span>
                  </div>
                  {sec.details.map((d: string, j: number) => (
                    <div key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 2 }}>{d}</div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
