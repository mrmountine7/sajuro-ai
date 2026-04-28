import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronDown, Info, Loader2, Star, Crown, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'
import { useProfileGuard } from '@/lib/profile-guard-context'

/* ─── 타입 ─── */
type Gender = 'male' | 'female'
type CalendarType = 'solar' | 'lunar' | 'lunar_leap'

const now = new Date()
const THIS_YEAR = now.getFullYear()
const THIS_MONTH = now.getMonth() + 1
const THIS_DAY = now.getDate()

const YEARS = Array.from({ length: THIS_YEAR - 1940 + 1 }, (_, i) => THIS_YEAR - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = [0, 10, 20, 30, 40, 50]
const PRESET_GROUPS = ['가족', '친구', '직장', '연인']

const KOREAN_CITIES: Record<string, string> = {
  Seoul:    '서울특별시',
  Busan:    '부산광역시',
  Incheon:  '인천광역시',
  Daegu:    '대구광역시',
  Daejeon:  '대전광역시',
  Gwangju:  '광주광역시',
  Ulsan:    '울산광역시',
  Sejong:   '세종특별자치시',
  Gyeonggi: '경기도',
  Gangwon:  '강원특별자치도',
  Chungbuk: '충청북도',
  Chungnam: '충청남도',
  Jeonbuk:  '전북특별자치도',
  Jeonnam:  '전라남도',
  Gyeongbuk:'경상북도',
  Gyeongnam:'경상남도',
  Jeju:     '제주특별자치도',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/* ─── 공통 셀렉트 ─── */
function Select<T extends string | number>({
  value, onChange, options, disabled = false, flex = 1,
}: {
  value: T; onChange: (v: T) => void
  options: { value: T; label: string }[]
  disabled?: boolean
  flex?: number
}) {
  return (
    <div style={{ position: 'relative', flex }}>
      <select
        value={String(value)}
        onChange={e => onChange(options.find(o => String(o.value) === e.target.value)!.value)}
        disabled={disabled}
        style={{
          width: '100%', height: 38, padding: '0 28px 0 10px',
          borderRadius: 8, fontSize: 13, fontWeight: 500,
          color: disabled ? 'var(--text-disabled)' : 'var(--text-primary)',
          background: disabled ? 'var(--bg-surface-3)' : 'var(--bg-surface-2)',
          border: '1.5px solid var(--border-1)',
          appearance: 'none', WebkitAppearance: 'none',
          outline: 'none', fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
    </div>
  )
}

/* ─── 폼 행 ─── */
function Row({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: last ? 'none' : '1px solid var(--border-1)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0, width: 68 }}>{label}</span>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
    </div>
  )
}

/* ─── 토글 칩 ─── */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 11px', borderRadius: 'var(--radius-full)',
      fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      background: active ? 'var(--bg-inverse)' : 'var(--bg-surface-3)',
      color: active ? 'var(--text-inverse)' : 'var(--text-tertiary)',
      border: `1.5px solid ${active ? 'var(--bg-inverse)' : 'var(--border-1)'}`,
      transition: 'all 0.15s',
    }}>{label}</button>
  )
}

/* ─── 액션 버튼 (편집 모드 전용) ─── */
function ActionBtn({ icon, label, color, onClick, loading }: {
  icon: React.ReactNode; label: string; color: string; onClick: () => void; loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        padding: '12px 8px', borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)', border: '1px solid var(--border-1)',
        transition: 'all 0.15s', opacity: loading ? 0.5 : 1,
      }}
    >
      <div style={{ color, fontSize: 18 }}>{loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : icon}</div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

