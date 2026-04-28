/* sajuro.ai Web App - Navigation & Logic */

const navigationHistory = ['screen-home'];
let currentScreen = 'screen-home';

const analysisMenuItems = [
  { id: 'manseryeok', title: '만세력', desc: '사주 팔자 원본 정보 확인', icon: '📜', badge: 'free', category: 'saju' },
  { id: 'precision', title: '내 사주 정밀분석', desc: '타고난 기질과 인생 구조를 깊게 해석', icon: '🔮', badge: 'recommend', category: 'saju' },
  { id: 'lifetime', title: '평생운세', desc: '일생의 큰 흐름과 전환점 분석', icon: '🌊', badge: 'popular', category: 'saju' },
  { id: 'flow', title: '운세 흐름', desc: '대운·세운·월운의 변화 포인트 확인', icon: '📈', badge: 'free', category: 'saju' },
  { id: 'newyear', title: '신년운세', desc: '2026년 한 해의 운세를 총정리', icon: '🎍', badge: 'popular', category: 'theme' },
  { id: 'tojeong', title: '토정비결', desc: '전통 방식의 한 해 운세 풀이', icon: '📖', badge: 'free', category: 'theme' },
  { id: 'wealth', title: '금전운', desc: '재물 흐름과 지출 위험을 분석', icon: '💰', badge: 'free-now', category: 'theme' },
  { id: 'love', title: '애정운', desc: '감정 흐름과 연애 타이밍 분석', icon: '💕', badge: 'recommend', category: 'theme' },
  { id: 'career', title: '직업운', desc: '적성과 커리어 방향 해석', icon: '💼', badge: null, category: 'theme' },
  { id: 'business', title: '사업운', desc: '사업 성패와 투자 시기 분석', icon: '🏢', badge: null, category: 'theme' },
  { id: 'health', title: '건강운', desc: '체질과 건강 주의 포인트', icon: '❤️‍🩹', badge: 'free', category: 'theme' },
  { id: 'friend', title: '친구운', desc: '인간관계와 사회적 연결 분석', icon: '🤝', badge: null, category: 'theme' },
  { id: 'couple', title: '연인궁합', desc: '끌림, 갈등, 감정 리듬을 확인', icon: '💑', badge: 'popular', category: 'match' },
  { id: 'marriage', title: '결혼궁합', desc: '결혼 상대로서의 궁합 분석', icon: '💍', badge: 'recommend', category: 'match' },
  { id: 'dream', title: '꿈해몽', desc: '꿈 속 상징의 의미를 해석', icon: '🌙', badge: 'free', category: 'life' },
  { id: 'name', title: '이름풀이', desc: '이름이 가진 에너지와 의미 분석', icon: '✍️', badge: null, category: 'life' },
  { id: 'palm', title: '손금 보기', desc: 'AI가 분석하는 손금 해석', icon: '🖐️', badge: 'coming-soon', category: 'image' },
  { id: 'face', title: '관상 보기', desc: 'AI가 분석하는 관상 해석', icon: '👤', badge: 'coming-soon', category: 'image' },
];

const badgeConfig = {
  'free': { label: '무료', class: 'badge-free' },
  'free-now': { label: '현재 무료', class: 'badge-free-now' },
  'premium': { label: '프리미엄', class: 'badge-premium' },
  'coming-soon': { label: '준비중', class: 'badge-coming-soon' },
  'recommend': { label: '추천', class: 'badge-recommend' },
  'popular': { label: '인기', class: 'badge-popular' },
};

function renderAnalysisGrid(filter = 'all') {
  const grid = document.getElementById('analysis-grid');
  if (!grid) return;

  const items = filter === 'all'
    ? analysisMenuItems
    : analysisMenuItems.filter(item => item.category === filter);

  grid.innerHTML = items.map(item => {
    const badgeHtml = item.badge
      ? `<span class="card-badge ${badgeConfig[item.badge].class}">${badgeConfig[item.badge].label}</span>`
      : '';

    return `
      <div class="analysis-card" onclick="navigateTo('screen-detail')">
        <div class="card-icon">${item.icon}</div>
        <div>
          <div class="card-title">${item.title}</div>
          <div class="card-desc">${item.desc}</div>
        </div>
        ${badgeHtml}
      </div>
    `;
  }).join('');
}

function navigateTo(screenId) {
  if (currentScreen === screenId) return;

  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => s.classList.remove('active'));

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    target.querySelector('.screen-body')?.scrollTo(0, 0);
    navigationHistory.push(screenId);
    currentScreen = screenId;
    updateTabBar(screenId);
    updateThemeColor(target);
  }
}

function switchTab(btn) {
  const screenId = btn.getAttribute('data-screen');
  navigateTo(screenId);
}

function goBack() {
  if (navigationHistory.length > 1) {
    navigationHistory.pop();
    const prevScreen = navigationHistory[navigationHistory.length - 1];
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.remove('active'));
    const target = document.getElementById(prevScreen);
    if (target) {
      target.classList.add('active');
      currentScreen = prevScreen;
      updateTabBar(prevScreen);
      updateThemeColor(target);
    }
  }
}

function updateTabBar(screenId) {
  const screen = document.getElementById(screenId);
  const tabName = screen?.getAttribute('data-tab');
  const isLight = screen?.classList.contains('theme-light');

  const tabBar = document.getElementById('main-tab-bar');
  tabBar.classList.remove('theme-light', 'theme-dark');
  tabBar.classList.add(isLight ? 'theme-light' : 'theme-dark');

  const tabScreenMap = {
    'screen-home': 'home',
    'screen-analysis': 'analysis',
    'screen-vault': 'vault',
    'screen-records': 'records',
    'screen-mypage': 'mypage'
  };

  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.remove('active');
    const itemScreenId = item.getAttribute('data-screen');
    if (tabScreenMap[itemScreenId] === tabName ||
        (tabName === 'vault' && itemScreenId === 'screen-vault') ||
        (tabName === 'records' && itemScreenId === 'screen-records')) {
      item.classList.add('active');
    }
  });

  tabBar.style.display = '';
}

function updateThemeColor(screen) {
  const isLight = screen.classList.contains('theme-light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', isLight ? '#F3F4F6' : '#0E0B0C');
  }
}

function initChipFilters() {
  const chipContainer = document.getElementById('analysis-chips');
  if (!chipContainer) return;

  chipContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    chipContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const filter = chip.getAttribute('data-filter');
    renderAnalysisGrid(filter);
  });

  document.querySelectorAll('.chip-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || row.id === 'analysis-chips') return;

      row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAnalysisGrid('all');
  initChipFilters();
  updateTabBar('screen-home');
});
