import { lunarToSolar } from './lunar-solar'

/* ═══════ 기본 상수 ═══════ */
export const STEMS_KR  = ['갑','을','병','정','무','기','경','신','임','계'] as const
export const STEMS_HJ  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const
export const BRANCHES_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해'] as const
export const BRANCHES_HJ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const
export const ELEMENTS   = ['목','화','토','금','수'] as const
export const ELEMENTS_HJ = ['木','火','土','金','水'] as const

export const TEN_GODS = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'] as const
export const TEN_GODS_HJ = ['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','正印'] as const

export const TWELVE_STAGES = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'] as const
export const TWELVE_STAGES_HJ = ['長生','沐浴','冠帶','建祿','帝旺','衰','病','死','墓','絶','胎','養'] as const

/* ═══════ 지장간 데이터 ═══════ */
// 각 지지에 포함된 천간 인덱스 [본기, 중기?, 여기?]
const HIDDEN_STEMS: number[][] = [
  [9],       // 子: 癸
  [5, 9, 7], // 丑: 己, 癸, 辛
  [0, 2, 4], // 寅: 甲, 丙, 戊
  [1],       // 卯: 乙
  [4, 1, 9], // 辰: 戊, 乙, 癸
  [2, 6, 4], // 巳: 丙, 庚, 戊
  [3, 5],    // 午: 丁, 己
  [5, 3, 1], // 未: 己, 丁, 乙
  [6, 8, 4], // 申: 庚, 壬, 戊
  [7],       // 酉: 辛
  [4, 7, 3], // 戌: 戊, 辛, 丁
  [8, 0],    // 亥: 壬, 甲
]

/* ═══════ 12운성 시작 지지 (양간 기준) ═══════ */
// 양간의 장생 위치: 甲=亥(11), 丙/戊=寅(2), 庚=巳(5), 壬=申(8)
const YANG_STAGE_START = [11, -1, 2, -1, 2, -1, 5, -1, 8, -1] as const
// 음간은 역행: 乙=午(6), 丁/己=酉(9), 辛=子(0), 癸=卯(3)
const YIN_STAGE_START  = [-1, 6, -1, 9, -1, 9, -1, 0, -1, 3] as const

/* ═══════ 합충파해 정의 ═══════ */
export const YUKAP: [number, number][] = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]]
export const SAMHAP: [number, number, number][] = [[8,0,4],[2,6,10],[5,9,1],[11,3,7]]
export const BANGHAP: [number, number, number][] = [[2,3,4],[5,6,7],[8,9,10],[11,0,1]]
export const CHUNG: [number, number][] = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]]
export const PA: [number, number][] = [[0,9],[1,4],[2,11],[3,6],[5,8],[7,10]]
export const HAE: [number, number][] = [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]]

/* ═══════ 타입 정의 ═══════ */
export interface Pillar {
  stem: number       // 0-9 천간 인덱스
  branch: number     // 0-11 지지 인덱스
  stemKr: string; stemHj: string
  branchKr: string; branchHj: string
  label: string      // "경오(庚午)"
}

export interface PillarDetail extends Pillar {
  tenGod: string     // 십성 (일간 기준)
  tenGodHj: string
  hiddenStems: { stem: number; kr: string; hj: string; tenGod: string; tenGodHj: string }[]
  stage: string      // 12운성
  stageHj: string
  element: string    // 천간 오행
  elementHj: string
}

export interface SajuResult {
  yearPillar: PillarDetail
  monthPillar: PillarDetail
  dayPillar: PillarDetail
  hourPillar: PillarDetail
  dayMasterElement: string
  dayMasterElementHj: string
  relations: RelationInfo[]
}

export interface RelationInfo {
  type: '육합' | '삼합' | '방합' | '충' | '파' | '해'
  pillars: string[]  // 관련 주 이름
  branches: number[]
}

export interface DaeunPeriod {
  pillar: Pillar
  startAge: number
  endAge: number
}

