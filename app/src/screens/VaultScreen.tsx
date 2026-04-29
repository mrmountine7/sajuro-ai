import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, Pencil, Trash2, Plus, Check, X, Settings2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getCurrentIdentity, applyUserFilter } from '@/lib/user-filter'
import { getZodiacData } from '@/lib/zodiac-icons'
import { analysisMenuItems, categoryLabels, badgeConfig } from '@/lib/analysis-menu'
import type { AnalysisCategory } from '@/lib/types'

/* ─── 타입 ─── */
interface DbProfile {
  id: string; name: string; gender: 'male' | 'female'
  birth_year: number; birth_month: number; birth_day: number
  birth_hour: string; calendar_type: 'solar' | 'lunar' | 'lunar_leap'
  city: string; country: string
  is_primary: boolean; is_favorite: boolean
  group_name: string | null; created_at: string
}

/* ─── 포맷 헬퍼 ─── */
const formatDate = (p: DbProfile) =>
  `${p.birth_year}/${String(p.birth_month).padStart(2, '0')}/${String(p.birth_day).padStart(2, '0')}`
const formatTime = (p: DbProfile) => p.birth_hour === 'unknown' ? '시간 모름' : p.birth_hour
const formatCal  = (p: DbProfile) => p.calendar_type === 'solar' ? '양' : '음'

function getKoreanAge(year: number) {
  return new Date().getFullYear() - year + 1
}

/* ─── 띠 아바타 ─── */
function ZodiacAvatar({ birthYear, size = 48 }: { birthYear: number; size?: number }) {
  const z = getZodiacData(birthYear)
  const labelSize = Math.round(size * 0.185)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: z.bg, border: `1.5px solid ${z.color}55`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 0,
    }}>
      <img
        src={z.img}
        alt={z.name}
        style={{ width: size * 0.76, height: size * 0.76, objectFit: 'contain' }}
      />
      <span style={{
        fontSize: labelSize, fontWeight: 700, color: z.color,
        lineHeight: 1, letterSpacing: '-0.02em', marginTop: -1,
      }}>
        {z.name}
      </span>
    </div>
  )
}

/* ─── 기본 그룹 ─── */
const DEFAULT_GROUPS = ['가족', '친구', '직장', '연인']
const FIXED_TABS     = ['전체', ...DEFAULT_GROUPS] // 항상 표시

/* ─── 분석 메뉴 바텀시트 ─── */
const ANALYSIS_CATEGORIES: AnalysisCategory[] = ['all', 'saju', 'theme', 'match', 'life', 'image']

