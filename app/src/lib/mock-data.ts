import type { Profile, RecordItem } from './types'

export const mockProfiles: Profile[] = [
  {
    id: '1', user_id: 'u1', name: '김은우', birth_date: '1970-01-14',
    birth_time: '03:10', is_lunar: true, gender: 'male', location: 'Seoul',
    relation: 'self', is_primary: true, is_favorite: true, display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2', user_id: 'u1', name: '쫑', birth_date: '1973-02-09',
    birth_time: '11:00', is_lunar: false, gender: 'female', location: 'Seoul',
    relation: 'lover', is_favorite: true, display_order: 1,
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: '3', user_id: 'u1', name: '누나', birth_date: '1966-04-03',
    birth_time: '18:00', is_lunar: true, gender: 'female', location: 'Seoul',
    relation: 'family', is_favorite: true, display_order: 2,
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: '4', user_id: 'u1', name: '친구A', birth_date: '1978-07-21',
    birth_time: '08:30', is_lunar: false, gender: 'male', location: 'Seoul',
    relation: 'friend', display_order: 3,
    created_at: '2026-03-01T00:00:00Z',
  },
]

export const mockRecords: RecordItem[] = [
  {
    id: 'r1', title: '김은우 · 2026 신년운세', date: '2026.04.02 14:23',
    summary: '올해는 정리와 선택의 균형이 중요한 시기',
    tags: ['내 분석', '저장됨'], type: 'analysis',
    highlight: '🎍 정관(正官) 세운 — 조직 내 승진·인정 가능성 높은 해',
    expert_note: '⚠️ "하반기 편인 운에서 과도한 고민은 금물, 직감을 믿으세요"',
  },
  {
    id: 'r2', title: '김은우 × 쫑 · 연인궁합', date: '2026.04.02 11:05',
    summary: '감정 연결은 강하지만 리듬 차이를 조율해야 함',
    tags: ['궁합'], type: 'compatibility', question_count: 12,
    profile_names: ['김은우', '쫑'],
    highlight: '💑 일지 육합 구조 — 생활 리듬은 맞지만 감정 표현 차이 큼',
    qa_summary: 'Q. 자주 다투는 이유? → "일간 충으로 자극이 강한 구조, 대화 타이밍이 핵심"',
    expert_note: '✨ "서로의 식신 에너지를 존중하면 최고의 파트너가 됩니다"',
  },
  {
    id: 'r3', title: '김은우 · 금전운', date: '2026.04.01 19:48',
    summary: '지출 통제가 핵심 포인트',
    tags: ['저장한 결과'], type: 'saved',
    highlight: '💰 편재(偏財) 과다 — 돈이 들어와도 빠져나가는 구조',
    expert_note: '⚠️ "6~8월 겁재 운, 보증·투자 절대 금지 시기입니다"',
  },
  {
    id: 'r4', title: '김은우 · 직업운', date: '2026.03.28 09:32',
    summary: '현재 커리어 방향성은 맞으나 디테일 조정 필요',
    tags: ['내 분석'], type: 'analysis',
    highlight: '💼 정관+식신 구조 — 전문직·기획 계열에서 빛나는 사주',
    expert_note: '✨ "올해 정인 운에서 자격증·학습 투자가 3년 뒤 큰 결실로"',
  },
  {
    id: 'r5', title: '김은우 · 평생운세', date: '2026.03.25 16:15',
    summary: '타고난 에너지가 강하며 중년 이후 큰 전환기',
    tags: ['내 분석'], type: 'analysis', question_count: 5,
    highlight: '🌊 45세 대운 전환 — 편관에서 정인으로, 공격에서 수성으로',
    qa_summary: 'Q. 50대에 사업 가능? → "정인 대운 안정기, 소규모 컨설팅형이 적합"',
    expert_note: '⚠️ "52세 전후 충(沖) 시기, 건강 관리가 최우선입니다"',
  },
]

export const mockResultSections = [
  {
    title: '총평',
    icon: '📝',
    content: '올해는 결과를 얻기 위해 끊임없이 노력하여 결국에는 원하는 바나 그에 합당하는 결과를 얻게 되는 해입니다. 식신(食神: 타고난 재능과 표현력을 뜻하는 별)이 강하게 작용하여 목표를 향해 가는 데 있어서 높은 인내심을 발휘할 수 있게 되며, 편재(偏財: 예상치 못한 재물이나 투자 수익)의 흐름이 하반기로 갈수록 강해집니다. 현재는 무리한 확장보다 흐름 정비가 더 중요합니다.',
  },
  {
    title: '강점',
    icon: '💪',
    items: [
      '식신(食神)의 기운으로 정보를 빠르게 포착하는 감각이 살아 있습니다.',
      '편재(偏財)가 활성화되어 재물 기회를 보는 감이 좋습니다.',
      '비견(比肩: 나와 같은 오행의 기운)이 받쳐주어 자기 능력을 키우려는 노력이 멈추지 않습니다.',
    ],
  },
  {
    title: '주의점',
    icon: '⚠️',
    items: [
      '상관(傷官: 감정 표현이 강한 별)이 겹쳐 즉흥적 결정은 손실로 이어질 수 있습니다.',
      '겁재(劫財: 재물을 빼앗기는 기운)의 영향으로 과신에 의한 손실에 주의하세요.',
      '의욕이 높았던 만큼 타격도 클 수 있으니 힘든 시기에 대비가 필요합니다.',
    ],
  },
  {
    title: '시기 포인트',
    icon: '📅',
    items: [
      '상반기: 정관(正官)의 영향으로 정리와 구조 점검의 시기',
      '하반기: 편재(偏財) 활성으로 기회 확대와 재물 흐름 회복',
      '4~6월: 인성(印星)이 약해 투자보다 절약에 집중할 것',
      '9~11월: 식신(食神) 생재(生財)로 새로운 수입원 기대',
    ],
  },
  {
    title: '실행 조언',
    icon: '✅',
    items: [
      '큰 결정 전에 원국(原局: 태어날 때 정해진 사주 구조)의 흐름을 먼저 점검하세요.',
      '소액 흐름부터 안정화시키세요 — 편재(偏財)는 큰 돈보다 작은 흐름에서 시작됩니다.',
      '무리하지 말고 조용히 스스로를 다독이는 시간을 가지세요 — 인성(印星)을 보충하는 행동입니다.',
    ],
  },
]
