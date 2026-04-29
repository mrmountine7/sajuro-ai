import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '@/components/layout/Header'
import { serviceConfigs } from '@/lib/analysis-services'
import { analyzeCompatibility, calculateSaju } from '@/lib/api-client'
import { Check, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'

/* ─── 정밀분석 항목 정의 ─── */
interface AnalysisItem { id: string; label: string; desc: string }
interface AnalysisGroup { id: string; label: string; icon: string; items: AnalysisItem[] }

const PRECISION_GROUPS: AnalysisGroup[] = [
  { id: 'structure', label: '사주 기본 구조', icon: '🏛️', items: [
    { id: 'pallja', label: '사주팔자 원국 분석', desc: '8글자 천간·지지 전체 구조' },
    { id: 'ilgan', label: '일간 기질과 성향', desc: '타고난 성격·기질·행동 패턴' },
    { id: 'ohaeng', label: '오행 균형 분석', desc: '목화토금수 과다·부족 파악' },
    { id: 'eumyang', label: '음양 구조', desc: '음기·양기의 흐름과 균형' },
  ]},
  { id: 'sipsung', label: '십성 분석', icon: '⭐', items: [
    { id: 'bigyeon', label: '비견·겁재 (자아·경쟁)', desc: '독립심·경쟁심·자존심' },
    { id: 'sikshin', label: '식신·상관 (표현·창의)', desc: '재능·표현력·창의성·언변' },
    { id: 'jaesung', label: '편재·정재 (재물·가치)', desc: '재물관·투자성향·사업력' },
    { id: 'gwansung', label: '편관·정관 (권위·규범)', desc: '리더십·책임감·직업성' },
    { id: 'insung', label: '편인·정인 (지혜·보호)', desc: '학습능력·직관·보호성향' },
  ]},
  { id: 'gyeokguk', label: '격국과 용신', icon: '🔑', items: [
    { id: 'gyeok', label: '월지 격국 판별', desc: '정관격·식신격·재격 등 사주의 틀' },
    { id: 'yongshin', label: '용신·기신·희신', desc: '나에게 필요한 오행과 피해야 할 오행' },
    { id: 'johoo', label: '조후 분석', desc: '한난조습(온도·습도) 균형' },
  ]},
  { id: 'daewoon', label: '대운과 세운', icon: '📅', items: [
    { id: 'current_daewoon', label: '현재 대운 상세 분석', desc: '지금 흐르는 10년 대운의 의미' },
    { id: 'past_daewoon', label: '과거 대운 총평', desc: '지나온 삶의 흐름 복기' },
    { id: 'future_daewoon', label: '향후 대운 예측', desc: '앞으로 찾아올 변화의 시기' },
    { id: 'seun', label: '올해 세운 분석', desc: `${new Date().getFullYear()}년 연간 운세` },
  ]},
  { id: 'domain', label: '인생 영역별 운세', icon: '🌟', items: [
    { id: 'career', label: '직업·커리어운', desc: '적성·직종·승진 시기' },
    { id: 'wealth', label: '재물운', desc: '수입 흐름·투자 적기·손재 시기' },
    { id: 'love', label: '연애·결혼운', desc: '인연 시기·배우자 특성·궁합 방향' },
    { id: 'health', label: '건강운', desc: '취약 부위·주의 시기·체질 특성' },
    { id: 'family', label: '가족관계운', desc: '부모·형제·자녀와의 연' },
  ]},
  { id: 'special', label: '특수 구조 분석', icon: '🔬', items: [
    { id: 'shinsal', label: '신살 분석', desc: '역마·도화·천을귀인·화개 등' },
    { id: 'hapchung', label: '합·충·형·파·해', desc: '천간합·지지충 구조와 영향' },
    { id: 'gongmang', label: '공망 분석', desc: '비어있는 기운과 그 의미' },
  ]},
]

const ALL_ITEM_IDS = PRECISION_GROUPS.flatMap(g => g.items.map(i => i.id))

/* ─── 정밀분석 항목 선택 팝업 ─── */
function PrecisionSelectPopup({
  onCancel, onConfirm
}: { onCancel: () => void; onConfirm: (items: string[]) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set(ALL_ITEM_IDS))
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleGroup = (group: AnalysisGroup) => {
    const ids = group.items.map(i => i.id)
    const allChecked = ids.every(id => checked.has(id))
    setChecked(prev => {
      const next = new Set(prev)
      allChecked ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id))
      return next
    })
  }

  const toggleCollapse = (gid: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(gid) ? next.delete(gid) : next.add(gid)
      return next
    })
  }

  const checkedCount = checked.size

  return (
    <>
      <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, background: 'var(--bg-surface)',
        borderRadius: '20px 20px 0 0', zIndex: 301,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.14)',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* 핸들 + 헤더 */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-2)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>분석 항목 선택</span>
              <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-accent)', fontWeight: 700 }}>{checkedCount}/{ALL_ITEM_IDS.length}</span>
            </div>
            <button onClick={onCancel} style={{ color: 'var(--text-tertiary)', padding: 4 }}><X size={20} /></button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setChecked(new Set(ALL_ITEM_IDS))} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)' }}>전체 선택</button>
            <button onClick={() => setChecked(new Set())} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)' }}>전체 해제</button>
          </div>
        </div>

        {/* 항목 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {PRECISION_GROUPS.map(group => {
            const groupItemIds = group.items.map(i => i.id)
            const allChecked = groupItemIds.every(id => checked.has(id))
            const someChecked = groupItemIds.some(id => checked.has(id))
            const isCollapsed = collapsed.has(group.id)
            return (
              <div key={group.id} style={{ marginBottom: 12 }}>
                {/* 그룹 헤더 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: allChecked ? '#EEF2FF' : someChecked ? '#FFF8E1' : 'var(--bg-surface-3)', border: '1px solid var(--border-1)', marginBottom: 6 }}>
                  {/* 그룹 전체 체크박스 */}
                  <div onClick={() => toggleGroup(group)} style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    background: allChecked ? '#6366F1' : someChecked ? '#FCD34D' : 'var(--bg-surface)',
                    border: allChecked ? 'none' : '1.5px solid var(--border-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {allChecked && <Check size={13} color="#fff" strokeWidth={3} />}
                    {someChecked && !allChecked && <span style={{ fontSize: 10, color: '#92400E', fontWeight: 800 }}>−</span>}
                  </div>
                  <span style={{ fontSize: 16 }}>{group.icon}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{group.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{groupItemIds.filter(id => checked.has(id)).length}/{groupItemIds.length}</span>
                  <button onClick={() => toggleCollapse(group.id)} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                </div>

                {/* 그룹 아이템 목록 */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8 }}>
                    {group.items.map(item => {
                      const isChecked = checked.has(item.id)
                      return (
                        <div key={item.id} onClick={() => toggleItem(item.id)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          borderRadius: 10, cursor: 'pointer',
                          background: isChecked ? 'var(--bg-surface)' : 'transparent',
                          border: isChecked ? '1px solid var(--border-1)' : '1px solid transparent',
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                            background: isChecked ? '#6366F1' : 'var(--bg-surface-3)',
                            border: isChecked ? 'none' : '1.5px solid var(--border-2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isChecked && <Check size={12} color="#fff" strokeWidth={3} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: isChecked ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{item.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ height: 8 }} />
        </div>

        {/* 하단 버튼 */}
        <div style={{ padding: '12px 20px 24px', flexShrink: 0, borderTop: '1px solid var(--border-1)', display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '14px 0', borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 700, background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)' }}>
            취소
          </button>
          <button
            onClick={() => checkedCount > 0 && onConfirm([...checked])}
            disabled={checkedCount === 0}
            style={{ flex: 2, padding: '14px 0', borderRadius: 'var(--radius-md)', fontSize: 15, fontWeight: 700, background: checkedCount > 0 ? 'var(--bg-accent)' : 'var(--border-1)', color: checkedCount > 0 ? '#1F2937' : 'var(--text-disabled)', border: 'none', cursor: checkedCount > 0 ? 'pointer' : 'not-allowed' }}>
            위 체크항목 분석하기
          </button>
        </div>
      </div>
    </>
  )
}

// group_name을 포함한 확장 Profile 타입
interface ProfileWithGroup extends Profile {
  group_name?: string | null
  is_primary?: boolean
}

function profileToRequest(p: Profile) {
  const [y, m, d] = p.birth_date.split('-').map(Number)
  const [h, mi] = p.birth_time.split(':').map(Number)
  return { name: p.name, gender: p.gender, year: y, month: m, day: d, hour: h, minute: mi || 0, is_lunar: p.is_lunar }
}

function ProfileSelector({ profiles, selected, onSelect, label }: {
  profiles: ProfileWithGroup[]; selected: string; onSelect: (id: string) => void; label: string
}) {
  // 그룹 탭 계산
  const groups = ['전체', ...Array.from(new Set(
    profiles.map(p => p.group_name).filter(Boolean)
  )) as string[], ...(profiles.some(p => !p.group_name && !p.is_primary) ? ['미분류'] : [])]

  const [activeGroup, setActiveGroup] = useState('전체')

  const filtered = activeGroup === '전체' ? profiles
    : activeGroup === '미분류' ? profiles.filter(p => !p.group_name && !p.is_primary)
    : profiles.filter(p => p.group_name === activeGroup)

  return (
    <div style={{ margin: '0 20px 16px' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>{label}</div>

      {/* 그룹 탭 — 2개 이상일 때만 표시 */}
      {groups.length > 2 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
          {groups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)} style={{
              padding: '5px 12px', borderRadius: 'var(--radius-full)', flexShrink: 0,
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              background: activeGroup === g ? 'var(--bg-inverse)' : 'var(--bg-surface)',
              color: activeGroup === g ? 'var(--text-inverse)' : 'var(--text-tertiary)',
              border: activeGroup === g ? 'none' : '1px solid var(--border-1)',
              transition: 'all 0.15s',
            }}>
              {g}
            </button>
          ))}
        </div>
      )}

      {/* 프로필 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
            이 그룹에 저장된 사주가 없습니다
          </div>
        ) : filtered.map(p => {
          const active = selected === p.id
          return (
            <button key={p.id} onClick={() => onSelect(p.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)',
              border: active ? '2px solid var(--border-accent)' : '1px solid var(--border-1)',
              textAlign: 'left', width: '100%',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: active ? 'var(--bg-accent)' : 'var(--bg-surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 600, flexShrink: 0,
                color: active ? '#1F2937' : 'var(--text-secondary)',
              }}>{p.name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                  {p.is_primary && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: '#FFF8DD', color: '#C58D00' }}>기본</span>
                  )}
                  {p.group_name && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface-3)', color: 'var(--text-tertiary)' }}>{p.group_name}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {p.birth_date.replace(/-/g, '/')} {p.birth_time} ({p.is_lunar ? '음' : '양'})
                </div>
              </div>
              {active && <Check size={18} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AnalysisEntryScreen() {
  const { serviceId } = useParams()
  const nav = useNavigate()
  const config = serviceConfigs[serviceId || '']

  const [profiles, setProfiles] = useState<ProfileWithGroup[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [selectedId1, setSelectedId1] = useState('')
  const [selectedId2, setSelectedId2] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPrecisionPopup, setShowPrecisionPopup] = useState(false)

  // Supabase에서 실제 프로필 목록 로드
  useEffect(() => {
    async function fetchProfiles() {
      if (!supabase) { setProfilesLoading(false); return }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, gender, birth_year, birth_month, birth_day, birth_hour, calendar_type, is_primary, is_favorite, group_name, created_at')
          .eq('device_id', getDeviceId())
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true })
        if (data && data.length > 0) {
          // Supabase 컬럼 → ProfileWithGroup 타입 변환
          const mapped: ProfileWithGroup[] = data.map((p: any) => ({
            id: p.id,
            user_id: '',
            name: p.name,
            gender: p.gender,
            birth_date: `${p.birth_year}-${String(p.birth_month).padStart(2,'0')}-${String(p.birth_day).padStart(2,'0')}`,
            birth_time: p.birth_hour === 'unknown' ? '12:00' : p.birth_hour,
            is_lunar: p.calendar_type !== 'solar',
            is_primary: p.is_primary,
            is_favorite: p.is_favorite,
            group_name: p.group_name,
            created_at: p.created_at,
          }))
          setProfiles(mapped)
          setSelectedId1(mapped[0]?.id || '')
          setSelectedId2(mapped[1]?.id || mapped[0]?.id || '')
        }
      } catch (e) {
        console.error('[AnalysisEntryScreen]', e)
      } finally {
        setProfilesLoading(false)
      }
    }
    fetchProfiles()
  }, [])

  if (!config) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>서비스를 찾을 수 없습니다.</div>
  if (serviceId === 'name') { nav('/name-reading', { replace: true }); return null }
  if (serviceId === 'palm') { nav('/analysis/palm', { replace: true }); return null }
  if (serviceId === 'face') { nav('/analysis/face', { replace: true }); return null }
  if (profilesLoading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 14 }}>사주 목록 불러오는 중...</span>
    </div>
  )

  const isCompatibility = config.type === 'compatibility'
  const isText = config.type === 'text'
  const isProfile = config.type === 'profile'
  const isComingSoon = config.comingSoon

  const handleStart = async () => {
    if (isComingSoon || loading) return

    // precision 서비스는 항목 선택 팝업 먼저
    if (serviceId === 'precision' && isProfile) {
      const p1 = profiles.find(p => p.id === selectedId1)
      if (!p1) { alert('분석 대상을 선택해주세요.'); return }
      setShowPrecisionPopup(true)
      return
    }

    // lifetime은 전용 화면으로 이동 (API 호출은 화면에서)
    if (serviceId === 'lifetime' && isProfile) {
      const p1 = profiles.find(p => p.id === selectedId1)
      if (!p1) { alert('분석 대상을 선택해주세요.'); return }
      nav('/lifetime-result', { state: { profile: profileToRequest(p1) } })
      return
    }

    // 범용 운세 서비스 (flow, tojeong, wealth, love, career, business, health, friend)
    const FORTUNE_SERVICES: Record<string, string> = {
      flow: '운세 흐름', tojeong: '토정비결', wealth: '금전운',
      'love-fortune': '애정운', career: '직업운', business: '사업운',
      health: '건강운', friend: '친구운', newyear: '신년운세',
    }
    const fortuneTypeMap: Record<string, string> = { 'love-fortune': 'love' }
    if (serviceId && FORTUNE_SERVICES[serviceId] && isProfile) {
      const p1 = profiles.find(p => p.id === selectedId1)
      if (!p1) { alert('분석 대상을 선택해주세요.'); return }
      nav('/fortune-result', { state: {
        profile: profileToRequest(p1),
        fortuneType: fortuneTypeMap[serviceId] || serviceId,
        fortuneTitle: FORTUNE_SERVICES[serviceId],
      }})
      return
    }

    setLoading(true)
    try {
      if (isCompatibility) {
        const p1 = profiles.find(p => p.id === selectedId1)
        const p2 = profiles.find(p => p.id === selectedId2)
        if (!p1 || !p2) { alert('두 사람을 모두 선택해주세요.'); return }

        if (serviceId === 'family' || serviceId === 'general') {
          const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
          const res = await fetch(`${API_BASE}/api/compatibility/family`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              person1: profileToRequest(p1),
              person2: profileToRequest(p2),
              relation: serviceId === 'family' ? 'family' : 'general',
            }),
          })
          if (!res.ok) throw new Error(`가족궁합 API 오류: ${res.status}`)
          const analysisData = await res.json()
          nav('/family-result', { state: { analysisData } })
        } else if (serviceId === 'marriage') {
          const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
          const res = await fetch(`${API_BASE}/api/marriage/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person1: profileToRequest(p1), person2: profileToRequest(p2) }),
          })
          if (!res.ok) throw new Error(`결혼궁합 API 오류: ${res.status}`)
          const analysisData = await res.json()
          nav('/marriage-result', { state: { analysisData } })
        } else {
          const res = await analyzeCompatibility({
            person1: profileToRequest(p1),
            person2: profileToRequest(p2),
            use_llm: false,
          })
          nav('/compatibility-result', { state: { data: res.data } })
        }
      } else if (isProfile) {
        const p1 = profiles.find(p => p.id === selectedId1)
        if (!p1) { alert('분석 대상을 선택해주세요.'); return }
        const res = await calculateSaju(profileToRequest(p1))
        nav('/detail/api', { state: { data: res.data } })
      } else {
        nav('/result/sample')
      }
    } catch (e: any) {
      console.error('API error:', e)
      alert('분석 중 오류가 발생했습니다. API 서버를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrecisionConfirm = (selectedItems: string[]) => {
    setShowPrecisionPopup(false)
    const p1 = profiles.find(p => p.id === selectedId1)
    if (!p1) return
    nav('/precision-result', { state: { profile: profileToRequest(p1), selectedItems } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title={config.title} showBack />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Service Info */}
        <div style={{ margin: '0 20px 20px', padding: 24, borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', border: '1px solid var(--border-1)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{config.icon}</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{config.title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{config.detailDescription}</p>
        </div>

        {/* Features */}
        <div style={{ margin: '0 20px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>분석 항목</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {config.features.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--border-1)', fontSize: 13, color: 'var(--text-secondary)' }}>
                <Check size={14} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Profile Selection */}
        {isProfile && (
          <ProfileSelector profiles={profiles} selected={selectedId1} onSelect={setSelectedId1} label="분석할 사주 선택" />
        )}

        {/* Compatibility: Two Profile Selection */}
        {isCompatibility && (
          <>
            <ProfileSelector profiles={profiles} selected={selectedId1} onSelect={setSelectedId1} label="나" />
            <ProfileSelector
              profiles={profiles.filter(p => p.id !== selectedId1)}
              selected={selectedId2} onSelect={setSelectedId2} label="상대"
            />
          </>
        )}

        {/* Text Input */}
        {isText && (
          <div style={{ margin: '0 20px 20px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>{config.inputLabel}</div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={config.inputPlaceholder} style={{ width: '100%', minHeight: 120, padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--bg-surface)', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} />
          </div>
        )}

        {/* Coming Soon */}
        {isComingSoon && (
          <div style={{ margin: '0 20px 20px', padding: 24, borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-1)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-tertiary)' }}>서비스 준비 중입니다</div>
            <div style={{ fontSize: 13, color: 'var(--text-disabled)', marginTop: 4 }}>빠른 시일 내에 오픈할 예정이에요!</div>
          </div>
        )}
      </div>

      {/* Fixed CTA */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 50 }}>
        <button onClick={handleStart} disabled={isComingSoon || loading} style={{
          width: '100%', padding: 16, borderRadius: 'var(--radius-md)',
          fontSize: 16, fontWeight: 700, textAlign: 'center',
          background: (isComingSoon || loading) ? 'var(--border-1)' : 'var(--bg-accent)',
          color: (isComingSoon || loading) ? 'var(--text-disabled)' : '#1F2937',
          boxShadow: (isComingSoon || loading) ? 'none' : 'var(--shadow-md)',
          cursor: (isComingSoon || loading) ? 'not-allowed' : 'pointer',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
          {loading ? '분석 중...' : config.ctaLabel}
        </button>
      </div>

      {/* 정밀분석 항목 선택 팝업 */}
      {showPrecisionPopup && (
        <PrecisionSelectPopup
          onCancel={() => setShowPrecisionPopup(false)}
          onConfirm={handlePrecisionConfirm}
        />
      )}
    </div>
  )
}
