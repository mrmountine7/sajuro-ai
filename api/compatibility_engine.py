"""연인 사주 궁합 6단계 분석 엔진"""

from dataclasses import dataclass, field
from saju_core import (
    SajuResult, Pillar, GAN_WUXING, ZHI_WUXING, WUXING_KO,
    ZH_TO_KO_GAN, ZH_TO_KO_ZHI, GAN_YINYANG,
    get_sipsin, get_zhi_sipsin, get_jijanggan_sipsins,
    check_ganhap, check_yukhap, check_chong, check_samhap, check_amhap,
    GANHAP, YUKHAP, ZHI_CHONG, JIJANGGAN,
)


@dataclass
class StageResult:
    stage: int
    title: str
    summary: str = ''
    details: list[str] = field(default_factory=list)
    score: int = 0
    tags: list[str] = field(default_factory=list)


@dataclass
class CompatibilityResult:
    person1_name: str
    person2_name: str
    overall_score: int = 0
    overall_summary: str = ''
    stages: list[StageResult] = field(default_factory=list)
    outer_score: int = 0    # 겉궁합
    inner_score: int = 0    # 속궁합
    timeline_notes: list[str] = field(default_factory=list)


def analyze_compatibility(saju1: SajuResult, saju2: SajuResult) -> CompatibilityResult:
    """6단계 연인궁합 분석 실행"""
    result = CompatibilityResult(person1_name=saju1.name, person2_name=saju2.name)

    st_ilji = _stage3_ilji_jiji(saju1, saju2)       # 1st: 일지·속궁합 (가장 중요)
    st_amhap = _stage4_jijanggan_amhap(saju1, saju2) # 2nd: 지장간·암합
    st_hannan = _stage1_hannan_josup(saju1, saju2)    # 3rd: 한난조습
    st_ohang = _stage2_ilgan_ohang(saju1, saju2)      # 4th: 일간/오행
    st_daeun = _stage5_daeun_synergy(saju1, saju2)    # 5th: 대운 시너지

    # 표시 순서에 맞게 stage 번호 재부여
    st_ilji.stage = 1
    st_amhap.stage = 2
    st_hannan.stage = 3
    st_ohang.stage = 4
    st_daeun.stage = 5

    s1, s2, s3, s4, s5 = st_hannan, st_ohang, st_ilji, st_amhap, st_daeun
    result.stages = [st_ilji, st_amhap, st_hannan, st_ohang, st_daeun]
    result.outer_score = (s2.score * 2 + s5.score) // 3
    result.inner_score = (s1.score + s3.score + s4.score) // 3
    result.overall_score = (result.outer_score * 2 + result.inner_score * 3) // 5
    result.overall_summary = _generate_overall_summary(result)

    return result


# ===== 지지 → 계절 이미지 매핑 =====
ZHI_SEASON_IMAGE = {
    '子': '한겨울의 차가운 기운과 축축한 물기',
    '丑': '늦겨울, 땅속에 습기가 남아 있는 시기',
    '寅': '초봄의 선선한 날씨',
    '卯': '봄비가 촉촉한 따뜻한 봄날',
    '辰': '봄 끝자락, 축축한 안개와 흙냄새',
    '巳': '초여름의 점점 뜨거워지는 공기',
    '午': '한여름의 뜨거운 더위',
    '未': '늦여름, 무덥고 후텁지근한 습기',
    '申': '초가을의 서늘하고 건조한 바람',
    '酉': '가을 한가운데, 맑고 건조한 하늘',
    '戌': '늦가을, 건조하고 쓸쓸한 바람',
    '亥': '초겨울, 차가운 비와 축축한 공기',
}

def _describe_person_energy(name: str, saju: 'SajuResult') -> list[str]:
    mz = saju.month_pillar.zhi
    dz = saju.day_pillar.zhi
    mz_ko = ZH_TO_KO_ZHI.get(mz, mz)
    dz_ko = ZH_TO_KO_ZHI.get(dz, dz)
    m_img = ZHI_SEASON_IMAGE.get(mz, '')
    d_img = ZHI_SEASON_IMAGE.get(dz, '')

    lines = [f"{name}:"]
    lines.append(f"월지 {mz}({mz_ko}) → {m_img}")
    lines.append(f"일지 {dz}({dz_ko}) → {d_img}")

    h = saju.hannan
    j = saju.josup
    if h == '난' and j == '조':
        lines.append("→ 기본은 선선하지만, 속은 금방 뜨거워지는 타입입니다.")
    elif h == '난' and j == '습':
        lines.append("→ 겉은 차분하고 촉촉하지만, 속에 차가운 물기가 많은 타입입니다.")
    elif h == '한' and j == '조':
        lines.append("→ 차갑고 건조해서 쉽게 마음을 열지 않지만, 한번 열면 뜨거운 타입입니다.")
    elif h == '한' and j == '습':
        lines.append("→ 겉으로는 조용하고 촉촉하지만, 깊은 곳에 냉기를 품은 타입입니다.")
    else:
        lines.append(f"→ {h}{j} 체질입니다.")
    return lines