/* ═══════ 핵심 계산 함수 ═══════ */

function makePillar(stem: number, branch: number): Pillar {
  return {
    stem, branch,
    stemKr: STEMS_KR[stem], stemHj: STEMS_HJ[stem],
    branchKr: BRANCHES_KR[branch], branchHj: BRANCHES_HJ[branch],
    label: `${STEMS_KR[stem]}${BRANCHES_KR[branch]}(${STEMS_HJ[stem]}${BRANCHES_HJ[branch]})`,
  }
}

/** 십성 계산: 내 일간 vs 상대 천간 */
export function getTenGodIndex(myStem: number, otherStem: number): number {
  const myEl    = Math.floor(myStem / 2)
  const otherEl = Math.floor(otherStem / 2)
  const sameYY  = (myStem % 2) === (otherStem % 2)
  const diff    = (otherEl - myEl + 5) % 5
  return diff * 2 + (sameYY ? 0 : 1)
}

/** 12운성 계산 */
function getStageIndex(dayStem: number, branch: number): number {
  const isYang = dayStem % 2 === 0
  if (isYang) {
    const start = YANG_STAGE_START[dayStem]
    return (branch - start + 12) % 12
  } else {
    const start = YIN_STAGE_START[dayStem]
    return (start - branch + 12) % 12
  }
}

/** 년주 계산 (입춘 기준 보정) */
function getYearPillar(solarYear: number, solarMonth: number, solarDay: number): Pillar {
  let y = solarYear
  if (solarMonth < 2 || (solarMonth === 2 && solarDay < 4)) y -= 1
  const stem   = (y - 4 + 600) % 10
  const branch = (y - 4 + 600) % 12
  return makePillar(stem, branch)
}

/** 절기 기반 사주 월 번호 (1=寅月 ~ 12=丑月) */
function getSajuMonth(solarMonth: number, solarDay: number): number {
  const boundaries = [
    [2, 4], [3, 6], [4, 5], [5, 6], [6, 6], [7, 7],
    [8, 8], [9, 8], [10, 8], [11, 7], [12, 7], [1, 6],
  ]
  for (let i = 0; i < 12; i++) {
    const [bm, bd] = boundaries[i]
    const [nm, nd] = boundaries[(i + 1) % 12]
    if (solarMonth === bm && solarDay >= bd) return i + 1
    if (solarMonth === nm && solarDay < nd) return i + 1
  }
  return 1
}

/** 월주 계산 */
function getMonthPillar(yearStem: number, sajuMonth: number): Pillar {
  const baseStem = ((yearStem % 5) * 2 + 2) % 10
  const stem   = (baseStem + sajuMonth - 1) % 10
  const branch = (sajuMonth + 1) % 12
  return makePillar(stem, branch)
}

/** 일주 계산 (양력 Date 기반) */
function getDayPillar(solarDate: Date): Pillar {
  const ref = new Date(2024, 0, 1)
  ref.setHours(0, 0, 0, 0)
  const target = new Date(solarDate.getFullYear(), solarDate.getMonth(), solarDate.getDate())
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - ref.getTime()) / 86400000)
  const stem   = ((diff % 10) + 10) % 10
  const branch = ((diff % 12) + 12) % 12
  return makePillar(stem, branch)
}

/** 시주 계산 (-30분 보정 + 야자시/조자시 적용) */
function getHourPillar(dayStem: number, hour: number, minute: number): Pillar {
  let correctedH = hour
  let correctedM = minute - 30
  if (correctedM < 0) { correctedM += 60; correctedH -= 1 }
  if (correctedH < 0) correctedH += 24

  let hourBranch: number
  if (correctedH === 23) hourBranch = 0
  else hourBranch = Math.floor((correctedH + 1) / 2) % 12

  const baseStem = (dayStem % 5) * 2
  const stem = (baseStem + hourBranch) % 10
  return makePillar(stem, hourBranch)
}