interface AnalysisMenuSheetProps {
  profileName: string
  onSelect: (route: string) => void
  onClose: () => void
}
function AnalysisMenuSheet({ profileName, onSelect, onClose }: AnalysisMenuSheetProps) {
  const [filter, setFilter] = useState<AnalysisCategory>('all')
  const filtered = filter === 'all'
    ? analysisMenuItems.filter(i => i.badge !== 'coming-soon')
    : analysisMenuItems.filter(i => i.category === filter && i.badge !== 'coming-soon')

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, background: 'var(--bg-surface)',
        borderRadius: '20px 20px 0 0', zIndex: 201,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        maxHeight: '75vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* 핸들 + 헤더 */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-2)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 }}>
            <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}><X size={20} /></button>
          </div>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 14 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{profileName}</span> 님의 사주를 분석합니다
          </p>

          {/* 카테고리 필터 */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
            {ANALYSIS_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} style={{
                padding: '5px 12px', borderRadius: 'var(--radius-full)', flexShrink: 0,
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                background: filter === cat ? 'var(--bg-inverse)' : 'var(--bg-surface-3)',
                color: filter === cat ? 'var(--text-inverse)' : 'var(--text-tertiary)',
                border: 'none', transition: 'all 0.15s',
              }}>
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* 메뉴 리스트 */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item.route)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '13px 0', textAlign: 'left', borderBottom: '1px solid var(--border-1)',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, background: 'var(--bg-surface-3)',
              }}>{item.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}>{item.description}</div>
              </div>
              {item.badge && badgeConfig[item.badge] && (
                <span style={{ flexShrink: 0, marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: badgeConfig[item.badge].color }}>
                  {badgeConfig[item.badge].label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

/* ─── 그룹 관리 바텀시트 ─── */
interface GroupMgmtSheetProps {
  allGroups: string[]       // '전체'·'미분류' 제외, 실제 관리 대상
  memberCount: (g: string) => number
  onRename: (oldName: string, newName: string) => Promise<void>
  onDelete: (name: string) => Promise<void>
  onAdd: (name: string) => void
  onClose: () => void
}
function GroupMgmtSheet({ allGroups, memberCount, onRename, onDelete, onAdd, onClose }: GroupMgmtSheetProps) {
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newGroupValue, setNewGroupValue] = useState('')
  const [showAddInput, setShowAddInput] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (g: string) => {
    setEditingGroup(g); setEditValue(g)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const confirmRename = async (oldName: string) => {
    const newName = editValue.trim()
    if (!newName || newName === oldName) { setEditingGroup(null); return }
    if (allGroups.includes(newName)) { alert('이미 존재하는 그룹명입니다.'); return }
    setActionLoading(`rename-${oldName}`)
    await onRename(oldName, newName)
    setActionLoading(null); setEditingGroup(null)
  }

  const confirmDelete = async (name: string) => {
    const cnt = memberCount(name)
    const msg = cnt > 0
      ? `'${name}' 그룹의 ${cnt}명이 미분류로 이동됩니다.\n계속하시겠습니까?`
      : `'${name}' 그룹을 삭제하시겠습니까?`
    if (!window.confirm(msg)) return
    setActionLoading(`del-${name}`)
    await onDelete(name)
    setActionLoading(null)
  }

  const confirmAdd = () => {
    const name = newGroupValue.trim()
    if (!name) return
    if (allGroups.includes(name)) { alert('이미 존재하는 그룹명입니다.'); return }
    onAdd(name)
    setNewGroupValue(''); setShowAddInput(false)
  }

  return (
    <>
      {/* 배경 딤 */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />

      {/* 시트 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, background: 'var(--bg-surface)',
        borderRadius: '20px 20px 0 0', zIndex: 201,
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* 핸들 + 헤더 */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-2)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>그룹 관리</span>
            <button onClick={onClose} style={{ color: 'var(--text-tertiary)', padding: 4 }}><X size={20} /></button>
          </div>
        </div>

        {/* 그룹 목록 */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>
          {allGroups.map(g => {
            const cnt = memberCount(g)
            const isEditing = editingGroup === g
            const isLoading = actionLoading?.startsWith(`rename-${g}`) || actionLoading === `del-${g}`

            return (
              <div key={g} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 0', borderBottom: '1px solid var(--border-1)',
              }}>
                {/* 그룹 색 점 */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bg-accent)', flexShrink: 0 }} />

                {/* 이름 / 편집 입력 */}
                {isEditing ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmRename(g); if (e.key === 'Escape') setEditingGroup(null) }}
                    style={{
                      flex: 1, height: 34, padding: '0 10px', borderRadius: 8,
                      fontSize: 14, fontWeight: 500, border: '1.5px solid var(--border-accent)',
                      background: 'var(--bg-surface-2)', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{g}</span>
                    {cnt > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>{cnt}명</span>
                    )}
                  </div>
                )}

                {/* 액션 버튼 */}
                {isLoading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                ) : isEditing ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => confirmRename(g)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={15} color="#1F2937" />
                    </button>
                    <button onClick={() => setEditingGroup(null)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={15} color="var(--text-tertiary)" />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(g)} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={14} color="var(--text-secondary)" />
                    </button>
                    <button onClick={() => confirmDelete(g)} style={{ width: 30, height: 30, borderRadius: 8, background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* 그룹 추가 */}
          <div style={{ marginTop: 16 }}>
            {showAddInput ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={newGroupValue}
                  onChange={e => setNewGroupValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') { setShowAddInput(false); setNewGroupValue('') } }}
                  placeholder="새 그룹명 입력"
                  style={{
                    flex: 1, height: 38, padding: '0 12px', borderRadius: 10,
                    fontSize: 13, fontWeight: 500, border: '1.5px solid var(--border-accent)',
                    background: 'var(--bg-surface-2)', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button onClick={confirmAdd} style={{ height: 38, padding: '0 14px', borderRadius: 10, background: 'var(--bg-accent)', fontSize: 13, fontWeight: 700, color: '#1F2937' }}>추가</button>
                <button onClick={() => { setShowAddInput(false); setNewGroupValue('') }} style={{ height: 38, width: 38, borderRadius: 10, background: 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} color="var(--text-tertiary)" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAddInput(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', width: '100%' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-surface-3)', border: '1.5px dashed var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={15} color="var(--text-tertiary)" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-tertiary)' }}>새 그룹 추가</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── 메인 화면 ─── */
export default function VaultScreen() {
  const nav = useNavigate()
  const location = useLocation()

  const [profiles, setProfiles] = useState<DbProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('전체')

  /* ── 그룹 탭 드래그 스크롤 ── */
  const groupTabRef = useRef<HTMLDivElement>(null)
  const groupDrag = useRef({ on: false, startX: 0, scrollLeft: 0, moved: false })
  const onGroupMouseDown = useCallback((e: React.MouseEvent) => {
    const el = groupTabRef.current; if (!el) return
    groupDrag.current = { on: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
  }, [])
  const onGroupMouseMove = useCallback((e: React.MouseEvent) => {
    const d = groupDrag.current; if (!d.on) return
    const el = groupTabRef.current; if (!el) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 3) d.moved = true
    el.scrollLeft = d.scrollLeft - dx
  }, [])
  const onGroupMouseUp = useCallback(() => {
    const el = groupTabRef.current; if (!el) return
    groupDrag.current.on = false; el.style.cursor = 'grab'
  }, [])
  const onGroupClickCapture = useCallback((e: React.MouseEvent) => {
    if (groupDrag.current.moved) { e.stopPropagation(); groupDrag.current.moved = false }
  }, [])
  const [showGroupMgmt, setShowGroupMgmt] = useState(false)
  const [analysisTarget, setAnalysisTarget] = useState<{ name: string; id: string } | null>(null)
  // 사용자 정의 그룹 목록 (기본 그룹 + 추가된 커스텀 그룹, localStorage 저장)
  const [extraGroups, setExtraGroups] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('saju_extra_groups') || '[]') } catch { return [] }
  })

  const fetchProfiles = async () => {
    setLoading(true); setError('')
    try {
      if (!supabase) throw new Error('Supabase 미연결')
      const identity = await getCurrentIdentity()
      const { data, error: err } = await applyUserFilter(
        supabase.from('profiles')
          .select('id,name,gender,birth_year,birth_month,birth_day,birth_hour,calendar_type,city,country,is_primary,is_favorite,group_name,created_at')
          .order('created_at', { ascending: true }),
        identity
      )
      if (err) throw err
      setProfiles((data as DbProfile[]) ?? [])
    } catch (e) {
      console.error('[VaultScreen]', e); setError('데이터를 불러오지 못했습니다.')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchProfiles() }, [location.key])

  /* 그룹 저장 (localStorage) */
  const saveExtraGroups = (groups: string[]) => {
    setExtraGroups(groups)
    localStorage.setItem('saju_extra_groups', JSON.stringify(groups))
  }

  /* 탭 계산 */
  const primary    = profiles.find(p => p.is_primary)
  const favs       = profiles.filter(p => p.is_favorite && !p.is_primary)
  const nonPrimary = profiles.filter(p => !p.is_primary)

  const dbGroups    = Array.from(new Set(nonPrimary.map(p => p.group_name).filter(Boolean))) as string[]
  const allManagedGroups = Array.from(new Set([...DEFAULT_GROUPS, ...extraGroups, ...dbGroups]))
  const hasUngrouped = nonPrimary.some(p => !p.group_name)
  const tabs = ['전체', ...allManagedGroups, ...(hasUngrouped ? ['미분류'] : [])]

  const memberCount = (g: string) =>
    g === '미분류' ? nonPrimary.filter(p => !p.group_name).length
                   : nonPrimary.filter(p => p.group_name === g).length

  const others =
    selectedGroup === '전체'   ? nonPrimary
    : selectedGroup === '미분류' ? nonPrimary.filter(p => !p.group_name)
    : nonPrimary.filter(p => p.group_name === selectedGroup)

  /* 그룹 이름 변경 */
  const handleRename = async (oldName: string, newName: string) => {
    if (!supabase) return
    const identity = await getCurrentIdentity()
    await applyUserFilter(
      supabase.from('profiles').update({ group_name: newName }).eq('group_name', oldName),
      identity
    )
    saveExtraGroups(extraGroups.map(g => g === oldName ? newName : g))
    if (selectedGroup === oldName) setSelectedGroup(newName)
    await fetchProfiles()
  }

  /* 그룹 삭제 */
  const handleDelete = async (name: string) => {
    if (!supabase) return
    const identity = await getCurrentIdentity()
    await applyUserFilter(
      supabase.from('profiles').update({ group_name: null }).eq('group_name', name),
      identity
    )
    saveExtraGroups(extraGroups.filter(g => g !== name))
    if (selectedGroup === name) setSelectedGroup('전체')
    await fetchProfiles()
  }

  /* 그룹 추가 (빈 그룹) */
  const handleAdd = (name: string) => {
    if (!allManagedGroups.includes(name)) {
      saveExtraGroups([...extraGroups, name])
    }
  }

  /* 그룹명 → 궁합 라우트 자동 매칭 */
  const getCompatRoute = (groupName: string | null) => {
    switch (groupName) {
      case '연인': return '/analysis/couple'
      case '가족': return '/analysis/family'
      default:     return '/analysis/general'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="사주 보관소" showBack onBack={() => nav(-1)} rightActions={['fontSize', 'kakao', 'add']}
        onAction={a => { if (a === 'add') nav('/add-profile') }} />

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14 }}>불러오는 중...</span>
        </div>
      ) : error ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
          <span style={{ fontSize: 14, color: 'var(--text-tertiary)', textAlign: 'center' }}>{error}</span>
          <button onClick={fetchProfiles} style={{ padding: '8px 20px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, background: 'var(--bg-accent)', color: '#1F2937' }}>다시 시도</button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

          {/* 기본 사주 */}
          {primary ? (() => {
            const page = getKoreanAge(primary.birth_year)
            return (
            <div className="s-profile-card" style={{ margin: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <ZodiacAvatar birthYear={primary.birth_year} size={56} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 17, fontWeight: 700 }}>{primary.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{page}세</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, lineHeight: 1.4 }}>
                    {formatDate(primary)} · {formatTime(primary)} ({formatCal(primary)}) · {primary.city}
                  </div>
                  <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, background: '#FFF8DD', color: '#C58D00' }}>기본 사주</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => setAnalysisTarget({ name: primary.name, id: primary.id })} style={{ flex: 1, padding: '8px 0', borderRadius: 12, fontSize: 12, fontWeight: 600, textAlign: 'center', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)' }}>분석</button>
              </div>
            </div>
          )})() : (
            <button onClick={() => nav('/add-profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '16px 20px', padding: '24px 0', background: 'var(--bg-surface)', border: '2px dashed var(--border-accent)', borderRadius: 'var(--radius-lg)', width: 'calc(100% - 40px)', cursor: 'pointer' }}>
              <div style={{ fontSize: 28 }}>✨</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-accent)' }}>기본 사주를 추가해보세요</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>+ 새 사주 추가</div>
            </button>
          )}

          {/* 즐겨찾기 */}
          <div style={{ padding: '0 20px', marginBottom: 12 }}><div className="s-section-title">즐겨찾기</div></div>
          <div style={{ display: 'flex', gap: 16, padding: '0 20px', overflowX: 'auto', marginBottom: 24 }}>
            {favs.map(p => (
              <button key={p.id} onClick={() => nav(`/add-profile?id=${p.id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <ZodiacAvatar birthYear={p.birth_year} size={52} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{p.name}</span>
              </button>
            ))}
            <button onClick={() => nav('/add-profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-full)', border: '2px dashed var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-tertiary)' }}>+</div>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>추가</span>
            </button>
          </div>

          {/* 저장된 사주 헤더 */}
          <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="s-section-title">저장된 사주</div>
            <button onClick={() => nav('/add-profile')} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-accent)' }}>+ 새 사주 추가</button>
          </div>

          {/* 그룹 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>그룹</span>
            <button
              onClick={() => setShowGroupMgmt(true)}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--bg-surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-tertiary)', transition: 'all 0.15s' }}
            >
              <Settings2 size={14} />
            </button>
          </div>

          {/* 그룹 탭 — 드래그 스크롤 */}
          <div
            ref={groupTabRef}
            style={{ display: 'flex', gap: 8, padding: '0 20px', overflowX: 'auto', marginBottom: 12, paddingBottom: 2, scrollbarWidth: 'none', cursor: 'grab', WebkitOverflowScrolling: 'touch' as any }}
            onMouseDown={onGroupMouseDown}
            onMouseMove={onGroupMouseMove}
            onMouseUp={onGroupMouseUp}
            onMouseLeave={onGroupMouseUp}
            onClickCapture={onGroupClickCapture}
          >
            {tabs.map(tab => (
              <button key={tab} onClick={() => setSelectedGroup(tab)} style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', flexShrink: 0,
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                background: selectedGroup === tab ? 'var(--bg-inverse)' : 'var(--bg-surface)',
                color: selectedGroup === tab ? 'var(--text-inverse)' : 'var(--text-tertiary)',
                border: `1.5px solid ${selectedGroup === tab ? 'var(--bg-inverse)' : 'var(--border-1)'}`,
                transition: 'all 0.15s',
              }}>
                {tab}
                {tab !== '전체' && memberCount(tab) > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>{memberCount(tab)}</span>
                )}
              </button>
            ))}
          </div>

          {/* 사주 목록 */}
          {others.length === 0 ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              이 그룹에 저장된 사주가 없습니다
            </div>
          ) : (
            others.map(p => {
              const age = getKoreanAge(p.birth_year)
              const z = getZodiacData(p.birth_year)
              return (
                <button key={p.id} onClick={() => nav(`/add-profile?id=${p.id}`)}
                  style={{ display: 'flex', gap: 12, margin: '0 20px 10px', padding: '14px 16px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', textAlign: 'left', width: 'calc(100% - 40px)' }}>

                  <ZodiacAvatar birthYear={p.birth_year} size={48} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>{age}세</span>
                      {p.group_name && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: z.bg, color: z.color, border: `1px solid ${z.color}44` }}>
                          {p.group_name}
                        </span>
                      )}
                      {p.is_favorite && <span style={{ fontSize: 12 }}>⭐</span>}
                    </div>

                    {/* 생년월일 */}
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
                      {formatDate(p)} · {formatTime(p)} ({formatCal(p)}) · {p.city}
                    </div>

                    {/* 액션 버튼 */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <span className="s-small-btn" onClick={e => { e.stopPropagation(); setAnalysisTarget({ name: p.name, id: p.id }) }}>분석</span>
                      <span className="s-small-btn" onClick={e => { e.stopPropagation(); nav(getCompatRoute(p.group_name)) }}>나와의 궁합</span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}

      {/* 분석 메뉴 바텀시트 */}
      {analysisTarget && (
        <AnalysisMenuSheet
          profileName={analysisTarget.name}
          onSelect={route => { setAnalysisTarget(null); nav(route) }}
          onClose={() => setAnalysisTarget(null)}
        />
      )}

      {/* 그룹 관리 바텀시트 */}
      {showGroupMgmt && (
        <GroupMgmtSheet
          allGroups={allManagedGroups}
          memberCount={memberCount}
          onRename={handleRename}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onClose={() => setShowGroupMgmt(false)}
        />
      )}
    </div>
  )
}
