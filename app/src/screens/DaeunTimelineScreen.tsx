import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getCurrentIdentity, applyUserFilter } from '@/lib/user-filter'
import {
  calculateFullSaju, calculateDaeun,
  getTenGodIndex, TEN_GODS,
  ELEMENTS,
  type DaeunPeriod,
} from '@/lib/saju-engine'

/* ─── 오행 색상 ─── */
const EL_META: Record<string, { bg: string; border: string; color: string; badge: string; char: string }> = {
  '목': { bg: '#ECFDF5', border: '#6EE7B7', color: '#059669', badge: '#D1FAE5', char: '木' },
  '화': { bg: '#FFF1F2', border: '#FCA5A5', color: '#DC2626', badge: '#FEE2E2', char: '火' },
  '토': { bg: '#FFFBEB', border: '#FCD34D', color: '#D97706', badge: '#FEF3C7', char: '土' },
  '금': { bg: '#EEF2FF', border: '#A5B4FC', color: '#4F46E5', badge: '#E0E7FF', char: '金' },
  '수': { bg: '#F0F9FF', border: '#7DD3FC', color: '#0284C7', badge: '#E0F2FE', char: '水' },
}
const DEFAULT_EL = { bg: '#F1F5F9', border: '#CBD5E1', color: '#64748B', badge: '#F1F5F9', char: '?' }

interface Profile {
  name: string; gender: 'male' | 'female'
  birth_year: number; birth_month: number; birth_day: number
  birth_hour: string; calendar_type: string
}

function parseBirthHour(h: string): [number, number] {
  if (!h || h === 'unknown') return [12, 0]
  const m = h.match(/(\d+):(\d+)/)
  return m ? [+m[1], +m[2]] : [12, 0]
}

