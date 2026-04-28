import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, Search, Loader2,
  ArrowUpRight, X, MessageCircle,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getDeviceId } from '@/lib/device-id'

/* ─── 타입 ─── */
interface QAItem {
  id: string
  analysisId: string
  analysisType: 'precision' | 'dream' | 'compatibility' | 'marriage'
  profileName: string
  itemLabel: string
  question: string
  answer: string
  createdAt: string
}

/* ─── 상수 ─── */
const FILTER_TABS = ['전체', '미답변', '정밀분석', '결혼궁합', '꿈해몽', '궁합'] as const

const TYPE_META = {
  precision:     { label: '정밀분석', bg: '#EEF2FF', color: '#6366F1', emoji: '🔮', route: '/precision-result' },
  dream:         { label: '꿈해몽',   bg: '#F5F3FF', color: '#8B5CF6', emoji: '🌙', route: '/analysis/dream' },
  compatibility: { label: '궁합',     bg: '#FFF0F6', color: '#EC4899', emoji: '💑', route: '/compatibility-result' },
  marriage:      { label: '결혼궁합', bg: '#EDE9FE', color: '#7C3AED', emoji: '💍', route: '/marriage-result' },
} as const

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

/* ─── Q&A 행 컴포넌트 ─── */
function QARow({ item, nav }: { item: QAItem; nav: ReturnType<typeof useNavigate> }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[item.analysisType]
  const hasAnswer = Boolean(item.answer?.trim())

  function handleGoToAnalysis(e: React.MouseEvent) {
    e.stopPropagation()
    if (item.analysisType === 'precision') {
      nav('/precision-result', { state: { analysisId: item.analysisId } })
    } else if (item.analysisType === 'marriage') {
      nav('/marriage-result', { state: { analysisId: item.analysisId } })
    } else {
      nav(meta.route)
    }
  }

  return (
    <div
      style={{
        margin: '0 20px 10px',
        borderRadius: 14,
        border: `1px solid ${expanded ? '#C7D2FE' : 'var(--border-1)'}`,
        background: expanded ? '#FAFBFF' : 'var(--bg-surface)',
        transition: 'border-color 0.2s, background 0.2s',
        overflow: 'hidden',
      }}
    >
      {/* ─── 접힌 헤더 행 ─── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', padding: '12px 14px', textAlign: 'left',
          display: 'flex', flexDirection: 'column', gap: 5,
          cursor: 'pointer', background: 'transparent', border: 'none',
        }}
      >
        {/* 메타 줄 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 'var(--radius-full)', background: meta.bg, color: meta.color,
            }}>
              {meta.emoji} {meta.label}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>
              {item.profileName}
            </span>
            {item.itemLabel && (
              <span style={{ fontSize: 10, color: 'var(--text-disabled)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                · {item.itemLabel}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-full)',
              background: hasAnswer ? '#ECFDF5' : '#FFF7ED',
              color: hasAnswer ? '#059669' : '#EA580C',
            }}>
              {hasAnswer ? '답변 완료 ✓' : '답변 대기'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtDate(item.createdAt)}</span>
            {expanded
              ? <ChevronUp size={13} color="var(--text-tertiary)" />
              : <ChevronDown size={13} color="var(--text-tertiary)" />}
          </div>
        </div>

        {/* 질문 미리보기 */}
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          Q. {expanded
            ? item.question
            : (item.question.length > 50 ? item.question.slice(0, 50) + '…' : item.question)}
        </div>

        {/* 답변 한 줄 미리보기 (접힌 상태) */}
        {!expanded && hasAnswer && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            {item.answer.slice(0, 65)}{item.answer.length > 65 ? '…' : ''}
          </div>
        )}
      </button>

      {/* ─── 펼쳐진 영역 ─── */}
      {expanded && (
        <div style={{ padding: '0 14px 14px' }}>
          {hasAnswer ? (
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: '#F0F4FF', border: '1px solid #D0DCFF',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#6366F1', marginBottom: 6, letterSpacing: 0.3 }}>
                A. 답변
              </div>
              <div style={{
                fontSize: 13, color: '#1E3A5F', lineHeight: 1.8, whiteSpace: 'pre-wrap',
              }}>
                {item.answer}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: '#FFF7ED', border: '1px solid #FED7AA', textAlign: 'center',
            }}>
              <div style={{ fontSize: 12, color: '#EA580C' }}>아직 답변이 작성되지 않았습니다</div>
            </div>
          )}

          {/* 해당 분석 바로가기 */}
          <button
            onClick={handleGoToAnalysis}
            style={{
              marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 10,
              background: meta.bg, border: `1px solid ${meta.color}22`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>해당 분석 보기</span>
            <ArrowUpRight size={12} color={meta.color} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── 빈 상태 ─── */
function EmptyState({ searchText, filter, nav }: {
  searchText: string
  filter: string
  nav: ReturnType<typeof useNavigate>
}) {
  if (searchText) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          "{searchText}" 검색 결과가 없습니다
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          다른 키워드로 검색해보세요
        </div>
      </div>
    )
  }
  if (filter === '미답변') {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          미답변 질문이 없습니다
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          모든 질문에 답변이 완료되었습니다
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        아직 질문/답변 내역이 없습니다
      </div>
      <div style={{
        fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, marginBottom: 20,
      }}>
        정밀분석 결과 화면에서 궁금한 점을<br />질문하면 이곳에 자동으로 기록됩니다
      </div>
      <button
        onClick={() => nav('/analysis')}
        style={{
          padding: '10px 24px', borderRadius: 'var(--radius-full)',
          background: 'var(--bg-accent)', color: '#1F2937',
          fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}
      >
        분석 시작하기
      </button>
    </div>
  )
}

/* ─── 메인 화면 ─── */
export default function QAHistoryScreen() {
  const nav = useNavigate()
  const [activeFilter, setActiveFilter] = useState<string>('전체')
  const [searchText, setSearchText] = useState('')
  const [qaItems, setQaItems] = useState<QAItem[]>([])
  const [loading, setLoading] = useState(true)

  /* DB에서 Q&A 로드 — precision_qa 테이블 직접 조회 */
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        if (!supabase) return
        const deviceId = getDeviceId()
        const items: QAItem[] = []

        /* ── precision_qa: 정밀분석 Q&A 직접 조회 ── */
        const { data: qaData } = await supabase
          .from('precision_qa')
          .select('id, analysis_id, item_id, item_label, question, answer, created_at')
          .eq('device_id', deviceId)
          .order('created_at', { ascending: false })
          .limit(200)

        if (qaData && qaData.length > 0) {
          /* analysis_id 목록으로 profile_name 일괄 조회 */
          const analysisIds = [...new Set((qaData as any[]).map(r => r.analysis_id))]
          const { data: analyses } = await supabase
            .from('precision_analyses')
            .select('id, profile_name')
            .in('id', analysisIds)

          const profileMap: Record<string, string> = {}
          if (analyses) {
            for (const a of analyses as any[]) profileMap[a.id] = a.profile_name || '—'
          }

          for (const row of qaData as any[]) {
            if (!row.question?.trim()) continue
            // marriage_ prefix가 있으면 결혼궁합 Q&A
            const isMarriage = (row.item_id || '').startsWith('marriage_')
            const profileName = profileMap[row.analysis_id] || '—'
            const isMarriageProfile = profileName.includes('결혼궁합')
            items.push({
              id: row.id,
              analysisId: row.analysis_id,
              analysisType: (isMarriage || isMarriageProfile) ? 'marriage' : 'precision',
              profileName: profileName.replace(' 결혼궁합', ''),
              itemLabel: row.item_label || row.item_id?.replace(/^marriage_/, '') || '',
              question: row.question,
              answer: row.answer || '',
              createdAt: row.created_at,
            })
          }
        }

        setQaItems(items)
      } catch (e) {
        console.warn('[QAHistoryScreen]', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* 필터 + 검색 */
  const filtered = useMemo(() => {
    let list = qaItems

    if (activeFilter === '미답변')     list = list.filter(i => !i.answer?.trim())
    else if (activeFilter === '정밀분석')  list = list.filter(i => i.analysisType === 'precision')
    else if (activeFilter === '결혼궁합')  list = list.filter(i => i.analysisType === 'marriage')
    else if (activeFilter === '꿈해몽')    list = list.filter(i => i.analysisType === 'dream')
    else if (activeFilter === '궁합')      list = list.filter(i => i.analysisType === 'compatibility')

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      list = list.filter(i =>
        i.question.toLowerCase().includes(q) ||
        i.answer.toLowerCase().includes(q) ||
        i.profileName.toLowerCase().includes(q)
      )
    }
    return list
  }, [qaItems, activeFilter, searchText])

  const answeredCount = qaItems.filter(i => i.answer?.trim()).length
  const unansweredCount = qaItems.length - answeredCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="질문/답변 내역" showBack onBack={() => nav(-1)} rightActions={['fontSize']} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* ─── 검색바 ─── */}
        <div style={{ padding: '14px 20px 0', position: 'relative' }}>
          <Search
            size={15}
            color="var(--text-tertiary)"
            style={{
              position: 'absolute', left: 34,
              top: '50%', transform: 'translateY(-20%)',
              pointerEvents: 'none',
            }}
          />
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="질문이나 답변 내용 검색..."
            style={{
              width: '100%', padding: '10px 38px', borderRadius: 12,
              fontSize: 13, border: '1px solid var(--border-1)',
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              style={{
                position: 'absolute', right: 32, top: '50%', transform: 'translateY(-20%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              }}
            >
              <X size={14} color="var(--text-tertiary)" />
            </button>
          )}
        </div>

        {/* ─── 필터 탭 ─── */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', overflowX: 'auto' }}>
          {FILTER_TABS.map(f => (
            <button
              key={f}
              className={`s-chip ${activeFilter === f ? 's-chip-active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}{f === '미답변' && unansweredCount > 0 ? ` ${unansweredCount}` : ''}
            </button>
          ))}
        </div>

        {/* ─── 통계 요약 바 ─── */}
        {!loading && qaItems.length > 0 && (
          <div style={{
            display: 'flex', gap: 8, padding: '0 20px 14px',
          }}>
            <div style={{
              flex: 1, padding: '10px 0', borderRadius: 12, textAlign: 'center',
              background: 'var(--bg-surface)', border: '1px solid var(--border-1)',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#6366F1' }}>{qaItems.length}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>전체 질문</div>
            </div>
            <div style={{
              flex: 1, padding: '10px 0', borderRadius: 12, textAlign: 'center',
              background: 'var(--bg-surface)', border: '1px solid var(--border-1)',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{answeredCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>답변 완료</div>
            </div>
            <div style={{
              flex: 1, padding: '10px 0', borderRadius: 12, textAlign: 'center',
              background: unansweredCount > 0 ? '#FFF7ED' : 'var(--bg-surface)',
              border: `1px solid ${unansweredCount > 0 ? '#FED7AA' : 'var(--border-1)'}`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: unansweredCount > 0 ? '#EA580C' : '#64748B' }}>
                {unansweredCount}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>미답변</div>
            </div>
          </div>
        )}

        {/* ─── 검색 결과 건수 ─── */}
        {!loading && filtered.length > 0 && (searchText || activeFilter !== '전체') && (
          <div style={{ padding: '0 20px 8px', fontSize: 11, color: 'var(--text-tertiary)' }}>
            {filtered.length}건
          </div>
        )}

        {/* ─── 로딩 ─── */}
        {loading && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '40px 0', color: 'var(--text-tertiary)',
          }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>질문/답변 불러오는 중...</span>
          </div>
        )}

        {/* ─── Q&A 목록 ─── */}
        {!loading && filtered.map(item => (
          <QARow key={item.id} item={item} nav={nav} />
        ))}

        {/* ─── 빈 상태 ─── */}
        {!loading && filtered.length === 0 && (
          <EmptyState searchText={searchText} filter={activeFilter} nav={nav} />
        )}

        {/* ─── 하단 안내 (기록 있을 때) ─── */}
        {!loading && qaItems.length > 0 && (
          <div style={{
            margin: '8px 20px 0',
            padding: '12px 16px', borderRadius: 12,
            background: '#F5F3FF', border: '1px solid #DDD6FE',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <MessageCircle size={15} color="#8B5CF6" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#5B21B6', lineHeight: 1.6 }}>
              각 행을 탭하면 전체 Q&A를 볼 수 있으며, <strong>해당 분석 보기</strong>로 원본 분석 결과로 이동합니다.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
