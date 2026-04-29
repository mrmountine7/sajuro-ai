const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

interface SajuRequest {
  name: string
  gender: string
  year: number
  month: number
  day: number
  hour: number
  minute?: number
  is_lunar?: boolean
}

interface CompatibilityRequest {
  person1: SajuRequest
  person2: SajuRequest
  use_llm?: boolean
}

export async function calculateSaju(req: SajuRequest) {
  const res = await fetch(`${API_BASE}/api/saju/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function analyzeCompatibility(req: CompatibilityRequest) {
  const res = await fetch(`${API_BASE}/api/compatibility/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export interface DreamInterpretRequest {
  dreamText: string
  experienceText?: string
  sajuContext?: {
    ilgan: string; ilganKr: string; ilganElement: string
    yongshin?: string; dayPillar?: string
    currentDaeun?: string; daeunElement?: string
    currentSeun?: string; todayIlgin?: string; todayIlginElement?: string
    elementDistribution?: Record<string, number>
  }
  dreamDate?: string
}

export async function interpretDreamLLM(req: DreamInterpretRequest) {
  const res = await fetch(`${API_BASE}/api/dream/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`꿈해몽 API 오류 (${res.status}): ${err}`)
  }
  return res.json()
}