# ===== 1단계: 한난조습·조후 =====
def _stage1_hannan_josup(s1: SajuResult, s2: SajuResult) -> StageResult:
    stage = StageResult(stage=1, title='한난조습·조후(온도·습도 상호 흐름)')
    details = []
    score = 50

    # 안내문
    details.append("[온도/습도를 보는 이유와 기준]")
    details.append("사람마다 태어난 계절(월지)과 그날의 기운(일지)로 몸과 마음의 온도, 습도를 볼 수 있습니다.")
    details.append("월지는 '태어난 계절의 날씨', 일지는 '그날 하루의 느낌'이라고 생각하면 이해하기 쉽습니다.")
    details.append("")

    # 보완 관계 체크
    hannan_comp = (s1.hannan == '한' and s2.hannan == '난') or (s1.hannan == '난' and s2.hannan == '한')
    josup_comp = (s1.josup == '조' and s2.josup == '습') or (s1.josup == '습' and s2.josup == '조')

    # 기본 점수
    if hannan_comp and josup_comp:
        score = 90
        stage.tags.append("체질 최고 보완")
    elif hannan_comp:
        score = 75
        stage.tags.append("온도 보완")
    elif josup_comp:
        score = 70
        stage.tags.append("습도 보완")
    elif s1.hannan == s2.hannan and s1.josup == s2.josup:
        score = 55
        stage.tags.append("동질 체질")
    else:
        score = 60

    # 일지 오행 직접 보완 보너스
    dz1_wx = ZHI_WUXING.get(s1.day_pillar.zhi, '')
    dz2_wx = ZHI_WUXING.get(s2.day_pillar.zhi, '')
    fire_water = {dz1_wx, dz2_wx} == {'火', '水'}
    wood_metal = {dz1_wx, dz2_wx} == {'木', '金'}

    if fire_water:
        score = min(score + 10, 95)
        stage.tags.append("화수 상호 조절")
    elif wood_metal:
        score = min(score + 8, 95)
        stage.tags.append("목금 상호 제약")

    # 일지 합·충 체질 시너지 보너스
    dz1 = s1.day_pillar.zhi
    dz2 = s2.day_pillar.zhi
    if check_yukhap(dz1, dz2):
        score = min(score + 5, 95)
        stage.tags.append("일지 육합 체질 시너지")
    elif check_chong(dz1, dz2):
        # 충은 자극적 보완 — 감점이 아니라 소폭 가점 (긴장 속 끌림)
        score = min(score + 3, 95)
        stage.tags.append("일지 충 긴장적 보완")

    details.append("")

    # 분석 결과 영역
    details.append("[분석 결과]")

    s1_dz = s1.day_pillar.zhi
    s2_dz = s2.day_pillar.zhi
    s1_dz_ko = ZH_TO_KO_ZHI.get(s1_dz, s1_dz)
    s2_dz_ko = ZH_TO_KO_ZHI.get(s2_dz, s2_dz)
    s1_dz_img = ZHI_SEASON_IMAGE.get(s1_dz, '')
    s2_dz_img = ZHI_SEASON_IMAGE.get(s2_dz, '')

    if hannan_comp and josup_comp:
        details.append(f"두 사람은 온도와 습도가 모두 상호보완되는, 체질적으로 이상적인 속궁합입니다.")
        details.append(f"{s1.name}의 {s1.hannan} 에너지와 {s2.name}의 {s2.hannan} 에너지가 서로를 데워주고 식혀주며, {s1.josup}한 쪽과 {s2.josup}한 쪽이 서로를 촉촉하게 감싸줍니다.")
        details.append("함께 있으면 본능적으로 몸과 마음이 편안해지는 관계로, 스킨십도 자연스럽고 깊은 교감이 가능합니다.")
    elif hannan_comp:
        details.append(f"두 사람은 온도 리듬이 잘 맞는 궁합입니다.")
        details.append(f"{s1.name}의 {s1.hannan} 에너지와 {s2.name}의 {s2.hannan} 에너지가 서로를 식혀주고 데워주어, 함께 있으면 체온이 자연스럽게 조율됩니다.")
        details.append("스킨십에서 한쪽이 뜨거울 때 다른 쪽이 시원하게 받아주는 리듬이 있어, 신체적 교감이 편안한 관계입니다.")
    elif josup_comp:
        details.append("두 사람은 감정의 습도 리듬이 잘 맞는, 편안하게 섞이는 궁합입니다.")
        details.append(f"{s1.name}의 일지 {s1_dz}({s1_dz_ko})는 '{s1_dz_img}'의 기운으로 {s1.josup}한 성질이고, {s2.name}의 일지 {s2_dz}({s2_dz_ko})는 '{s2_dz_img}'의 기운으로 {s2.josup}한 성질입니다.")
        details.append(f"서로의 {s1.josup}함과 {s2.josup}함이 적당히 보완되어, 함께 있을 때 정서적으로 촉촉하고 안정감을 느끼기 쉬운 관계입니다.")
        details.append(f"특히 일지 {s1_dz}({s1_dz_ko})와 {s2_dz}({s2_dz_ko})의 조합은, {s1.name}의 타오르는 열기를 {s2.name}의 물기가 적셔주고, {s2.name}의 차가움을 {s1.name}의 따뜻함이 녹여주는 구조입니다.")
        details.append("감정이 과열될 때 상대가 자연스럽게 진정시켜주고, 감정이 식을 때 상대가 다시 불을 지펴주는 — 서로가 서로의 감정 온도 조절기가 되어주는 궁합입니다.")
    elif s1.hannan == s2.hannan and s1.josup == s2.josup:
        p1_type = f"{s1.hannan}{s1.josup}"
        details.append(f"두 사람은 같은 체질({p1_type})로, 스킨십 템포와 감정 리듬이 비슷합니다.")
        details.append(f"일지가 각각 {s1_dz}({s1_dz_ko})와 {s2_dz}({s2_dz_ko})로, 비슷한 기후 성질을 가지고 있어 처음에는 감각이 잘 맞는다고 느낍니다.")
        details.append("다만 감정이나 피로가 쌓이면 서로 채워주지 못하고 같은 방향으로 치우치기 쉬워, 의식적으로 환기시켜주는 노력이 필요합니다.")
    else:
        details.append("두 사람은 부분적으로 보완이 되는 관계입니다.")
        details.append(f"일지 {s1_dz}({s1_dz_ko})와 {s2_dz}({s2_dz_ko})의 조합에서, 일부 영역은 서로 잘 채워주지만 다른 영역에서는 체질적 조율이 필요합니다.")
        details.append("관계를 오래 유지하려면, 서로의 온도·습도 차이를 이해하고 맞춰가는 과정이 중요합니다.")

    details.append("")

    # 개인별 온도·습도 분석(상세)
    details.append("[참고 (개인별 상세)]")
    details.extend(_describe_person_energy(s1.name, s1))
    details.append("")
    details.extend(_describe_person_energy(s2.name, s2))

    stage.details = details
    stage.score = score
    stage.summary = details[4] if len(details) > 4 else ''
    return stage


