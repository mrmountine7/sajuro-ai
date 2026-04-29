import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getCurrentIdentity, applyUserFilter } from '@/lib/user-filter'
import { lunarToSolar } from '@/lib/lunar-solar'
import {
  calculateFullSaju, calculateDaeun, getYearFortune, getMonthFortunes, getDayFortunes,
  getTenGodIndex, ELEMENTS, TEN_GODS, TWELVE_STAGES, TWELVE_STAGES_HJ,
  BRANCHES_KR, BRANCHES_HJ,
  type SajuResult, type BirthInput, type DaeunPeriod, type Pillar, type PillarDetail,
} from '@/lib/saju-engine'

/* ─── 타입 ─── */
interface Profile {
  name: string; gender: 'male' | 'female'
  birth_year: number; birth_month: number; birth_day: number
  birth_hour: string; calendar_type: string
}

/* ─── 오행 색상 ─── */
const EL: Record<string, { bg: string; color: string; char: string; desc: string }> = {
  '목': { bg: '#ECFDF5', color: '#059669', char: '木', desc: '성장·창의·유연' },
  '화': { bg: '#FFF0F0', color: '#EF4444', char: '火', desc: '열정·표현·활동' },
  '토': { bg: '#FFF8E1', color: '#D97706', char: '土', desc: '신뢰·안정·중심' },
  '금': { bg: '#F0F4FF', color: '#6366F1', char: '金', desc: '결단·원칙·강인' },
  '수': { bg: '#F0FAFF', color: '#0EA5E9', char: '水', desc: '지혜·유연·깊이' },
}

/* ─── 십성 설명 ─── */
const TEN_GOD_DESC: Record<string, string> = {
  '비견': '자립심·경쟁', '겁재': '도전·추진력',
  '식신': '재능·창의', '상관': '통찰·변화',
  '편재': '기회·사교', '정재': '성실·안정',
  '편관': '결단·리더십', '정관': '원칙·책임',
  '편인': '직감·독창', '정인': '지혜·학문',
  '본원': '일간 자신',
}

/* ─── 합충파해 메타 ─── */
const RELATION_META: Record<string, { bg: string; color: string; good: boolean; baseDesc: string }> = {
  '육합': { bg: '#ECFDF5', color: '#059669', good: true,  baseDesc: '두 지지가 결합하여 새로운 오행 기운을 만들어냅니다.' },
  '삼합': { bg: '#EEF2FF', color: '#6366F1', good: true,  baseDesc: '세 지지가 합쳐 강력한 오행 국(局)을 형성합니다.' },
  '방합': { bg: '#F0F9FF', color: '#0369A1', good: true,  baseDesc: '같은 방위 세 지지가 모여 오행의 기운을 증폭시킵니다.' },
  '충':   { bg: '#FEF2F2', color: '#DC2626', good: false, baseDesc: '정반대 기운이 충돌하여 변동·이별·갈등을 유발합니다.' },
  '파':   { bg: '#FFF7ED', color: '#EA580C', good: false, baseDesc: '기운이 깨져 손실·훼손이 우려됩니다.' },
  '해':   { bg: '#FDF4FF', color: '#9333EA', good: false, baseDesc: '방해와 갈등의 기운으로 관계 마찰이 생깁니다.' },
}

/* ─── 삼합 → 결과 오행(局) ─── */
const SAMHAP_TABLE: [number[], string, string][] = [
  [[2,  6, 10], '화국(火局)', '인오술(寅午戌) — 목화토가 합쳐 강렬한 화(火)의 기운을 만듭니다. 열정·표현·활동성이 극대화됩니다.'],
  [[5,  9,  1], '금국(金局)', '사유축(巳酉丑) — 화금토가 합쳐 강인한 금(金)의 기운을 만듭니다. 결단력·원칙·냉철함이 강해집니다.'],
  [[8,  0,  4], '수국(水局)', '신자진(申子辰) — 금수토가 합쳐 깊은 수(水)의 기운을 만듭니다. 지혜·유연함·내면의 힘이 강화됩니다.'],
  [[11, 3,  7], '목국(木局)', '해묘미(亥卯未) — 수목토가 합쳐 왕성한 목(木)의 기운을 만듭니다. 성장·창의·진취성이 넘칩니다.'],
]

