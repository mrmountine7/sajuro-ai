import type { AnalysisMenuItem } from './types'

export const analysisMenuItems: AnalysisMenuItem[] = [
  { id: 'manseryuk', title: '만세력', description: '사주 팔자 원본 정보 확인', icon: '📜', badge: 'free', category: 'saju', route: '/analysis/manseryuk' },
  { id: 'precision', title: '사주 정밀분석', description: '타고난 기질과 인생 구조를 깊게 해석', icon: '🔮', badge: 'free-now', category: 'saju', route: '/analysis/precision' },
  { id: 'lifetime', title: '평생운세', description: '일생의 큰 흐름과 전환점 분석', icon: '🌊', badge: 'free-now', category: 'saju', route: '/analysis/lifetime' },
  { id: 'flow', title: '운세 흐름', description: '대운(大運)·세운·월운의 변화 포인트 확인', icon: '📈', badge: 'free-now', category: 'saju', route: '/analysis/flow' },
  { id: 'newyear', title: '신년운세', description: '2026년 한 해의 운세를 총정리', icon: '🎍', badge: 'free-now', category: 'theme', route: '/analysis/newyear' },
  { id: 'tojeong', title: '토정비결', description: '전통 방식의 한 해 운세 풀이', icon: '📖', badge: 'free', category: 'theme', route: '/analysis/tojeong' },
  { id: 'wealth', title: '금전운', description: '재물 흐름과 지출 위험을 분석', icon: '💰', badge: 'free-now', category: 'theme', route: '/analysis/wealth' },
  { id: 'love-fortune', title: '애정운', description: '감정 흐름과 연애 타이밍 분석', icon: '💕', badge: 'free-now', category: 'theme', route: '/analysis/love-fortune' },
  { id: 'career', title: '직업운', description: '적성(適性)과 커리어 방향 해석', icon: '💼', badge: 'free-now', category: 'theme', route: '/analysis/career' },
  { id: 'business', title: '사업운', description: '사업 성패와 투자 시기 분석', icon: '🏢', badge: 'free-now', category: 'theme', route: '/analysis/business' },
  { id: 'health', title: '건강운', description: '체질과 건강 주의 포인트', icon: '❤️‍🩹', badge: 'free', category: 'theme', route: '/analysis/health' },
  { id: 'friend', title: '친구운', description: '인간관계와 사회적 연결 분석', icon: '🤝', badge: 'free', category: 'theme', route: '/analysis/friend' },
  { id: 'couple', title: '연인궁합', description: '끌림, 갈등, 감정 리듬을 확인', icon: '💑', badge: 'free-now', category: 'match', route: '/analysis/couple' },
  { id: 'marriage', title: '결혼궁합', description: '결혼 상대로서의 궁합(宮合) 분석', icon: '💍', badge: 'free-now', category: 'match', route: '/analysis/marriage' },
  { id: 'family', title: '가족궁합', description: '가족 간 관계 에너지 해석', icon: '👨‍👩‍👧', badge: 'free', category: 'match', route: '/analysis/family' },
  { id: 'general', title: '기타 궁합', description: '친구·동료·지인 간 관계 궁합 분석', icon: '🔗', badge: 'free', category: 'match', route: '/analysis/general' },
  { id: 'dream', title: '꿈해몽', description: '꿈 속 상징의 의미를 해석', icon: '🌙', badge: 'free', category: 'life', route: '/analysis/dream' },
  { id: 'name', title: '이름풀이', description: '이름이 가진 에너지와 의미 분석', icon: '✍️', badge: 'free', category: 'life', route: '/analysis/name' },
  { id: 'palm', title: '손금 보기', description: '손금에 새겨진 운명의 비밀', icon: '🖐️', badge: 'free', category: 'image', route: '/analysis/palm' },
  { id: 'face', title: '관상 보기', description: '고전에 근거한 정밀 관상 해석', icon: '👤', badge: 'free', category: 'image', route: '/analysis/face' },
]

export const categoryLabels: Record<string, string> = {
  all: '전체',
  saju: '내 사주',
  theme: '테마운',
  match: '궁합·관계',
  life: '생활·부가',
  image: '이미지 분석',
}

export const badgeConfig: Record<string, { label: string; color: string }> = {
  free: { label: '현재무료', color: '#DC2626' },
  'free-now': { label: '현재무료', color: '#DC2626' },
  'coming-soon': { label: '준비중', color: '#9CA3AF' },
}