# ===== 오행별 삶의 의미 =====
WUXING_MEANING = {
    '木': '성장·도전·계획하는 힘',
    '火': '표현·열정·사회적 빛',
    '土': '안정·신뢰·중심을 잡는 힘',
    '金': '결단·정리·실행하는 힘',
    '水': '지혜·유연함·내면의 깊이',
}
WUXING_NATURE = {
    '木': '나무처럼 위로 뻗어나가려는 에너지',
    '火': '불처럼 밝히고 표현하려는 에너지',
    '土': '땅처럼 품고 안정시키려는 에너지',
    '金': '쇠처럼 자르고 정리하려는 에너지',
    '水': '물처럼 흐르고 적응하려는 에너지',
}

# ===== 2단계: 일간/오행 구조 궁합 =====
def _stage2_ilgan_ohang(s1: SajuResult, s2: SajuResult) -> StageResult:
    stage = StageResult(stage=2, title='일간/오행 구조 궁합')
    details = []
    score = 50

    dm1, dm2 = s1.day_master, s2.day_master
    dm1_ko = ZH_TO_KO_GAN.get(dm1, dm1)
    dm2_ko = ZH_TO_KO_GAN.get(dm2, dm2)
    dm1_wx = GAN_WUXING.get(dm1, '')
    dm2_wx = GAN_WUXING.get(dm2, '')
    dm1_wx_ko = WUXING_KO.get(dm1_wx, '')
    dm2_wx_ko = WUXING_KO.get(dm2_wx, '')

    # 안내문
    details.append("[일간/오행 구조를 궁합에서 보는 이유]")
    details.append("일간(日干)은 '나 자신'을 대표하는 글자로, 사주에서 가장 핵심적인 요소입니다.")
    details.append("두 사람의 일간이 어떤 오행(목·화·토·금·수)인지에 따라, 서로에게 어떤 에너지를 주고받는지 알 수 있습니다.")
    details.append("또한 사주 전체의 오행 분포를 합쳐 보면, 두 사람이 함께 있을 때 삶의 어떤 영역이 채워지고 어떤 영역이 부족한지 파악할 수 있습니다.")
    details.append("")

    # 간합 체크
    hap = check_ganhap(dm1, dm2)
    if hap:
        score = 88
        stage.tags.append("일간합")
    else:
        _wuxing_rel = _get_wuxing_relation(dm1_wx, dm2_wx)
        if '상생' in _wuxing_rel:
            score = 75
            stage.tags.append("일간 상생")
        elif '비화' in _wuxing_rel:
            score = 68
            stage.tags.append("일간 비화")
        else:
            score = 65
            stage.tags.append("일간 상극")

    # 분석 결과
    details.append("[구조 궁합 상세]")

    details.append(f"{s1.name}의 일간은 {dm1}({dm1_ko}), 오행으로는 {dm1_wx_ko}({dm1_wx})입니다.")
    details.append(f"→ {WUXING_NATURE.get(dm1_wx, '')}를 가진 사람입니다.")
    details.append(f"{s2.name}의 일간은 {dm2}({dm2_ko}), 오행으로는 {dm2_wx_ko}({dm2_wx})입니다.")
    details.append(f"→ {WUXING_NATURE.get(dm2_wx, '')}를 가진 사람입니다.")
    details.append("")

    if hap:
        hap_ko = WUXING_KO.get(hap, '')
        details.append(f"두 사람의 일간 {dm1_ko}({dm1_wx_ko})와 {dm2_ko}({dm2_wx_ko})는 천간합(天干合) 관계입니다.")
        details.append(f"→ 만나면 자연스럽게 {hap_ko}({hap})의 새로운 기운이 생겨나는, 정서적으로 찰떡인 천생 궁합입니다. 대화할 때 코드가 맞고, 같은 방향을 바라보는 느낌을 자주 받게 됩니다.")
    else:
        if '상생' in (_get_wuxing_relation(dm1_wx, dm2_wx)):
            details.append(f"두 사람의 오행은 상생(相生) 관계입니다 — 한쪽이 다른 쪽을 자연스럽게 키워주는 구조입니다.")
            details.append(f"→ {dm1_wx_ko}({dm1_wx})와 {dm2_wx_ko}({dm2_wx})가 서로를 살려주어, 함께 있을수록 서로의 장점이 커지는 관계입니다.")
        elif '비화' in (_get_wuxing_relation(dm1_wx, dm2_wx)):
            details.append(f"두 사람의 오행은 비화(比和) 관계입니다 — 같은 오행으로 동질감이 강합니다.")
            details.append(f"→ 서로를 잘 이해하고 공감하지만, 같은 방향으로만 흘러 새로운 자극이 부족할 수 있습니다.")
        else:
            details.append(f"두 사람의 오행은 상극(相剋) 관계입니다 — {dm2_wx_ko}({dm2_wx})가 {dm1_wx_ko}({dm1_wx})를 제어하는 구조입니다.")
            details.append(f"→ 서로에게 강한 자극과 끌림을 주지만, 그만큼 부딪힘도 있습니다. 이 긴장감이 오히려 관계를 지루하지 않게 만드는 케미의 원천이 됩니다.")
    details.append("")

    # 오행 분포 합산
    wc1 = s1.wuxing_count
    wc2 = s2.wuxing_count
    combined = {k: wc1.get(k, 0) + wc2.get(k, 0) for k in ['木', '火', '土', '金', '水']}
    missing_in_1 = [k for k, v in wc1.items() if v == 0 and wc2.get(k, 0) > 0]
    missing_in_2 = [k for k, v in wc2.items() if v == 0 and wc1.get(k, 0) > 0]

    mutual_comp = bool(missing_in_1) and bool(missing_in_2)
    if missing_in_1:
        for w in missing_in_1:
            wk = WUXING_KO[w]
            meaning = WUXING_MEANING.get(w, '')
            details.append(f"{s2.name}이(가) {s1.name}에게 {wk}({w}) 오행을 보충해줌")
            details.append(f"→ {s1.name}의 사주에는 {wk}({w}: {meaning})이 없습니다. 혼자서는 이 영역이 약할 수 있지만, {s2.name}이 곁에 있으면 자연스럽게 이 기운이 채워집니다.")
        score += 5
    if missing_in_2:
        for w in missing_in_2:
            wk = WUXING_KO[w]
            meaning = WUXING_MEANING.get(w, '')
            details.append(f"{s1.name}이(가) {s2.name}에게 {wk}({w}) 오행을 보충해줌")
            details.append(f"→ {s2.name}의 사주에는 {wk}({w}: {meaning})이 없습니다. 혼자서는 이 영역이 약할 수 있지만, {s1.name}이 곁에 있으면 자연스럽게 이 기운이 채워집니다.")
        score += 5
    if mutual_comp:
        score += 5
        details.append("")
        details.append("서로에게 없는 오행을 채워주는 쌍방향 보완 관계")
        details.append("→ 두 사람이 함께 있을 때 비로소 삶의 모든 영역(성장·열정·안정·결단·지혜)이 균형을 이루는 구조입니다. 혼자서는 부족했던 부분을 상대가 자연스럽게 메워주는, 퍼즐 조각 같은 관계입니다.")
        stage.tags.append("쌍방향 보완")

    all_present = all(v > 0 for v in combined.values())
    if all_present:
        score = min(score + 5, 95)
        details.append("합산 오행 5행 완비 → 상호보완적 궁합 구조")
        stage.tags.append("오행 완비")

    stage.details = details
    stage.score = score
    stage.summary = details[1] if len(details) > 1 else details[0]
    return stage