/* ─── 방합 → 결과 오행(方) ─── */
const BANGHAP_TABLE: [number[], string, string][] = [
  [[2,  3,  4], '목방(木方)', '인묘진(寅卯辰) — 동방(東方) 목(木)의 기운이 집결합니다. 성장과 창의의 힘이 강해집니다.'],
  [[5,  6,  7], '화방(火方)', '사오미(巳午未) — 남방(南方) 화(火)의 기운이 집결합니다. 열정과 표현력이 극대화됩니다.'],
  [[8,  9, 10], '금방(金方)', '신유술(申酉戌) — 서방(西方) 금(金)의 기운이 집결합니다. 결단력과 원칙이 강화됩니다.'],
  [[11, 0,  1], '수방(水方)', '해자축(亥子丑) — 북방(北方) 수(水)의 기운이 집결합니다. 지혜와 내면의 힘이 깊어집니다.'],
]

/* ─── 육합 → 결과 오행 ─── */
const YUKHAP_TABLE: [number, number, string, string][] = [
  [0,  1,  '토(土)', '자축합(子丑合) — 수(水)와 토(土)가 합하여 안정된 토(土) 기운을 만듭니다.'],
  [2, 11,  '목(木)', '인해합(寅亥合) — 목(木)과 수(水)가 합하여 생동감 있는 목(木) 기운을 만듭니다.'],
  [3, 10,  '화(火)', '묘술합(卯戌合) — 목(木)과 토(土)가 합하여 따뜻한 화(火) 기운을 만듭니다.'],
  [4,  9,  '금(金)', '진유합(辰酉合) — 토(土)와 금(金)이 합하여 강인한 금(金) 기운을 만듭니다.'],
  [5,  8,  '수(水)', '사신합(巳申合) — 화(火)와 금(金)이 합하여 유연한 수(水) 기운을 만듭니다.'],
  [6,  7,  '토(土)', '오미합(午未合) — 화(火)와 토(土)가 합하여 따뜻한 토(土) 기운을 만듭니다.'],
]

/* ─── 충 설명 ─── */
const CHUNG_TABLE: [number, number, string][] = [
  [0,  6, '자오충(子午沖) — 수(水)와 화(火)가 충돌합니다. 감정 기복·이동·변화에 주의하세요.'],
  [1,  7, '축미충(丑未沖) — 토(土)끼리 충돌합니다. 재물·직업의 변동이 생길 수 있습니다.'],
  [2,  8, '인신충(寅申沖) — 목(木)과 금(金)이 충돌합니다. 사고·이별·급격한 변화에 주의하세요.'],
  [3,  9, '묘유충(卯酉沖) — 목(木)과 금(金)이 충돌합니다. 관계 갈등·수술·손재에 주의하세요.'],
  [4, 10, '진술충(辰戌沖) — 토(土)끼리 충돌합니다. 신경계·피부·소화기 건강에 주의하세요.'],
  [5, 11, '사해충(巳亥沖) — 화(火)와 수(水)가 충돌합니다. 질병·법적 문제·여행 중 사고에 주의하세요.'],
]

/* ─── 파 설명 ─── */
const PA_TABLE: [number, number, string][] = [
  [0,  3, '자묘파(子卯破) — 수(水)와 목(木)의 기운이 깨집니다. 인간관계 손상·계획 무산에 주의하세요.'],
  [1,  10,'축술파(丑戌破) — 토(土)끼리 기운이 깨집니다. 재물 손실·토지 문제에 주의하세요.'],
  [2,  11,'인해파(寅亥破) — 목(木)과 수(水)의 기운이 깨집니다. 건강·사업 계획에 주의하세요.'],
  [4,  7, '진미파(辰未破) — 토(土)끼리 기운이 깨집니다. 부동산·농업·재물에 영향이 있습니다.'],
  [5,  8, '사신파(巳申破) — 화(火)와 금(金)의 기운이 깨집니다. 교통·기계·수술에 주의하세요.'],
  [6,  9, '오유파(午酉破) — 화(火)와 금(金)의 기운이 깨집니다. 구설·명예 손상에 주의하세요.'],
]

