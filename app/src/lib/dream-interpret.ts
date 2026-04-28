/**
 * 꿈해몽 해석 엔진
 * 전통 해몽서(주공해몽, 태공망해몽) + 명리학적 상징 결합
 *
 * 1. 키워드 매칭으로 꿈 상징 추출
 * 2. 각 상징의 길흉/의미/행운 해석
 * 3. 사용자 일간 기반 맞춤 조언 생성
 */

export interface DreamSymbol {
  keyword: string
  category: '동물' | '자연' | '인물' | '행위' | '사물' | '장소' | '신체' | '감정'
  icon: string
  fortune: '길몽' | '흉몽' | '보통'
  meaning: string
  detail: string
  advice: string
  luckyNumber: number
}

const SYMBOL_DB: DreamSymbol[] = [
  // ─── 동물 ───
  { keyword: '뱀', category: '동물', icon: '🐍', fortune: '길몽',
    meaning: '재물과 지혜의 상징',
    detail: '뱀이 나타나는 꿈은 전통 해몽에서 재물운의 상승을 뜻합니다. 특히 큰 뱀일수록 큰 재물을 상징하며, 편재(偏財: 예상치 못한 재물)의 기운과 연결됩니다.',
    advice: '가까운 시일 내 예상치 못한 금전적 기회가 올 수 있습니다. 투자나 새로운 사업 제안에 주목하세요.',
    luckyNumber: 7 },
  { keyword: '용', category: '동물', icon: '🐉', fortune: '길몽',
    meaning: '출세와 권위의 상징',
    detail: '용은 동양 해몽에서 최고의 길몽입니다. 정관(正官: 질서와 인정의 별)의 에너지와 직결되어, 직장에서의 승진이나 사회적 인정을 예고합니다.',
    advice: '큰 목표를 세우기에 좋은 시기입니다. 리더십을 발휘할 기회가 다가오고 있으니 자신감을 가지세요.',
    luckyNumber: 1 },
  { keyword: '호랑이', category: '동물', icon: '🐅', fortune: '보통',
    meaning: '권력과 도전의 이중적 상징',
    detail: '호랑이는 편관(偏官: 긴장과 결단력의 별)의 상징으로, 도전적인 상황이 다가올 수 있음을 뜻합니다. 호랑이가 온순하면 길, 공격적이면 흉으로 봅니다.',
    advice: '큰 결정이나 도전 앞에 서게 될 수 있습니다. 침착하게 대응하면 좋은 결과를 얻을 수 있어요.',
    luckyNumber: 3 },
  { keyword: '개', category: '동물', icon: '🐕', fortune: '길몽',
    meaning: '충성과 인간관계의 상징',
    detail: '개가 반갑게 맞아주는 꿈은 주변의 도움과 신뢰를 뜻합니다. 비견(比肩: 자립과 경쟁의 별)의 에너지로, 동료나 친구의 지원을 암시합니다.',
    advice: '인간관계를 소중히 여기세요. 오랜 친구나 동료에게서 좋은 소식이 올 수 있습니다.',
    luckyNumber: 2 },
  { keyword: '고양이', category: '동물', icon: '🐈', fortune: '보통',
    meaning: '직감과 비밀의 상징',
    detail: '고양이는 편인(偏印: 직감과 색다른 관점의 별)의 상징으로, 숨겨진 진실이 드러나거나 직감이 예민해지는 시기를 뜻합니다.',
    advice: '직감을 믿되, 비밀스러운 제안에는 신중하게 대응하세요.',
    luckyNumber: 9 },
  { keyword: '돼지', category: '동물', icon: '🐷', fortune: '길몽',
    meaning: '풍요와 재물의 상징',
    detail: '돼지는 정재(正財: 안정적 재물의 별)의 대표적 상징입니다. 꿈에 돼지가 나오면 재물운이 상승하고 있음을 뜻합니다.',
    advice: '금전적으로 안정된 시기가 다가옵니다. 저축이나 안정적 투자를 고려해보세요.',
    luckyNumber: 8 },
  { keyword: '물고기', category: '동물', icon: '🐟', fortune: '길몽',
    meaning: '행운과 기회의 상징',
    detail: '물고기를 잡는 꿈은 기회를 잡는다는 뜻으로, 식신(食神: 타고난 재능과 표현력의 별)의 에너지와 연결됩니다.',
    advice: '새로운 기회가 눈앞에 있습니다. 망설이지 말고 잡으세요.',
    luckyNumber: 6 },
  { keyword: '새', category: '동물', icon: '🐦', fortune: '길몽',
    meaning: '자유와 소식의 상징',
    detail: '새가 날아가는 꿈은 좋은 소식이 올 것을 예고합니다. 상관(傷官: 날카로운 통찰의 별)의 기운으로, 창의적 영감이 찾아올 수도 있습니다.',
    advice: '자유로운 발상과 소통이 필요한 시기입니다. 편지, 메시지에 주목하세요.',
    luckyNumber: 4 },

  // ─── 자연 ───
  { keyword: '물', category: '자연', icon: '💧', fortune: '길몽',
    meaning: '재물과 감정의 흐름',
    detail: '맑은 물은 재물운과 감정적 정화를 뜻합니다. 수(水) 오행의 에너지로, 지혜와 통찰력이 높아지는 시기입니다. 탁한 물은 감정적 혼란을 경고합니다.',
    advice: '감정을 정리하고 직감을 따르세요. 물과 관련된 장소에서 좋은 일이 생길 수 있습니다.',
    luckyNumber: 6 },
  { keyword: '산', category: '자연', icon: '⛰️', fortune: '길몽',
    meaning: '안정과 목표 달성의 상징',
    detail: '산에 오르는 꿈은 목표를 향해 나아가고 있음을 뜻합니다. 토(土) 오행의 안정 에너지로, 꾸준한 노력이 결실을 맺는 시기입니다.',
    advice: '지금 하고 있는 일을 포기하지 마세요. 정상이 가까워지고 있습니다.',
    luckyNumber: 5 },
  { keyword: '불', category: '자연', icon: '🔥', fortune: '보통',
    meaning: '열정과 변화의 이중 상징',
    detail: '불은 화(火) 오행으로, 밝게 타오르면 열정과 성공을, 통제 불능이면 갈등과 분노를 뜻합니다. 식신·상관의 에너지와 관련됩니다.',
    advice: '열정은 좋지만 감정 조절에 유의하세요. 급한 결정은 피하는 것이 좋습니다.',
    luckyNumber: 3 },
  { keyword: '꽃', category: '자연', icon: '🌸', fortune: '길몽',
    meaning: '사랑과 아름다움의 상징',
    detail: '꽃이 피는 꿈은 연애운이나 대인관계가 좋아지는 시기를 뜻합니다. 정재(正財)·정관(正官)의 조화로운 에너지입니다.',
    advice: '대인관계에서 좋은 인연이 찾아올 수 있습니다. 마음을 열고 만남에 적극적으로 나서세요.',
    luckyNumber: 2 },
  { keyword: '비', category: '자연', icon: '🌧️', fortune: '보통',
    meaning: '정화와 새로운 시작',
    detail: '비는 묵은 것을 씻어내고 새로운 시작을 예고합니다. 정인(正印: 지혜와 안정의 별)의 에너지와 연결됩니다.',
    advice: '과거의 고민을 내려놓을 때입니다. 새로운 마음으로 시작하면 좋은 결과가 따릅니다.',
    luckyNumber: 1 },
  { keyword: '바다', category: '자연', icon: '🌊', fortune: '길몽',
    meaning: '무한한 가능성과 잠재력',
    detail: '넓은 바다는 당신 안의 무한한 잠재력을 뜻합니다. 편인(偏印)의 에너지로, 아직 발견하지 못한 재능이 깨어날 수 있습니다.',
    advice: '새로운 분야에 도전하기 좋은 시기입니다. 시야를 넓혀보세요.',
    luckyNumber: 8 },

  // ─── 인물 ───
  { keyword: '죽은 사람', category: '인물', icon: '👻', fortune: '보통',
    meaning: '과거와의 연결, 미해결 감정',
    detail: '돌아가신 분이 나타나는 꿈은 편인(偏印)의 상징으로, 과거의 미해결된 감정이나 조상의 메시지를 뜻합니다. 평온한 모습이면 길, 화난 모습이면 주의가 필요합니다.',
    advice: '조상에 대한 감사의 마음을 표현하세요. 성묘나 기도가 마음의 안정을 가져다줍니다.',
    luckyNumber: 9 },
  { keyword: '아이', category: '인물', icon: '👶', fortune: '길몽',
    meaning: '새로운 시작과 순수함',
    detail: '아이는 식신(食神: 창의력과 표현의 별)의 상징으로, 새로운 프로젝트나 아이디어의 탄생을 뜻합니다.',
    advice: '새로운 시작을 두려워하지 마세요. 순수한 마음으로 접근하면 좋은 결과가 있습니다.',
    luckyNumber: 1 },

  // ─── 행위 ───
  { keyword: '날다', category: '행위', icon: '🕊️', fortune: '길몽',
    meaning: '자유와 성취의 상징',
    detail: '하늘을 나는 꿈은 현재의 제약에서 벗어나 성취를 이루는 것을 뜻합니다. 제왕(帝旺) 12운성의 에너지와 통합니다.',
    advice: '큰 꿈을 꾸세요. 지금이 도약할 때입니다.',
    luckyNumber: 1 },
  { keyword: '쫓기다', category: '행위', icon: '🏃', fortune: '흉몽',
    meaning: '불안과 회피의 상징',
    detail: '누군가에게 쫓기는 꿈은 편관(偏官: 긴장과 압박의 별)의 에너지로, 현실에서 회피하고 있는 문제가 있음을 경고합니다.',
    advice: '미루고 있는 문제를 직면하세요. 용기를 내면 오히려 상황이 호전됩니다.',
    luckyNumber: 7 },
  { keyword: '떨어지다', category: '행위', icon: '⬇️', fortune: '흉몽',
    meaning: '불안정과 통제력 상실',
    detail: '높은 곳에서 떨어지는 꿈은 현재 상황에 대한 불안감을 반영합니다. 절(絶) 12운성의 기운으로, 전환점에 서 있음을 뜻합니다.',
    advice: '지금은 무리하지 마세요. 안정을 최우선으로 두고, 기반을 다지는 시기입니다.',
    luckyNumber: 5 },
  { keyword: '싸우다', category: '행위', icon: '⚔️', fortune: '보통',
    meaning: '내면의 갈등과 해소',
    detail: '싸우는 꿈은 겁재(劫財: 도전과 경쟁의 별)의 에너지로, 내면의 갈등이 표면화되고 있음을 뜻합니다. 이기면 길, 지면 주의가 필요합니다.',
    advice: '감정을 억누르지 말고 건강하게 표현하세요. 운동이나 활동적인 취미가 도움됩니다.',
    luckyNumber: 3 },
  { keyword: '울다', category: '행위', icon: '😢', fortune: '길몽',
    meaning: '감정의 정화와 해방',
    detail: '의외로 우는 꿈은 길몽입니다. 묵은 감정이 해소되고 정인(正印)의 안정 에너지가 들어오는 것을 뜻합니다.',
    advice: '감정을 숨기지 마세요. 솔직한 표현이 관계를 더 깊게 만들어줍니다.',
    luckyNumber: 4 },

  // ─── 사물 ───
  { keyword: '돈', category: '사물', icon: '💰', fortune: '보통',
    meaning: '가치와 자존감의 반영',
    detail: '돈을 줍는 꿈은 편재(偏財)의 기운이지만, 역설적으로 실제 금전 손실을 경고할 수 있습니다. 돈을 잃는 꿈은 오히려 재물이 들어올 징조입니다.',
    advice: '돈에 대한 집착을 내려놓으세요. 자연스러운 흐름을 따르면 재물운이 좋아집니다.',
    luckyNumber: 8 },
  { keyword: '집', category: '사물', icon: '🏠', fortune: '길몽',
    meaning: '안정과 내면의 상태',
    detail: '깨끗하고 넓은 집은 정재(正財)의 안정 에너지로, 가정과 경제의 안정을 뜻합니다. 낡은 집은 변화가 필요함을 암시합니다.',
    advice: '가정에 더 많은 관심을 기울이세요. 주거 환경 개선이 운기를 높여줍니다.',
    luckyNumber: 6 },
  { keyword: '차', category: '사물', icon: '🚗', fortune: '길몽',
    meaning: '인생의 방향과 속도',
    detail: '차를 운전하는 꿈은 인생의 주도권을 쥐고 있음을 뜻합니다. 건록(建祿) 12운성의 자립 에너지와 연결됩니다.',
    advice: '지금의 방향이 맞습니다. 속도를 조절하면서 꾸준히 나아가세요.',
    luckyNumber: 5 },

  // ─── 장소 ───
  { keyword: '학교', category: '장소', icon: '🏫', fortune: '보통',
    meaning: '학습과 과거의 미완성 과제',
    detail: '학교 꿈은 정인(正印: 지혜의 별)의 에너지로, 아직 배워야 할 것이 있음을 뜻합니다. 시험 꿈은 자기 검증의 욕구입니다.',
    advice: '새로운 배움에 열려 있으세요. 자격증이나 강의가 미래에 큰 도움이 됩니다.',
    luckyNumber: 4 },
  { keyword: '병원', category: '장소', icon: '🏥', fortune: '보통',
    meaning: '치유와 회복의 필요',
    detail: '병원 꿈은 몸과 마음에 회복이 필요하다는 신호입니다. 병(病) 12운성의 기운으로, 건강 관리에 신경 쓸 시기입니다.',
    advice: '건강검진을 미루지 마세요. 충분한 휴식이 최고의 보약입니다.',
    luckyNumber: 2 },

  // ─── 신체 ───
  { keyword: '이', category: '신체', icon: '🦷', fortune: '흉몽',
    meaning: '건강과 자존감의 경고',
    detail: '이(치아)가 빠지는 꿈은 건강 악화나 가족의 안부를 걱정해야 하는 흉몽입니다. 쇠(衰) 12운성의 기운입니다.',
    advice: '가족의 건강을 살펴보세요. 특히 어르신의 안부를 확인하는 것이 좋습니다.',
    luckyNumber: 9 },
  { keyword: '머리카락', category: '신체', icon: '💇', fortune: '보통',
    meaning: '사고력과 걱정의 반영',
    detail: '머리카락이 빠지는 꿈은 과도한 걱정과 스트레스를 반영합니다. 편인(偏印)의 과잉 에너지입니다.',
    advice: '생각이 너무 많아진 시기입니다. 명상이나 산책으로 머리를 비워보세요.',
    luckyNumber: 7 },
]