# ===== 3단계: 일지·지지 합충 =====
def _stage3_ilji_jiji(s1: SajuResult, s2: SajuResult) -> StageResult:
    stage = StageResult(stage=3, title='일지·지지 합충 (속궁합)')
    details = []
    score = 50

    dz1 = s1.day_pillar.zhi
    dz2 = s2.day_pillar.zhi
    dz1_ko = ZH_TO_KO_ZHI.get(dz1, dz1)
    dz2_ko = ZH_TO_KO_ZHI.get(dz2, dz2)

    # 안내
    details.append("[일지·지지를 속궁합에서 가장 먼저 보는 이유]")
    details.append("연인 궁합에서 가장 중요한 것이 일지(日支)입니다. 일지는 사주에서 '배우자 자리'이자 '내 가장 사적인 공간'을 뜻합니다.")
    details.append("일간(日干)이 '나의 정신·의식'이라면, 일지(日支)는 '나의 몸·생활·본능'입니다. 연인 관계에서는 정신보다 몸과 생활의 리듬이 맞느냐가 관계의 지속성을 결정합니다.")
    details.append("두 사람의 일지가 어떤 관계인지 보면, 함께 살 때의 생활 패턴, 스킨십 리듬, 신체적 교감의 자연스러움을 가장 직접적으로 알 수 있습니다.")
    details.append("그래서 모든 궁합 분석에서 일지를 가장 먼저, 가장 비중 있게 봅니다.")
    details.append("")

    # 분석 결과
    details.append("[속궁합 상세]")
    details.append(f"{s1.name}의 일지는 {dz1}({dz1_ko}), {s2.name}의 일지는 {dz2}({dz2_ko})입니다.")

    has_match = False

    # 일지 동일
    if dz1 == dz2:
        score = 82
        has_match = True
        details.append(f"→ 두 사람의 일지가 동일합니다. 생활 패턴과 잠자리 습관이 비슷해서, 함께 살 때 서로 맞추려는 노력 없이도 편안하게 지낼 수 있는 구조입니다.")
        stage.tags.append("일지 동일")

    # 일지 육합
    yh = check_yukhap(dz1, dz2)
    if yh:
        score = max(score, 90)
        has_match = True
        yh_ko = WUXING_KO.get(yh, yh)
        details.append(f"→ 일지 육합({dz1_ko}–{dz2_ko} → {yh_ko}): 서로 몸이 잘 맞는다는 대표적인 속궁합 패턴입니다.")
        details.append("→ 성적 끌림과 잠자리 만족도가 자연스럽게 높고, 동거·동침의 리듬이 노력 없이도 맞아 떨어집니다. 함께 있을수록 몸과 마음이 하나로 녹아드는 느낌을 받기 쉬운, 속궁합 최상의 구조입니다.")
        stage.tags.append("일지 육합")

    # 일지 충
    is_chong = check_chong(dz1, dz2)
    if is_chong:
        score = max(score, 78)
        has_match = True
        dz1_img = ZHI_SEASON_IMAGE.get(dz1, '')
        dz2_img = ZHI_SEASON_IMAGE.get(dz2, '')

        details.append(f"→ 일지 충({dz1_ko}↔{dz2_ko}): {dz1_ko}는 '{dz1_img}'이고 {dz2_ko}는 '{dz2_img}'입니다.")
        details.append("→ 정반대 에너지가 정면으로 부딪히는 구조로, 만났을 때의 케미와 성적 긴장감이 매우 강합니다. '처음 만났는데 왠지 모르게 눈을 뗄 수 없는' 느낌이 바로 이 충(沖)에서 옵니다.")
        details.append("→ 일지 충은 단순한 갈등이 아닙니다. 서로 완전히 다른 에너지를 가졌기 때문에 상대에게서 자신에게 없는 것을 강렬하게 느끼는 것이며, 이것이 연인 사이에서는 강한 끌림과 자극으로 작용합니다.")
        details.append("→ 서로의 차이를 '틀린 것'이 아닌 '다른 매력'으로 이해하면, 충의 에너지는 관계를 지루하지 않게 만드는 최고의 케미가 됩니다. 다만 에너지 소모가 크므로, 함께 쉬어가는 시간을 의식적으로 만드는 것이 장기적 관계의 핵심입니다.")
        stage.tags.append("강한 케미")
        stage.tags.append("일지 충")

    if not has_match:
        details.append("→ 일지끼리 합이나 충 관계는 아닙니다. 본능적 끌림보다는 다른 영역(정서, 가치관 등)에서 관계의 힘이 나오는 구조입니다.")

    details.append("")

    # 전체 지지 삼합·방합 분석
    all_zhi = s1.all_zhi + s2.all_zhi
    samhap_results = check_samhap(all_zhi)
    if samhap_results:
        details.append("[참고 (전체 지지 합충)]")
        for combo, element in samhap_results:
            elem_ko = WUXING_KO.get(element, element)
            sipsin_meaning = _interpret_element_as_attraction(s1.day_master, element)
            details.append(f"지지 삼합으로 {elem_ko}({element}) 기운이 활성화됩니다 ({sipsin_meaning})")
            details.append(f"→ 두 사람이 만나면 {elem_ko} 에너지가 강해집니다. 같은 방향으로 기운이 움직여 생활 리듬과 성욕의 방향이 잘 맞는 쪽입니다.")
            if '식상' in sipsin_meaning or '재성' in sipsin_meaning:
                stage.tags.append("성적 끌림 활성")
                score = min(score + 8, 95)

    stage.details = details
    stage.score = score
    stage.summary = details[6] if len(details) > 6 else details[0]
    return stage