/* ─── 해 설명 ─── */
const HAE_TABLE: [number, number, string][] = [
  [0,  11,'자해해(子亥害) — 수(水)끼리 상극합니다. 친밀한 관계에서 방해가 생깁니다.'],
  [1,   6,'축오해(丑午害) — 토(土)와 화(火)가 충돌합니다. 구설·배신에 주의하세요.'],
  [2,   9,'인유해(寅酉害) — 목(木)과 금(金)이 서로 방해합니다. 직업·건강에 마찰이 생깁니다.'],
  [3,   8,'묘신해(卯申害) — 목(木)과 금(金)이 서로 방해합니다. 소송·분쟁에 주의하세요.'],
  [4,   7,'진미해(辰未害) — 토(土)끼리 서로 방해합니다. 부부·파트너 관계에 갈등이 생깁니다.'],
  [5,  10,'사술해(巳戌害) — 화(火)와 토(土)가 서로 방해합니다. 관재·사기에 주의하세요.'],
]

/* ─── relation 상세 설명 생성 ─── */
function getRelationDetail(type: string, branches: number[]): { resultEl?: string; detail: string } {
  const sorted = [...branches].sort((a, b) => a - b)

  if (type === '삼합') {
    for (const [brs, resultEl, detail] of SAMHAP_TABLE) {
      if (brs.every(b => branches.includes(b))) return { resultEl, detail }
    }
  }
  if (type === '방합') {
    for (const [brs, resultEl, detail] of BANGHAP_TABLE) {
      if (brs.every(b => branches.includes(b))) return { resultEl, detail }
    }
  }
  if (type === '육합') {
    for (const [a, b, resultEl, detail] of YUKHAP_TABLE) {
      if (branches.includes(a) && branches.includes(b)) return { resultEl, detail }
    }
  }
  if (type === '충') {
    for (const [a, b, detail] of CHUNG_TABLE) {
      if (branches.includes(a) && branches.includes(b)) return { detail }
    }
  }
  if (type === '파') {
    for (const [a, b, detail] of PA_TABLE) {
      if (branches.includes(a) && branches.includes(b)) return { detail }
    }
  }
  if (type === '해') {
    for (const [a, b, detail] of HAE_TABLE) {
      if (branches.includes(a) && branches.includes(b)) return { detail }
    }
  }
  const branchStr = branches.map(b => `${BRANCHES_KR[b]}(${BRANCHES_HJ[b]})`).join('·')
  return { detail: `${branchStr}의 ${type} 관계입니다.` }
}

/* ─── 지지 한자 표시용 ─── */
function branchLabel(branches: number[]) {
  return branches.map(b => `${BRANCHES_KR[b]}(${BRANCHES_HJ[b]})`).join('·')
}

/* ─── 간단 격국 판별 (월지 십성 기반) ─── */
function getGyeokguk(monthTenGod: string): string {
  const map: Record<string, string> = {
    '비견': '비겁격(比劫格)', '겁재': '비겁격(比劫格)',
    '식신': '식신격(食神格)', '상관': '상관격(傷官格)',
    '편재': '편재격(偏財格)', '정재': '정재격(正財格)',
    '편관': '편관격(偏官格)', '정관': '정관격(正官格)',
    '편인': '편인격(偏印格)', '정인': '정인격(正印格)',
  }
  return map[monthTenGod] || '격국 미확정'
}

/* ─── 지지 오행 매핑 (자·축·인·묘·진·사·오·미·신·유·술·해) ─── */
const BRANCH_ELEMENT = ['수','토','목','목','토','화','화','토','금','금','토','수'] as const

/* ─── 주(柱) 라벨과 의미 ─── */
const PILLAR_MEANING: Record<string, string> = {
  '년주': '조상·부모궁',
  '월주': '부모·사회궁',
  '일주': '나·배우자궁',
  '시주': '자녀·말년궁',
}

function parseBirthHour(h: string): [number, number] {
  if (h === 'unknown') return [12, 0]
  const m = h.match(/(\d+):(\d+)/)
  return m ? [+m[1], +m[2]] : [12, 0]
}

