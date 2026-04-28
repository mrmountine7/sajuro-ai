import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type FontSizeLevel = 'small' | 'medium' | 'large'

interface FontSizeCtx {
  level: FontSizeLevel
  setLevel: (l: FontSizeLevel) => void
  scale: number
}

const SCALES: Record<FontSizeLevel, number> = { small: 0.9, medium: 1, large: 1.15 }
const STORAGE_KEY = 'saju_font_size'

const FontSizeContext = createContext<FontSizeCtx>({ level: 'medium', setLevel: () => {}, scale: 1 })

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<FontSizeLevel>(() => {
    try { return (localStorage.getItem(STORAGE_KEY) as FontSizeLevel) || 'medium' } catch { return 'medium' }
  })

  const setLevel = (l: FontSizeLevel) => {
    setLevelState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  useEffect(() => {
    const scale = SCALES[level]
    document.documentElement.style.setProperty('--font-scale', String(scale))
    // zoom은 inline px 값까지 포함해 모든 크기를 비례 스케일
    document.body.style.zoom = String(scale)
  }, [level])

  return (
    <FontSizeContext.Provider value={{ level, setLevel, scale: SCALES[level] }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() { return useContext(FontSizeContext) }