/** Pillar에 십성/지장간/12운성 추가 */
function enrichPillar(pillar: Pillar, dayStem: number, isDayPillar: boolean): PillarDetail {
  const godIdx = isDayPillar ? -1 : getTenGodIndex(dayStem, pillar.stem)
  const stageIdx = getStageIndex(dayStem, pillar.branch)
  const elIdx = Math.floor(pillar.stem / 2)

  const hiddenStems = HIDDEN_STEMS[pillar.branch].map(s => {
    const gIdx = getTenGodIndex(dayStem, s)
    return { stem: s, kr: STEMS_KR[s], hj: STEMS_HJ[s], tenGod: TEN_GODS[gIdx], tenGodHj: TEN_GODS_HJ[gIdx] }
  })

  return {
    ...pillar,
    tenGod: isDayPillar ? '본원' : TEN_GODS[godIdx],
    tenGodHj: isDayPillar ? '本元' : TEN_GODS_HJ[godIdx],
    hiddenStems,
    stage: TWELVE_STAGES[stageIdx],
    stageHj: TWELVE_STAGES_HJ[stageIdx],
    element: ELEMENTS[elIdx],
    elementHj: ELEMENTS_HJ[elIdx],
  }
}

/** 사주 간 합충파해 관계 검출 */
function findRelations(branches: { name: string; branch: number }[]): RelationInfo[] {
  const results: RelationInfo[] = []
  const brs = branches.map(b => b.branch)

  for (const [a, b] of YUKAP) {
    const idxs = brs.map((br, i) => (br === a || br === b) ? i : -1).filter(i => i >= 0)
    if (idxs.length >= 2) {
      for (let i = 0; i < idxs.length; i++)
        for (let j = i + 1; j < idxs.length; j++)
          if ((brs[idxs[i]] === a && brs[idxs[j]] === b) || (brs[idxs[i]] === b && brs[idxs[j]] === a))
            results.push({ type: '육합', pillars: [branches[idxs[i]].name, branches[idxs[j]].name], branches: [brs[idxs[i]], brs[idxs[j]]] })
    }
  }

  for (const trio of SAMHAP) {
    const matched = trio.map(t => brs.findIndex(b => b === t)).filter(i => i >= 0)
    if (matched.length >= 2) results.push({ type: '삼합', pillars: matched.map(i => branches[i].name), branches: matched.map(i => brs[i]) })
  }

  for (const trio of BANGHAP) {
    const matched = trio.map(t => brs.findIndex(b => b === t)).filter(i => i >= 0)
    if (matched.length >= 2) results.push({ type: '방합', pillars: matched.map(i => branches[i].name), branches: matched.map(i => brs[i]) })
  }

  for (const [a, b] of CHUNG) {
    const idxs = brs.map((br, i) => (br === a || br === b) ? i : -1).filter(i => i >= 0)
    if (idxs.length >= 2)
      for (let i = 0; i < idxs.length; i++)
        for (let j = i + 1; j < idxs.length; j++)
          if ((brs[idxs[i]] === a && brs[idxs[j]] === b) || (brs[idxs[i]] === b && brs[idxs[j]] === a))
            results.push({ type: '충', pillars: [branches[idxs[i]].name, branches[idxs[j]].name], branches: [brs[idxs[i]], brs[idxs[j]]] })
  }

  for (const [a, b] of PA) {
    const ia = brs.indexOf(a), ib = brs.indexOf(b)
    if (ia >= 0 && ib >= 0) results.push({ type: '파', pillars: [branches[ia].name, branches[ib].name], branches: [a, b] })
  }

  for (const [a, b] of HAE) {
    const ia = brs.indexOf(a), ib = brs.indexOf(b)
    if (ia >= 0 && ib >= 0) results.push({ type: '해', pillars: [branches[ia].name, branches[ib].name], branches: [a, b] })
  }

  return results
}

/* ═══════ 메인: 전체 사주 계산 ═══════ */