/* ─── 사주 주(柱) 카드 ─── */
function PillarCard({ p, label, isDayMaster }: { p: PillarDetail; label: string; isDayMaster?: boolean }) {
  const stemElKey = ELEMENTS[Math.floor(p.stem / 2)]
  const stemEl = EL[stemElKey] || EL['토']

  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
      {/* 주 라벨 */}
      <div style={{ fontSize: 10, fontWeight: 700, color: isDayMaster ? '#D97706' : 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 9, color: 'var(--text-disabled)', marginBottom: 6 }}>{PILLAR_MEANING[label]}</div>

      {/* 천간 */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, margin: '0 auto 3px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: stemEl.bg,
        border: isDayMaster ? `2.5px solid ${stemEl.color}` : `1px solid ${stemEl.color}40`,
        fontSize: 20, fontWeight: 900, color: stemEl.color,
        boxShadow: isDayMaster ? `0 0 0 3px ${stemEl.bg}` : 'none',
      }}>
        {p.stemHj}
      </div>
      <div style={{ fontSize: 9, color: stemEl.color, fontWeight: 600, marginBottom: 6 }}>
        {p.stemKr}({stemElKey})
      </div>

      {/* 지지 */}
      {(() => {
        const branchElKey = BRANCH_ELEMENT[p.branch] ?? '토'
        const branchEl = EL[branchElKey] || EL['토']
        return (
          <>
            <div style={{
              width: 42, height: 42, borderRadius: 12, margin: '0 auto 3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: branchEl.bg,
              border: `1px solid ${branchEl.color}40`,
              fontSize: 20, fontWeight: 900, color: branchEl.color,
            }}>
              {p.branchHj}
            </div>
            <div style={{ fontSize: 9, color: branchEl.color, fontWeight: 600, marginBottom: 6 }}>
              {p.branchKr}({branchElKey})
            </div>
          </>
        )
      })()}

      {/* 십성 뱃지 */}
      <div style={{
        padding: '2px 0', borderRadius: 6, fontSize: 10, fontWeight: 700,
        background: isDayMaster ? '#FFF8E1' : 'var(--bg-surface-3)',
        color: isDayMaster ? '#D97706' : 'var(--text-secondary)',
        marginBottom: 5,
      }}>{p.tenGod}</div>

      {/* 지장간 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', marginBottom: 4 }}>
        {p.hiddenStems.map((hs, i) => (
          <span key={i} style={{
            fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 4,
            background: 'var(--bg-surface-3)', color: 'var(--text-secondary)',
          }}>
            {hs.hj}
            <span style={{ fontSize: 8, color: 'var(--text-tertiary)' }}>·{hs.tenGod}</span>
          </span>
        ))}
      </div>

      {/* 12운성 */}
      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-accent)' }}>
        {p.stage}({p.stageHj})
      </div>
    </div>
  )
}

/* ─── 오행 분포 바 ─── */
function OhaengBar({ el, count, total }: { el: string; count: number; total: number }) {
  const meta = EL[el] || EL['토']
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const label = count >= 3 ? '과다' : count === 0 ? '부족' : ''
  const labelColor = count >= 3 ? '#DC2626' : count === 0 ? '#6366F1' : 'transparent'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: meta.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{meta.char}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: meta.color }}>{el} · {meta.desc}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: labelColor }}>{label || `${count}개`}</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: 'var(--border-1)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: meta.color, transition: 'width 0.5s ease' }} />
        </div>
      </div>
    </div>
  )
}

