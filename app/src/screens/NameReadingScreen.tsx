import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import Header from '@/components/layout/Header'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/* ─── 딥블루 디자인 토큰 ─── */
const N = {
  primary:  '#1E3A8A',
  soft:     '#2563EB',
  light:    '#3B82F6',
  bg:       '#EFF6FF',
  bgMid:    '#DBEAFE',
  border:   '#93C5FD',
  text:     '#1E3A8A',
  textSoft: '#1D4ED8',
  gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)',
} as const

/* ─── 타입 ─── */
interface HanjaOption { id: number; hanja: string; strokes: number; element: string; meaning: string; gender_pref: string }
interface SurnameOption { id: number; hanja: string; strokes: number; element: string }
interface GridInfo { number: number; name: string; luck: string; luck_score: number; description: string; keywords: string[] }
interface CharInterpretation { hanja: string; reading: string; meaning: string; symbolism: string }
interface AnalysisResult {
  full_name: string; full_hanja: string; total_strokes: number
  grids: { won: GridInfo; hyeong: GridInfo; i: GridInfo; jeong: GridInfo; chong: GridInfo }
  yin_yang: string[]; yin_yang_balanced: boolean; elements: string[]
  chars: { hanja: string; strokes: number; label: string }[]
  llm: {
    name_reading: string
    char_interpretations: CharInterpretation[]
    overall_verdict: string; strengths: string[]; cautions: string[]
    personality: string; career_fortune: string; lucky_advice: string; score: number
  }
}

