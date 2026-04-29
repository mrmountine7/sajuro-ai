import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Heart, ChevronDown, ChevronUp } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getCurrentIdentity, applyUserFilter } from '@/lib/user-filter'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/* ─── 분홍/로즈 디자인 토큰 ─── */
const R = {
  primary:  '#DB2777',
  soft:     '#EC4899',
  bg:       '#FFF0F6',
  bgMid:    '#FDF2F8',
  border:   '#FBCFE8',
  text:     '#831843',
  textSoft: '#9D174D',
  gradient: 'linear-gradient(135deg, #FFF0F6 0%, #FDF2F8 100%)',
} as const

interface IdealTypeResult {
  summary: string
  spouse_star_analysis: string
  spouse_palace: string
  personality_traits: string[]
  appearance_tendency: string
  career_background: string
  compatible_elements: string[]
  compatible_ilju: string[]
  caution: string
  timing: string
  gender: string
  name: string
}

interface Profile {
  name: string; gender: string
  birth_year: number; birth_month: number; birth_day: number
  birth_hour: string; calendar_type: string
}

function parseBirthHour(h: string): [number, number] {
  if (!h || h === 'unknown') return [12, 0]
  const m = h.match(/(\d+):(\d+)/)
  return m ? [+m[1], +m[2]] : [12, 0]
}

/* ─── 섹션 아코디언 ─── */
function Section({ title, emoji, children, defaultOpen = false }: {
  title: string; emoji: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ margin: '0 20px 10px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${open ? R.border : 'var(--border-1)'}`, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: open ? R.bg : 'var(--bg-surface)', textAlign: 'left' }}
      >
        <span style={{ fontSize: 20 }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: open ? R.primary : 'var(--text-primary)' }}>{title}</span>
        {open ? <ChevronUp size={15} color="var(--text-tertiary)" /> : <ChevronDown size={15} color="var(--text-tertiary)" />}
      </button>
      {open && (
        <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${R.border}`, background: R.bgMid }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function IdealTypeScreen() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [result, setResult] = useState<IdealTypeResult | null>(null)

  useEffect(() => {
    async function load() {
      if (!supabase) { setError('Supabase 미연결'); setLoading(false); return }
      const identity = await getCurrentIdentity()
      const { data } = await applyUserFilter(
        supabase.from('profiles').select('name, gender, birth_year, birth_month, birth_day, birth_hour, calendar_type'),
        identity
      ).eq('is_primary', true).single()
      if (!data) { setError('프로필이 없습니다. 사주 보관소에서 먼저 등록해주세요.'); setLoading(false); return }
      const p = data as Profile
      const [h, mi] = parseBirthHour(p.birth_hour)
      try {
        const res = await fetch(`${API_BASE}/api/saju/ideal-type`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: p.name, gender: p.gender,
            year: p.birth_year, month: p.birth_month, day: p.birth_day,
            hour: h, minute: mi,
            is_lunar: p.calendar_type !== 'solar',
          }),
        })
        if (!res.ok) throw new Error(`API 오류: ${res.status}`)
        setResult(await res.json())
      } catch (e: any) {
        setError(e.message || '분석 오류')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="나의 이상형 사주 분석" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '40px 20px' }}>
        <div style={{ fontSize: 52 }}>💕</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: R.text }}>이상형을 분석하고 있습니다</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.6 }}>
          배우자성과 일지(배우자궁)를 분석 중...<br />잠시만 기다려주세요
        </div>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: R.primary }} />
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="나의 이상형 사주 분석" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{error}</div>
        <button onClick={() => nav('/vault')} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: R.bg, color: R.primary, fontSize: 14, fontWeight: 700, border: `1px solid ${R.border}`, cursor: 'pointer' }}>
          사주 보관소로 이동
        </button>
      </div>
    </div>
  )

  if (!result) return null
  const isFemale = result.gender === 'female'
  const spouseTerm = isFemale ? '남편성(관성)' : '아내성(재성)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="나의 이상형 사주 분석" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>

        {/* ─── 요약 카드 ─── */}
        <div style={{ margin: '14px 20px 16px', padding: '20px 18px', borderRadius: 18, background: R.gradient, border: `1.5px solid ${R.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: R.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={22} color="#fff" fill="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: R.textSoft }}>
                {result.name}님의 이상형
              </div>
              <div style={{ fontSize: 11, color: R.soft, marginTop: 2 }}>
                {spouseTerm} 기반 분석
              </div>
            </div>
          </div>
          <div style={{ fontSize: 14, color: R.text, lineHeight: 1.8, fontWeight: 500 }}>
            {result.summary}
          </div>
        </div>

        {/* ─── 성격 특성 태그 ─── */}
        {result.personality_traits?.length > 0 && (
          <div style={{ margin: '0 20px 16px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: R.textSoft, marginBottom: 10 }}>💫 이상형의 성격 특성</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.personality_traits.map((trait, i) => (
                <span key={i} style={{ fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 'var(--radius-full)', background: R.bg, color: R.primary, border: `1px solid ${R.border}` }}>
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ─── 잘 맞는 일주 ─── */}
        {result.compatible_ilju?.length > 0 && (
          <div style={{ margin: '0 20px 16px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: `1px solid ${R.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: R.textSoft, marginBottom: 10 }}>⭐ 잘 맞는 일주(日柱)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.compatible_ilju.map((ilju, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: R.bgMid, border: `1px solid ${R.border}` }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: R.primary, flexShrink: 0, minWidth: 20 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: R.text, lineHeight: 1.5 }}>{ilju}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 아코디언 섹션들 ─── */}
        <Section title={`${spouseTerm} 구조 분석`} emoji="🔮" defaultOpen={true}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{result.spouse_star_analysis}</p>
        </Section>

        <Section title="일지(배우자궁) 분석" emoji="🏠">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{result.spouse_palace}</p>
        </Section>

        <Section title="외모·인상 경향" emoji="✨">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{result.appearance_tendency}</p>
        </Section>

        <Section title="직업·배경 경향" emoji="💼">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{result.career_background}</p>
        </Section>

        {result.compatible_elements?.length > 0 && (
          <Section title="잘 맞는 오행(五行)" emoji="🌟">
            <div style={{ display: 'flex', gap: 8 }}>
              {result.compatible_elements.map((el, i) => (
                <span key={i} style={{ fontSize: 14, fontWeight: 700, padding: '6px 16px', borderRadius: 'var(--radius-full)', background: R.bg, color: R.primary, border: `1px solid ${R.border}` }}>
                  {el}
                </span>
              ))}
            </div>
          </Section>
        )}

        <Section title="⚠️ 주의할 관계 패턴" emoji="🛡️">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{result.caution}</p>
        </Section>

        <Section title="인연의 시기와 조건" emoji="⏰">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75, margin: 0 }}>{result.timing}</p>
        </Section>

        {/* ─── 하단 CTA ─── */}
        <div style={{ margin: '16px 20px 0', display: 'flex', gap: 10 }}>
          <button
            onClick={() => nav('/analysis/couple')}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: R.primary, color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}
          >
            💑 연인궁합 분석하기
          </button>
          <button
            onClick={() => nav('/analysis/marriage')}
            style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: R.bg, color: R.primary, fontSize: 14, fontWeight: 700, border: `1px solid ${R.border}`, cursor: 'pointer' }}
          >
            💍 결혼궁합 분석하기
          </button>
        </div>
      </div>
    </div>
  )
}