/* ─── 메인 ─── */
export default function AddProfileScreen() {
  const nav = useNavigate()
  const { refreshPrimary } = useProfileGuard()
  const [searchParams] = useSearchParams()
  const profileId = searchParams.get('id')
  const isEditMode = !!profileId

  /* 폼 상태 */
  const [name, setName] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [calendarType, setCalendarType] = useState<CalendarType>('solar')
  const [year, setYear] = useState(THIS_YEAR - 30)
  const [month, setMonth] = useState(THIS_MONTH)
  const [day, setDay] = useState(THIS_DAY)
  const [unknownTime, setUnknownTime] = useState(false)
  const [hour, setHour] = useState(12)
  const [minute, setMinute] = useState(0)
  const [city, setCity] = useState('Seoul')
  const [groupName, setGroupName] = useState('')
  const [customGroup, setCustomGroup] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [isPrimary, setIsPrimary] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [hasPrimary, setHasPrimary] = useState(false)

  /* UI 상태 */
  const [nameError, setNameError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [saveError, setSaveError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const effectiveGroup = showCustom ? customGroup : groupName

  /* 초기화: 편집 모드면 기존 데이터 로드, 신규면 기본 사주 존재 여부만 확인 */
  useEffect(() => {
    const init = async () => {
      if (!supabase) { setInitLoading(false); return }
      try {
        if (isEditMode && profileId) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', profileId)
            .single()
          if (error || !data) throw error ?? new Error('프로필 없음')

          const p = data as Record<string, unknown>
          setName(String(p.name ?? ''))
          setGender((p.gender as Gender) ?? 'male')
          setCalendarType((p.calendar_type as CalendarType) ?? 'solar')
          setYear(Number(p.birth_year) || THIS_YEAR - 30)
          setMonth(Number(p.birth_month) || THIS_MONTH)
          setDay(Number(p.birth_day) || THIS_DAY)
          const bh = String(p.birth_hour ?? 'unknown')
          if (bh === 'unknown') {
            setUnknownTime(true)
          } else {
            const [h, m] = bh.split(':').map(Number)
            setHour(isNaN(h) ? 12 : h)
            setMinute(isNaN(m) ? 0 : m)
          }
          setCity(String(p.city ?? 'Seoul'))
          setIsPrimary(Boolean(p.is_primary))
          setIsFavorite(Boolean(p.is_favorite))
          const gn = p.group_name ? String(p.group_name) : ''
          if (gn && PRESET_GROUPS.includes(gn)) {
            setGroupName(gn)
          } else if (gn) {
            setCustomGroup(gn)
            setShowCustom(true)
          }
        } else {
          const deviceId = getDeviceId()
          const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_primary', true)
            .eq('device_id', deviceId)
            .limit(1)
          setHasPrimary(!!(data && data.length > 0))
        }
      } catch (e) {
        console.error('[AddProfileScreen] 초기화 오류:', e)
      } finally {
        setInitLoading(false)
      }
    }
    init()
  }, [profileId, isEditMode])

  /* 월/연 변경 시 일 범위 조정 */
  const daysInMonth = getDaysInMonth(year, month)
  const dayOptions = Array.from({ length: daysInMonth }, (_, i) => ({ value: i + 1, label: `${String(i + 1).padStart(2, '0')}일` }))
  useEffect(() => { if (day > daysInMonth) setDay(daysInMonth) }, [year, month, daysInMonth, day])

  const getBirthHour = () =>
    unknownTime ? 'unknown' : `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  /* 저장/수정 */
  const handleSave = async () => {
    if (!name.trim()) { setNameError('이름을 입력해주세요'); return }
    setNameError(''); setSaveError('')
    if (!supabase) { setSaveError('데이터베이스에 연결할 수 없습니다.'); return }

    setLoading(true)
    try {
      const payload = {
        name: name.trim(), gender,
        nationality: 'domestic' as const,
        birth_year: year, birth_month: month, birth_day: day,
        birth_hour: getBirthHour(),
        calendar_type: calendarType,
        country: 'Korea', city,
        is_primary: isPrimary,
        group_name: effectiveGroup.trim() || null,
      }

      if (isEditMode && profileId) {
        const { error } = await supabase.from('profiles').update(payload).eq('id', profileId)
        if (error) throw error
      } else {
        const deviceId = getDeviceId()
        if (isPrimary && hasPrimary) {
          await supabase.from('profiles').update({ is_primary: false })
            .eq('device_id', deviceId).eq('is_primary', true)
        }
        const { error } = await supabase.from('profiles').insert({
          ...payload, is_favorite: false, device_id: deviceId, user_id: null,
        })
        if (error) throw error
      }
      refreshPrimary()
      nav('/vault')
    } catch (e) {
      console.error('[AddProfile] 저장 실패:', e)
      setSaveError('저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  /* 즐겨찾기 토글 */
  const handleFavorite = async () => {
    if (!supabase || !profileId) return
    setActionLoading('fav')
    try {
      const { error } = await supabase.from('profiles').update({ is_favorite: !isFavorite }).eq('id', profileId)
      if (error) throw error
      setIsFavorite(v => !v)
    } catch (e) { console.error(e) } finally { setActionLoading(null) }
  }

  /* 기본 사주 설정 */
  const handleSetPrimary = async () => {
    if (!supabase || !profileId || isPrimary) return
    setActionLoading('primary')
    try {
      const deviceId = getDeviceId()
      await supabase.from('profiles').update({ is_primary: false }).eq('device_id', deviceId).eq('is_primary', true)
      const { error } = await supabase.from('profiles').update({ is_primary: true }).eq('id', profileId)
      if (error) throw error
      setIsPrimary(true)
    } catch (e) { console.error(e) } finally { setActionLoading(null) }
  }

  /* 삭제 */
  const handleDelete = async () => {
    if (!supabase || !profileId) return
    if (!window.confirm(`'${name}' 사주를 삭제하시겠습니까?`)) return
    setActionLoading('del')
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', profileId)
      if (error) throw error
      nav('/vault')
    } catch (e) {
      console.error(e)
      setActionLoading(null)
    }
  }

  if (initLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-tertiary)' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: 14 }}>불러오는 중...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface-2)' }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', minHeight: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-1)', flexShrink: 0, position: 'relative' }}>
        <button onClick={() => nav(-1)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-full)', color: 'var(--text-primary)' }}>
          <ChevronLeft size={22} />
        </button>
        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>
          {isEditMode ? `${name || '사주'} 정보 수정` : '새 사주 추가'}
        </span>
      </div>

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 110px' }}>

        {/* 편집 모드 액션 버튼 */}
        {isEditMode && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <ActionBtn
              icon={<Star size={18} fill={isFavorite ? '#F2C316' : 'none'} />}
              label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
              color={isFavorite ? '#F2C316' : 'var(--text-tertiary)'}
              onClick={handleFavorite}
              loading={actionLoading === 'fav'}
            />
            <ActionBtn
              icon={<Crown size={18} fill={isPrimary ? '#F2C316' : 'none'} />}
              label={isPrimary ? '기본 사주' : '기본으로 설정'}
              color={isPrimary ? '#F2C316' : 'var(--text-tertiary)'}
              onClick={handleSetPrimary}
              loading={actionLoading === 'primary'}
            />
            <ActionBtn
              icon={<Trash2 size={18} />}
              label="삭제"
              color="#EF4444"
              onClick={handleDelete}
              loading={actionLoading === 'del'}
            />
          </div>
        )}

        {/* 폼 카드 */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-1)', overflow: 'hidden' }}>

          {/* 이름 */}
          <Row label="이름 *">
            <div style={{ flex: 1 }}>
              <input
                type="text" value={name}
                onChange={e => { setName(e.target.value); if (nameError) setNameError('') }}
                placeholder="이름 또는 별칭"
                style={{
                  width: '100%', height: 38, padding: '0 12px', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
                  background: 'var(--bg-surface-2)',
                  border: `1.5px solid ${nameError ? '#EF4444' : 'var(--border-1)'}`,
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              {nameError && <p style={{ fontSize: 10, color: '#EF4444', marginTop: 3 }}>{nameError}</p>}
            </div>
          </Row>

          {/* 성별 */}
          <Row label="성별">
            <Chip label="남성" active={gender === 'male'} onClick={() => setGender('male')} />
            <Chip label="여성" active={gender === 'female'} onClick={() => setGender('female')} />
          </Row>

          {/* 음양력 */}
          <Row label="음양력">
            <Chip label="양력" active={calendarType === 'solar'} onClick={() => setCalendarType('solar')} />
            <Chip label="음력" active={calendarType === 'lunar'} onClick={() => setCalendarType('lunar')} />
            <Chip label="윤달" active={calendarType === 'lunar_leap'} onClick={() => setCalendarType('lunar_leap')} />
          </Row>

          {/* 생년월일 */}
          <Row label="생년월일">
            <Select value={year} onChange={setYear} options={YEARS.map(y => ({ value: y, label: `${y}년` }))} flex={5} />
            <Select value={month} onChange={setMonth} options={MONTHS.map(m => ({ value: m, label: `${String(m).padStart(2, '0')}월` }))} flex={3} />
            <Select value={day} onChange={setDay} options={dayOptions} flex={3} />
          </Row>

          {/* 태어난 시간 */}
          <Row label="태어난 시">
            <button onClick={() => setUnknownTime(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${unknownTime ? 'var(--border-accent)' : 'var(--border-2)'}`,
                background: unknownTime ? 'var(--bg-accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {unknownTime && <span style={{ fontSize: 10, fontWeight: 800, color: '#111827', lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>모름</span>
            </button>
            <Select value={hour} onChange={setHour} options={HOURS.map(h => ({ value: h, label: `${String(h).padStart(2, '0')}시` }))} disabled={unknownTime} />
            <Select value={minute} onChange={setMinute} options={MINUTES.map(m => ({ value: m, label: `${String(m).padStart(2, '0')}분` }))} disabled={unknownTime} />
          </Row>

          {/* 출생지 */}
          <Row label="출생지">
            <Select value={city} onChange={setCity} options={Object.entries(KOREAN_CITIES).map(([v, label]) => ({ value: v, label }))} />
          </Row>

          {/* 그룹 */}
          <Row label="그룹">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
              {PRESET_GROUPS.map(g => (
                <Chip key={g} label={g} active={!showCustom && groupName === g}
                  onClick={() => { setShowCustom(false); setGroupName(prev => prev === g ? '' : g) }} />
              ))}
              <Chip label="직접입력" active={showCustom}
                onClick={() => { setShowCustom(v => !v); setGroupName('') }} />
              {showCustom && (
                <input
                  type="text" value={customGroup}
                  onChange={e => setCustomGroup(e.target.value)}
                  placeholder="그룹명 입력" autoFocus
                  style={{
                    width: '100%', height: 34, padding: '0 10px', marginTop: 4,
                    borderRadius: 8, fontSize: 12, fontWeight: 500,
                    color: 'var(--text-primary)', background: 'var(--bg-surface-2)',
                    border: '1.5px solid var(--border-accent)',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              )}
            </div>
          </Row>

          {/* 기본 사주 (신규 추가 시에만 표시) */}
          {!isEditMode && (
            <Row label="기본 사주" last>
              <div style={{ flex: 1, fontSize: 11, color: 'var(--text-tertiary)' }}>
                {hasPrimary ? '기존 기본 사주 해제 후 설정' : '홈·분석에서 기본으로 사용'}
              </div>
              <div onClick={() => setIsPrimary(v => !v)} style={{ cursor: 'pointer', flexShrink: 0 }}>
                <div style={{ width: 44, height: 26, borderRadius: 'var(--radius-full)', background: isPrimary ? 'var(--bg-accent)' : 'var(--border-2)', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 'var(--radius-full)', background: '#fff', position: 'absolute', top: 3, left: isPrimary ? 21 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                </div>
              </div>
            </Row>
          )}
          {isEditMode && <div style={{ height: 1 }} />}
        </div>

        {/* -30분 안내 */}
        <div style={{ display: 'flex', gap: 5, marginTop: 10, alignItems: 'flex-start' }}>
          <Info size={11} style={{ color: 'var(--text-accent)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            분석 시 <strong style={{ color: 'var(--text-secondary)' }}>-30분 보정</strong> 자동 적용 · 밤 11시(23:00~23:59) 출생은 야자시로 다음 날 기준 계산
          </p>
        </div>

        {saveError && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: '#FFF0F0', border: '1px solid #FFCDD2', fontSize: 12, color: '#C62828' }}>
            {saveError}
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px 28px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-1)', zIndex: 50 }}>
        <button
          onClick={handleSave} disabled={loading}
          style={{
            width: '100%', height: 52, borderRadius: 'var(--radius-md)',
            fontSize: 16, fontWeight: 700,
            background: loading ? 'var(--border-1)' : 'var(--bg-accent)',
            color: loading ? 'var(--text-disabled)' : '#1F2937',
            boxShadow: loading ? 'none' : 'var(--shadow-md)',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
          {loading ? '저장 중...' : isEditMode ? '수정 저장하기' : '사주 저장하기'}
        </button>
      </div>

    </div>
  )
}