/* ─── 길흉 색상 ─── */
function luckColor(luck: string) {
  if (luck.includes('대길')) return { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' }
  if (luck === '길') return { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' }
  if (luck.includes('반길')) return { bg: '#FFF8E1', color: '#D97706', border: '#FCD34D' }
  if (luck === '평') return { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' }
  if (luck === '흉') return { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' }
  return { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' }
}

/* ─── 점수 표시 ─── */
function LuckBadge({ luck, score }: { luck: string; score: number }) {
  const c = luckColor(luck)
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {luck} {score}점
    </span>
  )
}

/* ─── 오행 색상 ─── */
const EL_COLOR: Record<string, string> = { '목': '#059669', '화': '#DC2626', '토': '#D97706', '금': '#4F46E5', '수': '#0284C7' }

/* ─── 한자 선택 모달 ─── */
function HanjaSelector({ syllable, options, selected, onSelect, onClose }: {
  syllable: string; options: HanjaOption[]; selected: HanjaOption | null
  onSelect: (h: HanjaOption) => void; onClose: () => void
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', zIndex: 401, maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '14px 20px 12px', background: N.gradient, borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>"{syllable}" 한자 선택</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>사용하는 한자를 선택하세요</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 24px' }}>
          {options.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              해당 음절의 한자 정보가 없습니다.<br />직접 획수를 입력해주세요.
            </div>
          ) : options.map(opt => (
            <button key={opt.id} onClick={() => { onSelect(opt); onClose() }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, marginBottom: 8, textAlign: 'left',
              background: selected?.hanja === opt.hanja ? N.bg : 'var(--bg-surface)',
              border: `${selected?.hanja === opt.hanja ? '2px' : '1px'} solid ${selected?.hanja === opt.hanja ? N.border : 'var(--border-1)'}`,
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: N.primary, minWidth: 40, textAlign: 'center' }}>{opt.hanja}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{opt.hanja} ({syllable})</span>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: `${EL_COLOR[opt.element] || '#64748B'}20`, color: EL_COLOR[opt.element] || '#64748B', fontWeight: 700 }}>{opt.element}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{opt.meaning} · {opt.strokes}획</div>
              </div>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-tertiary)' }}>{opt.strokes}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/* ─── 격(格) 카드 ─── */
function GridCard({ label, info, open, onToggle }: { label: string; info: GridInfo; open: boolean; onToggle: () => void }) {
  const c = luckColor(info.luck)
  return (
    <div style={{ marginBottom: 8, borderRadius: 12, border: `1px solid ${open ? N.border : 'var(--border-1)'}`, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: open ? N.bg : 'var(--bg-surface)', textAlign: 'left' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: c.color }}>{info.number}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{label} ({info.name})</span>
            <LuckBadge luck={info.luck} score={info.luck_score} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{info.number}수 · {info.keywords?.slice(0,3).join(' · ')}</div>
        </div>
        {open ? <ChevronUp size={15} color="var(--text-tertiary)" /> : <ChevronDown size={15} color="var(--text-tertiary)" />}
      </button>
      {open && (
        <div style={{ padding: '10px 14px 14px', borderTop: `1px solid ${N.border}`, background: N.bgMid }}>
          <p style={{ fontSize: 13, color: N.text, lineHeight: 1.75, margin: 0 }}>{info.description}</p>
        </div>
      )}
    </div>
  )
}

/* ─── 메인 화면 ─── */
export default function NameReadingScreen() {
  const nav = useNavigate()

  /* 입력 상태 */
  const [surnameHangul, setSurnameHangul] = useState('')
  const [surnameOptions, setSurnameOptions] = useState<SurnameOption[]>([])
  const [selectedSurname, setSelectedSurname] = useState<SurnameOption | null>(null)
  const [surnameLoading, setSurnameLoading] = useState(false)
  // 미등록 성씨 수동 입력
  const [manualHanja, setManualHanja] = useState('')
  const [manualStrokes, setManualStrokes] = useState('')
  const [givenHangul, setGivenHangul] = useState('')  // 이름 한글 (예: 민준)
  const [givenChars, setGivenChars] = useState<{ hangul: string; selected: HanjaOption | null; options: HanjaOption[]; loadingOptions: boolean }[]>([])
  const [selectorOpen, setSelectorOpen] = useState<number | null>(null)  // null=성씨, 0~n=이름글자
  const [surnameModalOpen, setSurnameModalOpen] = useState(false)

  /* 분석 상태 */
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [openGrids, setOpenGrids] = useState<Set<string>>(new Set(['won']))

  /* 성씨 변경 → DB 조회 */
  useEffect(() => {
    if (!surnameHangul.trim()) {
      setSurnameOptions([]); setSelectedSurname(null); setSurnameLoading(false)
      setManualHanja(''); setManualStrokes(''); return
    }
    setSurnameLoading(true)
    fetch(`${API_BASE}/api/name/surnames/${encodeURIComponent(surnameHangul.trim())}`)
      .then(r => r.json())
      .then(data => {
        setSurnameOptions(data)
        if (data.length === 1) setSelectedSurname(data[0])
        else if (data.length > 1 && !selectedSurname) setSelectedSurname(null)
      })
      .catch(() => setSurnameOptions([]))
      .finally(() => setSurnameLoading(false))
  }, [surnameHangul])

  /* 이름 한글 변경 → 글자별 분해 + 한자 목록 조회 */
  const handleGivenChange = useCallback(async (val: string) => {
    setGivenHangul(val)
    const syllables = val.trim().split('').filter(c => c.match(/[가-힣]/))
    const chars = await Promise.all(syllables.map(async syl => {
      try {
        const data = await fetch(`${API_BASE}/api/name/characters/${encodeURIComponent(syl)}`).then(r => r.json())
        return { hangul: syl, selected: data.length === 1 ? data[0] : null, options: data, loadingOptions: false }
      } catch {
        return { hangul: syl, selected: null, options: [], loadingOptions: false }
      }
    }))
    setGivenChars(chars)
    setResult(null)
  }, [])

  // 수동입력 오행 계산 (수리오행)
  function calcElement(strokes: number): string {
    const r = strokes % 10
    if (r === 1 || r === 2) return '목'
    if (r === 3 || r === 4) return '화'
    if (r === 5 || r === 6) return '토'
    if (r === 7 || r === 8) return '금'
    return '수'
  }

  // 수동입력 완성 시 selectedSurname 합성
  useEffect(() => {
    if (surnameOptions.length > 0) return  // DB 있으면 수동입력 불필요
    const s = parseInt(manualStrokes, 10)
    if (manualHanja && s > 0) {
      setSelectedSurname({ id: -1, hanja: manualHanja, strokes: s, element: calcElement(s) })
    } else {
      setSelectedSurname(null)
    }
  }, [manualHanja, manualStrokes, surnameOptions.length])

  const isReady = () => {
    if (!selectedSurname) return false
    if (givenChars.length === 0) return false
    return givenChars.every(c => c.selected !== null)
  }

  async function handleAnalyze() {
    if (!isReady()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const body = {
        surname_hangul: surnameHangul,
        surname_hanja: selectedSurname!.hanja,
        surname_strokes: selectedSurname!.strokes,
        given_chars: givenChars.map(c => ({
          hangul: c.hangul,
          hanja: c.selected!.hanja,
          strokes: c.selected!.strokes,
          meaning: c.selected!.meaning || '',
        })),
      }
      const res = await fetch(`${API_BASE}/api/name/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(`API 오류: ${res.status}`)
      const data = await res.json()
      setResult(data)
      setOpenGrids(new Set(['won']))

      // 분석기록 저장 (localStorage)
      try {
        const record = {
          id: `name_${Date.now()}`,
          full_name: data.full_name ?? '',
          full_hanja: data.full_hanja ?? '',
          total_strokes: data.total_strokes ?? 0,
          score: data.llm?.score ?? 0,
          name_reading: data.llm?.name_reading ?? '',
          created_at: new Date().toISOString(),
        }
        const prev = JSON.parse(localStorage.getItem('name_readings_local') || '[]')
        localStorage.setItem('name_readings_local', JSON.stringify([record, ...prev].slice(0, 50)))
      } catch { /* 저장 실패 무시 */ }
    } catch (e: any) {
      setError(e.message || '분석 오류')
    } finally {
      setLoading(false)
    }
  }

  const GRID_LABELS: Record<string, string> = {
    won: '원격(元格) — 천운', hyeong: '형격(亨格) — 이름운',
    i: '이격(利格) — 사회운', jeong: '정격(貞格) — 이름기운', chong: '총격(總格) — 종합운',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="이름풀이" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 입력 카드 ─── */}
        <div style={{ margin: '14px 20px 16px', padding: '18px 16px', borderRadius: 16, background: 'var(--bg-surface)', border: `1.5px solid ${N.border}`, overflow: 'hidden', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: N.primary, marginBottom: 14 }}>이름 입력</div>

          {/* 성씨 입력 */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>성씨 (한글)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={surnameHangul}
                onChange={e => setSurnameHangul(e.target.value.slice(0,1))}
                placeholder="성씨 입력 (예: 김)"
                maxLength={1}
                style={{ flex: 1, minWidth: 0, height: 42, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${surnameHangul ? N.border : 'var(--border-1)'}`, background: surnameHangul ? N.bg : 'var(--bg-surface)', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: N.text, transition: 'all 0.15s' }}
              />
              {/* 성씨 한자 선택 버튼 — 글자 입력 후 항상 표시 */}
              {surnameHangul && (
                <button
                  onClick={() => surnameOptions.length > 0 && setSurnameModalOpen(true)}
                  disabled={surnameLoading || surnameOptions.length === 0}
                  style={{
                    flexShrink: 0, padding: '0 14px', height: 42, borderRadius: 10,
                    border: `1.5px solid ${selectedSurname ? N.border : surnameLoading ? 'var(--border-1)' : surnameOptions.length === 0 ? '#FED7AA' : 'var(--border-1)'}`,
                    background: selectedSurname ? N.bg : surnameLoading ? 'var(--bg-surface-3)' : surnameOptions.length === 0 ? '#FFF7ED' : 'var(--bg-surface)',
                    cursor: surnameOptions.length > 0 && !surnameLoading ? 'pointer' : 'default',
                    fontSize: 13, fontWeight: 700,
                    color: selectedSurname ? N.primary : surnameLoading ? 'var(--text-tertiary)' : surnameOptions.length === 0 ? '#EA580C' : 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    minWidth: 80, transition: 'all 0.2s',
                  }}
                >
                  {surnameLoading ? (
                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> 조회중</>
                  ) : selectedSurname ? (
                    <><span style={{ fontSize: 18, fontWeight: 900 }}>{selectedSurname.hanja}</span> {selectedSurname.strokes}획</>
                  ) : surnameOptions.length === 0 ? (
                    '미등록'
                  ) : (
                    '한자 선택'
                  )}
                </button>
              )}
            </div>
            {selectedSurname && (
              <div style={{ marginTop: 6, fontSize: 11, color: N.soft }}>
                {selectedSurname.hanja} · {selectedSurname.strokes}획 · {selectedSurname.element}(五行)
              </div>
            )}
            {surnameHangul && !surnameLoading && surnameOptions.length === 0 && (
              <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 10, background: N.bgMid, border: `1px solid ${N.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: N.primary, marginBottom: 8 }}>
                  DB에 없는 성씨입니다. 직접 입력해주세요.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>성씨 한자</label>
                    <input
                      value={manualHanja}
                      onChange={e => setManualHanja(e.target.value.slice(0, 1))}
                      placeholder="예: 陳"
                      maxLength={1}
                      style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, border: `1.5px solid ${manualHanja ? N.border : 'var(--border-1)'}`, background: manualHanja ? N.bg : 'var(--bg-surface)', fontSize: 16, fontWeight: 700, outline: 'none', fontFamily: 'inherit', color: N.text, boxSizing: 'border-box', textAlign: 'center' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>획수</label>
                    <input
                      value={manualStrokes}
                      onChange={e => setManualStrokes(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="예: 16"
                      inputMode="numeric"
                      style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 8, border: `1.5px solid ${manualStrokes ? N.border : 'var(--border-1)'}`, background: manualStrokes ? N.bg : 'var(--bg-surface)', fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit', color: N.text, boxSizing: 'border-box', textAlign: 'center' }}
                    />
                  </div>
                  {manualHanja && manualStrokes && (
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 0 }}>
                      <label style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>오행</label>
                      <div style={{ height: 38, padding: '0 10px', borderRadius: 8, background: N.bg, border: `1px solid ${N.border}`, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: N.primary }}>
                        {calcElement(parseInt(manualStrokes, 10))}
                      </div>
                    </div>
                  )}
                </div>
                {manualHanja && manualStrokes && (
                  <div style={{ marginTop: 6, fontSize: 11, color: N.soft }}>
                    {manualHanja}({surnameHangul}) · {manualStrokes}획 · {calcElement(parseInt(manualStrokes, 10))}(五行) — 수리오행 자동 계산
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 이름 입력 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>이름 (한글)</label>
            <input
              value={givenHangul}
              onChange={e => handleGivenChange(e.target.value.slice(0,2))}
              placeholder="이름 입력 (예: 민준)"
              maxLength={2}
              style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: 10, border: `1.5px solid ${givenHangul ? N.border : 'var(--border-1)'}`, background: givenHangul ? N.bg : 'var(--bg-surface)', fontSize: 14, outline: 'none', fontFamily: 'inherit', color: N.text, boxSizing: 'border-box', transition: 'all 0.15s' }}
            />
          </div>

          {/* 이름 한자 선택 (글자별) */}
          {givenChars.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 8 }}>이름 한자 선택</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {givenChars.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectorOpen(i)}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: 12, textAlign: 'center',
                      border: `${c.selected ? '2px' : '1.5px'} solid ${c.selected ? N.border : N.light}`,
                      background: c.selected ? N.bg : N.bgMid,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 900, color: c.selected ? N.primary : N.light }}>
                      {c.selected ? c.selected.hanja : '?'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{c.hangul} ({c.selected ? `${c.selected.strokes}획` : '미선택'})</div>
                    {c.selected && <div style={{ fontSize: 10, color: EL_COLOR[c.selected.element] || N.soft, marginTop: 1 }}>{c.selected.element}</div>}
                  </button>
                ))}
              </div>
              {givenChars.some(c => !c.selected) && (
                <div style={{ fontSize: 11, color: N.soft, marginTop: 6, fontWeight: 600 }}>한자를 탭하여 선택해주세요</div>
              )}
            </div>
          )}

          {/* 분석 버튼 */}
          <button
            onClick={handleAnalyze}
            disabled={!isReady() || loading}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, fontSize: 15, fontWeight: 800,
              background: isReady() && !loading ? N.soft : 'var(--border-1)',
              color: isReady() && !loading ? '#fff' : 'var(--text-disabled)',
              border: 'none', cursor: isReady() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: isReady() && !loading ? `0 2px 8px ${N.soft}50` : 'none',
            }}
          >
            {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> 풀이 중...</> : '이름풀이 시작'}
          </button>

          {error && <div style={{ marginTop: 10, fontSize: 12, color: '#DC2626', textAlign: 'center' }}>{error}</div>}
        </div>

        {/* ─── 분석 결과 ─── */}
        {result && (
          <>
            {/* ─── 이름의 뜻 카드 ─── */}
            {(result.llm?.name_reading || result.llm?.char_interpretations?.length > 0) && (
              <div style={{ margin: '0 20px 16px', padding: '18px 16px', borderRadius: 16, background: 'var(--bg-surface)', border: `1.5px solid ${N.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: N.primary, marginBottom: 14, letterSpacing: 0.5 }}>
                  이름의 뜻과 의미
                </div>

                {/* 글자별 뜻 해석 */}
                {result.llm?.char_interpretations?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {result.llm.char_interpretations.map((ci, i) => {
                      const el = result.elements?.[i] || ''
                      const col = EL_COLOR[el] || N.primary
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, background: `${col}08`, border: `1px solid ${col}25` }}>
                          {/* 한자 + 음 */}
                          <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
                            <div style={{ fontSize: 26, fontWeight: 900, color: col, lineHeight: 1 }}>{ci.hanja}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: col, marginTop: 3 }}>{ci.reading}</div>
                          </div>
                          {/* 뜻 + 상징 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                              {ci.meaning}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              {ci.symbolism}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 이름 전체 의미 해석 */}
                {result.llm?.name_reading && (
                  <div style={{ padding: '12px 14px', borderRadius: 12, background: N.bgMid, border: `1px solid ${N.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: N.textSoft, marginBottom: 6 }}>이름 전체가 담은 의미</div>
                    <div style={{ fontSize: 13, color: N.text, lineHeight: 1.8, fontWeight: 500 }}>
                      {result.llm.name_reading}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 종합 점수 카드 */}
            <div style={{ margin: '0 20px 16px', padding: '20px 18px', borderRadius: 18, background: N.gradient, border: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{result.llm?.score ?? '—'}</span>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>{result.full_name}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{result.full_hanja} · 총 {result.total_strokes}획</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                    {result.yin_yang?.join(' · ')} {result.yin_yang_balanced ? '· 음양 균형' : '· 음양 불균형'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 1.8, marginTop: 4, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.1)' }}>{result.llm?.overall_verdict}</div>
            </div>

            {/* 수리오행 · 음양 시각화 */}
            <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${N.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: N.primary, marginBottom: 10, letterSpacing: 0.3 }}>수리오행 & 음양 배열</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {result.chars?.map((c, i) => {
                  const el = result.elements?.[i] || ''
                  const yy = result.yin_yang?.[i] || ''
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10, background: `${EL_COLOR[el] || '#64748B'}10`, border: `1px solid ${EL_COLOR[el] || '#64748B'}30` }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: EL_COLOR[el] || '#64748B' }}>{c.hanja}</div>
                      <div style={{ fontSize: 10, color: EL_COLOR[el] || '#64748B', fontWeight: 700, marginTop: 2 }}>{el}({c.strokes}획)</div>
                      <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 1 }}>{yy.slice(0,1)}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 오격(五格) 분석 */}
            <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${N.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: N.primary, marginBottom: 10, letterSpacing: 0.3 }}>오격(五格) 81수리 분석</div>
              {Object.entries(result.grids || {}).map(([key, info]) => (
                <GridCard
                  key={key}
                  label={GRID_LABELS[key] || key}
                  info={info as GridInfo}
                  open={openGrids.has(key)}
                  onToggle={() => setOpenGrids(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })}
                />
              ))}
            </div>

            {/* LLM 상세 분석 */}
            {result.llm && (
              <div style={{ margin: '0 20px 16px' }}>
                {result.llm.strengths?.length > 0 && (
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: N.bg, border: `1px solid ${N.border}`, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: N.primary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: N.primary, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 900 }}>+</span>
                      이름의 강점
                    </div>
                    {result.llm.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, color: N.text, lineHeight: 1.65, paddingLeft: 10, borderLeft: `3px solid ${N.light}`, marginBottom: 6 }}>{s}</div>)}
                  </div>
                )}
                {result.llm.cautions?.length > 0 && (
                  <div style={{ padding: '14px 16px', borderRadius: 14, background: '#FFF7ED', border: '1px solid #FED7AA', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#EA580C', marginBottom: 8 }}>주의사항</div>
                    {result.llm.cautions.map((c, i) => <div key={i} style={{ fontSize: 13, color: '#9A3412', lineHeight: 1.65, paddingLeft: 10, borderLeft: '3px solid #FED7AA', marginBottom: 6 }}>{c}</div>)}
                  </div>
                )}
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${N.border}`, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: N.primary, marginBottom: 6, letterSpacing: 0.3 }}>성격·기질</div>
                  <div style={{ fontSize: 13, color: N.text, lineHeight: 1.8 }}>{result.llm.personality}</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${N.border}`, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: N.primary, marginBottom: 6, letterSpacing: 0.3 }}>직업·재물운</div>
                  <div style={{ fontSize: 13, color: N.text, lineHeight: 1.8 }}>{result.llm.career_fortune}</div>
                </div>
                <div style={{ padding: '16px', borderRadius: 14, background: N.gradient }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 8, letterSpacing: 0.5 }}>이름 주인에게 드리는 조언</div>
                  <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.8, fontStyle: 'italic', fontWeight: 500 }}>"{result.llm.lucky_advice}"</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── 성씨 선택 모달 ─── */}
      {surnameModalOpen && (
        <>
          <div onClick={() => setSurnameModalOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', zIndex: 401, maxHeight: '60vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '14px 20px 12px', background: N.gradient, borderRadius: '20px 20px 0 0', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.4)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>"{surnameHangul}" 성씨 한자 선택</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>사용하는 한자를 선택하세요</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 24px' }}>
              {surnameOptions.map(opt => (
                <button key={opt.id} onClick={() => { setSelectedSurname(opt); setSurnameModalOpen(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, marginBottom: 8, textAlign: 'left', background: selectedSurname?.hanja === opt.hanja ? N.bg : 'var(--bg-surface)', border: `${selectedSurname?.hanja === opt.hanja ? '2px' : '1px'} solid ${selectedSurname?.hanja === opt.hanja ? N.border : 'var(--border-1)'}`, cursor: 'pointer' }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: N.primary, minWidth: 40, textAlign: 'center' }}>{opt.hanja}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{opt.hanja} ({surnameHangul})</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{opt.strokes}획 · 오행: {opt.element}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── 이름 한자 선택 모달 ─── */}
      {selectorOpen !== null && givenChars[selectorOpen] && (
        <HanjaSelector
          syllable={givenChars[selectorOpen].hangul}
          options={givenChars[selectorOpen].options}
          selected={givenChars[selectorOpen].selected}
          onSelect={opt => setGivenChars(prev => prev.map((c, i) => i === selectorOpen ? { ...c, selected: opt } : c))}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </div>
  )
}
