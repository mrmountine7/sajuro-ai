export type ServiceType = 'profile' | 'compatibility' | 'text' | 'image'

export interface ServiceConfig {
  id: string
  title: string
  icon: string
  description: string
  detailDescription: string
  type: ServiceType
  features: string[]
  inputLabel?: string
  inputPlaceholder?: string
  ctaLabel: string
  comingSoon?: boolean
}

export const serviceConfigs: Record<string, ServiceConfig> = {
  manseryuk: {
    id: 'manseryuk', title: '만세력', icon: '📜', type: 'profile',
    description: '사주 팔자 원본 정보 확인',
    detailDescription: '태어난 년월일시를 기반으로 천간(天干)과 지지(地支)를 배치하여 사주 팔자의 원본 구조를 확인합니다.',
    features: ['천간·지지 배치 확인', '십성(十星) 관계 분석', '오행(五行) 분포 확인', '12운성 파악'],
    ctaLabel: '만세력 보기',
  },
  precision: {
    id: 'precision', title: '사주 정밀분석', icon: '🔮', type: 'profile',
    description: '타고난 기질과 인생 구조를 깊게 해석',
    detailDescription: '적천수, 자평진전 등 고전문헌에 근거하여 일간(日干)의 강약, 격국(格局), 용신(用神)을 종합 분석합니다.',
    features: ['일간 강약 판단', '격국·용신 분석', '성격·기질 해석', '인생 구조 분석'],
    ctaLabel: '정밀분석 시작',
  },
  lifetime: {
    id: 'lifetime', title: '평생운세', icon: '🌊', type: 'profile',
    description: '일생의 큰 흐름과 전환점 분석',
    detailDescription: '대운(大運)의 흐름을 따라 인생의 큰 전환점과 시기별 특성을 분석합니다.',
    features: ['10년 단위 대운 분석', '인생 전환점 예측', '시기별 강점·약점', '핵심 행운기 파악'],
    ctaLabel: '평생운세 보기',
  },
  flow: {
    id: 'flow', title: '운세 흐름', icon: '📈', type: 'profile',
    description: '대운·세운·월운의 변화 포인트 확인',
    detailDescription: '현재 대운(大運), 올해 세운(歲運), 이번 달 월운(月運)의 에너지 변화를 분석합니다.',
    features: ['현재 대운 분석', '2026년 세운 해석', '월별 운세 흐름', '주요 변화 시점'],
    ctaLabel: '운세 흐름 보기',
  },
  newyear: {
    id: 'newyear', title: '신년운세', icon: '🎍', type: 'profile',
    description: '2026년 月별 길흉·기회·행운 완전정복',
    detailDescription: '2026년 병오년(丙午年)과 내 사주의 관계를 분석합니다. 월별 길흉 달력, 반드시 잡아야 할 3대 기회, 주의사항, 행운 아이템까지 평생운세·운세흐름과 겹치지 않는 실용적 연간 가이드입니다.',
    features: ['2026년 테마 & 에너지', '月별 길흉 달력(1~12월)', '3대 기회 & 3대 주의', '행운 방향·색·숫자'],
    ctaLabel: '신년운세 보기',
  },
  tojeong: {
    id: 'tojeong', title: '토정비결', icon: '📖', type: 'profile',
    description: '전통 방식의 한 해 운세 풀이',
    detailDescription: '조선시대 이지함 선생의 토정비결을 기반으로 올해의 상·중·하 괘를 뽑아 해석합니다.',
    features: ['상·중·하 삼괘 풀이', '월별 길흉 판단', '전통 비결 원문', '현대적 해석 병행'],
    ctaLabel: '토정비결 보기',
  },
  wealth: {
    id: 'wealth', title: '금전운', icon: '💰', type: 'profile',
    description: '재물 흐름과 지출 위험을 분석',
    detailDescription: '편재(偏財)와 정재(正財)의 흐름을 분석하여 재물 운의 방향과 주의점을 알려드립니다.',
    features: ['재물 흐름 분석', '수입·지출 예측', '투자 적합 시기', '재물 위험 요소'],
    ctaLabel: '금전운 분석',
  },
  'love-fortune': {
    id: 'love-fortune', title: '애정운', icon: '💕', type: 'profile',
    description: '감정 흐름과 연애 타이밍 분석',
    detailDescription: '도화살(桃花殺)과 관성(官星)의 작용을 분석하여 연애와 감정의 흐름을 풀이합니다.',
    features: ['연애 타이밍 분석', '이상형 성향', '감정 변화 포인트', '인연 시기 예측'],
    ctaLabel: '애정운 분석',
  },
  career: {
    id: 'career', title: '직업운', icon: '💼', type: 'profile',
    description: '적성과 커리어 방향 해석',
    detailDescription: '관성(官星)과 식상(食傷)의 구조를 분석하여 적성에 맞는 직업과 커리어 방향을 제시합니다.',
    features: ['적성 분석', '직업 추천', '커리어 전환 시기', '성공 전략'],
    ctaLabel: '직업운 분석',
  },
  business: {
    id: 'business', title: '사업운', icon: '🏢', type: 'profile',
    description: '사업 성패와 투자 시기 분석',
    detailDescription: '재성(財星)과 관성(官星)의 균형을 분석하여 사업의 방향과 투자 적기를 판단합니다.',
    features: ['사업 적합도', '투자 적합 시기', '파트너 궁합', '사업 위험 요소'],
    ctaLabel: '사업운 분석',
  },
  health: {
    id: 'health', title: '건강운', icon: '❤️‍🩹', type: 'profile',
    description: '체질과 건강 주의 포인트',
    detailDescription: '오행(五行)의 편중과 부족을 분석하여 체질적 특성과 건강 주의 사항을 안내합니다.',
    features: ['오행 체질 분석', '취약 장기 파악', '건강 주의 시기', '보양 방향 제안'],
    ctaLabel: '건강운 분석',
  },
  friend: {
    id: 'friend', title: '친구운', icon: '🤝', type: 'profile',
    description: '인간관계와 사회적 연결 분석',
    detailDescription: '비겁(比劫)과 인성(印星)의 관계를 분석하여 대인관계 패턴과 인맥 운을 풀이합니다.',
    features: ['대인관계 패턴', '인맥 확장 시기', '갈등 요인 분석', '협력 관계 적합성'],
    ctaLabel: '친구운 분석',
  },
  couple: {
    id: 'couple', title: '연인궁합', icon: '💑', type: 'compatibility',
    description: '끌림, 갈등, 감정 리듬을 확인',
    detailDescription: '두 사람의 일간(日干) 관계, 오행 상생상극, 합충(合沖) 관계를 종합 분석합니다.',
    features: ['일간 궁합 분석', '오행 상성 확인', '감정 리듬 비교', '갈등 포인트 파악'],
    ctaLabel: '연인궁합 보기',
  },
  marriage: {
    id: 'marriage', title: '결혼궁합', icon: '💍', type: 'compatibility',
    description: '결혼 상대로서의 궁합 분석',
    detailDescription: '배우자궁(配偶者宮)과 관성·재성의 관계를 분석하여 결혼 궁합을 풀이합니다.',
    features: ['배우자궁 분석', '결혼 적합도', '가정 생활 예측', '갈등 해소 방향'],
    ctaLabel: '결혼궁합 보기',
  },
  family: {
    id: 'family', title: '가족궁합', icon: '👨‍👩‍👧', type: 'compatibility',
    description: '가족 간 관계 에너지 해석',
    detailDescription: '가족 구성원 간의 오행 에너지 관계를 분석하여 조화와 갈등 요인을 파악합니다.',
    features: ['가족 오행 관계', '세대 간 에너지', '갈등 요인 분석', '관계 개선 방향'],
    ctaLabel: '가족궁합 보기',
  },
  dream: {
    id: 'dream', title: '꿈해몽', icon: '🌙', type: 'text',
    description: '꿈 속 상징의 의미를 해석',
    detailDescription: '꿈에 나온 상징, 인물, 상황을 명리학적 관점과 전통 해몽서를 결합하여 해석합니다.',
    features: ['상징 해석', '길몽·흉몽 판단', '행운 숫자 제시', '실생활 조언'],
    inputLabel: '꿈 내용',
    inputPlaceholder: '기억나는 꿈의 내용을 자세히 적어주세요...',
    ctaLabel: '꿈해몽 시작',
  },
  name: {
    id: 'name', title: '이름풀이', icon: '✍️', type: 'text',
    description: '이름이 가진 에너지와 의미 분석',
    detailDescription: '한자 획수, 오격(五格) 81수리, 음양오행을 종합하여 이름을 풀이합니다.',
    features: ['오격 81수리 분석', '음양 배열 판단', '자원오행 해석', 'LLM 종합 평가'],
    inputLabel: '이름',
    inputPlaceholder: '분석할 이름을 입력하세요 (한글)',
    ctaLabel: '이름풀이 시작',
    route: '/name-reading',
  },
  palm: {
    id: 'palm', title: '손금 보기', icon: '🖐️', type: 'image',
    description: 'AI가 분석하는 손금 해석',
    detailDescription: '손바닥 사진을 AI Vision이 분석하여 생명선·감정선·지능선·운명선·재물선의 의미를 풀이합니다.',
    features: ['생명선 분석', '감정선 해석', '지능선 판단', '운명선·재물선 확인'],
    ctaLabel: '손금 분석 시작',
  },
  face: {
    id: 'face', title: '관상 보기', icon: '👤', type: 'image',
    description: '고전에 근거한 정밀 관상 해석',
    detailDescription: '마의상법·신상전편·유장상법 등 동양 관상학 고전에 근거하여 삼정(三停)·오관(五官)·기색(氣色)·골상(骨相)·명궁(命宮) 5대 영역을 정밀 분석합니다.',
    features: ['삼정(三停) 분석', '오관(五官) 해석', '기색(氣色) 판단', '골상·명궁 종합'],
    ctaLabel: '관상 분석 시작',
  },
}