# ===== 4단계: 지장간·암합 =====
def _stage4_jijanggan_amhap(s1: SajuResult, s2: SajuResult) -> StageResult:
    stage = StageResult(stage=4, title='지장간·암합 (무의식적 끌림)')
    details = []
    score = 50

    dz1 = s1.day_pillar.zhi
    dz2 = s2.day_pillar.zhi

    # 안내
    details.append("[지장간·암합을 궁합에서 보는 이유]")
    details.append("지장간(支藏干)은 지지(地支) 속에 숨어 있는 천간으로, 겉으로 드러나지 않는 '내면의 본능'을 뜻합니다.")
    details.append("두 사람의 지장간이 어떻게 연결되는지 보면, 말로 설명하기 어려운 본능적 끌림, 은밀한 감정, 무의식적인 성적 코드를 알 수 있습니다.")
    details.append("암합(暗合)은 겉으로는 보이지 않지만 속에서 은밀하게 합쳐지는 관계로, '숨은 연애 코드'라고 볼 수 있습니다.")
    details.append("")

    # 분석 결과
    details.append("[무의식적 끌림 상세]")

    jj1_for_s2 = get_jijanggan_sipsins(s2.day_master, dz1)
    jj2_for_s1 = get_jijanggan_sipsins(s1.day_master, dz2)

    jj1_str = ', '.join([f"{j['sipsin']}({j['stem']})" for j in jj1_for_s2])
    jj2_str = ', '.join([f"{j['sipsin']}({j['stem']})" for j in jj2_for_s1])
    details.append(f"{s1.name}의 일지 속 지장간이 {s2.name}에게 주는 느낌: {jj1_str}")
    details.append(f"{s2.name}의 일지 속 지장간이 {s1.name}에게 주는 느낌: {jj2_str}")

    intimate_keywords = {'편재', '정재', '식신', '상관', '편관', '정관'}
    jj1_sipsins = {j['sipsin'] for j in jj1_for_s2}
    jj2_sipsins = {j['sipsin'] for j in jj2_for_s1}

    mutual_intimate = jj1_sipsins & intimate_keywords and jj2_sipsins & intimate_keywords
    if mutual_intimate:
        score = 78
        details.append("")
        details.append("일지 지장간이 서로 재(財)·관(官)·식상(食傷)으로 연결되어 있습니다.")
        details.append("→ 겉으로는 담담해 보여도, 둘만의 공간에서는 적극적이고 솔직해지는 패턴입니다. 말보다 눈빛과 스킨십으로 통하는 부분이 많은 관계입니다.")
        stage.tags.append("은밀한 끌림")

    # 암합 체크
    amhap_results = check_amhap(dz1, dz2)
    if amhap_results:
        details.append("")
        for ah in amhap_results:
            s1_ko = ZH_TO_KO_GAN.get(ah['stem1'], ah['stem1'])
            s2_ko = ZH_TO_KO_GAN.get(ah['stem2'], ah['stem2'])
            elem_ko = WUXING_KO.get(ah['result_element'], ah['result_element'])
            details.append(f"암합 발견: {s1_ko}({ah['tier1']})–{s2_ko}({ah['tier2']}) → {elem_ko}")
            details.append(f"→ 겉으로는 특별할 것 없어 보여도, 속에서 은밀하게 끌리는 코드가 있습니다. 처음 만났을 때 '왠지 모르게 신경 쓰이는' 느낌이 여기서 나옵니다.")
        score = min(score + len(amhap_results) * 8, 90)
        stage.tags.append("암합")

        if len(amhap_results) >= 3:
            details.append("⚠ 다중 암합 — 끌림이 매우 강하지만, 집착이나 과도한 감정 몰입으로 이어질 수 있어 주의가 필요합니다.")
            stage.tags.append("집착 위험")
    else:
        details.append("")
        details.append("일지 간 암합은 없습니다.")
        details.append("→ 무의식적·본능적 끌림보다는, 서로를 의식적으로 선택하고 노력해서 관계를 만들어가는 타입입니다.")

    stage.details = details
    stage.score = score
    stage.summary = details[5] if len(details) > 5 else details[0]
    return stage


