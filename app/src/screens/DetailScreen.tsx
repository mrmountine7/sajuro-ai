import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import Header from '@/components/layout/Header'
import { mockProfiles } from '@/lib/mock-data'
import { calculateSaju } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

const ELEMENT_COLORS: Record<string, string> = {
  '목': '#22C55E', '화': '#FF5A5F', '토': '#F5C518', '금': '#E5E7EB', '수': '#3B82F6',
}
const ELEMENT_TEXT: Record<string, string> = {
  '목': '#fff', '화': '#fff', '토': '#1F2937', '금': '#111827', '수': '#fff',
}

interface PillarData {
  name: string; gan: string; zhi: string
  gan_ko: string; zhi_ko: string
  gan_wuxing: string; zhi_wuxing: string
  sipsin: string; zhi_sipsin: string
}

export default function DetailScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const location = useLocation()
  const stateData = location.state?.data
  const profile = mockProfiles.find(p => p.id === id)
  const [data, setData] = useState<any>(stateData || null)
  const [loading, setLoading] = useState(!stateData)
  const [error, setError] = useState('')

  useEffect(() => {
    if (stateData) return
    if (!profile) { setError('프로필을 찾을 수 없습니다.'); setLoading(false); return }
    const load = async () => {
      try {
        const [y, m, d] = profile.birth_date.split('-').map(Number)
        const [h, mi] = profile.birth_time.split(':').map(Number)
        const res = await calculateSaju({
          name: profile.name, gender: profile.gender,
          year: y, month: m, day: d, hour: h, minute: mi || 0,
          is_lunar: profile.is_lunar,
        })
        setData(res.data)
      } catch (e: any) {
        setError(e.message || 'API 연결 실패')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [profile, stateData])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="내 사주" showBack />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-tertiary)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> 사주 계산 중...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header title="내 사주" showBack />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
          {error || '데이터를 불러올 수 없습니다.'}<br />API 서버를 확인해주세요.
        </div>
      </div>
    )
  }

  const pillars: PillarData[] = data.pillars_detail || []
  const wuxing = data.wuxing_count || {}
  const dmWuxingKo = data.day_master_wuxing_ko || ''
  const dmWuxingEmoji = data.day_master_wuxing_emoji || ''
  const dayAnimal = data.day_animal || ''
  const dayAnimalEmoji = data.day_animal_emoji || ''
  const innateSipsin = data.innate_sipsin || ''
  const innateDesc = data.innate_desc || ''

  const getWuxingColor = (wuxing_ko: string) => ELEMENT_COLORS[wuxing_ko] || '#999'
  const getWuxingTextColor = (wuxing_ko: string) => ELEMENT_TEXT[wuxing_ko] || '#fff'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="내 사주" showBack rightActions={['share']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100 }}>

        {/* Person Info */}
        <div style={{ margin: '0 20px 16px', padding: 20, background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              {data.name}
              {profile?.relation && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>({profile.relation === 'self' ? '본인' : profile.relation})</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3 }}>
              {data.birth_date} · {data.birth_time} · {data.gender === 'male' ? '남성' : '여성'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-accent)', marginTop: 4 }}>
              일간(日干): {data.day_master}({data.day_master_ko}) · 한난조습: {data.hannan}{data.josup}
            </div>
          </div>
          <button style={{ padding: '7px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600, background: 'var(--bg-surface-3)', color: 'var(--text-secondary)', border: '1px solid var(--border-1)' }}>변경</button>
        </div>

        {/* Three Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '0 20px', marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '16px 10px', textAlign: 'center', border: '1px solid var(--border-1)' }}>
            <div className="s-elem-icon" style={{ background: getWuxingColor(dmWuxingKo) }}>{dmWuxingEmoji}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{dmWuxingKo}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>오행</div>
          </div>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '16px 10px', textAlign: 'center', border: '1px solid var(--border-1)' }}>
            <div className="s-elem-icon" style={{ background: getWuxingColor(dmWuxingKo) }}>{dayAnimalEmoji}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{dayAnimal}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>일주 동물</div>
          </div>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '16px 10px', textAlign: 'center', border: '1px solid var(--border-1)' }}>
            <div className="s-elem-icon" style={{ background: '#F5C518' }}>🎭</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{innateSipsin}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 3 }}>타고난 성향</div>
          </div>
        </div>

        {/* Innate Description */}
        {innateDesc && (
          <div style={{ margin: '0 20px 16px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-1)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            💡 {innateDesc}
          </div>
        )}

        {/* Saju Grid */}
        <div style={{ margin: '0 20px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '20px 12px', border: '1px solid var(--border-1)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', marginBottom: 16 }}>사주 팔자</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[...pillars].reverse().map(p => (
              <div key={p.name} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-accent)', marginBottom: 4 }}>{p.sipsin || ''}</div>
                <div className="s-tile" style={{ background: getWuxingColor(p.gan_wuxing ? ({'木':'목','火':'화','土':'토','金':'금','水':'수'} as any)[p.gan_wuxing] || '' : ''), color: getWuxingTextColor(({'木':'목','火':'화','土':'토','金':'금','水':'수'} as any)[p.gan_wuxing] || '') }}>
                  {p.gan}
                </div>
                <div className="s-tile" style={{ background: getWuxingColor(({'木':'목','火':'화','土':'토','金':'금','水':'수'} as any)[p.zhi_wuxing] || ''), color: getWuxingTextColor(({'木':'목','火':'화','土':'토','金':'금','水':'수'} as any)[p.zhi_wuxing] || '') }}>
                  {p.zhi}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.3 }}>
                  {p.zhi_sipsin}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wuxing Distribution */}
        <div style={{ margin: '0 20px 20px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '16px', border: '1px solid var(--border-1)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>오행 분포</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {['목', '화', '토', '금', '수'].map(wx => {
              const count = wuxing[wx] || 0
              return (
                <div key={wx} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'var(--border-1)', marginBottom: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(count * 25, 100)}%`, height: '100%', borderRadius: 4, background: getWuxingColor(wx) }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: count === 0 ? 'var(--text-disabled)' : 'var(--text-primary)' }}>{wx}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{count}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div style={{ position: 'absolute', bottom: 68, left: 20, right: 20, zIndex: 50 }}>
        <button onClick={() => nav('/result/sample')} className="s-cta-btn">운세 풀이 보기</button>
      </div>
    </div>
  )
}
