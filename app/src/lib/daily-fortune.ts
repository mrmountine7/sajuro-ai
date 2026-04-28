import { lunarToSolar } from './lunar-solar'

const STEMS_KR  = ['갑','을','병','정','무','기','경','신','임','계'] as const
const STEMS_HJ  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const
const BRANCHES_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해'] as const
const BRANCHES_HJ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const
const FIVE_ELEMENTS = ['목','화','토','금','수'] as const
const WEEKDAYS = ['일','월','화','수','목','금','토'] as const

export interface DayPillar {
  stem: number; branch: number
  label: string       // "갑자(甲子)"
  stemKr: string; stemHj: string
  branchKr: string; branchHj: string
}

/**
 * 일진(日辰) 계산 — 60갑자 일주기
 * 기준일: 2024-01-01 = 갑자(甲子)일 (stem=0, branch=0)
 * ※ 실제 서비스에서는 만세력 엔진으로 교체 필요
 */
export function getDayPillar(date: Date): DayPillar {
  const ref = new Date(2024, 0, 1)
  ref.setHours(0, 0, 0, 0)
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - ref.getTime()) / 86400000)
  const stem   = ((diff % 10) + 10) % 10
  const branch = ((diff % 12) + 12) % 12
  return {
    stem, branch,
    stemKr: STEMS_KR[stem], stemHj: STEMS_HJ[stem],
    branchKr: BRANCHES_KR[branch], branchHj: BRANCHES_HJ[branch],
    label: `${STEMS_KR[stem]}${BRANCHES_KR[branch]}(${STEMS_HJ[stem]}${BRANCHES_HJ[branch]})`,
  }
}

/** 음력이면 양력으로 변환한 Date 반환, 양력이면 그대로 */
function toBirthDate(year: number, month: number, day: number, calendarType: string): Date {
  if (calendarType === 'lunar' || calendarType === 'lunar_leap') {
    return lunarToSolar(year, month, day, calendarType === 'lunar_leap')
  }
  return new Date(year, month - 1, day)
}

/** 일주(日柱) 라벨 — 프로필 카드용 */
export function getDayPillarLabel(
  birthYear: number, birthMonth: number, birthDay: number, calendarType = 'solar',
): string {
  const dp = getDayPillar(toBirthDate(birthYear, birthMonth, birthDay, calendarType))
  return dp.label
}

/* ─── 십성(十星) 계산 ─── */

interface TenGodInfo {
  name: string; hanja: string
  desc: string
  message: string
}

const TEN_GOD_DATA: TenGodInfo[] = [
  { name: '비견', hanja: '比肩', desc: '자립과 경쟁의 별',
    message: '자신의 힘으로 해결하는 날입니다. 협업보다 독립적 판단이 빛나는 시기입니다.' },
  { name: '겁재', hanja: '劫財', desc: '도전과 과감한 결단의 별',
    message: '주변의 유혹에 흔들리기 쉬운 날입니다. 지출과 약속에 신중하세요.' },
  { name: '식신', hanja: '食神', desc: '타고난 재능과 표현력의 별',
    message: '창의적인 에너지가 활발한 날입니다. 떠오르는 아이디어를 꼭 메모해 두세요.' },
  { name: '상관', hanja: '傷官', desc: '날카로운 통찰과 변화의 별',
    message: '날카로운 직감이 살아나는 날입니다. 다만 말실수에 주의하세요.' },
  { name: '편재', hanja: '偏財', desc: '예상치 못한 기회와 사교의 별',
    message: '예상치 못한 기회가 찾아올 수 있습니다. 적극적으로 움직여 보세요.' },
  { name: '정재', hanja: '正財', desc: '안정적 재물과 계획의 별',
    message: '안정적인 계획 실행에 유리한 날입니다. 저축이나 정리가 좋은 날입니다.' },
  { name: '편관', hanja: '偏官', desc: '긴장과 결단력의 별',
    message: '긴장감이 높지만 결단력도 강한 날입니다. 미루던 일을 처리하기 좋습니다.' },
  { name: '정관', hanja: '正官', desc: '질서와 인정의 별',
    message: '질서와 원칙을 따를 때 좋은 결과를 얻습니다. 윗사람의 인정이 있을 수 있어요.' },
  { name: '편인', hanja: '偏印', desc: '직감과 색다른 관점의 별',
    message: '독특한 관점이 열리는 날입니다. 새로운 학습이나 취미에 도전해 보세요.' },
  { name: '정인', hanja: '正印', desc: '지혜와 내면 안정의 별',
    message: '마음이 안정되는 날입니다. 공부나 깊은 사색에 집중하면 큰 성과가 있습니다.' },
]

/**
 * 십성 인덱스 계산
 * 오행 상생: 목→화→토→금→수→목
 * diff 0=비견/겁재, 1=식신/상관, 2=편재/정재, 3=편관/정관, 4=편인/정인
 * 같은 음양=편(0), 다른 음양=정(1) — 비견/겁재는 반대(같으면 비견)
 */
function getTenGodIndex(myStem: number, todayStem: number): number {
  const myEl    = Math.floor(myStem / 2)
  const otherEl = Math.floor(todayStem / 2)
  const sameYY  = (myStem % 2) === (todayStem % 2)
  const diff    = (otherEl - myEl + 5) % 5
  return diff * 2 + (sameYY ? 0 : 1)
}

/* ─── 오늘의 한마디 생성 ─── */

export interface DailyFortune {
  dateLabel: string     // "2026.04.19 (토)"
  dayPillar: DayPillar  // 오늘의 일진
  tenGod: TenGodInfo    // 오늘의 십성
  userDayPillar: DayPillar // 사용자 일주
  userElement: string   // "목" 등
}

export function getDailyFortune(
  birthYear: number, birthMonth: number, birthDay: number, calendarType = 'solar',
): DailyFortune {
  const today = new Date()
  const todayPillar = getDayPillar(today)
  const userPillar  = getDayPillar(toBirthDate(birthYear, birthMonth, birthDay, calendarType))

  const godIdx = getTenGodIndex(userPillar.stem, todayPillar.stem)
  const tenGod = TEN_GOD_DATA[godIdx]

  const wd = WEEKDAYS[today.getDay()]
  const y  = today.getFullYear()
  const m  = String(today.getMonth() + 1).padStart(2, '0')
  const d  = String(today.getDate()).padStart(2, '0')

  return {
    dateLabel: `${y}.${m}.${d} (${wd})`,
    dayPillar: todayPillar,
    tenGod,
    userDayPillar: userPillar,
    userElement: FIVE_ELEMENTS[Math.floor(userPillar.stem / 2)],
  }
}
