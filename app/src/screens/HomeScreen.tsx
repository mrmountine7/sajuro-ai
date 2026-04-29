import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, ChevronDown } from 'lucide-react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { getCurrentIdentity, applyUserFilter } from '@/lib/user-filter'
import { LANGUAGES, getLang, setLang } from '@/lib/i18n'
import { useProfileGuard } from '@/lib/profile-guard-context'

/* ─── 빠른 분석 메뉴 ─── */
const QUICK_MENUS = [
  { icon: '🔮', title: '정밀분석',  desc: '타고난 기질과 인생 구조',     route: '/analysis/precision' },
  { icon: '📈', title: '운세 흐름', desc: '대운·세운·월운 변화 포인트', route: '/analysis/flow' },
  { icon: '💰', title: '금전운',   desc: '재물 흐름과 지출 위험',       route: '/analysis/wealth' },
  { icon: '💕', title: '연인궁합', desc: '끌림·갈등·감정 리듬',         route: '/analysis/couple' },
]

/* ─── 온보딩 슬라이드 카드 ─── */
const SLIDES = [
  {
    gradient: 'linear-gradient(135deg, #FFF8DD 0%, #FEF3C7 100%)',
    accent: '#D97706',
    badge: '핵심 차별화',
    icon: '🎯',
    title: '당신이 겪은 일들의\n이유를 압니다',
    desc: '과거를 정확히 짚어낸 뒤 미래를 분석합니다. "왜 그때 그랬는지" 명리학적 근거로 설명해 드립니다.',
    tags: ['적천수', '자평진전', '궁통보감', '명리정종'],
    preview: null,
  },
  {
    gradient: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    accent: '#15803D',
    badge: '9대 고전문헌',
    icon: '📚',
    title: '조선 명리학의 정수를\nAI가 읽어드립니다',
    desc: '적천수·자평진전·궁통보감 등 9대 고전을 학습한 AI가 당신의 사주 구조를 해석합니다.',
    tags: ['격국 분석', '용신 판단', '한난조습', '오행 구조'],
    preview: null,
  },
  {
    gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    accent: '#1D4ED8',
    badge: 'AI 명리 상담',
    icon: '💬',
    title: '궁금한 건 바로\n물어보세요',
    desc: '분석 결과에 대해 무엇이든 질문하세요. 전문 상담사 수준의 깊이 있는 답변을 드립니다.',
    tags: ['질의응답', '맞춤 조언', '추가 해석', '운세 상담'],
    preview: null,
  },
  {
    gradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
    accent: '#BE123C',
    badge: '심층 궁합',
    icon: '💑',
    title: '6단계로 분석하는\n진짜 궁합',
    desc: '한난조습부터 지장간 암합까지. 겉궁합과 속궁합을 모두 풀어드립니다.',
    tags: ['한난조습', '일지합충', '지장간 암합', '겉/속 궁합'],
    preview: null,
  },
]

/* ─── 서비스 미리보기 데이터 ─── */
const SERVICE_PREVIEWS = [
  { category: '내 사주', name: '사주 정밀분석', desc: '타고난 기질·격국·용신 종합 분석', accent: '#7C3AED', bg: '#F5F3FF' },
  { category: '내 사주', name: '평생운세',     desc: '대운·세운 흐름과 인생 구조', accent: '#7C3AED', bg: '#F5F3FF' },
  { category: '내 사주', name: '운세 흐름',   desc: '지금 이 시기의 변화 포인트', accent: '#7C3AED', bg: '#F5F3FF' },
  { category: '내 사주', name: '만세력',       desc: '사주 원국·대운·합충파해 조견', accent: '#7C3AED', bg: '#F5F3FF' },
  { category: '테마운',  name: '금전운',       desc: '재물 흐름·지출 위험·투자 시기', accent: '#D97706', bg: '#FFFBEB' },
  { category: '테마운',  name: '애정·직업운',  desc: '연애·결혼·커리어 시기 분석',   accent: '#D97706', bg: '#FFFBEB' },
  { category: '궁합',    name: '연인 궁합',    desc: '끌림·갈등·감정 리듬 6단계 분석', accent: '#BE123C', bg: '#FFF1F2' },
  { category: '궁합',    name: '결혼 궁합',    desc: '일생 동반자 적합도 심층 분석', accent: '#BE123C', bg: '#FFF1F2' },
  { category: '생활',    name: '꿈해몽',       desc: '꿈을 명리학적으로 해석',       accent: '#0369A1', bg: '#F0F9FF' },
  { category: '생활',    name: '이름풀이',      desc: '한자·오행격으로 이름 분석',    accent: '#0369A1', bg: '#F0F9FF' },
  { category: '이미지',  name: '손금 분석',    desc: '사진 한 장으로 손금 해석',     accent: '#15803D', bg: '#F0FDF4' },
  { category: '이미지',  name: '관상 분석',    desc: '사진으로 보는 삼정·오관·기색', accent: '#15803D', bg: '#F0FDF4' },
]

