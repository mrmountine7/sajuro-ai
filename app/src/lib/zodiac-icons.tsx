/* 12지지 아이콘 — 크롭된 이미지 기반 */

export interface ZodiacInfo {
  name: string
  img: string       // public/zodiac/*.png 경로
  element: string
  color: string     // 오행 대표 색상
  bg: string        // 아바타 배경
}

export const ZODIAC_DATA: ZodiacInfo[] = [
  { name: '쥐띠',  img: '/zodiac/rat.png',     element: '수', color: '#2563EB', bg: '#EFF6FF' },
  { name: '소띠',  img: '/zodiac/ox.png',      element: '토', color: '#92400E', bg: '#FEF3C7' },
  { name: '호띠',  img: '/zodiac/tiger.png',   element: '목', color: '#15803D', bg: '#F0FDF4' },
  { name: '토끼',  img: '/zodiac/rabbit.png',  element: '목', color: '#15803D', bg: '#F0FDF4' },
  { name: '용띠',  img: '/zodiac/dragon.png',  element: '토', color: '#92400E', bg: '#FEF3C7' },
  { name: '뱀띠',  img: '/zodiac/snake.png',   element: '화', color: '#B91C1C', bg: '#FFF1F2' },
  { name: '말띠',  img: '/zodiac/horse.png',   element: '화', color: '#B91C1C', bg: '#FFF1F2' },
  { name: '양띠',  img: '/zodiac/goat.png',    element: '토', color: '#92400E', bg: '#FEF3C7' },
  { name: '원숭',  img: '/zodiac/monkey.png',  element: '금', color: '#525252', bg: '#F5F5F5' },
  { name: '닭띠',  img: '/zodiac/rooster.png', element: '금', color: '#525252', bg: '#F5F5F5' },
  { name: '개띠',  img: '/zodiac/dog.png',     element: '토', color: '#92400E', bg: '#FEF3C7' },
  { name: '돼지',  img: '/zodiac/pig.png',     element: '수', color: '#2563EB', bg: '#EFF6FF' },
]

export function getZodiacData(birthYear: number): ZodiacInfo {
  return ZODIAC_DATA[((birthYear - 1900) % 12 + 12) % 12]
}
