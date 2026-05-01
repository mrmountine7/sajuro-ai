import { useState } from 'react'
import { Check } from 'lucide-react'

export interface ProfileItem {
  id: string
  name: string
  subtitle?: string
  is_primary?: boolean
  group_name?: string | null
}

interface Props {
  profiles: ProfileItem[]
  selected: string
  onSelect: (id: string) => void
  label?: string
}

export default function ProfileGroupSelector({ profiles, selected, onSelect, label }: Props) {
  // 그룹 탭 계산 — 사주 있는 그룹만, 전체는 맨 오른쪽
  const nonEmptyGroups = Array.from(new Set(
    profiles.map(p => p.group_name).filter(Boolean)
  )) as string[]
  const hasUngrouped = profiles.some(p => !p.group_name)
  const groups = [...nonEmptyGroups, ...(hasUngrouped ? ['미분류'] : []), '전체']

  // '나' 그룹이 있으면 기본 선택, 없으면 첫 번째 그룹, 없으면 '전체'
  const defaultGroup = groups.includes('나') ? '나' : (groups[0] ?? '전체')
  const [activeGroup, setActiveGroup] = useState(defaultGroup)

  const filtered = activeGroup === '전체' ? profiles
    : activeGroup === '미분류' ? profiles.filter(p => !p.group_name)
    : profiles.filter(p => p.group_name === activeGroup)

  return (
    <div style={{ margin: '0 20px 16px' }}>
      {label && (
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
          {label}
        </div>
      )}

      {/* 그룹 탭 — 그룹이 2개 이상일 때만 표시 */}
      {groups.length > 2 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2,
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any,
        }}>
          {groups.map(g => {
            const count = g === '전체' ? profiles.length
              : g === '미분류' ? profiles.filter(p => !p.group_name).length
              : profiles.filter(p => p.group_name === g).length
            const isActive = activeGroup === g
            return (
              <button key={g} onClick={() => setActiveGroup(g)} style={{
                padding: '5px 12px', borderRadius: 'var(--radius-full)', flexShrink: 0,
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                background: isActive ? 'var(--bg-inverse)' : 'var(--bg-surface)',
                color: isActive ? 'var(--text-inverse)' : 'var(--text-tertiary)',
                border: isActive ? 'none' : '1px solid var(--border-1)',
                transition: 'all 0.15s',
              }}>
                {g}
                {count > 0 && (
                  <span style={{ marginLeft: 3, fontSize: 11, opacity: 0.75 }}>{count}</span>
                )}
              </button>
            )
          })}
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
              }}>
                {p.name[0]}
              </div>
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
                {p.subtitle && (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{p.subtitle}</div>
                )}
              </div>
              {active && <Check size={18} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