# ===== 5단계: 대운 시너지 분석 =====
def _stage5_daeun_synergy(s1: SajuResult, s2: SajuResult) -> StageResult:
    stage = StageResult(stage=5, title='대운 흐름 시너지 분석')
    details = []
    score = 50

    d1_list = s1.daeun_list
    d2_list = s2.daeun_list
    d1_cur = s1.current_daeun
    d2_cur = s2.current_daeun

    if not d1_cur or not d2_cur:
        details.append("대운 데이터 부족으로 시너지 분석 불가")
        stage.details = details
        stage.score = 50
        return stage

    # 안내
    details.append("[대운 흐름을 궁합에서 보는 이유]")
    details.append("대운(大運)은 10년 단위로 바뀌는 인생의 큰 흐름입니다.")
    details.append("두 사람의 대운이 같은 시기에 좋은 방향으로 겹치면, 함께 성장하고 좋은 일을 만들어갈 수 있는 '시너지 시기'가 됩니다.")
    details.append("반대로 동시에 어려운 대운이 겹치면, 서로 힘든 시기가 겹쳐 관계에 무리가 올 수 있습니다.")
    details.append("")

    # 현재 대운 분석
    details.append("[현재 대운 시너지]")

    d1_ko = f"{d1_cur.get('gan_ko','')}{d1_cur.get('zhi_ko','')}"
    d2_ko = f"{d2_cur.get('gan_ko','')}{d2_cur.get('zhi_ko','')}"
    d1_sipsin = f"{d1_cur.get('gan_sipsin','')}/{d1_cur.get('zhi_sipsin','')}"
    d2_sipsin = f"{d2_cur.get('gan_sipsin','')}/{d2_cur.get('zhi_sipsin','')}"
    d1_period = f"{d1_cur.get('age_start','')}~{d1_cur.get('age_end','')}세 ({d1_cur.get('year_start','')}~{d1_cur.get('year_end','')})"
    d2_period = f"{d2_cur.get('age_start','')}~{d2_cur.get('age_end','')}세 ({d2_cur.get('year_start','')}~{d2_cur.get('year_end','')})"

    details.append(f"{s1.name} 현재 대운: {d1_ko}({d1_sipsin}) [{d1_period}]")
    details.append(f"{s2.name} 현재 대운: {d2_ko}({d2_sipsin}) [{d2_period}]")

    # 현재 대운 간합 체크
    cur_ganhap = check_ganhap(d1_cur.get('gan', ''), d2_cur.get('gan', ''))
    if cur_ganhap:
        score += 15
        details.append(f"→ 두 사람의 현재 대운 천간이 합(合)을 이룹니다. 지금이 관계가 가장 깊어지고 서로에게 가장 좋은 영향을 주는 시기입니다.")
        stage.tags.append("대운 천간합")

    cur_yukhap = check_yukhap(d1_cur.get('zhi', ''), d2_cur.get('zhi', ''))
    cur_chong = check_chong(d1_cur.get('zhi', ''), d2_cur.get('zhi', ''))
    if cur_yukhap:
        score += 12
        details.append(f"→ 현재 대운 지지가 육합 관계입니다. 생활 리듬이 잘 맞아 동거나 결혼을 결정하기에 유리한 시기입니다.")
        stage.tags.append("대운 육합")
    elif cur_chong:
        score += 3
        details.append(f"→ 현재 대운 지지가 충(沖) 관계입니다. 자극과 변화가 많은 시기로, 관계에서 갈등이 생기면 적극적으로 대화해야 합니다.")
        stage.tags.append("대운 충")

    good_sipsins = {'식신', '정재', '편재', '정관', '정인'}
    d1_good = d1_cur.get('gan_sipsin', '') in good_sipsins or d1_cur.get('zhi_sipsin', '') in good_sipsins
    d2_good = d2_cur.get('gan_sipsin', '') in good_sipsins or d2_cur.get('zhi_sipsin', '') in good_sipsins
    if d1_good and d2_good:
        score += 12
        details.append("→ 두 사람 모두 현재 좋은 대운 흐름을 타고 있습니다. 함께 성장하고, 서로의 발전을 응원하면서 시너지를 만들어낼 수 있는 최적의 시기입니다.")
        stage.tags.append("쌍방 호운")
    elif d1_good or d2_good:
        score += 6
        who = s1.name if d1_good else s2.name
        other = s2.name if d1_good else s1.name
        details.append(f"→ {who}의 대운이 좋은 흐름에 있습니다. {other}에게 긍정적인 에너지를 나눠줄 수 있는 시기로, {who}가 관계를 이끌어가면 좋은 결과를 만들 수 있습니다.")
        stage.tags.append("편방 호운")

    details.append("")

    # 미래 대운 시너지 분석
    details.append("[향후 대운 시너지 전망]")

    future_synergies = []
    for d1 in d1_list:
        if d1.get('year_start', 0) < 2026:
            continue
        for d2 in d2_list:
            if d2.get('year_start', 0) < 2026:
                continue
            overlap_start = max(d1.get('year_start', 0), d2.get('year_start', 0))
            overlap_end = min(d1.get('year_end', 0), d2.get('year_end', 0))
            if overlap_start > overlap_end:
                continue

            synergy_score = 0
            notes = []
            gh = check_ganhap(d1.get('gan', ''), d2.get('gan', ''))
            if gh:
                synergy_score += 3
                notes.append("천간합")
            yh = check_yukhap(d1.get('zhi', ''), d2.get('zhi', ''))
            if yh:
                synergy_score += 2
                notes.append("지지육합")
            ch = check_chong(d1.get('zhi', ''), d2.get('zhi', ''))
            if ch:
                synergy_score -= 1
                notes.append("지지충")

            d1g = d1.get('gan_sipsin', '') in good_sipsins or d1.get('zhi_sipsin', '') in good_sipsins
            d2g = d2.get('gan_sipsin', '') in good_sipsins or d2.get('zhi_sipsin', '') in good_sipsins
            if d1g and d2g:
                synergy_score += 2
                notes.append("쌍방호운")
            elif d1g or d2g:
                synergy_score += 1

            if synergy_score > 0 and notes:
                future_synergies.append({
                    'period': f"{overlap_start}~{overlap_end}년",
                    'score': synergy_score,
                    'notes': notes,
                    'd1': f"{d1.get('gan_ko','')}{d1.get('zhi_ko','')}",
                    'd2': f"{d2.get('gan_ko','')}{d2.get('zhi_ko','')}",
                })

    future_synergies.sort(key=lambda x: x['score'], reverse=True)
    if future_synergies:
        best = future_synergies[0]
        details.append(f"최고 시너지 시기: {best['period']}")
        details.append(f"→ {s1.name} 대운 {best['d1']} × {s2.name} 대운 {best['d2']} — {', '.join(best['notes'])}으로 두 사람의 에너지가 가장 잘 합쳐지는 시기입니다. 이 시기에 큰 결정(결혼, 동거, 공동 프로젝트 등)을 하면 좋은 결과를 기대할 수 있습니다.")
        score += 8

        if len(future_synergies) >= 2:
            second = future_synergies[1]
            details.append(f"차선 시너지 시기: {second['period']}")
            details.append(f"→ {', '.join(second['notes'])} — 최고 시기 다음으로 관계에 좋은 에너지가 흐르는 시기입니다.")
            score += 4
    else:
        details.append("향후 대운에서 뚜렷한 합(合) 시너지는 발견되지 않습니다.")
        details.append("→ 하지만 이는 나쁜 것이 아닙니다. 개별적으로 좋은 대운이 올 때 상대에게 긍정적 에너지를 나눠줄 수 있으며, 의식적인 노력으로 충분히 좋은 관계를 유지할 수 있습니다.")

    # 위기 시기 경고
    risk_periods = []
    for d1 in d1_list:
        for d2 in d2_list:
            overlap_start = max(d1.get('year_start', 0), d2.get('year_start', 0))
            overlap_end = min(d1.get('year_end', 0), d2.get('year_end', 0))
            if overlap_start > overlap_end or overlap_start < 2026:
                continue
            bad_sipsins = {'상관', '겁재', '편관'}
            d1_bad = d1.get('gan_sipsin', '') in bad_sipsins and d1.get('zhi_sipsin', '') in bad_sipsins
            d2_bad = d2.get('gan_sipsin', '') in bad_sipsins and d2.get('zhi_sipsin', '') in bad_sipsins
            if d1_bad and d2_bad:
                risk_periods.append(f"{overlap_start}~{overlap_end}년")

    if risk_periods:
        details.append("")
        details.append(f"⚠ 권태·갈등 주의 시기: {', '.join(risk_periods[:2])}")
        details.append("→ 이 시기에는 두 사람 모두 예민해지기 쉬우므로, 서로에게 기대를 낮추고 각자의 시간을 존중하는 것이 관계를 지키는 방법입니다.")
        stage.tags.append("위기 시기 주의")

    stage.details = details
    stage.score = min(score, 95)
    stage.summary = f"현재 대운 시너지 기반 점수: {stage.score}점"
    return stage


