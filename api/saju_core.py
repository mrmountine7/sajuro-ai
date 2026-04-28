"""사주 핵심 데이터 테이블 및 계산 모듈 (ai_saju manseryuk.py 기반 재구성)"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime

# ===== 천간 (Heavenly Stems) =====
TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
TIANGAN_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
ZH_TO_KO_GAN = dict(zip(TIANGAN, TIANGAN_KO))

# ===== 지지 (Earthly Branches) =====
DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
DIZHI_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
ZH_TO_KO_ZHI = dict(zip(DIZHI, DIZHI_KO))

# ===== 오행 (Five Elements) =====
# 색상: 목=#22C55E(초록), 화=#FF5A5F(빨강), 토=#F5C518(노랑), 금=#E5E7EB(회색), 수=#3B82F6(파랑)
GAN_WUXING = {'甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水'}
ZHI_WUXING = {'子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'}
GAN_YINYANG = {'甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양', '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음'}
ZHI_YINYANG = {'子': '양', '丑': '음', '寅': '양', '卯': '음', '辰': '양', '巳': '음', '午': '양', '未': '음', '申': '양', '酉': '음', '戌': '양', '亥': '음'}
WUXING_KO = {'木': '목', '火': '화', '土': '토', '金': '금', '水': '수'}

# ===== 십성 (Ten Gods) =====
_RELATIONS = [
    ('木', [('木', '비견', '겁재'), ('火', '식신', '상관'), ('土', '편재', '정재'), ('金', '편관', '정관'), ('水', '편인', '정인')]),
    ('火', [('火', '비견', '겁재'), ('土', '식신', '상관'), ('金', '편재', '정재'), ('水', '편관', '정관'), ('木', '편인', '정인')]),
    ('土', [('土', '비견', '겁재'), ('金', '식신', '상관'), ('水', '편재', '정재'), ('木', '편관', '정관'), ('火', '편인', '정인')]),
    ('金', [('金', '비견', '겁재'), ('水', '식신', '상관'), ('木', '편재', '정재'), ('火', '편관', '정관'), ('土', '편인', '정인')]),
    ('水', [('水', '비견', '겁재'), ('木', '식신', '상관'), ('火', '편재', '정재'), ('土', '편관', '정관'), ('金', '편인', '정인')]),
]
SIPSIN_MAP: dict[tuple[str, str, bool], str] = {}
for _day_wx, _targets in _RELATIONS:
    for _target_wx, _same, _diff in _targets:
        SIPSIN_MAP[(_day_wx, _target_wx, True)] = _same
        SIPSIN_MAP[(_day_wx, _target_wx, False)] = _diff

def get_sipsin(day_gan: str, target_gan: str) -> str:
    dw = GAN_WUXING.get(day_gan, '')
    tw = GAN_WUXING.get(target_gan, '')
    same_yy = GAN_YINYANG.get(day_gan) == GAN_YINYANG.get(target_gan)
    return SIPSIN_MAP.get((dw, tw, same_yy), '')

def get_zhi_sipsin(day_gan: str, zhi: str) -> str:
    jj = JIJANGGAN.get(zhi, [])
    if not jj:
        return ''
    main_stem = jj[-1][0]
    return get_sipsin(day_gan, main_stem)

# ===== 지장간 (Hidden Stems) =====
JIJANGGAN = {
    '子': [('壬', '여기'), ('癸', '정기')],
    '丑': [('癸', '여기'), ('辛', '중기'), ('己', '정기')],
    '寅': [('戊', '여기'), ('丙', '중기'), ('甲', '정기')],
    '卯': [('甲', '여기'), ('乙', '정기')],
    '辰': [('乙', '여기'), ('癸', '중기'), ('戊', '정기')],
    '巳': [('戊', '여기'), ('庚', '중기'), ('丙', '정기')],
    '午': [('丙', '여기'), ('己', '중기'), ('丁', '정기')],
    '未': [('丁', '여기'), ('乙', '중기'), ('己', '정기')],
    '申': [('戊', '여기'), ('壬', '중기'), ('庚', '정기')],
    '酉': [('庚', '여기'), ('辛', '정기')],
    '戌': [('辛', '여기'), ('丁', '중기'), ('戊', '정기')],
    '亥': [('戊', '여기'), ('甲', '중기'), ('壬', '정기')],
}

# ===== 합충형파해 =====
GANHAP = {('甲', '己'): '土', ('乙', '庚'): '金', ('丙', '辛'): '水', ('丁', '壬'): '木', ('戊', '癸'): '火'}
YUKHAP = {('子', '丑'): '土', ('寅', '亥'): '木', ('卯', '戌'): '火', ('辰', '酉'): '金', ('巳', '申'): '水', ('午', '未'): '火'}
SAMHAP = {('寅', '午', '戌'): '火', ('巳', '酉', '丑'): '金', ('申', '子', '辰'): '水', ('亥', '卯', '未'): '木'}
BANGHAP = {('寅', '卯', '辰'): '木', ('巳', '午', '未'): '火', ('申', '酉', '戌'): '金', ('亥', '子', '丑'): '水'}
ZHI_CHONG = [('子', '午'), ('丑', '未'), ('寅', '申'), ('卯', '酉'), ('辰', '戌'), ('巳', '亥')]

# ===== 한난조습 (Hot/Cold/Dry/Wet) =====
ZHI_HANNAN = {
    '寅': '난', '卯': '난', '辰': '난',
    '巳': '난', '午': '난', '未': '난',
    '申': '한', '酉': '한', '戌': '한',
    '亥': '한', '子': '한', '丑': '한',
}
ZHI_JOSUP = {
    '子': '습', '丑': '습', '寅': '조',
    '卯': '습', '辰': '습', '巳': '조',
    '午': '조', '未': '조', '申': '조',
    '酉': '조', '戌': '조', '亥': '습',
}
# 토(진·술·축·미) 보정
ZHI_HANNAN_CORRECTED = {**ZHI_HANNAN, '辰': '난', '戌': '한', '丑': '한', '未': '난'}
ZHI_JOSUP_CORRECTED = {**ZHI_JOSUP, '辰': '습', '戌': '조', '丑': '습', '未': '조'}


@dataclass
class Pillar:
    name: str
    gan: str
    zhi: str
    gan_ko: str = ''
    zhi_ko: str = ''
    gan_wuxing: str = ''
    zhi_wuxing: str = ''
    gan_yinyang: str = ''
    zhi_yinyang: str = ''
    sipsin: str = ''
    zhi_sipsin: str = ''

    def __post_init__(self):
        self.gan_ko = ZH_TO_KO_GAN.get(self.gan, self.gan)
        self.zhi_ko = ZH_TO_KO_ZHI.get(self.zhi, self.zhi)
        self.gan_wuxing = GAN_WUXING.get(self.gan, '')
        self.zhi_wuxing = ZHI_WUXING.get(self.zhi, '')
        self.gan_yinyang = GAN_YINYANG.get(self.gan, '')
        self.zhi_yinyang = ZHI_YINYANG.get(self.zhi, '')


@dataclass
class SajuResult:
    name: str
    gender: str
    birth_date: str
    birth_time: str
    year_pillar: Pillar = field(default_factory=lambda: Pillar('년주', '', ''))
    month_pillar: Pillar = field(default_factory=lambda: Pillar('월주', '', ''))
    day_pillar: Pillar = field(default_factory=lambda: Pillar('일주', '', ''))
    hour_pillar: Pillar = field(default_factory=lambda: Pillar('시주', '', ''))
    day_master: str = ''  # 일간
    hannan: str = ''      # 한/난
    josup: str = ''       # 조/습

    @property
    def all_gan(self) -> list[str]:
        return [self.year_pillar.gan, self.month_pillar.gan, self.day_pillar.gan, self.hour_pillar.gan]

    @property
    def all_zhi(self) -> list[str]:
        return [self.year_pillar.zhi, self.month_pillar.zhi, self.day_pillar.zhi, self.hour_pillar.zhi]

    daeun_list: list[dict] = field(default_factory=list)
    daeun_start_age: int = 0
    current_daeun: dict = field(default_factory=dict)

    @property
    def wuxing_count(self) -> dict[str, int]:
        count = {'木': 0, '火': 0, '土': 0, '金': 0, '水': 0}
        for g in self.all_gan:
            wx = GAN_WUXING.get(g)
            if wx:
                count[wx] += 1
        for z in self.all_zhi:
            wx = ZHI_WUXING.get(z)
            if wx:
                count[wx] += 1
        return count


def calculate_saju(name: str, gender: str, year: int, month: int, day: int,
                   hour: int, minute: int = 0, is_lunar: bool = False,
                   use_yajasi: bool = True, apply_minus_30: bool = True) -> SajuResult:
    """sajupy를 이용한 사주 계산
    
    야자시/조자시 규칙:
    - 23:00~23:59 (야자시): 다음날 일주 사용, 시주는 子時
    - 00:00~00:59 (조자시): 당일 일주 사용, 시주는 子時
    
    -30분 보정:
    - 출생 시간에서 30분을 빼서 시진(時辰) 판단
    - 시진 경계(홀수 시 정각)에 걸리는 경우의 불확실성을 보완
    """
    try:
        from sajupy import SajuCalculator
        from datetime import datetime, timedelta
        calc = SajuCalculator()

        if is_lunar:
            solar = calc.lunar_to_solar(year, month, day, False)
            year, month, day = solar['solar_year'], solar['solar_month'], solar['solar_day']

        calc_dt = datetime(year, month, day, hour, minute)

        # -30분 보정
        if apply_minus_30:
            calc_dt = calc_dt - timedelta(minutes=30)

        calc_year, calc_month, calc_day = calc_dt.year, calc_dt.month, calc_dt.day
        calc_hour, calc_minute = calc_dt.hour, calc_dt.minute

        # 야자시: 보정 후 23시대가 되면 다음날 일주
        if use_yajasi and calc_hour == 23:
            next_day = calc_dt.date() + timedelta(days=1)
            calc_year, calc_month, calc_day = next_day.year, next_day.month, next_day.day
            calc_hour = 0

        saju = calc.calculate_saju(calc_year, calc_month, calc_day, calc_hour, calc_minute)
        result = SajuResult(name=name, gender=gender, birth_date=f"{year}-{month:02d}-{day:02d}", birth_time=f"{hour:02d}:{minute:02d}")

        result.year_pillar = Pillar('년주', saju.get('year_stem', ''), saju.get('year_branch', ''))
        result.month_pillar = Pillar('월주', saju.get('month_stem', ''), saju.get('month_branch', ''))
        result.day_pillar = Pillar('일주', saju.get('day_stem', ''), saju.get('day_branch', ''))
        result.hour_pillar = Pillar('시주', saju.get('hour_stem', ''), saju.get('hour_branch', ''))
        result.day_master = result.day_pillar.gan

        # 십성 계산
        dm = result.day_master
        for p in [result.year_pillar, result.month_pillar, result.hour_pillar]:
            p.sipsin = get_sipsin(dm, p.gan)
            p.zhi_sipsin = get_zhi_sipsin(dm, p.zhi)
        result.day_pillar.sipsin = '일원'
        result.day_pillar.zhi_sipsin = get_zhi_sipsin(dm, result.day_pillar.zhi)

        # 한난조습
        month_zhi = result.month_pillar.zhi
        day_zhi = result.day_pillar.zhi
        result.hannan = ZHI_HANNAN_CORRECTED.get(month_zhi, '')
        result.josup = ZHI_JOSUP_CORRECTED.get(day_zhi, '')

        # 대운 계산
        birth_year = int(result.birth_date.split('-')[0])
        result.daeun_start_age, result.daeun_list, result.current_daeun = _calc_daeun(
            result.year_pillar, result.month_pillar, dm, gender, birth_year
        )

        return result
    except Exception as e:
        raise RuntimeError(f"사주 계산 실패: {e}")


def check_ganhap(gan1: str, gan2: str) -> Optional[str]:
    pair = (gan1, gan2) if (gan1, gan2) in GANHAP else (gan2, gan1)
    return GANHAP.get(pair)

def check_yukhap(zhi1: str, zhi2: str) -> Optional[str]:
    pair = (zhi1, zhi2) if (zhi1, zhi2) in YUKHAP else (zhi2, zhi1)
    return YUKHAP.get(pair)

def check_chong(zhi1: str, zhi2: str) -> bool:
    return (zhi1, zhi2) in ZHI_CHONG or (zhi2, zhi1) in ZHI_CHONG

def check_samhap(zhis: list[str]) -> list[tuple[tuple, str]]:
    results = []
    zhi_set = set(zhis)
    for combo, element in SAMHAP.items():
        matches = [z for z in combo if z in zhi_set]
        if len(matches) >= 2:
            results.append((combo, element))
    return results

def get_jijanggan_sipsins(day_gan: str, zhi: str) -> list[dict]:
    """지장간 각 성분의 십성을 반환"""
    entries = JIJANGGAN.get(zhi, [])
    return [{'stem': stem, 'tier': tier, 'sipsin': get_sipsin(day_gan, stem)} for stem, tier in entries]

def check_amhap(zhi1: str, zhi2: str) -> list[dict]:
    """지장간 암합 체크"""
    pair = (zhi1, zhi2)
    if pair in YUKHAP or (zhi2, zhi1) in YUKHAP:
        return []
    results = []
    jj1 = JIJANGGAN.get(zhi1, [])
    jj2 = JIJANGGAN.get(zhi2, [])
    for stem1, tier1 in jj1:
        for stem2, tier2 in jj2:
            hap = check_ganhap(stem1, stem2)
            if hap:
                results.append({'stem1': stem1, 'tier1': tier1, 'stem2': stem2, 'tier2': tier2, 'result_element': hap})
    return results


# ===== 대운 계산 =====
def _calc_daeun(year_pillar: Pillar, month_pillar: Pillar, day_master: str,
                gender: str, birth_year: int) -> tuple[int, list[dict], dict]:
    year_gan = year_pillar.gan
    yy = GAN_YINYANG.get(year_gan, '양')
    is_forward = (yy == '양' and gender == 'male') or (yy == '음' and gender == 'female')
    direction = 1 if is_forward else -1

    # 기운 시작 나이 (간이 계산: 3~8세 범위, 정밀 절기 계산은 추후 보강)
    start_age = 4 if is_forward else 6

    mg_idx = TIANGAN.index(month_pillar.gan) if month_pillar.gan in TIANGAN else 0
    mz_idx = DIZHI.index(month_pillar.zhi) if month_pillar.zhi in DIZHI else 0

    current_year = datetime.now().year
    current_age = current_year - birth_year + 1

    daeun_list = []
    for order in range(1, 10):
        g_idx = (mg_idx + order * direction) % 10
        z_idx = (mz_idx + order * direction) % 12
        gan = TIANGAN[g_idx]
        zhi = DIZHI[z_idx]
        age_start = start_age + (order - 1) * 10
        age_end = age_start + 9
        year_start = birth_year + age_start - 1
        year_end = birth_year + age_end - 1

        gan_wx = GAN_WUXING.get(gan, '')
        zhi_wx = ZHI_WUXING.get(zhi, '')
        dm_wx = GAN_WUXING.get(day_master, '')
        same_yy_gan = GAN_YINYANG.get(day_master) == GAN_YINYANG.get(gan)
        same_yy_zhi = GAN_YINYANG.get(day_master) == ZHI_YINYANG.get(zhi)

        from saju_core import SIPSIN_MAP
        gan_sipsin = SIPSIN_MAP.get((dm_wx, gan_wx, same_yy_gan), '')
        zhi_main = JIJANGGAN.get(zhi, [])
        zhi_sipsin = ''
        if zhi_main:
            main_stem = zhi_main[-1][0]
            zhi_sipsin = get_sipsin(day_master, main_stem)

        is_current = age_start <= current_age <= age_end

        entry = {
            'order': order,
            'gan': gan, 'zhi': zhi,
            'gan_ko': ZH_TO_KO_GAN.get(gan, ''), 'zhi_ko': ZH_TO_KO_ZHI.get(zhi, ''),
            'gan_wuxing': WUXING_KO.get(gan_wx, ''), 'zhi_wuxing': WUXING_KO.get(zhi_wx, ''),
            'gan_sipsin': gan_sipsin, 'zhi_sipsin': zhi_sipsin,
            'age_start': age_start, 'age_end': age_end,
            'year_start': year_start, 'year_end': year_end,
            'is_current': is_current,
        }
        daeun_list.append(entry)

    current_daeun = next((d for d in daeun_list if d['is_current']), daeun_list[0] if daeun_list else {})
    return start_age, daeun_list, current_daeun
