import { X } from 'lucide-react'
import { useFontSize, type FontSizeLevel } from '@/lib/font-size-context'

const OPTIONS: { level: FontSizeLevel; label: string; size: number }[] = [
  { level: 'small',  label: '작게', size: 18 },
  { level: 'medium', label: '보통', size: 24 },
  { level: 'large',  label: '크게', size: 30 },
]

export default function FontSizePopup({ onClose }: { onClose: () => void }) {
  const { level, setLevel } = useFontSize()

  const handleSelect = (l: FontSizeLevel) => {
    setLevel(l)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 300, background: 'var(--bg-surface)', borderRadius: 20, zIndex: 301,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: '28px 24px 24px',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, color: 'var(--text-tertiary)', padding: 4 }}>
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          글자 크기
        </div>
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          사주분석 결과 페이지의<br/>글자 크기가 변경돼요.
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
          {OPTIONS.map(opt => {
            const active = level === opt.level
            return (
              <button key={opt.level} onClick={() => handleSelect(opt.level)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: active ? '2.5px solid var(--text-primary)' : '1.5px solid var(--border-2)',
                  background: active ? 'var(--bg-surface)' : 'var(--bg-surface-3)',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: opt.size, fontWeight: 700, color: 'var(--text-primary)' }}>Aa</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: active ? 'none' : '1.5px solid var(--border-2)',
                    background: active ? '#F59E0B' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{opt.label}</span>
                </div>
              </button>
            )
          })}
        </div>

        <button onClick={onClose} style={{
          width: '100%', padding: '14px 0', borderRadius: 'var(--radius-full)',
          fontSize: 15, fontWeight: 700, background: '#F5D200', color: '#1F2937',
          border: 'none', cursor: 'pointer',
        }}>
          확인
        </button>
      </div>
    </>
  )
}