# ===== 유틸리티 =====
def _get_wuxing_relation(wx1: str, wx2: str) -> str:
    if wx1 == wx2:
        return '비화(比和): 같은 오행으로 동질감'
    sang_saeng = {'木': '火', '火': '土', '土': '金', '金': '水', '水': '木'}
    if sang_saeng.get(wx1) == wx2:
        return f'상생(相生): {WUXING_KO[wx1]}이(가) {WUXING_KO[wx2]}을 생함'
    if sang_saeng.get(wx2) == wx1:
        return f'상생(相生): {WUXING_KO[wx2]}이(가) {WUXING_KO[wx1]}을 생함'
    sang_geuk = {'木': '土', '土': '水', '水': '火', '火': '金', '金': '木'}
    if sang_geuk.get(wx1) == wx2:
        return f'상극(相剋): {WUXING_KO[wx1]}이(가) {WUXING_KO[wx2]}을 극함 — 자극적 관계'
    if sang_geuk.get(wx2) == wx1:
        return f'상극(相剋): {WUXING_KO[wx2]}이(가) {WUXING_KO[wx1]}을 극함 — 자극적 관계'
    return '기타 관계'


def _interpret_element_as_attraction(day_master: str, element: str) -> str:
    dm_wx = GAN_WUXING.get(day_master, '')
    from saju_core import SIPSIN_MAP
    same = SIPSIN_MAP.get((dm_wx, element, True), '')
    diff = SIPSIN_MAP.get((dm_wx, element, False), '')
    parts = []
    if same:
        parts.append(same)
    if diff:
        parts.append(diff)
    return '/'.join(parts) if parts else '일반'