export interface BirthInput {
  birthYear: number; birthMonth: number; birthDay: number
  birthHour: number; birthMinute: number
  calendarType: string
  gender: 'male' | 'female'
}

export function calculateFullSaju(input: BirthInput): SajuResult {
  const { birthYear, birthMonth, birthDay, birthHour, birthMinute, calendarType, gender: _gender } = input

  const solarDate = (calendarType === 'lunar' || calendarType === 'lunar_leap')
    ? lunarToSolar(birthYear, birthMonth, birthDay, calendarType === 'lunar_leap')
    : new Date(birthYear, birthMonth - 1, birthDay)

  const sy = solarDate.getFullYear()
  const sm = solarDate.getMonth() + 1
  const sd = solarDate.getDate()

  const yearP  = getYearPillar(sy, sm, sd)
  const sajuM  = getSajuMonth(sm, sd)
  const monthP = getMonthPillar(yearP.stem, sajuM)
  const dayP   = getDayPillar(solarDate)
  const hourP  = getHourPillar(dayP.stem, birthHour, birthMinute)

  const ds = dayP.stem
  const elIdx = Math.floor(ds / 2)

  const pillarNames = [
    { name: '시주', branch: hourP.branch },
    { name: '일주', branch: dayP.branch },
    { name: '월주', branch: monthP.branch },
    { name: '년주', branch: yearP.branch },
  ]

  return {
    yearPillar:  enrichPillar(yearP,  ds, false),
    monthPillar: enrichPillar(monthP, ds, false),
    dayPillar:   enrichPillar(dayP,   ds, true),
    hourPillar:  enrichPillar(hourP,  ds, false),
    dayMasterElement: ELEMENTS[elIdx],
    dayMasterElementHj: ELEMENTS_HJ[elIdx],
    relations: findRelations(pillarNames),
  }
}

/* ═══════ 대운 계산 ═══════ */

export function calculateDaeun(input: BirthInput, monthPillar: Pillar): DaeunPeriod[] {
  const { gender, calendarType, birthYear, birthMonth, birthDay } = input

  const solarDate = (calendarType === 'lunar' || calendarType === 'lunar_leap')
    ? lunarToSolar(birthYear, birthMonth, birthDay, calendarType === 'lunar_leap')
    : new Date(birthYear, birthMonth - 1, birthDay)

  const yearP = getYearPillar(solarDate.getFullYear(), solarDate.getMonth() + 1, solarDate.getDate())
  const isYangYear = yearP.stem % 2 === 0
  const isMale = gender === 'male'
  const forward = (isMale && isYangYear) || (!isMale && !isYangYear)

  const startAge = 3
  const periods: DaeunPeriod[] = []

  for (let i = 0; i < 10; i++) {
    const offset = forward ? i + 1 : -(i + 1)
    const stem   = ((monthPillar.stem + offset) % 10 + 10) % 10
    const branch = ((monthPillar.branch + offset) % 12 + 12) % 12
    periods.push({
      pillar: makePillar(stem, branch),
      startAge: startAge + i * 10,
      endAge:   startAge + (i + 1) * 10 - 1,
    })
  }

  return periods
}

/* ═══════ 세운 계산 (특정 연도) ═══════ */
export function getYearFortune(year: number): Pillar {
  const stem   = (year - 4 + 600) % 10
  const branch = (year - 4 + 600) % 12
  return makePillar(stem, branch)
}

/* ═══════ 월운 계산 (특정 연도의 월별) ═══════ */
export function getMonthFortunes(year: number): { month: number; pillar: Pillar }[] {
  const yearP = getYearFortune(year)
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    pillar: getMonthPillar(yearP.stem, i + 1),
  }))
}

/* ═══════ 일운 계산 (특정 연월의 일별) ═══════ */
export function getDayFortunes(year: number, month: number): { day: number; pillar: Pillar }[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    pillar: getDayPillar(new Date(year, month - 1, i + 1)),
  }))
}
