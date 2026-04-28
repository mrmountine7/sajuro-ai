import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import { Loader2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import { calculateFullSaju } from '@/lib/saju-engine'
import { getDailyFortune } from '@/lib/daily-fortune'
import { lunarToSolar } from '@/lib/lunar-solar'
import { interpretDreamLLM } from '@/lib/api-client'
import { getUser } from '@/lib/auth'

/* ─── 타입 ─── */
interface SajuContextPayload {
  ilgan: string; ilganKr: string; ilganElement: string
  yongshin?: string; dayPillar?: string
  currentDaeun?: string; daeunElement?: string
  currentSeun?: string; todayIlgin?: string; todayIlginElement?: string
  elementDistribution?: Record<string, number>
}

interface DreamDomain { name: string; rating: string; summary: string }
interface LiteratureRef { source: string; originalText: string; translation: string }
interface LLMResult {
  overallSentiment: string; overallSummary: string; mainInterpretation: string
  domains: DreamDomain[]; todaysAdvice: string; luckyColor: string
  luckyNumbers: number[]; literatureRefs: LiteratureRef[]
  detectedSymbols: string[]; needsMoreDetail: boolean; additionalQuestion?: string
}

/* ─── 색상 매핑 ─── */
const SENTIMENT_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  '대길': { bg: '#ECFDF5', color: '#059669', emoji: '🌟' },
  '길':   { bg: '#F0FFF4', color: '#16A34A', emoji: '✨' },
  '중길': { bg: '#FFF8E1', color: '#D97706', emoji: '🌙' },
  '평':   { bg: '#F1F5F9', color: '#64748B', emoji: '☁️' },
  '주의': { bg: '#FFF7ED', color: '#EA580C', emoji: '⚠️' },
  '흉':   { bg: '#FEF2F2', color: '#DC2626', emoji: '🌪️' },
}
const DOMAIN_ICONS: Record<string, string> = {
  '재물운': '💰', '직업운': '💼', '연애운': '💕', '건강운': '❤️', '가정운': '🏠',
  '명예운': '⭐', '사업운': '🏢', '대인관계': '🤝',
}

/* ─── 로딩 단계 ─── */
const LOADING_STEPS = [
  '꿈 속 상징을 분석하고 있습니다...',
  '고전문헌에서 유사한 사례를 찾고 있습니다...',
  '나의 사주와 연결하고 있습니다...',
  '사주가가 해몽을 완성하고 있습니다...',
]