/* ─── 언어 선택 드롭다운 ─── */
function LangSelector() {
  const [current, setCurrent] = useState(getLang())
  const [open, setOpen] = useState(false)
  const cur = LANGUAGES.find(l => l.code === current) ?? LANGUAGES[0]

  const select = (code: string) => {
    setLang(code); setCurrent(code); setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 'var(--radius-full)',
          fontSize: 13, fontWeight: 500,
          background: 'var(--bg-surface)', border: '1px solid var(--border-1)',
          color: 'var(--text-secondary)',
        }}
      >
        <span>{cur.flag}</span>
        <span>{cur.label}</span>
        <ChevronDown size={13} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div style={{
            position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-md)',
            zIndex: 11, minWidth: 150, overflow: 'hidden',
          }}>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => select(l.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', width: '100%', textAlign: 'left',
                  fontSize: 13, fontWeight: current === l.code ? 700 : 400,
                  color: current === l.code ? 'var(--text-accent)' : 'var(--text-primary)',
                  background: current === l.code ? 'var(--bg-surface-2)' : 'transparent',
                  borderBottom: '1px solid var(--border-1)',
                }}
              >
                <span>{l.flag}</span><span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── 온보딩 뷰 ─── */
function OnboardingView({ onStart }: { onStart: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)' }}>

      {/* ── 스크롤 영역 ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* ── 히어로 / 브랜딩 ── */}
        <div style={{ padding: '32px 24px 20px', textAlign: 'center' }}>
          {/* 로고 */}
          <div style={{
            fontSize: 44, fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1,
            color: 'var(--text-accent)', marginBottom: 10,
          }}>
            사주로
          </div>
          {/* 뱃지형 서브타이틀 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
            background: 'var(--bg-surface)', border: '1px solid var(--border-1)',
            borderRadius: 'var(--radius-full)', padding: '5px 14px', marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bg-accent)', display: 'inline-block', flexShrink: 0 }} />
            AI 기반 고전 명리 분석 · 9대 고전문헌 DB
          </div>
          {/* 메인 타이틀 */}
          <div style={{
            fontSize: 26, fontWeight: 900, color: 'var(--text-primary)',
            lineHeight: 1.3, letterSpacing: '-0.03em', marginBottom: 12,
          }}>
            당신의 사주를<br />AI가 깊이 읽어드립니다
          </div>
          {/* 설명 */}
          <div style={{
            fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 300, margin: '0 auto',
          }}>
            적천수·자평진전·궁통보감 등<br />
            9대 고전을 학습한 AI가<br />
            운명의 구조를 해석합니다
          </div>
        </div>

        {/* ── 슬라이드 카드 ── */}
        <div
          style={{
            display: 'flex', alignItems: 'flex-start',
            overflowX: 'auto', overflowY: 'visible',
            scrollSnapType: 'x mandatory', scrollBehavior: 'smooth',
            gap: 12, padding: '0 20px 12px',
          } as React.CSSProperties}
          onScroll={e => {
            const el = e.currentTarget
            setActiveIdx(Math.round(el.scrollLeft / (el.clientWidth - 16)))
          }}
        >
          {SLIDES.map((s, i) => (
            <div key={i} style={{
              minWidth: 'calc(100vw - 80px)', maxWidth: 'calc(100vw - 80px)',
              scrollSnapAlign: 'center', flexShrink: 0,
              borderRadius: 'var(--radius-xl)', padding: '12px 14px',
              background: s.gradient, border: `1px solid ${s.accent}22`,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxSizing: 'border-box',
            }}>
            {/* 배지 */}
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', background: s.accent, color: '#fff', letterSpacing: '0.03em' }}>
                {s.badge}
              </span>
            </div>
            {/* 타이틀 */}
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, marginBottom: 5, whiteSpace: 'pre-line' }}>
              {s.title}
            </div>
            {/* 설명 */}
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {s.desc}
            </div>
            {/* 분석 미리보기 */}
            {s.preview && (
              <div style={{
                background: 'rgba(255,255,255,0.75)', borderRadius: 6,
                padding: '5px 10px', marginBottom: 7,
                borderLeft: `3px solid ${s.accent}`,
                fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.45, fontStyle: 'italic',
              }}>
                💡 {s.preview}
              </div>
            )}
            {/* 키워드 태그 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {s.tags.map(t => (
                <span key={t} style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.6)',
                  color: s.accent, border: `1px solid ${s.accent}44`,
                }}>{t}</span>
              ))}
            </div>
          </div>
          ))}
        </div>

        {/* ── 인디케이터 ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '2px 0 20px' }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: activeIdx === i ? 20 : 6, height: 6, borderRadius: 3,
              transition: 'all 0.2s',
              background: activeIdx === i ? 'var(--bg-accent)' : 'var(--border-2)',
            }} />
          ))}
        </div>

        {/* ── 서비스 미리보기 ── */}
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
              무엇을 분석해드릴까요?
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-accent)',
              background: '#FEF9C3', padding: '3px 9px', borderRadius: 'var(--radius-full)',
            }}>
              12종 서비스
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SERVICE_PREVIEWS.map(svc => (
              <div key={svc.name} style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-1)',
                borderRadius: 'var(--radius-md)',
                padding: '13px 14px',
              }}>
                <div style={{
                  display: 'inline-block', fontSize: 10, fontWeight: 700,
                  color: svc.accent, background: svc.bg,
                  padding: '2px 8px', borderRadius: 'var(--radius-full)', marginBottom: 7,
                }}>
                  {svc.category}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
                  {svc.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
                  {svc.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 신뢰 지표 ── */}
        <div style={{
          display: 'flex', margin: '0 20px 8px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-1)',
          borderRadius: 'var(--radius-md)', overflow: 'hidden',
        }}>
          {[
            { num: '9대', label: '고전문헌 학습' },
            { num: '12종', label: '분석 서비스' },
            { num: '무료', label: '기본 분석' },
          ].map((s, i) => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center',
              borderRight: i < 2 ? '1px solid var(--border-1)' : 'none',
              padding: '12px 0',
            }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-accent)' }}>{s.num}</div>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 하단 여백 */}
        <div style={{ height: 16 }} />
      </div>

      {/* ── 하단 CTA (고정) — 탭바(60px) 위로 올림 ── */}
      <div style={{
        padding: '10px 20px calc(env(safe-area-inset-bottom, 0px) + 74px)',
        borderTop: '1px solid var(--border-1)',
        background: 'var(--bg-surface)', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>언어</span>
          <LangSelector />
        </div>
        <button
          onClick={onStart}
          style={{
            width: '100%', height: 52, borderRadius: 'var(--radius-md)',
            fontSize: 16, fontWeight: 700,
            background: 'var(--bg-accent)', color: '#1F2937',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          내 사주 분석 시작하기 ✨
        </button>
      </div>
    </div>
  )
}

/* ─── 개인화 홈 뷰 ─── */
interface Profile { id: string; name: string; birth_year: number; is_primary: boolean }
interface RecentItem { icon: string; title: string; meta: string }

function todayLabel() {
  const d = new Date()
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`
}

function PersonalizedHome({ primaryName, primaryId, nav }: {
  primaryName: string
  primaryId: string
  nav: ReturnType<typeof useNavigate>
}) {
  const { safeNav } = useProfileGuard()
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  const fetchRecent = useCallback(async () => {
    if (!supabase) return
    try {
      const identity = await getCurrentIdentity()

      const all: (RecentItem & { ts: number })[] = []

      // 정밀분석 / 결혼궁합
      const { data: pData } = await applyUserFilter(
        supabase.from('precision_analyses')
          .select('profile_name,created_at')
          .order('created_at', { ascending: false })
          .limit(3),
        identity
      )
      for (const r of (pData ?? []) as any[]) {
        const n = r.profile_name || ''
        if (n.includes('결혼궁합'))
          all.push({ icon: '💍', title: n, meta: '결혼 궁합 분석', ts: new Date(r.created_at).getTime() })
        else if (n.includes('궁합'))
          all.push({ icon: '💑', title: n, meta: '궁합 분석', ts: new Date(r.created_at).getTime() })
        else
          all.push({ icon: '🔮', title: `${n} · 정밀분석`, meta: '사주 정밀분석', ts: new Date(r.created_at).getTime() })
      }

      // 평생운세
      const { data: lData } = await applyUserFilter(
        supabase.from('lifetime_readings')
          .select('profile_name,created_at')
          .order('created_at', { ascending: false })
          .limit(2),
        identity
      )
      for (const r of (lData ?? []) as any[])
        all.push({ icon: '🌊', title: `${r.profile_name || ''} · 평생운세`, meta: '대운·세운 흐름', ts: new Date(r.created_at).getTime() })

      // 꿈해몽
      try {
        const { data: dData } = await applyUserFilter(
          supabase.from('dream_records')
            .select('overall_sentiment,created_at')
            .order('created_at', { ascending: false })
            .limit(1),
          identity
        )
        for (const r of (dData ?? []) as any[])
          all.push({ icon: '💭', title: '꿈해몽', meta: r.overall_sentiment || '꿈 해석', ts: new Date(r.created_at).getTime() })
      } catch { /* 테이블 없으면 무시 */ }

      all.sort((a, b) => b.ts - a.ts)
      setRecentItems(all.slice(0, 3).map(({ ts: _ts, ...rest }) => rest))
    } catch (e) {
      console.warn('[PersonalizedHome] recent fetch', e)
    }
  }, [])

  useEffect(() => { fetchRecent() }, [fetchRecent])

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

      {/* ── 인사말 ── */}
      <div style={{ padding: '8px 20px 20px' }}>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 500 }}>
          {todayLabel()}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {primaryName}님, 오늘의 흐름을<br />살펴볼까요?
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>
          지금 가장 궁금한 운세를 빠르게 확인해보세요.
        </div>
      </div>

      {/* ── 빠른 분석 ── */}
      <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="s-section-title">지금 많이 보는 분석</div>
        <button onClick={() => safeNav('/analysis')} style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>전체 보기 ›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px', marginBottom: 24 }}>
        {QUICK_MENUS.map(c => (
          <button key={c.title} className="s-card" onClick={() => safeNav(c.route)} style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.4 }}>{c.desc}</div>
          </button>
        ))}
      </div>

      {/* ── 최근 본 분석 (실제 DB) ── */}
      {recentItems.length > 0 && (
        <>
          <div style={{ padding: '0 20px', marginBottom: 10 }}><div className="s-section-title">최근 본 분석</div></div>
          {recentItems.map((item, i) => (
            <button key={i} onClick={() => safeNav('/records')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', width: '100%', textAlign: 'left' }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.meta}</div>
              </div>
              <span style={{ color: 'var(--text-disabled)', flexShrink: 0 }}>›</span>
            </button>
          ))}
        </>
      )}

      {/* ── 내 사주 바로보기 ── */}
      <div style={{ padding: '20px 20px 12px' }}><div className="s-section-title">내 사주 바로보기</div></div>
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 20 }}>
        {[
          { icon: '📋', label: '내 사주',     p: `/detail/${primaryId}` },
          { icon: '⭐', label: '즐겨찾기',    p: '/vault' },
          { icon: '➕', label: '새 사주 추가', p: '/add-profile' },
        ].map(s => (
          <button key={s.label} onClick={() => safeNav(s.p)} className="s-card-md" style={{ flex: 1, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── 메인 HomeScreen ─── */
export default function HomeScreen({ forceOnboarding = false }: { forceOnboarding?: boolean }) {
  const nav = useNavigate()
  const [loading, setLoading] = useState(!forceOnboarding)
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [primaryId, setPrimaryId] = useState<string>('')

  useEffect(() => {
    if (forceOnboarding) return
    const check = async () => {
      try {
        if (!supabase) { setLoading(false); return }
        const identity = await getCurrentIdentity()
        const { data } = await applyUserFilter(
          supabase.from('profiles')
            .select('id,name,is_primary')
            .order('created_at', { ascending: true })
            .limit(5),
          identity
        )

        if (data && data.length > 0) {
          const primary = (data as Profile[]).find(p => p.is_primary) ?? data[0] as Profile
          setPrimaryName(primary.name)
          setPrimaryId(primary.id)
        }
      } catch {
        // 오류 시 온보딩 표시
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [forceOnboarding])

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  /* 신규 사용자 → 온보딩 */
  if (!primaryName) {
    return <OnboardingView onStart={() => nav('/add-profile')} />
  }

  /* 기존 사용자 → 개인화 홈 */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header
        titleElement={<span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-accent)' }}>사주로</span>}
        rightActions={['kakao', 'search', 'bell']}
      />
      <PersonalizedHome primaryName={primaryName} primaryId={primaryId} nav={nav} />
    </div>
  )
}
