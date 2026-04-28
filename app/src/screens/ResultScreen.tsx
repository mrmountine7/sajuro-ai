import { useNavigate } from 'react-router-dom'
import Header from '@/components/layout/Header'
import { mockResultSections } from '@/lib/mock-data'

const keywords = ['재물 흐름', '지출 관리', '기회 포착', '구조 정비']
const related = [
  { icon: '📈', title: '운세 흐름', desc: '함께 보기' },
  { icon: '💼', title: '사업운', desc: '이어서 보기' },
  { icon: '💕', title: '애정운', desc: '함께 보기' },
]

export default function ResultScreen() {
  const nav = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Header title="금전운 분석 결과" showBack rightActions={['save', 'share']} />
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {/* Summary */}
        <div style={{ margin: '0 20px 16px', padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-accent)', marginBottom: 8 }}>김은우님의 금전운 분석</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.5 }}>"올해는 수입 확대보다 지출 관리와 구조 정비가 중요한 흐름입니다."</p>
        </div>

        {/* Keywords */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 20px', marginBottom: 20 }}>
          {keywords.map(k => <span key={k} className="s-keyword-tag">{k}</span>)}
        </div>

        {/* Sections */}
        {mockResultSections.map(s => (
          <div key={s.title} style={{ padding: '0 20px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>{s.icon} {s.title}</h3>
            {s.content && <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{s.content}</p>}
            {s.items && (
              <ul style={{ paddingLeft: 0 }}>
                {s.items.map((item, i) => (
                  <li key={i} className="s-bullet" style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, paddingTop: 4, paddingBottom: 4 }}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Related */}
        <div style={{ padding: '8px 20px 14px' }}><div className="s-section-title">관련 분석 추천</div></div>
        <div style={{ display: 'flex', gap: 12, padding: '0 20px', overflowX: 'auto', marginBottom: 16 }}>
          {related.map(r => (
            <button key={r.title} onClick={() => nav('/result/sample')} className="s-card-md" style={{ flexShrink: 0, width: 130, textAlign: 'center', padding: 14, cursor: 'pointer' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{r.desc}</div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', overflowX: 'auto', marginBottom: 8 }}>
          <button className="s-action-btn s-action-btn-primary">💬 추가 질문하기</button>
          {['📌 핵심만 요약', '💡 쉽게 다시 설명', '🔗 관련 분석 추천'].map(l => (
            <button key={l} className="s-action-btn">{l}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