export interface DreamResult {
  symbols: DreamSymbol[]
  overallFortune: '길몽' | '흉몽' | '보통'
  summary: string
  luckyNumbers: number[]
  generalAdvice: string
}

export function interpretDream(dreamText: string): DreamResult {
  const text = dreamText.toLowerCase()
  const matched = SYMBOL_DB.filter(s => text.includes(s.keyword))

  if (matched.length === 0) {
    return {
      symbols: [],
      overallFortune: '보통',
      summary: '꿈에서 명확한 상징을 찾기 어렵습니다. 좀 더 구체적인 내용을 적어주시면 정확한 해석이 가능합니다.',
      luckyNumbers: [3, 7],
      generalAdvice: '꿈의 전체적인 분위기(편안했는지, 불안했는지)를 기억해보세요. 감정이 해석의 핵심 단서입니다.',
    }
  }

  const fortuneCounts = { '길몽': 0, '흉몽': 0, '보통': 0 }
  matched.forEach(s => fortuneCounts[s.fortune]++)
  const overallFortune: DreamResult['overallFortune'] =
    fortuneCounts['길몽'] > fortuneCounts['흉몽'] ? '길몽'
    : fortuneCounts['흉몽'] > fortuneCounts['길몽'] ? '흉몽' : '보통'

  const luckyNumbers = [...new Set(matched.map(s => s.luckyNumber))].slice(0, 4)

  const keySymbols = matched.slice(0, 3).map(s => s.keyword).join(', ')
  const summary = overallFortune === '길몽'
    ? `${keySymbols} 등의 상징이 나타났으며, 전체적으로 좋은 기운이 감지됩니다. 가까운 시일 내 긍정적 변화가 예상됩니다.`
    : overallFortune === '흉몽'
    ? `${keySymbols} 등의 상징이 경고 메시지를 담고 있습니다. 조심스러운 대처가 필요한 시기입니다.`
    : `${keySymbols} 등의 상징이 복합적으로 나타났습니다. 상황에 따라 길흉이 달라질 수 있으니 세심한 판단이 필요합니다.`

  const generalAdvice = overallFortune === '길몽'
    ? '꿈의 기운을 살려 적극적으로 행동하세요. 오늘 중 중요한 결정을 내리면 좋은 결과가 따릅니다.'
    : overallFortune === '흉몽'
    ? '무리한 결정이나 새로운 시작은 잠시 미루세요. 현재 상황을 안정시키는 것이 우선입니다.'
    : '꿈의 메시지를 마음에 새기되, 과도한 해석은 삼가세요. 균형 잡힌 판단이 중요합니다.'

  return { symbols: matched, overallFortune, summary, luckyNumbers, generalAdvice }
}