export default function DaeunTimelineScreen() {
  const nav = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [periods, setPeriods] = useState<DaeunPeriod[]>([])
  const [birthYear, setBirthYear] = useState(0)
  const [dayMasterEl, setDayMasterEl] = useState('')
  const [dayMasterStem, setDayMasterStem] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const currentYear = new Date().getFullYear()

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
      setProfile(p)

      const [h, mi] = parseBirthHour(p.birth_hour)
      const saju = calculateFullSaju({
        name: p.name, gender: p.gender,
        birthYear: p.birth_year, birthMonth: p.birth_month, birthDay: p.birth_day,
        birthHour: h, birthMinute: mi,
        calendarType: p.calendar_type as any,
      })
      const daeuns = calculateDaeun({
        name: p.name, gender: p.gender,
        birthYear: p.birth_year, birthMonth: p.birth_month, birthDay: p.birth_day,
        birthHour: h, birthMinute: mi,
        calendarType: p.calendar_type as any,
      }, saju.monthPillar)

      setPeriods(daeuns)
      setBirthYear(p.birth_year)
      setDayMasterEl(saju.dayMasterElement)
      setDayMasterStem(saju.dayPillar.stem)
      setLoading(false)
    }
    load()
  }, [])

  function currentAge() {
    if (!profile) return 0
    return currentYear - profile.birth_year + 1
  }

  function isPeriodCurrent(p: DaeunPeriod) {
    const age = currentAge()
    return age >= p.startAge && age <= p.endAge
  }
  function isPeriodPast(p: DaeunPeriod) { return currentAge() > p.endAge }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="인생 대운 타임라인" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-tertiary)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>사주 계산 중...</span>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="인생 대운 타임라인" showBack onBack={() => nav(-1)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{error}</div>
        <button onClick={() => nav('/vault')} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: '#ECFDF5', color: '#059669', fontSize: 14, fontWeight: 700, border: '1px solid #6EE7B7', cursor: 'pointer' }}>
          사주 보관소로 이동
        </button>
      </div>
    </div>
  )

  const dmMeta = EL_META[dayMasterEl] || DEFAULT_EL

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="인생 대운 타임라인" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>

        {/* ─── 내 일간 배지 ─── */}
        <div style={{ margin: '14px 20px 16px', padding: '14px 16px', borderRadius: 14, background: `linear-gradient(135deg, ${dmMeta.bg} 0%, #F8FAFC 100%)`, border: `1px solid ${dmMeta.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: dmMeta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>{dmMeta.char}</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>{profile?.name}님의 일간(日干)</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: dmMeta.color }}>{dayMasterEl}(木·火·土·金·水 중 {dayMasterEl}) 일간</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>아래 대운은 이 일간을 기준으로 해석됩니다</div>
            </div>
          </div>
        </div>

        {/* ─── 타임라인 ─── */}
        <div style={{ padding: '0 20px', position: 'relative' }}>
          {/* 세로 줄 */}
          <div style={{ position: 'absolute', left: 40, top: 0, bottom: 0, width: 2, background: 'var(--border-1)', zIndex: 0 }} />

          {periods.map((period, idx) => {
            const isCurrent = isPeriodCurrent(period)
            const isPast = isPeriodPast(period)
            const ganEl = ELEMENTS[Math.floor(period.pillar.stem / 2)]
            const meta = EL_META[ganEl] || DEFAULT_EL
            const ganTenGod = TEN_GODS[getTenGodIndex(dayMasterStem, period.pillar.stem)]
            const yearStart = birthYear + period.startAge - 1
            const yearEnd = birthYear + period.endAge - 1

            return (
              <div key={idx} style={{ display: 'flex', gap: 14, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                {/* 타임라인 도트 */}
                <div style={{ flexShrink: 0, width: 40, display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
                  <div style={{
                    width: isCurrent ? 20 : 14, height: isCurrent ? 20 : 14,
                    borderRadius: '50%', flexShrink: 0,
                    background: isCurrent ? meta.color : isPast ? 'var(--border-2)' : meta.badge,
                    border: `2px solid ${isCurrent ? meta.color : isPast ? 'var(--border-1)' : meta.border}`,
                    boxShadow: isCurrent ? `0 0 0 4px ${meta.badge}` : 'none',
                    transition: 'all 0.2s',
                    marginTop: isCurrent ? -3 : 0,
                  }} />
                </div>

                {/* 대운 카드 */}
                <div style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: isCurrent ? meta.bg : isPast ? 'var(--bg-surface)' : 'var(--bg-surface)',
                  border: `${isCurrent ? '2px' : '1px'} solid ${isCurrent ? meta.border : 'var(--border-1)'}`,
                  opacity: isPast ? 0.65 : 1,
                }}>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    {/* 간지 큰 글자 */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{period.pillar.stemHj}</span>
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.badge, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: meta.color }}>{period.pillar.branchHj}</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: isCurrent ? meta.color : 'var(--text-primary)' }}>
                          {period.pillar.stemKr}{period.pillar.branchKr}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: meta.color, color: '#fff' }}>
                            현재 대운
                          </span>
                        )}
                        {isPast && (
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-3)', color: 'var(--text-disabled)' }}>
                            지난 대운
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {period.startAge}세 ~ {period.endAge}세 · {yearStart}년 ~ {yearEnd}년
                      </div>
                    </div>
                  </div>

                  {/* 십성 분석 */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', background: meta.badge, color: meta.color, border: `1px solid ${meta.border}` }}>
                      天 {period.pillar.stemKr}({ganEl}) · {ganTenGod}
                    </span>
                  </div>

                  {/* 오행 설명 */}
                  <div style={{ fontSize: 12, color: isCurrent ? meta.color : 'var(--text-secondary)', lineHeight: 1.6, opacity: 0.9 }}>
                    {ganTenGod === '비견' && '나와 같은 오행이 강해지는 시기. 독립심이 높아지고 경쟁 상황이 많아집니다.'}
                    {ganTenGod === '겁재' && '비견과 유사하지만 더 급격한 변화. 승부 욕구와 재물 변동이 나타납니다.'}
                    {ganTenGod === '식신' && '재능과 표현력이 활성화되는 시기. 여유롭고 창의적인 에너지가 흐릅니다.'}
                    {ganTenGod === '상관' && '변화와 도전의 시기. 기존 틀을 깨고 새로운 길을 모색하게 됩니다.'}
                    {ganTenGod === '편재' && '활동적인 재물 운이 활발한 시기. 사업·투자·사교 활동이 두드러집니다.'}
                    {ganTenGod === '정재' && '안정적인 재물 축적의 시기. 꾸준한 노력이 결실을 맺는 흐름입니다.'}
                    {ganTenGod === '편관' && '압박과 도전이 많지만 강인하게 성장하는 시기. 리더십이 요구됩니다.'}
                    {ganTenGod === '정관' && '질서와 인정을 받는 시기. 조직 내 승진·명예 상승이 가능합니다.'}
                    {ganTenGod === '편인' && '직감과 배움이 강해지는 시기. 색다른 분야에 대한 관심이 높아집니다.'}
                    {ganTenGod === '정인' && '안정과 지혜가 쌓이는 시기. 학문·내면 성장에 유리한 흐름입니다.'}
                    {!['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'].includes(ganTenGod) && '이 대운의 에너지가 사주 원국과 상호작용합니다.'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── 하단 안내 ─── */}
        <div style={{ margin: '0 20px 20px', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
            💡 대운(大運)은 10년 단위로 바뀌는 큰 인생 흐름입니다. 각 대운의 천간(天干)이 일간(日干)과 어떤 십성(十星) 관계인지에 따라 그 시기의 에너지와 주요 사건이 결정됩니다. 정밀분석에서 더 깊은 대운 해석을 받아보실 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  )
}