def generate_quick_summary(result: CompatibilityResult) -> dict:
    """핵심만 요약 — 짧고 쉽게 + 조언"""
    p1 = result.person1_name
    p2 = result.person2_name
    s = result.overall_score

    lines = []
    lines.append(f"💛 {p1} × {p2} 궁합 한눈에 보기")
    lines.append("")

    for stage in result.stages:
        emoji = '🟢' if stage.score >= 80 else '🟡' if stage.score >= 65 else '🔴'
        lines.append(f"{emoji} {stage.title}: {stage.score}점")
        if stage.tags:
            lines.append(f"   키워드: {', '.join(stage.tags[:3])}")

    lines.append("")
    lines.append(f"종합 점수: {s}점 (겉궁합 {result.outer_score} / 속궁합 {result.inner_score})")
    lines.append("")

    # 조언
    lines.append("💡 이 관계를 위한 조언")
    if result.inner_score > result.outer_score + 10:
        lines.append("· 본능적 끌림은 강하니, 대화와 일상 소통을 의식적으로 늘려보세요.")
    elif result.outer_score > result.inner_score + 10:
        lines.append("· 가치관은 잘 맞으니, 스킨십과 신체적 교감에 조금 더 신경 쓰면 좋겠어요.")
    else:
        lines.append("· 겉과 속 궁합이 균형 잡혀 있어요. 지금처럼 자연스럽게 함께하면 됩니다.")

    if s >= 80:
        lines.append("· 서로의 장점을 자주 말로 표현해주면 관계가 더 깊어집니다.")
    elif s >= 65:
        lines.append("· 서로 다른 부분을 '매력'으로 바라보는 연습을 해보세요.")
    else:
        lines.append("· 작은 것부터 맞춰가는 연습이 중요합니다. 조급해하지 마세요.")

    return {'lines': lines}


def generate_easy_explanation(result: CompatibilityResult) -> dict:
    """쉽게 다시 설명 — 사주 용어 없이 일상어로만"""
    p1 = result.person1_name
    p2 = result.person2_name
    sections = []

    for stage in result.stages:
        title = stage.title
        score = stage.score
        tags = stage.tags

        # 제목을 쉬운 말로 변환
        if '속궁합' in title:
            easy_title = '함께 살 때 몸과 생활이 맞는지'
        elif '지장간' in title or '암합' in title or '무의식' in title:
            easy_title = '말 안 해도 느끼는 끌림이 있는지'
        elif '한난' in title or '온도' in title:
            easy_title = '서로의 체질과 감정 온도가 맞는지'
        elif '일간' in title or '오행' in title:
            easy_title = '성격과 에너지가 서로 맞는지'
        elif '대운' in title:
            easy_title = '앞으로의 인생 흐름이 시너지를 내는지'
        else:
            easy_title = title

        # 점수별 쉬운 한줄 평가
        if score >= 85:
            grade = '아주 잘 맞아요'
        elif score >= 75:
            grade = '잘 맞는 편이에요'
        elif score >= 65:
            grade = '보통이에요'
        else:
            grade = '노력이 필요해요'

        # 태그 조합을 분석하여 중복 없이 하나의 설명 생성
        tag_set = set(tags)
        easy_details = []
        used = set()

        def _add(key: str, text: str):
            if key not in used:
                easy_details.append(text)
                used.add(key)

        for tag in tags:
            if ('케미' in tag or '충' in tag) and '케미충' not in used:
                _add('케미충', '서로 정반대 성격이라 오히려 강하게 끌립니다. 처음 만나면 "이 사람 뭔가 다르다"는 느낌이 강하고, 그 자극이 관계를 지루하지 않게 만들어요.')
            elif '육합' in tag:
                _add('육합', '함께 있으면 몸도 마음도 편안해지는 천생 짝이에요. 잠자리 궁합이 자연스럽게 좋은 구조입니다.')
            elif ('암합' in tag or '은밀' in tag) and '암합은밀' not in used:
                _add('암합은밀', '겉으로는 티 안 나지만, 속으로는 서로 강하게 의식하는 관계에요. 둘만 있으면 평소와 다른 모습이 나옵니다.')
            elif ('습도' in tag or '온도' in tag or '화수' in tag) and '체질' not in used:
                _add('체질', '한쪽이 뜨거울 때 다른 쪽이 식혀주는, 체질적 균형이 좋은 관계에요.')
            elif ('보완' in tag or '완비' in tag) and '보완' not in used:
                _add('보완', '서로에게 없는 것을 채워주는, 퍼즐 조각 같은 관계에요.')
            elif '호운' in tag:
                _add('호운', '지금 시기에 함께 있으면 서로에게 좋은 영향을 주는 타이밍이에요.')
            elif '상극' in tag:
                _add('상극', '성격이 달라서 부딪힐 수 있지만, 그 다름이 서로에게 새로운 시각을 열어줘요.')

        if not easy_details:
            easy_details.append('특별히 강한 특징은 없지만, 서로 맞춰가면 충분히 좋은 관계를 만들 수 있어요.')

        sections.append({
            'title': easy_title,
            'score': score,
            'grade': grade,
            'details': easy_details,
        })

    return {'sections': sections}


def _generate_overall_summary(result: CompatibilityResult) -> str:
    score = result.overall_score
    if score >= 85:
        return f"종합 {score}점 — 천생연분에 가까운 궁합입니다. 정서적 교감과 체질적 조화가 모두 뛰어납니다."
    elif score >= 70:
        return f"종합 {score}점 — 좋은 궁합입니다. 서로를 보완하는 힘이 있으며, 약간의 조율로 더 좋아질 수 있습니다."
    elif score >= 55:
        return f"종합 {score}점 — 보통의 궁합입니다. 노력과 이해를 통해 충분히 좋은 관계를 만들 수 있습니다."
    else:
        return f"종합 {score}점 — 도전적인 궁합입니다. 서로의 차이를 인정하고 소통하는 것이 핵심입니다."
