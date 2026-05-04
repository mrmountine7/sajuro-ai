import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Users, BarChart2, Activity, Clock, TrendingUp, Layers } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const TYPE_LABEL: Record<string, string> = {
  precision:   '사주정밀',
  dream:       '꿈해몽',
  name:        '이름풀이',
  marriage:    '결혼궁합',
  compat:      '이름궁합',
  manseryuk:   '만세력',
  fortune:     '운세',
  lifetime:    '평생운',
  palm:        '손금',
  face:        '관상',
  family:      '가족궁합',
  ideal:       '이상형',
}

const TYPE_COLOR: Record<string, string> = {
  precision: '#6366F1', dream: '#0EA5E9', name: '#1E3A8A',
  marriage: '#EC4899', compat: '#F59E0B', manseryuk: '#10B981',
  fortune: '#8B5CF6', lifetime: '#EF4444', palm: '#14B8A6',
  face: '#F97316', family: '#84CC16', ideal: '#E879F9',
}

interface Stats {
  generated_at: string
  profiles: {
    total: number; today: number; week: number
    unique_devices: number; unique_users: number
    by_group: Record<string, number>
  }
  analyses: { total: number; today: number; week: number; by_type: Record<string, number> }
  daily_chart: { labels: string[]; values: number[] }
  recent_activity: { id: string; profile_name: string; types: string[]; created_at: string }[]
}

function StatCard({ icon, label, value, sub, period, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; period?: string; color: string
}) {
  return (
    <div style={{
      flex: '1 1 140px', padding: '16px 14px', borderRadius: 14,
      background: '#fff', border: `1.5px solid ${color}30`,
      boxShadow: `0 2px 8px ${color}15`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>{label}</span>
      </div>
      {period && (
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, background: `${color}12`, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color }}>{period}</span>
        </div>
      )}
      <div style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>
          {value.toLocaleString()} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: color, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function DailyChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 1)
  const today = new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('. ', '/').replace('.', '')
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {values.map((v, i) => {
          const isToday = labels[i] === today
          const h = Math.max(Math.round((v / max) * 72), v > 0 ? 4 : 0)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              {v > 0 && (
                <div style={{ fontSize: 9, color: isToday ? '#6366F1' : '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>{v}</div>
              )}
              <div style={{
                width: '100%', height: h, borderRadius: '3px 3px 0 0',
                background: isToday ? '#6366F1' : '#BFDBFE',
                minHeight: v > 0 ? 4 : 0,
              }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {labels.map((l, i) => {
          const isToday = labels[i] === today
          return (
            <div key={i} style={{ flex: 1, fontSize: 8, textAlign: 'center', color: isToday ? '#6366F1' : '#CBD5E1', fontWeight: isToday ? 800 : 400 }}>
              {l.slice(3)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function MonitorScreen() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStats = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/api/monitor/stats`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStats(await res.json())
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message || '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(fetchStats, 30000)
    return () => clearInterval(t)
  }, [autoRefresh, fetchStats])

  const analysisTotal = Object.values(stats?.analyses.by_type ?? {}).reduce((a, b) => a + b, 0)
  const sortedTypes = Object.entries(stats?.analyses.by_type ?? {}).sort((a, b) => b[1] - a[1])
  const sortedGroups = Object.entries(stats?.profiles.by_group ?? {}).sort((a, b) => b[1] - a[1])

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'inherit' }}>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #312E81 100%)', padding: '20px 20px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>
              📊 사주로 모니터
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>
              {lastRefresh ? `마지막 갱신: ${lastRefresh.toLocaleTimeString('ko-KR')}` : '로딩 중…'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setAutoRefresh(v => !v)}
              style={{
                padding: '6px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                background: autoRefresh ? 'rgba(99,102,241,0.9)' : 'rgba(255,255,255,0.15)',
                color: '#fff',
              }}
            >
              {autoRefresh ? '자동갱신 ON' : '자동갱신 OFF'}
            </button>
            <button
              onClick={fetchStats}
              disabled={loading}
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 40px' }}>
        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: 13, marginBottom: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* 핵심 지표 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <StatCard icon={<Users size={16} />}      label="순방문자" value={stats?.profiles.unique_devices ?? '—'} period="누적 전체" sub={`카카오 로그인 ${stats?.profiles.unique_users ?? 0}명`} color="#6366F1" />
          <StatCard icon={<TrendingUp size={16} />} label="등록 명식" value={stats?.profiles.total ?? '—'} period="누적 전체" sub={`이번주 +${stats?.profiles.week ?? 0}건 · 오늘 +${stats?.profiles.today ?? 0}건`} color="#10B981" />
          <StatCard icon={<BarChart2 size={16} />}  label="전체 분석" value={stats?.analyses.total ?? '—'} period="누적 전체" sub={`이번주 +${stats?.analyses.week ?? 0}건 · 오늘 +${stats?.analyses.today ?? 0}건`} color="#0EA5E9" />
          <StatCard icon={<Activity size={16} />}   label="오늘 분석" value={stats?.analyses.today ?? '—'} period={`오늘 (${new Date().toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })})`} sub={`이번주 누적 ${stats?.analyses.week ?? 0}건`} color="#F59E0B" />
        </div>

        {/* 일별 분석 추이 */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Activity size={15} color="#6366F1" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>최근 14일 분석 현황</span>
          </div>
          {stats ? (
            <DailyChart labels={stats.daily_chart.labels} values={stats.daily_chart.values} />
          ) : (
            <div style={{ height: 80, background: '#F8FAFC', borderRadius: 8 }} />
          )}
        </div>

        {/* 분석 타입별 */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 16, border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Layers size={15} color="#0EA5E9" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>분석 타입별 현황</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>총 {analysisTotal.toLocaleString()}건</span>
          </div>
          {sortedTypes.length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>데이터 없음</div>
          ) : (
            sortedTypes.map(([type, cnt]) => (
              <MiniBar
                key={type}
                label={TYPE_LABEL[type] || type}
                value={cnt}
                max={sortedTypes[0]?.[1] ?? 1}
                color={TYPE_COLOR[type] || '#94A3B8'}
              />
            ))
          )}
        </div>

        {/* 사주 그룹별 */}
        {sortedGroups.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 16, border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Users size={15} color="#10B981" />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>그룹별 사주 현황</span>
            </div>
            {sortedGroups.map(([g, cnt]) => (
              <MiniBar key={g} label={g} value={cnt} max={sortedGroups[0]?.[1] ?? 1} color="#10B981" />
            ))}
          </div>
        )}

        {/* 최근 활동 */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '16px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Clock size={15} color="#F59E0B" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>최근 활동</span>
          </div>
          {(stats?.recent_activity ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>활동 없음</div>
          ) : (
            (stats?.recent_activity ?? []).map((act, i) => (
              <div
                key={act.id ?? i}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < (stats?.recent_activity.length ?? 0) - 1 ? '1px solid #F1F5F9' : 'none' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLOR[act.types?.[0]] || '#CBD5E1', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {act.profile_name || '(이름 없음)'}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    {(act.types ?? []).map(t => (
                      <span key={t} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `${TYPE_COLOR[t] || '#94A3B8'}18`, color: TYPE_COLOR[t] || '#94A3B8', fontWeight: 700 }}>
                        {TYPE_LABEL[t] || t}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>{timeAgo(act.created_at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
