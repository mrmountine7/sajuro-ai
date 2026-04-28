import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import { useProfileGuard } from '@/lib/profile-guard-context'
import { analysisMenuItems, categoryLabels, badgeConfig } from '@/lib/analysis-menu'
import type { AnalysisCategory } from '@/lib/types'

const categories: AnalysisCategory[] = ['all', 'saju', 'theme', 'match', 'life', 'image']

export default function AnalysisScreen() {
  const [filter, setFilter] = useState<AnalysisCategory>('all')
  const nav = useNavigate()
  const { safeNav } = useProfileGuard()
  const filtered = filter === 'all' ? analysisMenuItems : analysisMenuItems.filter(i => i.category === filter)

  const tabBarRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ on: false, startX: 0, scrollLeft: 0, moved: false })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = tabBarRef.current; if (!el) return
    drag.current = { on: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
  }, [])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const d = drag.current; if (!d.on) return
    const el = tabBarRef.current; if (!el) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 3) d.moved = true
    el.scrollLeft = d.scrollLeft - dx
  }, [])
  const onMouseUp = useCallback(() => {
    const el = tabBarRef.current; if (!el) return
    drag.current.on = false; el.style.cursor = 'grab'
  }, [])
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (drag.current.moved) { e.stopPropagation(); drag.current.moved = false }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="분석 메뉴" rightActions={['kakao', 'fontSize', 'search']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <p style={{ padding: '0 20px', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>보고 싶은 분석을 선택해보세요.</p>

        {/* Filter Chips — 드래그 스크롤 */}
        <div
          ref={tabBarRef}
          style={{ display: 'flex', gap: 8, padding: '0 20px', overflowX: 'auto', marginBottom: 16, scrollbarWidth: 'none', cursor: 'grab', WebkitOverflowScrolling: 'touch' as any }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClickCapture={onClickCapture}
        >
          {categories.map(cat => (
            <button key={cat} className={`s-chip ${filter === cat ? 's-chip-active' : ''}`}
              style={{ flexShrink: 0 }} onClick={() => setFilter(cat)}>
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Card Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 20px' }}>
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => item.badge !== 'coming-soon' && safeNav(`/analysis/${item.id}`)}
              className="s-card-md"
              style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', position: 'relative', opacity: item.badge === 'coming-soon' ? 0.5 : 1, minHeight: 60 }}
            >
              <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{item.description}</div>
              </div>
              {item.badge && badgeConfig[item.badge] && (
                <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 11, fontWeight: 700, color: badgeConfig[item.badge].color }}>
                  {badgeConfig[item.badge].label}
                </span>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