/* ─── 문헌 인용 카드 ─── */
function LiteratureCard({ ref: r, expanded, onToggle }: { ref: LiteratureRef; expanded: boolean; onToggle: () => void }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={14} color="#D97706" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>📜 {r.source}</span>
        </div>
        {expanded ? <ChevronUp size={14} color="#D97706" /> : <ChevronDown size={14} color="#D97706" />}
      </div>
      {expanded && (
        <div style={{ marginTop: 10 }}>
          {r.originalText && (
            <div style={{ fontSize: 12, color: '#78350F', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.6 }}>
              "{r.originalText}"
            </div>
          )}
          {r.translation && (
            <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
              {r.translation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── 메인 화면 ─── */
export default function DreamScreen() {
  const [text, setText] = useState('')
  const [experienceText, setExperienceText] = useState('')
  const [result, setResult] = useState<LLMResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [phase, setPhase] = useState<'input' | 'result'>('input')
  const [sajuCtx, setSajuCtx] = useState<SajuContextPayload | null>(null)
  const [expandedLit, setExpandedLit] = useState<Record<number, boolean>>({})
  const [saved, setSaved] = useState(false)

  /* 사주 컨텍스트 로드 */
  useEffect(() => {
    async function loadSaju() {
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('birth_year,birth_month,birth_day,birth_hour,calendar_type,gender')
        .eq('device_id', getDeviceId())
        .eq('is_primary', true)
        .single()
      if (!data) return

      const { birth_year, birth_month, birth_day, calendar_type } = data
      const solarDate = (calendar_type === 'lunar' || calendar_type === 'lunar_leap')
        ? lunarToSolar(birth_year, birth_month, birth_day, calendar_type === 'lunar_leap')
        : new Date(birth_year, birth_month - 1, birth_day)

      const [h, m] = data.birth_hour === 'unknown' ? [12, 0]
        : (data.birth_hour.match(/(\d+):(\d+)/) || []).slice(1).map(Number) as [number, number]

      const saju = calculateFullSaju({
        birthYear: solarDate.getFullYear(),
        birthMonth: solarDate.getMonth() + 1,
        birthDay: solarDate.getDate(),
        birthHour: h || 12, birthMinute: m || 0,
        calendarType: 'solar', gender: data.gender,
      })

      const fortune = getDailyFortune(birth_year, birth_month, birth_day, calendar_type)
      const ELEMENTS_MAP: Record<string, string> = { '목': '木', '화': '火', '토': '土', '금': '金', '수': '水' }

      setSajuCtx({
        ilgan: saju.dayPillar.stemHj,
        ilganKr: saju.dayPillar.stemKr,
        ilganElement: ELEMENTS_MAP[saju.dayMasterElement] || saju.dayMasterElement,
        dayPillar: saju.dayPillar.label,
        todayIlgin: fortune.dayPillar.label,
        todayIlginElement: ELEMENTS_MAP[fortune.userElement] || fortune.userElement,
      })
    }
    loadSaju()
  }, [])

  /* 해몽 실행 */
  const handleInterpret = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    setLoadingStep(0)

    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1))
    }, 2500)

    try {
      const data = await interpretDreamLLM({
        dreamText: text,
        experienceText: experienceText || undefined,
        sajuContext: sajuCtx || undefined,
        dreamDate: new Date().toLocaleDateString('ko-KR'),
      })
      const result = data as LLMResult
      setResult(result)
      setPhase('result')

      // ── localStorage에 항상 저장 (Supabase 독립) ──
      const newRecord = {
        id: crypto.randomUUID(),
        dream_date: new Date().toISOString().slice(0, 10),
        dream_text: text,
        overall_sentiment: result.overallSentiment,
        overall_summary: result.overallSummary,
        main_interpretation: result.mainInterpretation,
        domains: result.domains,
        todays_advice: result.todaysAdvice,
        lucky_color: result.luckyColor,
        detected_symbols: result.detectedSymbols,
        created_at: new Date().toISOString(),
      }
      try {
        const existing = JSON.parse(localStorage.getItem('dream_records_local') || '[]')
        const updated = [newRecord, ...existing].slice(0, 50) // 최대 50개
        localStorage.setItem('dream_records_local', JSON.stringify(updated))
        setSaved(true)
      } catch (lsErr) {
        console.warn('[DreamScreen] localStorage 저장 실패:', lsErr)
      }

      // ── Supabase에도 추가 저장 시도 (선택적) ──
      if (supabase) {
        try {
          const kakaoUser = await getUser()
          const { error: saveError } = await supabase.from('dream_records').insert({
            device_id: getDeviceId(),
            user_id: kakaoUser?.id ?? null,
            dream_date: new Date().toISOString().slice(0, 10),
            dream_text: text,
            experience_text: experienceText || null,
            overall_sentiment: result.overallSentiment,
            overall_summary: result.overallSummary,
            main_interpretation: result.mainInterpretation,
            domains: result.domains,
            todays_advice: result.todaysAdvice,
            lucky_color: result.luckyColor,
            lucky_numbers: result.luckyNumbers,
            literature_refs: result.literatureRefs,
            detected_symbols: result.detectedSymbols,
            saju_context: sajuCtx ?? null,
          })
          if (saveError) {
            console.warn('[DreamScreen] Supabase 저장 실패 (localStorage로 대체됨):', saveError.message)
          }
        } catch (saveErr) {
          console.warn('[DreamScreen] Supabase 저장 예외 (localStorage로 대체됨):', saveErr)
        }
      }
    } catch (e) {
      console.error('[DreamScreen]', e)
      alert(`꿈해몽 분석 중 오류가 발생했습니다.\n\n${e instanceof Error ? e.message : String(e)}`)
    } finally {
      clearInterval(stepTimer)
      setLoading(false)
    }
  }

  const handleReset = () => {
    setText(''); setExperienceText(''); setResult(null); setPhase('input'); setExpandedLit({}); setSaved(false)
  }

  const sentimentStyle = result
    ? (SENTIMENT_STYLE[result.overallSentiment] || SENTIMENT_STYLE['평'])
    : SENTIMENT_STYLE['평']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="꿈해몽" showBack rightActions={['fontSize']} />

      {/* ─── 입력 단계 ─── */}
      {phase === 'input' && !loading && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
          {/* 소개 */}
          <div style={{ margin: '0 20px 20px', padding: 24, borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌙</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>꿈해몽</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              주공해몽(周公解夢) 고전문헌과 사주명리학을<br/>
              결합한 정밀 꿈해몽 서비스입니다.
            </p>
            {sajuCtx && (
              <div style={{ marginTop: 10, padding: '6px 12px', borderRadius: 'var(--radius-full)', background: '#FFF8E1', display: 'inline-block' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706' }}>
                  {sajuCtx.dayPillar} 일주 기준으로 해몽합니다
                </span>
              </div>
            )}
          </div>

          {/* 분석 항목 */}
          <div style={{ margin: '0 20px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>분석 항목</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['고전문헌 RAG 검색', '사주 일간 기반 해석', '길흉 판정 + 영역별', '명리학 용어 해설'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#059669', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>

          {/* 꿈 내용 */}
          <div style={{ margin: '0 20px 12px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              🌙 꿈 내용을 자세히 적어주세요 <span style={{ color: '#EF4444', fontSize: 12 }}>*필수</span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="수세식 변기에 황금색 똥을 눴어요. 굵고 길었는데, 왠지 기분이 좋았어요..."
              style={{
                width: '100%', minHeight: 140, padding: 16, borderRadius: 14,
                border: '1.5px solid var(--border-1)', background: 'var(--bg-surface)',
                fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7,
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <div style={{ fontSize: 11, color: text.length >= 10 ? '#059669' : 'var(--text-tertiary)', marginTop: 4, textAlign: 'right' }}>
              {text.length >= 10 ? '✓ 충분합니다' : `${text.length}자 (최소 10자)`}
            </div>
          </div>

          {/* 최근 경험 (선택) */}
          <div style={{ margin: '0 20px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              🌿 최근 주요 경험 <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>선택 — 더 정확한 해석에 도움</span>
            </div>
            <textarea
              value={experienceText}
              onChange={e => setExperienceText(e.target.value)}
              placeholder="요즘 직장에서 스트레스가 많아요. 중요한 프로젝트를 앞두고 있어요..."
              style={{
                width: '100%', minHeight: 80, padding: 14, borderRadius: 14,
                border: '1px solid var(--border-1)', background: 'var(--bg-surface)',
                fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6,
                resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 팁 */}
          <div style={{ margin: '0 20px 20px', padding: '14px 16px', borderRadius: 12, background: '#FFF8E1', border: '1px solid #FFE4CC' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>💡 정확한 해석을 위한 팁</div>
            <ul style={{ fontSize: 12, color: '#92400E', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
              <li>변/똥 꿈은 주공해몽에서 대표적인 재물운 길조입니다</li>
              <li>동물의 색상, 크기, 행동을 구체적으로 적어주세요</li>
              <li>꿈에서의 감정(기쁨/두려움)이 해석의 핵심입니다</li>
            </ul>
          </div>
        </div>
      )}

      {/* ─── 로딩 단계 ─── */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 24 }}>
          <div style={{ fontSize: 48 }}>🌙</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
            꿈을 해몽하고 있습니다
          </div>
          <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LOADING_STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: i < loadingStep ? '#059669' : i === loadingStep ? 'var(--bg-accent)' : 'var(--bg-surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: i === loadingStep ? '2px solid var(--text-accent)' : 'none',
                }}>
                  {i < loadingStep && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
                  {i === loadingStep && <Loader2 size={10} style={{ animation: 'spin 1s linear infinite', color: '#1F2937' }} />}
                </div>
                <span style={{ fontSize: 13, color: i <= loadingStep ? 'var(--text-primary)' : 'var(--text-disabled)', fontWeight: i === loadingStep ? 600 : 400 }}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
            주공해몽(周公解夢) 고전문헌을<br/>
            사주와 결합하여 분석 중입니다
          </div>
        </div>
      )}

      {/* ─── 결과 단계 ─── */}
      {phase === 'result' && result && !loading && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>
          {/* 저장 완료 알림 */}
          {saved && (
            <div style={{ margin: '0 20px 10px', padding: '10px 14px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #6EE7B7', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>✅</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>분석 기록에 저장되었습니다 — 마이페이지 &gt; 분석 기록에서 확인하세요</span>
            </div>
          )}

          {/* 종합 판정 */}
          <div style={{
            margin: '0 20px 16px', padding: '20px 18px', borderRadius: 16,
            background: `linear-gradient(135deg, ${sentimentStyle.bg} 0%, #FFFFFF 100%)`,
            border: `1.5px solid ${sentimentStyle.color}33`,
          }}>
            <div style={{ textAlign: 'center', fontSize: 40, marginBottom: 8 }}>{sentimentStyle.emoji}</div>
            <div style={{ textAlign: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: sentimentStyle.color }}>{result.overallSentiment}</span>
              <span style={{ fontSize: 14, color: 'var(--text-tertiary)', marginLeft: 8 }}>{result.overallSummary}</span>
            </div>
            {sajuCtx && (
              <div style={{ textAlign: 'center', padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.7)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {sajuCtx.dayPillar} · {sajuCtx.ilgan}({sajuCtx.ilganElement}) 일간 기준 · {result.detectedSymbols?.join(', ')}
              </div>
            )}
          </div>

          {/* 본문 해몽 */}
          <div style={{ margin: '0 20px 16px', padding: '16px 18px', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>📖 해몽 본문</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>{result.mainInterpretation}</div>
          </div>

          {/* 영역별 해석 */}
          {result.domains && result.domains.length > 0 && (
            <div style={{ margin: '0 20px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>📊 영역별 해석</div>
              {result.domains.map((d, i) => {
                const ds = SENTIMENT_STYLE[d.rating] || SENTIMENT_STYLE['평']
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', marginBottom: 8 }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{DOMAIN_ICONS[d.name] || '🔮'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{d.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: ds.bg, color: ds.color }}>{d.rating}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d.summary}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 오늘의 조언 */}
          <div style={{ margin: '0 20px 16px', padding: '16px 18px', borderRadius: 14, background: '#F0FFF4', border: '1px solid #C6F6D5' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#276749', marginBottom: 8 }}>🔮 사주가의 조언</div>
            <div style={{ fontSize: 14, color: '#276749', lineHeight: 1.7 }}>{result.todaysAdvice}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#276749' }}>🎨 행운색: <strong>{result.luckyColor}</strong></span>
              {result.luckyNumbers?.length > 0 && (
                <span style={{ fontSize: 12, color: '#276749' }}>
                  🎲 행운번호: {result.luckyNumbers.map(n => (
                    <strong key={n} style={{ marginLeft: 4, background: '#FFF8E1', padding: '0 6px', borderRadius: 4, color: '#D97706' }}>{n}</strong>
                  ))}
                </span>
              )}
            </div>
          </div>

          {/* 고전문헌 근거 */}
          {result.literatureRefs && result.literatureRefs.length > 0 && (
            <div style={{ margin: '0 20px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>📜 고전문헌 근거</div>
              {result.literatureRefs.map((ref, i) => (
                <LiteratureCard
                  key={i} ref={ref}
                  expanded={!!expandedLit[i]}
                  onToggle={() => setExpandedLit(prev => ({ ...prev, [i]: !prev[i] }))}
                />
              ))}
            </div>
          )}

          {/* 추가 질문 안내 */}
          {result.needsMoreDetail && result.additionalQuestion && (
            <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 12, background: '#F0F4FF', border: '1px solid #D0DCFF' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#3B5998', marginBottom: 4 }}>💬 더 정확한 해몽을 원하신다면</div>
              <div style={{ fontSize: 12, color: '#3B5998', lineHeight: 1.6 }}>{result.additionalQuestion}</div>
            </div>
          )}

          {/* 입력한 꿈 내용 */}
          <div style={{ margin: '0 20px 20px', padding: '14px 16px', borderRadius: 12, background: 'var(--bg-surface-3)', border: '1px solid var(--border-1)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6 }}>입력한 꿈 내용</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</div>
          </div>
        </div>
      )}

      {/* ─── CTA ─── */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 50 }}>
        {phase === 'input' && !loading && (
          <button onClick={handleInterpret} disabled={text.trim().length < 10 || loading} style={{
            width: '100%', padding: 16, borderRadius: 'var(--radius-md)',
            fontSize: 16, fontWeight: 700, textAlign: 'center',
            background: text.trim().length < 10 ? 'var(--border-1)' : 'var(--bg-accent)',
            color: text.trim().length < 10 ? 'var(--text-disabled)' : '#1F2937',
            boxShadow: 'var(--shadow-md)', border: 'none',
            cursor: text.trim().length < 10 ? 'not-allowed' : 'pointer',
          }}>
            {text.trim().length < 10 ? '꿈 내용을 10자 이상 입력해주세요' : '✦ 꿈해몽 시작'}
          </button>
        )}
        {phase === 'result' && !loading && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleReset} style={{ flex: 1, padding: 16, borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 700, background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)' }}>
              다른 꿈 해석
            </button>
            <button onClick={() => window.history.back()} style={{ flex: 1, padding: 16, borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 700, background: 'var(--bg-accent)', color: '#1F2937', border: 'none' }}>
              완료
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