/* ─── 운세 그리드 (대운·세운·월운) ─── */
function FortuneGrid({ items, dayStem, label, currentIdx, onSelect }: {
  items: { key: string; pillar: Pillar; sub: string }[]
  dayStem: number; label: string; currentIdx?: number
  onSelect?: (idx: number) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, padding: '0 4px' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {items.map((item, idx) => {
          const godIdx = getTenGodIndex(dayStem, item.pillar.stem)
          const stemElKey = ELEMENTS[Math.floor(item.pillar.stem / 2)]
          const stemEl = EL[stemElKey]
          const isCurrent = idx === currentIdx
          return (
            <button key={item.key} onClick={() => onSelect?.(idx)} style={{
              padding: '10px 0', borderRadius: 12,
              background: isCurrent ? stemEl?.bg || 'var(--bg-surface)' : 'var(--bg-surface)',
              border: isCurrent ? `2px solid ${stemEl?.color || 'var(--border-accent)'}` : '1px solid var(--border-1)',
              textAlign: 'center', cursor: onSelect ? 'pointer' : 'default',
              position: 'relative',
            }}>
              {isCurrent && (
                <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: stemEl?.color, color: '#fff', whiteSpace: 'nowrap' }}>현재</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 1, marginBottom: 3 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: stemEl?.color || 'var(--text-primary)' }}>{item.pillar.stemHj}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-primary)' }}>{item.pillar.branchHj}</span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{item.pillar.stemKr}{item.pillar.branchKr}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: isCurrent ? stemEl?.color : 'var(--text-accent)', marginTop: 2 }}>{TEN_GODS[godIdx]}</div>
              <div style={{ fontSize: 8, color: 'var(--text-tertiary)', marginTop: 1 }}>{TEN_GOD_DESC[TEN_GODS[godIdx]] || ''}</div>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.sub}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── 탭 ─── */
const TABS = ['사주원국', '평생대운', '세운', '월운', '일운'] as const
type TabType = typeof TABS[number]

/* ─── 메인 ─── */
export default function ManseryukScreen() {
  const nav = useNavigate()
  const [allProfiles, setAllProfiles] = useState<(Profile & { id: string; is_primary: boolean })[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saju, setSaju] = useState<SajuResult | null>(null)
  const [daeun, setDaeun] = useState<DaeunPeriod[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('사주원국')
  const [selectedDaeunIdx, setSelectedDaeunIdx] = useState(0)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  /* ── 전체 프로필 목록 최초 로드 ── */
  useEffect(() => {
    async function loadProfiles() {
      if (!supabase) return
      const identity = await getCurrentIdentity()
      const { data } = await applyUserFilter(
        supabase.from('profiles')
          .select('id, name, gender, birth_year, birth_month, birth_day, birth_hour, calendar_type, is_primary')
          .order('is_primary', { ascending: false }),
        identity
      )
      if (data && data.length > 0) {
        setAllProfiles(data as any)
        // 기본 선택: 주 프로필 또는 첫 번째
        const primary = data.find((p: any) => p.is_primary) || data[0]
        setSelectedProfileId((primary as any).id)
      }
      setLoadingProfiles(false)
    }
    loadProfiles()
  }, [])

  /* ── 선택된 프로필이 바뀔 때마다 사주 재계산 ── */
  useEffect(() => {
    if (!selectedProfileId || allProfiles.length === 0) return
    const p = allProfiles.find(pr => pr.id === selectedProfileId)
    if (!p) return
    setProfile(p)
    const [h, m] = parseBirthHour(p.birth_hour)
    const input: BirthInput = {
      birthYear: p.birth_year, birthMonth: p.birth_month, birthDay: p.birth_day,
      birthHour: h, birthMinute: m, calendarType: p.calendar_type, gender: p.gender,
    }
    const result = calculateFullSaju(input)
    setSaju(result)
    const de = calculateDaeun(input, result.monthPillar)
    setDaeun(de)
    const curAge = new Date().getFullYear() - p.birth_year + 1
    const curIdx = de.findIndex(d => curAge >= d.startAge && curAge <= d.endAge)
    setSelectedDaeunIdx(curIdx >= 0 ? curIdx : 0)
    setActiveTab('사주원국')
  }, [selectedProfileId, allProfiles])

  const solarDate = useMemo(() => {
    if (!profile) return null
    if (profile.calendar_type !== 'solar')
      return lunarToSolar(profile.birth_year, profile.birth_month, profile.birth_day, profile.calendar_type === 'lunar_leap')
    return new Date(profile.birth_year, profile.birth_month - 1, profile.birth_day)
  }, [profile])

  if (loadingProfiles) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="만세력" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>불러오는 중...</div>
    </div>
  )

  if (allProfiles.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="만세력" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
        <div style={{ fontSize: 40 }}>📜</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>저장된 사주가 없습니다</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center' }}>사주를 먼저 등록해주세요</div>
        <button onClick={() => nav('/add-profile')} style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', background: 'var(--bg-accent)', color: '#1F2937', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          사주 추가하기
        </button>
      </div>
    </div>
  )

  if (!profile || !saju) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="만세력" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>계산 중...</div>
    </div>
  )

  const dayStem = saju.dayPillar.stem
  const dayElKey = saju.dayMasterElement
  const elc = EL[dayElKey] || EL['토']
  const currentYear = new Date().getFullYear()
  const currentAge = currentYear - profile.birth_year + 1
  const currentDaeun = daeun.find(d => currentAge >= d.startAge && currentAge <= d.endAge)
  const currentDaeunGodIdx = currentDaeun ? getTenGodIndex(dayStem, currentDaeun.pillar.stem) : -1

  // 격국: 월지 지장간(정기)의 십성
  const gyeokguk = getGyeokguk(saju.monthPillar.tenGod)

  // 오행 분포 계산 (천간 4 + 지지 4 = 팔자 8글자)
  const ohaengCount: Record<string, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 }
  const totalEl = 8
  for (const p of [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar]) {
    const stemEl = ELEMENTS[Math.floor(p.stem / 2)]
    if (stemEl in ohaengCount) ohaengCount[stemEl]++
    const branchEl = BRANCH_ELEMENT[p.branch]
    if (branchEl && branchEl in ohaengCount) ohaengCount[branchEl]++
  }

  // 현재 대운 인덱스
  const currentDaeunIdx = daeun.findIndex(d => currentAge >= d.startAge && currentAge <= d.endAge)

  // 세운 현재 인덱스
  const d = daeun[selectedDaeunIdx]
  const birthY = profile.birth_year
  const seunYears = d ? Array.from({ length: 10 }, (_, i) => birthY + d.startAge + i) : []
  const currentSeunIdx = seunYears.findIndex(y => y === currentYear)

  // 월운 현재 인덱스
  const currentMonthIdx = selectedYear === currentYear ? (new Date().getMonth()) : -1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="만세력" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />

      {/* ─── 프로필 선택 칩 바 ─── */}
      {allProfiles.length > 1 && (
        <div style={{
          display: 'flex', gap: 8, padding: '6px 20px 8px',
          overflowX: 'auto', scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
          background: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-1)',
          flexShrink: 0,
          flexWrap: 'nowrap',
        }}>
          {allProfiles.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProfileId(p.id)}
              className={`s-chip ${selectedProfileId === p.id ? 's-chip-active' : ''}`}
              style={{ flexShrink: 0, whiteSpace: 'nowrap', minWidth: 'max-content' }}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 상단 핵심 정보 카드 ─── */}
        <div style={{ margin: '0 20px 14px', padding: '18px 16px', borderRadius: 18, background: `linear-gradient(135deg, ${elc.bg} 0%, #F8FAFC 100%)`, border: `1.5px solid ${elc.color}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            {/* 일간 아바타 */}
            <div style={{ width: 60, height: 60, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: elc.color, flexShrink: 0, boxShadow: `0 4px 12px ${elc.color}40` }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{elc.char}</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>{dayElKey}일간</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{profile.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {solarDate && `${solarDate.getFullYear()}.${String(solarDate.getMonth()+1).padStart(2,'0')}.${String(solarDate.getDate()).padStart(2,'0')}`}
                {profile.calendar_type !== 'solar' && ` (음력 ${profile.birth_month}월 ${profile.birth_day}일)`}
                {' · '}{profile.birth_hour === 'unknown' ? '시간 모름' : profile.birth_hour}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {profile.gender === 'male' ? '남성' : '여성'} · {saju.dayPillar.label}일주
              </div>
            </div>
          </div>

          {/* 핵심 배지 3개 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: `1px solid ${elc.color}30` }}>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2 }}>격국(格局)</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: elc.color }}>{gyeokguk}</div>
            </div>
            {currentDaeun && (
              <div style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: `1px solid ${elc.color}30` }}>
                <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2 }}>현재 대운</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: elc.color }}>
                  {currentDaeun.pillar.label}대운 · {currentDaeunGodIdx >= 0 ? TEN_GODS[currentDaeunGodIdx] : ''}
                </div>
              </div>
            )}
            <div style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--bg-surface)', border: `1px solid ${elc.color}30` }}>
              <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginBottom: 2 }}>일간 특성</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: elc.color }}>{elc.desc}</div>
            </div>
          </div>
        </div>

        {/* ─── 탭 네비게이션 ─── */}
        <div style={{ display: 'flex', gap: 5, padding: '0 20px', marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: 'var(--radius-full)',
              fontSize: 12, fontWeight: 700,
              background: activeTab === tab ? 'var(--bg-inverse)' : 'var(--bg-surface)',
              color: activeTab === tab ? 'var(--text-inverse)' : 'var(--text-tertiary)',
              border: activeTab === tab ? 'none' : '1px solid var(--border-1)',
            }}>{tab}</button>
          ))}
        </div>

        {/* ─── 사주원국 탭 ─── */}
        {activeTab === '사주원국' && (
          <>
            {/* 사주 팔자 */}
            <div style={{ margin: '0 20px 14px', padding: '20px 12px', borderRadius: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>사주 팔자 (四柱八字)</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>시간 우선 → 연도 순</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <PillarCard p={saju.hourPillar} label="시주" />
                <PillarCard p={saju.dayPillar} label="일주" isDayMaster />
                <PillarCard p={saju.monthPillar} label="월주" />
                <PillarCard p={saju.yearPillar} label="년주" />
              </div>
              {/* 범례 */}
              <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface-3)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: 6 }}>읽는 방법</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: '위 큰 글자', desc: '천간(天干)' },
                    { label: '아래 큰 글자', desc: '지지(地支)' },
                    { label: '중간 태그', desc: '십성(十星)' },
                    { label: '작은 글자', desc: '지장간(地藏干)' },
                    { label: '하단', desc: '12운성(運星)' },
                  ].map(({ label, desc }) => (
                    <span key={label} style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{label}</span> = {desc}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 오행 분포 */}
            <div style={{ margin: '0 20px 14px', padding: '16px', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>오행 분포 (八字 기준)</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>과다 ≥ 3개 · 부족 = 0개 / 8글자</div>
              </div>
              {Object.entries(ohaengCount).map(([el, cnt]) => (
                <OhaengBar key={el} el={el} count={cnt} total={totalEl} />
              ))}
              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-surface-3)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                부족한 오행은 이름이나 색상·방향으로 보완하면 균형을 맞출 수 있습니다.
              </div>
            </div>

            {/* 합충파해 */}
            {saju.relations.length > 0 && (
              <div style={{ margin: '0 20px 14px', padding: '14px 16px', borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border-1)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>합충파해 (合沖破害)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {saju.relations.map((r, i) => {
                    const rm = RELATION_META[r.type]
                    if (!rm) return null
                    const { resultEl, detail } = getRelationDetail(r.type, r.branches)
                    return (
                      <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: rm.bg, border: `1px solid ${rm.color}30` }}>
                        {/* 타입 + 주 + 길흉 */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: rm.color }}>{r.type}</span>
                          <span style={{ fontSize: 11, color: rm.color, opacity: 0.75 }}>
                            {r.pillars.join(' ↔ ')}
                          </span>
                          {resultEl && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 4, background: `${rm.color}22`, color: rm.color, border: `1px solid ${rm.color}40` }}>
                              → {resultEl}
                            </span>
                          )}
                          <span style={{ marginLeft: 2, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: rm.color, color: '#fff' }}>
                            {rm.good ? '길(吉)' : '주의'}
                          </span>
                        </div>
                        {/* 지지 한자 */}
                        <div style={{ fontSize: 12, fontWeight: 700, color: rm.color, marginBottom: 5 }}>
                          {branchLabel(r.branches)}
                        </div>
                        {/* 상세 설명 */}
                        <div style={{ fontSize: 11, color: rm.color, opacity: 0.85, lineHeight: 1.65 }}>
                          {detail}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── 평생대운 탭 ─── */}
        {activeTab === '평생대운' && (
          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-surface-3)', fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              대운(大運)은 10년 단위로 바뀌는 큰 인생 흐름입니다. 현재 대운이 파란 테두리로 표시됩니다. 탭하면 해당 대운의 세운을 확인할 수 있습니다.
            </div>
            <FortuneGrid
              label="평생 대운 흐름"
              dayStem={dayStem}
              currentIdx={currentDaeunIdx >= 0 ? currentDaeunIdx : undefined}
              items={daeun.map((d, i) => ({
                key: `d${i}`, pillar: d.pillar,
                sub: `${d.startAge}~${d.endAge}세`,
              }))}
              onSelect={idx => { setSelectedDaeunIdx(idx); setActiveTab('세운') }}
            />
          </div>
        )}

        {/* ─── 세운 탭 ─── */}
        {activeTab === '세운' && (() => {
          if (!d) return null
          return (
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>대운 선택:</span>
                <select value={selectedDaeunIdx} onChange={e => setSelectedDaeunIdx(+e.target.value)} style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-surface)',
                  border: '1px solid var(--border-1)', borderRadius: 8, padding: '4px 8px',
                }}>
                  {daeun.map((dd, i) => <option key={i} value={i}>{dd.pillar.label} ({dd.startAge}~{dd.endAge}세)</option>)}
                </select>
              </div>
              <FortuneGrid
                label={`${d.pillar.label} 대운 — 세운 (${d.startAge}~${d.endAge}세)`}
                dayStem={dayStem}
                currentIdx={currentSeunIdx >= 0 ? currentSeunIdx : undefined}
                items={seunYears.map(y => ({ key: `y${y}`, pillar: getYearFortune(y), sub: `${y}년` }))}
                onSelect={idx => { setSelectedYear(seunYears[idx]); setActiveTab('월운') }}
              />
            </div>
          )
        })()}

        {/* ─── 월운 탭 ─── */}
        {activeTab === '월운' && (() => {
          const months = getMonthFortunes(selectedYear)
          return (
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>연도:</span>
                <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} style={{
                  fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-surface)',
                  border: '1px solid var(--border-1)', borderRadius: 8, padding: '4px 8px',
                }}>
                  {Array.from({ length: 20 }, (_, i) => currentYear - 5 + i).map(y => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
              </div>
              <FortuneGrid
                label={`${selectedYear}년 월운`}
                dayStem={dayStem}
                currentIdx={currentMonthIdx >= 0 ? currentMonthIdx : undefined}
                items={months.map(m => ({ key: `m${m.month}`, pillar: m.pillar, sub: `${m.month}월` }))}
                onSelect={idx => { setSelectedMonth(idx + 1); setActiveTab('일운') }}
              />
            </div>
          )
        })()}

        {/* ─── 일운 탭 ─── */}
        {activeTab === '일운' && (() => {
          const days = getDayFortunes(selectedYear, selectedMonth)
          const today = new Date()
          const todayDay = (selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1) ? today.getDate() : -1
          return (
            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>연도:</span>
                  <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '4px 8px' }}>
                    {Array.from({ length: 20 }, (_, i) => currentYear - 5 + i).map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>월:</span>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)} style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-surface)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '4px 8px' }}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{i+1}월</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {days.map(d => {
                  const godIdx = getTenGodIndex(dayStem, d.pillar.stem)
                  const stemElKey = ELEMENTS[Math.floor(d.pillar.stem / 2)]
                  const stemEl = EL[stemElKey]
                  const isToday = d.day === todayDay
                  return (
                    <div key={d.day} style={{
                      padding: '6px 0', borderRadius: 8, textAlign: 'center',
                      background: isToday ? stemEl?.bg || 'var(--bg-surface)' : 'var(--bg-surface)',
                      border: isToday ? `2px solid ${stemEl?.color}` : '1px solid var(--border-1)',
                    }}>
                      <div style={{ fontSize: 9, color: isToday ? stemEl?.color : 'var(--text-tertiary)', fontWeight: isToday ? 800 : 500 }}>{d.day}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: stemEl?.color }}>{d.pillar.stemHj}{d.pillar.branchHj}</div>
                      <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--text-accent)' }}>{TEN_GODS[godIdx]}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
