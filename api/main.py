"""sajuro.ai API 서버"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional
import asyncio
import dataclasses
import os
import json
import re

from saju_core import (
    calculate_saju, SajuResult, ZH_TO_KO_GAN, ZH_TO_KO_ZHI,
    GAN_WUXING, ZHI_WUXING, WUXING_KO, GAN_YINYANG,
    get_jijanggan_sipsins, JIJANGGAN,
)
from compatibility_engine import analyze_compatibility, generate_quick_summary, generate_easy_explanation
from llm_client import generate_analysis, build_compatibility_system_prompt, build_compatibility_user_prompt

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

ZHI_ANIMAL = {
    '子': '쥐', '丑': '소', '寅': '호랑이', '卯': '토끼', '辰': '용', '巳': '뱀',
    '午': '말', '未': '양', '申': '원숭이', '酉': '닭', '戌': '개', '亥': '돼지',
}
ZHI_ANIMAL_EMOJI = {
    '子': '🐭', '丑': '🐂', '寅': '🐅', '卯': '🐇', '辰': '🐉', '巳': '🐍',
    '午': '🐴', '未': '🐑', '申': '🐒', '酉': '🐓', '戌': '🐕', '亥': '🐖',
}
GAN_COLOR = {
    '甲': '푸른', '乙': '푸른', '丙': '붉은', '丁': '붉은', '戊': '누런',
    '己': '누런', '庚': '흰', '辛': '흰', '壬': '검은', '癸': '검은',
}
WUXING_EMOJI = {'木': '🌳', '火': '🔥', '土': '⛰️', '金': '⚔️', '水': '💧'}
SIPSIN_DESC = {
    '비견': '독립심과 자존심이 강한 리더형',
    '겁재': '경쟁심과 추진력이 강한 도전형',
    '식신': '재능과 표현력이 뛰어난 예술형',
    '상관': '창의적이고 자유분방한 혁신형',
    '편재': '사교적이고 기회를 잘 잡는 사업형',
    '정재': '성실하고 안정을 추구하는 관리형',
    '편관': '카리스마와 결단력의 권위형',
    '정관': '원칙과 책임감이 강한 공직형',
    '편인': '직관과 통찰이 뛰어난 학자형',
    '정인': '배려심 깊고 학구적인 교육형',
}

SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_REF = "lszgmmdvpldazzstlewf"

MIGRATION_SQL = """
CREATE TABLE IF NOT EXISTS dream_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text,
    device_id text NOT NULL DEFAULT '',
    dream_date date,
    dream_text text,
    experience_text text,
    overall_sentiment text,
    overall_summary text,
    main_interpretation text,
    domains jsonb,
    todays_advice text,
    lucky_color text,
    lucky_numbers jsonb,
    literature_refs jsonb,
    detected_symbols jsonb,
    saju_context jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS name_readings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text,
    device_id text NOT NULL DEFAULT '',
    full_name text,
    full_hanja text,
    total_strokes integer,
    score integer,
    name_reading text,
    created_at timestamptz DEFAULT now()
);
"""

async def run_migrations():
    if not SUPABASE_SERVICE_KEY:
        print("[Migration] SUPABASE_SERVICE_KEY not set, skipping")
        return
    try:
        import asyncpg
        # 직접 연결 우선, pooler 방식 폴백
        candidates = [
            f"postgresql://postgres:{SUPABASE_SERVICE_KEY}@db.{SUPABASE_REF}.supabase.co:5432/postgres",
            f"postgresql://postgres.{SUPABASE_REF}:{SUPABASE_SERVICE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
            f"postgresql://postgres.{SUPABASE_REF}:{SUPABASE_SERVICE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
        ]
        conn = None
        for conn_str in candidates:
            label = conn_str.split("@")[1].split(":")[0]
            try:
                conn = await asyncio.wait_for(asyncpg.connect(conn_str), timeout=10)
                print(f"[Migration] Connected via {label}")
                break
            except Exception as e:
                print(f"[Migration] {label} failed: {e}")

        if conn:
            for stmt in [s.strip() for s in MIGRATION_SQL.split(';') if s.strip()]:
                try:
                    await conn.execute(stmt)
                except Exception as e:
                    print(f"[Migration] stmt failed (may already exist): {e}")
            await conn.close()
            print("[Migration] Tables ensured OK")
        else:
            print("[Migration] All connections failed, skipping")
    except Exception as e:
        print(f"[Migration] Error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_migrations()
    yield


app = FastAPI(title="sajuro.ai API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174", "http://localhost:3000",
        "https://www.sajuro.ai", "https://sajuro.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SajuRequest(BaseModel):
    name: str
    gender: str  # 'male' | 'female'
    year: int
    month: int
    day: int
    hour: int
    minute: int = 0
    is_lunar: bool = False


class CompatibilityRequest(BaseModel):
    person1: SajuRequest
    person2: SajuRequest
    use_llm: bool = True


def _saju_to_dict(saju: SajuResult) -> dict:
    dm = saju.day_master
    dm_wx = GAN_WUXING.get(dm, '')
    dz = saju.day_pillar.zhi
    day_color = GAN_COLOR.get(dm, '')
    day_animal = ZHI_ANIMAL.get(dz, '')
    day_animal_emoji = ZHI_ANIMAL_EMOJI.get(dz, '')

    # 타고난 성향: 월주 지지의 정기(正氣)가 일간에 대한 십성
    month_zhi_sipsin = saju.month_pillar.zhi_sipsin or ''
    innate_sipsin = month_zhi_sipsin if month_zhi_sipsin and month_zhi_sipsin != '일원' else saju.hour_pillar.zhi_sipsin or ''
    innate_desc = SIPSIN_DESC.get(innate_sipsin, '')

    # 지장간 상세
    pillars_detail = []
    for p in [saju.year_pillar, saju.month_pillar, saju.day_pillar, saju.hour_pillar]:
        jj = get_jijanggan_sipsins(dm, p.zhi)
        pillars_detail.append({
            'name': p.name,
            'gan': p.gan, 'zhi': p.zhi,
            'gan_ko': p.gan_ko, 'zhi_ko': p.zhi_ko,
            'gan_wuxing': p.gan_wuxing, 'zhi_wuxing': p.zhi_wuxing,
            'gan_yinyang': p.gan_yinyang, 'zhi_yinyang': p.zhi_yinyang,
            'sipsin': p.sipsin, 'zhi_sipsin': p.zhi_sipsin,
            'jijanggan': [{'stem': j['stem'], 'stem_ko': ZH_TO_KO_GAN.get(j['stem'], ''), 'tier': j['tier'], 'sipsin': j['sipsin']} for j in jj],
        })

    return {
        'name': saju.name,
        'gender': saju.gender,
        'birth_date': saju.birth_date,
        'birth_time': saju.birth_time,
        'day_master': dm,
        'day_master_ko': ZH_TO_KO_GAN.get(dm, ''),
        'day_master_wuxing': dm_wx,
        'day_master_wuxing_ko': WUXING_KO.get(dm_wx, ''),
        'day_master_wuxing_emoji': WUXING_EMOJI.get(dm_wx, ''),
        'day_animal': f"{day_color} {day_animal}",
        'day_animal_emoji': day_animal_emoji,
        'innate_sipsin': innate_sipsin,
        'innate_desc': innate_desc,
        'hannan': saju.hannan,
        'josup': saju.josup,
        'wuxing_count': {WUXING_KO.get(k, k): v for k, v in saju.wuxing_count.items()},
        'pillars_detail': pillars_detail,
        'daeun_start_age': saju.daeun_start_age,
        'daeun_list': saju.daeun_list,
        'current_daeun': saju.current_daeun,
    }


@app.get("/")
async def root():
    return {"status": "ok", "service": "sajuro.ai API", "version": "1.1.0", "has_lifetime": True}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "sajuro.ai API", "version": "1.1.0"}


@app.post("/api/saju/calculate")
async def calc_saju(req: SajuRequest):
    try:
        saju = calculate_saju(req.name, req.gender, req.year, req.month, req.day, req.hour, req.minute, req.is_lunar)
        return {"success": True, "data": _saju_to_dict(saju)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/compatibility/analyze")
async def analyze_compat(req: CompatibilityRequest):
    try:
        saju1 = calculate_saju(req.person1.name, req.person1.gender, req.person1.year, req.person1.month, req.person1.day, req.person1.hour, req.person1.minute, req.person1.is_lunar)
        saju2 = calculate_saju(req.person2.name, req.person2.gender, req.person2.year, req.person2.month, req.person2.day, req.person2.hour, req.person2.minute, req.person2.is_lunar)

        comp = analyze_compatibility(saju1, saju2)

        result = {
            'person1': _saju_to_dict(saju1),
            'person2': _saju_to_dict(saju2),
            'overall_score': comp.overall_score,
            'outer_score': comp.outer_score,
            'inner_score': comp.inner_score,
            'overall_summary': comp.overall_summary,
            'stages': [dataclasses.asdict(s) for s in comp.stages],
            'quick_summary': generate_quick_summary(comp),
            'easy_explanation': generate_easy_explanation(comp),
        }

        # LLM 상세 풀이
        if req.use_llm:
            system_prompt = build_compatibility_system_prompt()
            user_prompt = build_compatibility_user_prompt(result)
            llm_analysis = await generate_analysis(system_prompt, user_prompt)
            result['llm_analysis'] = llm_analysis

        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 연인궁합 결과 저장 ───
class CompatibilitySaveRequest(BaseModel):
    device_id: str
    user_id: Optional[str] = None
    result: dict


@app.post("/api/compatibility/save")
async def compatibility_save(req: CompatibilitySaveRequest):
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"id": None, "saved": False}
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        row = {
            "device_id": req.device_id,
            "user_id": req.user_id or None,
            "result": json.dumps(req.result, ensure_ascii=False),
        }
        res = sb.table("compatibility_results").insert(row).execute()
        analysis_id = res.data[0]["id"] if res.data else None
        return {"id": analysis_id, "saved": True}
    except Exception as e:
        print(f"[compatibility/save] 오류: {e}")
        return {"id": None, "saved": False, "message": str(e)}


# ─── 연인궁합 Q&A ───
class CompatibilityQARequest(BaseModel):
    analysis_id: Optional[str] = None
    device_id: str
    stage_number: int
    stage_title: str
    stage_context: str        # 해당 단계의 분석 내용
    overall_context: str      # 두 사람의 전체 궁합 컨텍스트
    question: str
    round_number: int = 1
    conversation_history: list = []


@app.post("/api/compatibility/qa")
async def compatibility_qa(req: CompatibilityQARequest):
    try:
        history_text = ''
        if req.conversation_history:
            lines = []
            for m in req.conversation_history:
                if m.get('answer'):
                    lines.append(f"Q: {m['question']}\nA: {m['answer']}")
            if lines:
                history_text = '\n\n[이전 대화]\n' + '\n\n'.join(lines)

        system = """당신은 적천수, 자평진전 등 고전문헌에 정통한 연인궁합 전문가입니다.
두 사람의 사주 구조를 기반으로 구체적이고 실질적인 답변을 드립니다.
전문 용어 사용 시 반드시 괄호 안에 쉬운 설명을 병기하세요."""

        user_prompt = f"""[전체 궁합 컨텍스트]
{req.overall_context}

[현재 분석 단계: {req.stage_title}]
{req.stage_context}
{history_text}

[사용자 질문]
{req.question}

위 두 사람의 궁합 분석 내용을 바탕으로, 사용자의 질문에 구체적이고 친절하게 답변해주세요.
실제 사주 구조에서 나오는 근거를 들어 설명해 주시고, 실생활에서 도움이 되는 조언도 함께 드려주세요."""

        answer = await generate_dream_json(system, user_prompt)
        # JSON이 아닌 자유 텍스트 처리
        if answer.strip().startswith('{'):
            try:
                parsed = _parse_llm_json(answer)
                answer = parsed.get('answer', answer)
            except Exception:
                pass

        # DB 저장
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                sb.table("compatibility_qa").insert({
                    "analysis_id": req.analysis_id or None,
                    "device_id": req.device_id,
                    "stage_number": req.stage_number,
                    "stage_title": req.stage_title,
                    "question": req.question,
                    "answer": answer,
                    "round_number": req.round_number,
                }).execute()
            except Exception as e:
                print(f"[compatibility/qa] DB 오류: {e}")

        return {"answer": answer, "stage_number": req.stage_number}

    except Exception as e:
        print(f"[compatibility/qa] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Q&A 오류: {str(e)}")


# ──────────────────────────────────────────────
# 평생운세 엔드포인트
# ──────────────────────────────────────────────

LIFETIME_SECTIONS = [
    ("innate",   "타고난 원국 & 기질",       "🏛️"),
    ("daeun",    "10년 단위 대운 분석",       "📅"),
    ("turning",  "인생 전환점 예측",          "🔄"),
    ("strength", "시기별 강점·약점",          "⚡"),
    ("lucky",    "핵심 행운기",              "✨"),
    ("career",   "직업·커리어 평생운",        "💼"),
    ("wealth",   "재물·경제 평생운",          "💰"),
    ("love",     "애정·가족 평생운",          "❤️"),
]


class LifetimeRequest(BaseModel):
    name: str
    gender: str
    year: int
    month: int
    day: int
    hour: int
    minute: int = 0
    is_lunar: bool = False
    device_id: str = ''
    user_id: Optional[str] = None


class LifetimeQARequest(BaseModel):
    reading_id: Optional[str] = None
    device_id: str
    section_id: str
    section_title: str
    section_context: str
    saju_context: str
    question: str
    round_number: int = 1
    conversation_history: list = []


def _repair_json(raw: str) -> dict:
    """LLM JSON 파싱 — 다단계 복구 전략"""
    import re as _re

    # 1차: 표준 파싱
    try:
        return _parse_llm_json(raw)
    except Exception:
        pass

    # 2차: 문자열 내 줄바꿈 제거 후 재시도
    try:
        # JSON 문자열 내 리터럴 줄바꿈을 \n으로 교체
        fixed = _re.sub(r'(?<=: ")(.*?)(?="(?:\s*[,}\]]))',
                        lambda m: m.group(0).replace('\n', ' ').replace('\r', ''),
                        raw, flags=_re.DOTALL)
        return _parse_llm_json(fixed)
    except Exception:
        pass

    # 3차: 중괄호/대괄호로 범위 좁히기
    try:
        start = raw.find('{')
        if start == -1:
            raise ValueError("no JSON")
        depth = 0
        for i, ch in enumerate(raw[start:], start):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    candidate = raw[start:i+1]
                    # 각 문자열 값의 줄바꿈 제거
                    candidate = _re.sub(r'"([^"]*)"', lambda m: '"' + m.group(1).replace('\n', ' ') + '"', candidate)
                    return json.loads(candidate)
    except Exception:
        pass

    raise ValueError(f"JSON 파싱 실패: {raw[:200]}")


def _make_section_prompt(saju_ctx: str, gender: str, age: int, daeun: str,
                          sections: list) -> str:
    """섹션별 JSON 프롬프트 생성 — 섹션 2개씩 분리하여 JSON 크기 제한"""
    items = []
    for sid, stitle, icon, focus in sections:
        items.append(f'''  {{
    "id": "{sid}",
    "title": "{stitle}",
    "icon": "{icon}",
    "score": 0~100의 정수,
    "summary": "20자 이내 핵심 한 문장",
    "analysis": "{focus}에 대해 300자 이상 구체적으로 분석. 전문용어 괄호 병기. 고전문헌 근거 명시. 구체적 나이·연도 포함.",
    "tags": ["핵심키워드1", "핵심키워드2", "핵심키워드3"]
  }}''')
    sections_json = ',\n'.join(items)

    return f"""{saju_ctx}

【성별】{gender} 【현재 나이】약 {age}세

【대운 흐름】
{daeun}

위 사주를 바탕으로 아래 JSON 형식에 맞춰 분석하세요.
analysis 필드에는 줄바꿈 없이 한 줄로 작성하고, 큰따옴표를 사용하지 마세요.

반드시 아래 JSON만 출력:
[
{sections_json}
]"""


@app.post("/api/saju/lifetime")
async def lifetime_fortune(req: LifetimeRequest):
    """평생운세 종합 분석 — 8개 섹션 4+4 병렬 + DB 저장"""
    try:
        import datetime as _dt
        saju = calculate_saju(req.name, req.gender, req.year, req.month, req.day,
                               req.hour, req.minute, req.is_lunar)
        saju_dict = _saju_to_dict(saju)
        saju_context = _build_saju_context(req.dict(), saju_dict)

        daeun_list = saju_dict.get('daeun_list', [])
        current_year = _dt.date.today().year
        current_age = current_year - req.year + 1

        daeun_text = '\n'.join([
            f"{'→현재 ' if d.get('is_current') else ''}{d.get('gan_ko','')}{d.get('zhi_ko','')}대운 "
            f"({d.get('age_start',0)}~{d.get('age_end',0)}세, {d.get('year_start',0)}~{d.get('year_end',0)}년)"
            for d in daeun_list[:8]
        ])

        gender_label = '여성' if req.gender == 'female' else '남성'

        system = """당신은 적천수(滴天髓), 자평진전(子平眞詮), 궁통보감(窮通寶鑑) 등 고전문헌에 정통한 명리학 전문가입니다.
★ 원칙: 이 사람의 사주에서만 나오는 구체적 분석. 전문용어 괄호 병기. 나이·연도 명시.
★ JSON 작성 규칙: analysis 필드는 반드시 한 줄(줄바꿈 없이). 큰따옴표 사용 금지(작은따옴표 사용).
반드시 JSON만 출력하세요."""

        # 섹션 4+4 분리
        group_a = [
            ("innate",   "타고난 원국 & 기질",    "", "일간(日干) 강약·격국(格局)·용신(用神)·기신(忌神) 및 타고난 성품과 평생 패턴"),
            ("daeun",    "10년 단위 대운 분석",   "", "각 대운별 에너지와 실제 삶 패턴. 현재·다음 대운 집중. 구체적 나이·연도 명시"),
            ("turning",  "인생 전환점 예측",       "", "대운 전환기 3~4개를 구체적 나이/연도와 함께. 각 전환점의 성격과 대비법"),
            ("strength", "시기별 강점·약점",       "", "현재 대운의 강점·약점. 대운 변화 시 달라지는 점. 선천적 강약점"),
        ]
        group_b = [
            ("lucky",  "핵심 행운기",          "", "인생 최고 전성기 나이·연도. 활용 전략. 2순위 행운기. 준비 시기"),
            ("career", "직업·커리어 평생운",   "", "타고난 직업 특성. 성공 방향. 커리어 전성기. 관성/식상 분석"),
            ("wealth", "재물·경제 평생운",     "", "재성(財星) 구조. 재물 쌓이는/빠지는 시기. 투자 적합 여부. 전성기"),
            ("love",   "애정·가족 평생운",     "", "인연 시기와 배우자 특성. 부부관계 패턴. 자녀운. 가족관계"),
        ]

        # 전체 요약 프롬프트 (별도 짧은 호출)
        summary_prompt = f"""{saju_context}

【성별】{gender_label} 【현재 나이】약 {current_age}세 【대운】{daeun_text[:200]}

다음 JSON만 출력:
{{"overall_score": 0~100의 정수, "overall_summary": "이 사주의 평생 흐름 핵심 2문장. 줄바꿈 없이."}}"""

        prompt_a = _make_section_prompt(saju_context, gender_label, current_age, daeun_text, group_a)
        prompt_b = _make_section_prompt(saju_context, gender_label, current_age, daeun_text, group_b)

        # 3개 병렬 호출
        raw_summary, raw_a, raw_b = await asyncio.gather(
            generate_dream_json(system, summary_prompt),
            generate_dream_json(system, prompt_a),
            generate_dream_json(system, prompt_b),
        )

        # 파싱 (강건한 복구 사용)
        try:
            summary_data = _repair_json(raw_summary)
        except Exception:
            summary_data = {"overall_score": 70, "overall_summary": "사주 분석이 완료되었습니다."}

        def parse_sections(raw: str, group: list) -> list:
            """섹션 배열 파싱 — 오류 시 group 기본값으로 폴백"""
            try:
                text = raw.strip()
                # 배열 추출
                start = text.find('[')
                end = text.rfind(']') + 1
                if start >= 0 and end > start:
                    text = text[start:end]
                import re as _re
                # 문자열 값 내 줄바꿈 제거
                text = _re.sub(r'"([^"]*)"',
                               lambda m: '"' + m.group(1).replace('\n', ' ').replace('\r', '') + '"',
                               text)
                return json.loads(text)
            except Exception as e:
                print(f"[lifetime] 섹션 파싱 오류: {e}")
                # 폴백: 기본 구조 반환
                return [
                    {"id": sid, "title": title, "icon": icon, "score": 70,
                     "summary": "분석 중 오류가 발생했습니다.", "analysis": "", "tags": []}
                    for sid, title, icon, _ in group
                ]

        sections_a = parse_sections(raw_a, group_a)
        sections_b = parse_sections(raw_b, group_b)
        all_sections = sections_a + sections_b

        overall_score = summary_data.get("overall_score", 70)
        overall_summary = summary_data.get("overall_summary", "")

        # DB 저장
        reading_id = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                row = {
                    "profile_name": req.name,
                    "saju_context": saju_context,
                    "overall_score": overall_score,
                    "overall_summary": overall_summary,
                    "sections": json.dumps(all_sections, ensure_ascii=False),
                }
                if req.device_id:
                    row["device_id"] = req.device_id
                if req.user_id:
                    row["user_id"] = req.user_id
                res = sb.table("lifetime_readings").insert(row).execute()
                if res.data:
                    reading_id = res.data[0]["id"]
            except Exception as e:
                print(f"[lifetime] DB 저장 오류: {e}")

        return {
            "reading_id": reading_id,
            "profile_name": req.name,
            "saju_context": saju_context,
            "overall_score": overall_score,
            "overall_summary": overall_summary,
            "sections": all_sections,
        }

    except Exception as e:
        print(f"[lifetime] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"평생운세 분석 오류: {str(e)}")


@app.post("/api/saju/lifetime/qa")
async def lifetime_qa(req: LifetimeQARequest):
    """평생운세 섹션별 Q&A"""
    try:
        history_text = ''
        if req.conversation_history:
            lines = [f"Q: {m['question']}\nA: {m['answer']}"
                     for m in req.conversation_history if m.get('answer')]
            if lines:
                history_text = '\n\n[이전 대화]\n' + '\n\n'.join(lines)

        system = """당신은 적천수, 자평진전 등 고전문헌에 정통한 명리학 최고 전문가입니다.
사용자의 사주 구조를 기반으로 구체적이고 깊이 있는 답변을 드립니다.
전문 용어 사용 시 반드시 괄호 안에 쉬운 설명을 병기하세요.
이 사람만의 사주 구조에서 나오는 구체적 분석을 해주세요."""

        user_prompt = f"""[사주 정보]
{req.saju_context}

[현재 섹션: {req.section_title}]
{req.section_context}
{history_text}

[사용자 질문]
{req.question}

위 사주 분석을 바탕으로 질문에 구체적이고 깊이 있게 답변해주세요.
고전문헌 근거와 실생활 조언을 함께 포함해 주세요."""

        answer = await generate_dream_json(system, user_prompt)
        if answer.strip().startswith('{'):
            try:
                answer = _parse_llm_json(answer).get('answer', answer)
            except Exception:
                pass

        # DB 저장
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                sb.table("lifetime_qa").insert({
                    "reading_id": req.reading_id or None,
                    "device_id": req.device_id,
                    "section_id": req.section_id,
                    "section_title": req.section_title,
                    "question": req.question,
                    "answer": answer,
                    "round_number": req.round_number,
                }).execute()
            except Exception as e:
                print(f"[lifetime/qa] DB 오류: {e}")

        return {"answer": answer, "section_id": req.section_id}

    except Exception as e:
        print(f"[lifetime/qa] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Q&A 오류: {str(e)}")


# ──────────────────────────────────────────────
# 범용 운세 분석 엔드포인트 (8개 서비스 공통)
# ──────────────────────────────────────────────

# ─── 서비스별 섹션 정의 ───
FORTUNE_CONFIGS: dict = {
    "flow": {
        "title": "운세 흐름",
        "summary_focus": "현재 대운·세운·월운의 에너지 흐름과 핵심 변화 포인트",
        "groups": [
            [
                ("current_daeun", "현재 대운 핵심 분석", "현재 대운의 천간지지가 원국과 어떻게 작용하는지. 이 10년 동안 두드러질 삶의 패턴. 구체적 나이·연도 포함"),
                ("seun", "올해 세운(歲運) 흐름", "올해 세운의 오행이 원국에 미치는 영향. 올해 강한 분야와 약한 분야. 월별 핵심 흐름"),
            ],
            [
                ("quarterly", "분기별 월운 포인트", "1~3월·4~6월·7~9월·10~12월 각 분기별 에너지 특성. 주의할 달과 좋은 달"),
                ("turning", "주요 변화 시점 예측", "올해 또는 가까운 미래의 핵심 변화 시점. 대운 전환 시기. 구체적 준비 방법"),
            ],
        ],
    },
    "tojeong": {
        "title": "토정비결",
        "summary_focus": "전통 토정비결 방식으로 올 한 해의 상·중·하 흐름과 월별 길흉",
        "groups": [
            [
                ("upper", "상괘(上卦) — 상반기 총운", "1~6월 전체 흐름. 상반기 운세의 핵심 특성. 재물·건강·인간관계 각각. 주의할 달과 길한 달"),
                ("middle", "중괘(中卦) — 하반기 총운", "7~12월 전체 흐름. 하반기 운세 특성. 상반기 대비 변화점. 마무리 시기 조언"),
            ],
            [
                ("monthly", "월별 길흉 포인트", "1월~12월 각 달의 핵심 키워드와 주의 사항. 가장 길한 달 3개와 흉한 달 3개 명시"),
                ("yearly", "연말 총정리 & 내년 준비", "올해 전체를 관통하는 핵심 주제. 연말에 특히 신경 쓸 부분. 내년을 위한 준비 조언"),
            ],
        ],
    },
    "wealth": {
        "title": "금전운",
        "summary_focus": "재물 원국 구조와 올해 금전 흐름·손재 시기·투자 적기",
        "groups": [
            [
                ("structure", "재물 원국 구조 분석", "재성(財星)과 식상(食傷)의 원국 배치. 재물을 다루는 타고난 방식. 재물이 모이는 구조인지 흩어지는 구조인지"),
                ("flow", "올해 재물 흐름", "올해 세운이 재성에 미치는 영향. 수입 증가 시기와 지출 과다 시기. 구체적 달/분기 명시"),
            ],
            [
                ("chance", "투자·사업 적기 분석", "올해 투자나 새로운 사업에 적합한 시기. 반드시 피해야 할 시기. 적합한 투자 유형"),
                ("caution", "손재수(損財數) & 주의사항", "재물 손실이 우려되는 시기와 유형. 보증·투자·지출 관련 구체적 주의사항. 대비 방법"),
            ],
        ],
    },
    "love": {
        "title": "애정운",
        "summary_focus": "애정 성향과 올해 인연 흐름·연애 타이밍·감정 조절",
        "groups": [
            [
                ("nature", "타고난 애정 성향", "관성(官星)/재성(財星)으로 본 배우자 특성과 애정 방식. 연애에서 반복되는 패턴. 이상형 특성"),
                ("timing", "올해 인연 & 연애 타이밍", "올해 인연이 올 가능성과 시기. 감정이 깊어지는 시기. 이별이나 갈등 주의 시기"),
            ],
            [
                ("emotion", "감정 흐름 & 현재 관계", "올해 감정선의 기복. 현재 연애 중이라면 관계 발전/유지 조언. 솔로라면 만남의 기회 분석"),
                ("advice", "연애 성공 전략 & 주의사항", "이 사주에서 연애가 잘 풀리는 조건. 반드시 피해야 할 관계 패턴. 감정 관리 핵심 조언"),
            ],
        ],
    },
    "career": {
        "title": "직업운",
        "summary_focus": "타고난 직업 적성과 커리어 방향·전성기·주의 시기",
        "groups": [
            [
                ("aptitude", "타고난 직업 적성 & 재능", "관성(官星)/식상(食傷)/인성(印星) 구조로 본 직업 적성. 타고난 재능 분야. 가장 성공 가능성 높은 직종"),
                ("direction", "추천 커리어 방향", "이 사주에서 성공하는 직업 방향과 피해야 할 방향. 직업 선택 기준. 2순위 추천 직종"),
            ],
            [
                ("peak", "커리어 전성기 & 승진 시기", "올해 커리어에서 가장 유리한 시기. 승진·이직·창업 적기. 구체적 달/분기 명시"),
                ("caution", "조심할 직업 위험과 대비", "직업적 갈등이나 손실이 우려되는 시기. 이직·퇴직 주의 시기. 커리어 보호 전략"),
            ],
        ],
    },
    "business": {
        "title": "사업운",
        "summary_focus": "사업 적합도와 올해 사업 흐름·투자 적기·리스크 관리",
        "groups": [
            [
                ("fitness", "사업 적합도 & 기질 분석", "이 사주가 사업에 얼마나 적합한지. 재성(財星)과 관성(官星)의 균형. 사업가 기질과 취약점"),
                ("flow", "올해 사업 흐름 & 전략", "올해 사업 운의 전체 흐름. 공격적으로 확장할 시기와 수성(守城)할 시기. 핵심 전략"),
            ],
            [
                ("investment", "투자 & 파트너십 적기", "올해 투자에 가장 좋은 시기. 사업 파트너 선택 기준. 합작·계약 시 주의사항"),
                ("risk", "리스크 요인 & 손실 방지", "사업에서 가장 큰 리스크 요인. 손실이 우려되는 시기와 유형. 구체적 대비 전략"),
            ],
        ],
    },
    "health": {
        "title": "건강운",
        "summary_focus": "오행 체질 분석과 취약 부위·건강 주의 시기·체질 개선법",
        "groups": [
            [
                ("constitution", "오행 체질 & 타고난 건강", "오행(木火土金水) 편중으로 본 체질. 취약한 장기(臟器)와 기관. 타고난 건강의 강점과 약점"),
                ("weak_points", "취약 부위 & 주의 질환", "이 사주에서 주의해야 할 구체적 부위와 질환 유형. 기신(忌神) 오행이 대표하는 신체 부위"),
            ],
            [
                ("timing", "건강 주의 시기 & 관리", "올해 건강이 특히 취약해지는 달/시기. 병원 검진 권장 시기. 건강 관리 우선순위"),
                ("improvement", "체질 개선 & 건강 전략", "이 체질에 좋은 음식·운동·생활습관. 피해야 할 것들. 장기적 건강 유지 전략"),
            ],
        ],
    },
    "friend": {
        "title": "친구운",
        "summary_focus": "인간관계 기본 성향과 귀인(貴人)·갈등 요인·사회적 네트워크",
        "groups": [
            [
                ("nature", "인간관계 기본 성향", "비겁(比劫)/인성(印星) 구조로 본 인간관계 패턴. 사람을 대하는 방식. 반복되는 인간관계 패턴"),
                ("benefactor", "귀인(貴人) & 좋은 인연", "올해 귀인이 오는 시기. 도움이 되는 사람의 특성. 좋은 인연을 만나는 방법"),
            ],
            [
                ("conflict", "갈등 요인 & 해소법", "인간관계에서 반복되는 갈등 유형. 올해 갈등 주의 시기. 관계 회복 전략"),
                ("network", "사회적 네트워크 전략", "이 사주에 맞는 인맥 확장 방법. 주의해야 할 사람 유형. 올해 사회적 기회 시기"),
            ],
        ],
    },
    "newyear": {
        "title": "신년운세",
        "summary_focus": "2026년 병오년(丙午年)이 이 사주와 만났을 때의 핵심 에너지와 올 한 해 방향",
        "groups": [
            [
                ("annual_theme", "2026년 테마 & 이 사주와의 관계", "2026년 병오년(丙午年, 화(火)의 해)이 이 사주 원국과 어떻게 작용하는지. 세운 천간지지가 용신·기신에 미치는 영향. 올 한 해를 관통하는 핵심 에너지와 키워드 3개"),
                ("monthly_guide", "월별 길흉 달력 (1~12월)", "2026년 1월부터 12월까지 각 달의 운세 요약. 형식: '1월(계묘): 좋음 - 핵심 메시지 한 줄 / 2월(갑진): 보통 - ... / ...' 식으로 12달 전부 작성. 가장 좋은 달 3개와 조심할 달 3개를 마지막에 명시"),
            ],
            [
                ("three_chances", "올해 반드시 잡아야 할 3대 기회", "이 사주 구조와 2026년 세운이 만나 생기는 구체적 기회 3가지. 각각 어떤 분야에서 언제(월/분기) 오는지 명시. 기회를 잡는 구체적 행동 방법"),
                ("lucky_caution", "3대 주의사항 & 행운 아이템", "올해 특히 피해야 할 상황이나 행동 3가지(구체적 이유 포함). 이 사주에 2026년 행운을 더하는 방향(동서남북)·색깔·숫자·음식·월 각각 1가지씩"),
            ],
        ],
    },
}


class FortuneRequest(BaseModel):
    name: str
    gender: str
    year: int
    month: int
    day: int
    hour: int
    minute: int = 0
    is_lunar: bool = False
    fortune_type: str   # flow, tojeong, wealth, love, career, business, health, friend, newyear
    device_id: str = ''
    user_id: Optional[str] = None


class FortuneQARequest(BaseModel):
    reading_id: Optional[str] = None
    device_id: str
    fortune_type: str
    section_id: str
    section_title: str
    section_context: str
    saju_context: str
    question: str
    round_number: int = 1
    conversation_history: list = []


@app.post("/api/saju/fortune")
async def fortune_analyze(req: FortuneRequest):
    """범용 운세 분석 — 8개 서비스 공통"""
    try:
        import datetime as _dt
        config = FORTUNE_CONFIGS.get(req.fortune_type)
        if not config:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 fortune_type: {req.fortune_type}")

        saju = calculate_saju(req.name, req.gender, req.year, req.month, req.day,
                               req.hour, req.minute, req.is_lunar)
        saju_dict = _saju_to_dict(saju)
        saju_context = _build_saju_context(req.dict(), saju_dict)

        daeun_list = saju_dict.get('daeun_list', [])
        current_year = _dt.date.today().year
        current_age = current_year - req.year + 1

        daeun_text = '\n'.join([
            f"{'→현재 ' if d.get('is_current') else ''}{d.get('gan_ko','')}{d.get('zhi_ko','')}대운 "
            f"({d.get('age_start',0)}~{d.get('age_end',0)}세, {d.get('year_start',0)}~{d.get('year_end',0)}년)"
            for d in daeun_list[:6]
        ])

        gender_label = '여성' if req.gender == 'female' else '남성'

        system = f"""당신은 적천수(滴天髓), 자평진전(子平眞詮), 궁통보감(窮通寶鑑) 등 고전문헌에 정통한 명리학 전문가입니다.
전문: {config['title']} 분석

★ 원칙: 이 사람의 사주에서만 나오는 구체적 분석. 전문용어 괄호 병기. 나이·연도 명시.
★ JSON 작성 규칙: analysis 필드는 반드시 한 줄(줄바꿈 없이). 큰따옴표 사용 금지(작은따옴표 사용).
반드시 JSON만 출력하세요."""

        # 전체 요약
        summary_prompt = f"""{saju_context}

【성별】{gender_label} 【현재 나이】약 {current_age}세

다음 JSON만 출력:
{{"overall_score": 0~100의 정수, "overall_summary": "{config['summary_focus']}에 대한 핵심 2문장. 줄바꿈 없이."}}"""

        # 섹션 그룹 (4개 섹션을 2+2로 분리)
        groups = config['groups']  # [[섹션A1, 섹션A2], [섹션B1, 섹션B2]]

        def make_prompt(sections_list):
            items = []
            for sid, stitle, focus in sections_list:
                items.append(f'''  {{
    "id": "{sid}",
    "title": "{stitle}",
    "score": 0~100의 정수,
    "summary": "20자 이내 핵심",
    "analysis": "{focus}. 300자 이상. 전문용어 괄호 병기. 고전문헌 근거. 구체적 나이·연도.",
    "tags": ["키워드1", "키워드2", "키워드3"]
  }}''')
            return f"""{saju_context}
【성별】{gender_label} 【현재 나이】약 {current_age}세 【대운】{daeun_text[:150]}

다음 JSON 배열만 출력 (analysis는 한 줄, 줄바꿈·큰따옴표 없이):
[
{chr(44).join(items) if len(items) == 1 else ','.join(items)}
]"""

        prompt_a = make_prompt(groups[0])
        prompt_b = make_prompt(groups[1])

        raw_sum, raw_a, raw_b = await asyncio.gather(
            generate_dream_json(system, summary_prompt),
            generate_dream_json(system, prompt_a),
            generate_dream_json(system, prompt_b),
        )

        try:
            summary_data = _repair_json(raw_sum)
        except Exception:
            summary_data = {"overall_score": 70, "overall_summary": "분석이 완료되었습니다."}

        def parse_sections(raw, group):
            try:
                import re as _re
                text = raw.strip()
                s = text.find('['); e = text.rfind(']') + 1
                if s >= 0 and e > s:
                    text = text[s:e]
                text = _re.sub(r'"([^"]*)"',
                               lambda m: '"' + m.group(1).replace('\n', ' ').replace('\r', '') + '"',
                               text)
                return json.loads(text)
            except Exception as ex:
                print(f"[fortune/{req.fortune_type}] 섹션 파싱 오류: {ex}")
                return [{"id": sid, "title": t, "score": 70, "summary": "분석 중 오류 발생", "analysis": "", "tags": []}
                        for sid, t, _ in group]

        sections = parse_sections(raw_a, groups[0]) + parse_sections(raw_b, groups[1])

        # DB 저장
        reading_id = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                row = {
                    "fortune_type": req.fortune_type,
                    "profile_name": req.name,
                    "saju_context": saju_context,
                    "overall_score": summary_data.get("overall_score", 70),
                    "overall_summary": summary_data.get("overall_summary", ""),
                    "sections": json.dumps(sections, ensure_ascii=False),
                }
                if req.device_id: row["device_id"] = req.device_id
                if req.user_id: row["user_id"] = req.user_id
                res = sb.table("fortune_readings").insert(row).execute()
                if res.data: reading_id = res.data[0]["id"]
            except Exception as e:
                print(f"[fortune] DB 저장 오류: {e}")

        return {
            "reading_id": reading_id,
            "fortune_type": req.fortune_type,
            "fortune_title": config["title"],
            "profile_name": req.name,
            "saju_context": saju_context,
            "overall_score": summary_data.get("overall_score", 70),
            "overall_summary": summary_data.get("overall_summary", ""),
            "sections": sections,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[fortune/{req.fortune_type}] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"분석 오류: {str(e)}")


@app.post("/api/saju/fortune/qa")
async def fortune_qa(req: FortuneQARequest):
    """범용 운세 Q&A"""
    try:
        config = FORTUNE_CONFIGS.get(req.fortune_type, {})
        history_text = ''
        if req.conversation_history:
            lines = [f"Q: {m['question']}\nA: {m['answer']}"
                     for m in req.conversation_history if m.get('answer')]
            if lines:
                history_text = '\n\n[이전 대화]\n' + '\n\n'.join(lines)

        system = f"""당신은 적천수, 자평진전 등 고전문헌에 정통한 명리학 전문가입니다.
전문: {config.get('title', '사주')} 분석
이 사람의 사주 구조에서 나오는 구체적이고 깊이 있는 답변을 드립니다.
전문 용어 사용 시 반드시 괄호 안에 쉬운 설명을 병기하세요."""

        user_prompt = f"""[사주 정보]
{req.saju_context}

[현재 섹션: {req.section_title}]
{req.section_context}
{history_text}

[사용자 질문]
{req.question}

위 사주 분석을 바탕으로 질문에 구체적이고 깊이 있게 답변해주세요."""

        answer = await generate_dream_json(system, user_prompt)
        if answer.strip().startswith('{'):
            try:
                answer = _parse_llm_json(answer).get('answer', answer)
            except Exception:
                pass

        if SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                sb.table("fortune_qa").insert({
                    "reading_id": req.reading_id or None,
                    "device_id": req.device_id,
                    "section_id": req.section_id,
                    "section_title": req.section_title,
                    "question": req.question,
                    "answer": answer,
                    "round_number": req.round_number,
                }).execute()
            except Exception as e:
                print(f"[fortune/qa] DB 오류: {e}")

        return {"answer": answer, "section_id": req.section_id}

    except Exception as e:
        print(f"[fortune/qa] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Q&A 오류: {str(e)}")


# ──────────────────────────────────────────────
# 월운세 엔드포인트
# ──────────────────────────────────────────────

# 천간 60갑자 월주 계산 (기준: 2024년 1월 = 병자월)
_MONTH_STEMS_BASE = 2   # 2024-01 천간 인덱스 (병=2)
_MONTH_BRANCHES_BASE = 0  # 2024-01 지지 인덱스 (자=0)

STEMS_KR = ['갑','을','병','정','무','기','경','신','임','계']
BRANCHES_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해']
STEMS_HJ  = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
BRANCHES_HJ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

def get_month_pillar(year: int, month: int) -> dict:
    """해당 연·월의 월주(月柱) 계산"""
    total_months = (year - 2024) * 12 + (month - 1)
    stem   = ((_MONTH_STEMS_BASE + total_months) % 10 + 10) % 10
    branch = ((_MONTH_BRANCHES_BASE + total_months) % 12 + 12) % 12
    return {
        'stem_kr': STEMS_KR[stem], 'stem_hj': STEMS_HJ[stem],
        'branch_kr': BRANCHES_KR[branch], 'branch_hj': BRANCHES_HJ[branch],
        'label': f"{STEMS_KR[stem]}{BRANCHES_KR[branch]}({STEMS_HJ[stem]}{BRANCHES_HJ[branch]})",
    }

def get_year_pillar(year: int) -> dict:
    """해당 연도의 연주(年柱) 계산 (기준: 2024 = 갑진)"""
    base_year = 2024
    diff = year - base_year
    stem   = ((0 + diff) % 10 + 10) % 10   # 갑=0
    branch = ((4 + diff) % 12 + 12) % 12   # 진=4
    return {
        'stem_kr': STEMS_KR[stem], 'stem_hj': STEMS_HJ[stem],
        'branch_kr': BRANCHES_KR[branch], 'branch_hj': BRANCHES_HJ[branch],
        'label': f"{STEMS_KR[stem]}{BRANCHES_KR[branch]}({STEMS_HJ[stem]}{BRANCHES_HJ[branch]})",
    }


class MonthlyFortuneRequest(BaseModel):
    name: str
    gender: str
    year: int       # 출생 년
    month: int      # 출생 월
    day: int        # 출생 일
    hour: int       # 출생 시
    minute: int = 0
    is_lunar: bool = False
    target_year: int    # 분석 대상 연도
    target_month: int   # 분석 대상 월 (1~12)


@app.post("/api/saju/monthly-fortune")
async def monthly_fortune(req: MonthlyFortuneRequest):
    """월운세 분석 — 연간 12개월 요약 + 선택 월 상세"""
    try:
        saju = calculate_saju(req.name, req.gender, req.year, req.month, req.day,
                               req.hour, req.minute, req.is_lunar)
        saju_dict = _saju_to_dict(saju)
        saju_context = _build_saju_context(req.dict(), saju_dict)

        year_pillar  = get_year_pillar(req.target_year)
        month_pillar = get_month_pillar(req.target_year, req.target_month)

        # 12개월 월주 목록
        month_pillars_str = ', '.join([
            f"{i+1}월:{get_month_pillar(req.target_year, i+1)['label']}"
            for i in range(12)
        ])

        system = """당신은 적천수, 자평진전, 궁통보감 등 9대 고전문헌에 정통한 명리학 전문가입니다.
핵심 원칙:
1. 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
2. 해당 사주 구조의 구체적 특성에 맞는 분석만 (누구에게나 해당되는 일반론 금지)
3. 세운(年運)과 월운(月運)의 천간지지(天干地支)가 원국(原局)과 어떻게 작용하는지 근거 제시
4. 반드시 JSON만 출력"""

        user_prompt = f"""{saju_context}

【분석 대상】{req.target_year}년 {req.target_month}월
【세운】{year_pillar['label']} ({req.target_year}년)
【월운】{month_pillar['label']} ({req.target_month}월)
【연간 월주】{month_pillars_str}

위 사주팔자를 기반으로 {req.target_year}년 운세를 분석해주세요.

반드시 아래 JSON만 출력:
{{
  "year_summary": "{req.target_year}년 전체 흐름 2문장",
  "months": {{
    "1": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "2": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "3": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "4": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "5": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "6": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "7": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "8": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "9": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "10": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "11": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}},
    "12": {{"score": 0~100, "keyword": "핵심 키워드 2단어", "summary": "이 달의 핵심 3줄 이내"}}
  }},
  "target_month_detail": {{
    "overall": "{req.target_month}월 전체 흐름 3~4문장, 월주가 원국에 미치는 영향 포함",
    "career":  {{"score": 0~100, "summary": "직업·커리어 2~3문장"}},
    "wealth":  {{"score": 0~100, "summary": "재물·금전 2~3문장"}},
    "health":  {{"score": 0~100, "summary": "건강·체력 2~3문장"}},
    "relation":{{"score": 0~100, "summary": "관계·인간관계 2~3문장"}},
    "creative":{{"score": 0~100, "summary": "창의·학습·영성 2~3문장"}},
    "lucky_tip": "이달의 행운 포인트 1문장",
    "caution":   "이달의 주의 사항 1문장"
  }}
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)

        return {
            'saju_context': saju_context,
            'year_pillar': year_pillar,
            'year_summary': parsed.get('year_summary', ''),
            'months': parsed.get('months', {}),
            'target_month': req.target_month,
            'target_year': req.target_year,
            'target_month_detail': parsed.get('target_month_detail', {}),
            'month_pillar': month_pillar,
        }

    except Exception as e:
        print(f"[monthly-fortune] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"월운세 분석 오류: {str(e)}")


@app.post("/api/saju/monthly-fortune/detail")
async def monthly_fortune_detail(req: MonthlyFortuneRequest):
    """특정 월 상세 분석 (월 변경 시 호출)"""
    try:
        saju = calculate_saju(req.name, req.gender, req.year, req.month, req.day,
                               req.hour, req.minute, req.is_lunar)
        saju_dict = _saju_to_dict(saju)
        saju_context = _build_saju_context(req.dict(), saju_dict)

        year_pillar  = get_year_pillar(req.target_year)
        month_pillar = get_month_pillar(req.target_year, req.target_month)

        system = """당신은 적천수, 자평진전, 궁통보감 등 9대 고전문헌에 정통한 명리학 전문가입니다.
핵심 원칙:
1. 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
2. 해당 사주 구조의 구체적 특성에 맞는 분석만 (일반론 금지)
3. 세운·월운의 천간지지가 원국과 어떻게 작용하는지 명시
4. 반드시 JSON만 출력"""

        user_prompt = f"""{saju_context}

【분석 대상】{req.target_year}년 {req.target_month}월
【세운】{year_pillar['label']} ({req.target_year}년)
【월운】{month_pillar['label']} ({req.target_month}월)

{req.target_year}년 {req.target_month}월 운세를 5개 영역별로 상세 분석해주세요.

반드시 아래 JSON만 출력:
{{
  "overall": "{req.target_month}월 전체 흐름 3~4문장",
  "career":  {{"score": 0~100, "summary": "직업·커리어 2~3문장"}},
  "wealth":  {{"score": 0~100, "summary": "재물·금전 2~3문장"}},
  "health":  {{"score": 0~100, "summary": "건강·체력 2~3문장"}},
  "relation":{{"score": 0~100, "summary": "관계·인간관계 2~3문장"}},
  "creative":{{"score": 0~100, "summary": "창의·학습·영성 2~3문장"}},
  "lucky_tip": "이달의 행운 포인트 1문장",
  "caution":   "이달의 주의 사항 1문장"
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)
        return {**parsed, 'month_pillar': month_pillar}

    except Exception as e:
        print(f"[monthly-fortune/detail] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"월 상세 분석 오류: {str(e)}")


# ──────────────────────────────────────────────
# 이름풀이 엔드포인트
# ──────────────────────────────────────────────

def _get_sb():
    """Supabase 클라이언트 반환 (이름풀이 전용)"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=503, detail="Supabase 미연결")
    from supabase import create_client
    return create_client(SUPABASE_URL, SUPABASE_KEY)


@app.get("/api/name/surnames/{hangul}")
async def get_surnames(hangul: str):
    """성씨 한자 목록 조회"""
    try:
        sb = _get_sb()
        result = sb.table("hanja_surnames").select("*").eq("hangul", hangul).order("is_common", desc=True).execute()
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/name/characters/{hangul}")
async def get_name_characters(hangul: str):
    """이름 한자 목록 조회 (특정 음절)"""
    try:
        sb = _get_sb()
        result = (
            sb.table("hanja_names")
            .select("*")
            .eq("hangul", hangul)
            .eq("is_common", True)
            .order("display_order")
            .execute()
        )
        return result.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class NameAnalyzeRequest(BaseModel):
    surname_hangul: str           # 성씨 한글 (예: 김)
    surname_hanja: str            # 성씨 한자 (예: 金)
    surname_strokes: int          # 성씨 획수
    given_chars: list[dict]       # [{"hangul":"민","hanja":"珉","strokes":10}, ...]
    birth_year: Optional[int] = None
    birth_month: Optional[int] = None
    birth_day: Optional[int] = None
    birth_hour: Optional[str] = None
    calendar_type: Optional[str] = 'solar'
    gender: Optional[str] = 'male'


def _calc_five_element(strokes: int) -> str:
    """획수 → 오행 (수리오행)"""
    r = strokes % 10
    if r in (1, 2): return '목'
    if r in (3, 4): return '화'
    if r in (5, 6): return '토'
    if r in (7, 8): return '금'
    return '수'  # 9, 0


def _yin_yang(strokes: int) -> str:
    return '양(陽)' if strokes % 2 == 1 else '음(陰)'


def _calc_five_grids(ss: int, g1: int, g2: int = 0) -> dict:
    """
    ss=성씨획수, g1=이름첫자, g2=이름둘째자(외자면 0)
    오격(五格) 계산
    """
    if g2 == 0:
        # 외자 이름
        won   = ss            # 원격: 성씨
        hyeong= g1            # 형격: 이름
        i_    = ss + g1       # 이격: 성 + 이름첫자
        jeong = g1            # 정격: 이름첫자 (외자)
        chong = ss + g1       # 총격
    else:
        won   = ss
        hyeong= g1 + g2
        i_    = ss + g1
        jeong = g1 + g2
        chong = ss + g1 + g2

    def norm(n): return ((n - 1) % 81) + 1  # 1~81 범위 정규화

    return {
        'won':   norm(won),
        'hyeong': norm(hyeong),
        'i':     norm(i_),
        'jeong': norm(jeong),
        'chong': norm(chong),
    }


@app.post("/api/name/analyze")
async def analyze_name(req: NameAnalyzeRequest):
    """이름풀이 종합 분석"""
    try:
        sb = _get_sb()

        # 한자 목록 구성
        all_chars = [{'hanja': req.surname_hanja, 'strokes': req.surname_strokes, 'label': req.surname_hangul, 'meaning': ''}]
        for c in req.given_chars:
            all_chars.append({'hanja': c['hanja'], 'strokes': c['strokes'], 'label': c['hangul'], 'meaning': c.get('meaning', '')})

        ss = req.surname_strokes
        g_strokes = [c['strokes'] for c in req.given_chars]
        g1 = g_strokes[0] if g_strokes else 0
        g2 = g_strokes[1] if len(g_strokes) > 1 else 0

        # 오격 계산
        grids = _calc_five_grids(ss, g1, g2)

        # 81수리 DB 조회
        grid_nums = list(set(grids.values()))
        fortune_rows = sb.table("name_fortune_81").select("*").in_("number", grid_nums).execute()
        fortune_map = {r['number']: r for r in (fortune_rows.data or [])}

        # 음양 배열
        yin_yang_list = [_yin_yang(c['strokes']) for c in all_chars]
        yy_balanced = not all(y == yin_yang_list[0] for y in yin_yang_list)

        # 수리오행
        el_list = [_calc_five_element(c['strokes']) for c in all_chars]

        # 전체 이름 문자열
        full_name = req.surname_hangul + ''.join(c['hangul'] for c in req.given_chars)
        full_hanja = req.surname_hanja + ''.join(c['hanja'] for c in req.given_chars)
        total_strokes = ss + g1 + (g2 or 0)

        # 각 격의 풀이 텍스트
        def grid_info(num):
            f = fortune_map.get(num, {})
            return {
                'number': num,
                'name': f.get('name', ''),
                'luck': f.get('luck', ''),
                'luck_score': f.get('luck_score', 50),
                'description': f.get('description', ''),
                'keywords': f.get('keywords', []),
            }

        # LLM 종합 평가
        grid_summary = '\n'.join([
            f"원격({grids['won']}): {fortune_map.get(grids['won'],{}).get('name','')} - {fortune_map.get(grids['won'],{}).get('luck','')}",
            f"형격({grids['hyeong']}): {fortune_map.get(grids['hyeong'],{}).get('name','')} - {fortune_map.get(grids['hyeong'],{}).get('luck','')}",
            f"이격({grids['i']}): {fortune_map.get(grids['i'],{}).get('name','')} - {fortune_map.get(grids['i'],{}).get('luck','')}",
            f"정격({grids['jeong']}): {fortune_map.get(grids['jeong'],{}).get('name','')} - {fortune_map.get(grids['jeong'],{}).get('luck','')}",
            f"총격({grids['chong']}): {fortune_map.get(grids['chong'],{}).get('name','')} - {fortune_map.get(grids['chong'],{}).get('luck','')}",
        ])

        system = """당신은 성명학(姓名學) 전문가입니다. 원·형·이·정·총 오격(五格)과 81수리, 음양배열, 자원오행을 종합하여 이름을 풀이합니다.
전문 용어 사용 시 반드시 괄호 안에 한글 설명을 병기하세요. 반드시 JSON만 출력하세요."""

        # 한자별 뜻 정보
        char_meanings = []
        for c in all_chars:
            meaning = c.get('meaning', '')
            char_meanings.append(f"{c['hanja']}({c['label']}: {meaning})" if meaning else c['hanja'])
        char_meaning_str = ' · '.join(char_meanings)

        user_prompt = f"""이름: {full_name}({full_hanja}) / 총 획수: {total_strokes}획
성별: {'여성' if req.gender=='female' else '남성'}

[각 한자의 뜻]: {char_meaning_str}

[오격 분석]
{grid_summary}

[음양배열]: {' '.join([f"{c['hanja']}({_yin_yang(c['strokes'])})" for c in all_chars])}
[수리오행]: {' '.join([f"{c['hanja']}={_calc_five_element(c['strokes'])}" for c in all_chars])}

위 이름을 성명학적으로 종합 평가하고 다음 JSON 형식으로 출력하세요:
{{
  "name_reading": "각 한자의 뜻을 결합하여 이름 전체가 담고 있는 의미와 부모가 담은 바람 2~3문장 (구체적이고 시적으로)",
  "char_interpretations": [
    {{"hanja": "한자1", "reading": "음", "meaning": "뜻", "symbolism": "이 글자가 이름에 담은 상징 1문장"}},
    {{"hanja": "한자2", "reading": "음", "meaning": "뜻", "symbolism": "이 글자가 이름에 담은 상징 1문장"}}
  ],
  "overall_verdict": "이름 전체 종합 평가 3~4문장",
  "strengths": ["이름의 강점 1", "이름의 강점 2", "이름의 강점 3"],
  "cautions": ["주의사항 1", "주의사항 2"],
  "personality": "이름에서 나타나는 성격·기질 2~3문장",
  "career_fortune": "직업운·재물운 예측 2문장",
  "lucky_advice": "이 이름을 가진 사람에게 드리는 조언 1~2문장",
  "score": 0~100
}}"""

        raw = await generate_dream_json(system, user_prompt)
        llm_result = _parse_llm_json(raw)

        return {
            'full_name': full_name,
            'full_hanja': full_hanja,
            'total_strokes': total_strokes,
            'grids': {
                'won':    grid_info(grids['won']),
                'hyeong': grid_info(grids['hyeong']),
                'i':      grid_info(grids['i']),
                'jeong':  grid_info(grids['jeong']),
                'chong':  grid_info(grids['chong']),
            },
            'yin_yang': yin_yang_list,
            'yin_yang_balanced': yy_balanced,
            'elements': el_list,
            'chars': all_chars,
            'llm': llm_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[name/analyze] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"이름풀이 오류: {str(e)}")


# ──────────────────────────────────────────────
# 이상형 사주 분석 엔드포인트
# ──────────────────────────────────────────────

@app.post("/api/saju/ideal-type")
async def ideal_type(req: SajuRequest):
    """나의 이상형 사주 분석 — 사주 원국에서 배우자성 분석"""
    try:
        saju = calculate_saju(req.name, req.gender, req.year, req.month, req.day,
                               req.hour, req.minute, req.is_lunar)
        saju_dict = _saju_to_dict(saju)
        saju_context = _build_saju_context(req.dict(), saju_dict)

        gender_label = '여성' if req.gender == 'female' else '남성'
        spouse_star = '관성(官星)' if req.gender == 'female' else '재성(財星)'
        spouse_meaning = '남편성' if req.gender == 'female' else '아내성'

        system = """당신은 적천수, 자평진전, 궁통보감 등 9대 고전문헌에 정통한 명리학 전문가입니다.
배우자성 분석 원칙:
- 남성: 재성(財星)이 아내의 특성을 나타냄. 일지(배우자궁)의 지장간도 함께 분석
- 여성: 관성(官星)이 남편의 특성을 나타냄. 일지(배우자궁)의 지장간도 함께 분석
- 도화살(桃花殺), 홍염살(紅艶殺), 천을귀인(天乙貴人) 등 신살도 반영
- 추상적 일반론 금지 — 이 사주 구조에서 나타나는 구체적 특성만
- 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
반드시 JSON만 출력하세요."""

        user_prompt = f"""{saju_context}

위 사주는 {gender_label}입니다.
{spouse_star}({spouse_meaning})을 중심으로 이상형을 분석해주세요.

반드시 아래 JSON만 출력:
{{
  "summary": "이 사람의 이상형 핵심 2~3문장 (사주 구조 기반, 구체적)",
  "spouse_star_analysis": "{spouse_star} 구조 분석 (있는지·어떤 오행인지·강한지 약한지·배치 특성)",
  "spouse_palace": "일지(배우자궁) 분석 — 지장간의 십성과 배우자 특성",
  "personality_traits": ["이상형 성격 특성 1", "이상형 성격 특성 2", "이상형 성격 특성 3", "이상형 성격 특성 4", "이상형 성격 특성 5"],
  "appearance_tendency": "외모·인상 경향 1~2문장",
  "career_background": "직업·배경 경향 1~2문장",
  "compatible_elements": ["잘 맞는 오행 1", "잘 맞는 오행 2"],
  "compatible_ilju": ["잘 맞는 일주 예시 1 (이유 포함)", "잘 맞는 일주 예시 2 (이유 포함)", "잘 맞는 일주 예시 3 (이유 포함)"],
  "caution": "주의할 이상형 유형 또는 관계 패턴 1~2문장",
  "timing": "인연이 찾아오는 시기나 조건에 대한 명리학적 분석"
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)
        return {**parsed, 'gender': req.gender, 'name': req.name, 'saju_context': saju_context}

    except Exception as e:
        print(f"[ideal-type] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"이상형 분석 오류: {str(e)}")


# ──────────────────────────────────────────────
# ──────────────────────────────────────────────
# 가족궁합 엔드포인트
# ──────────────────────────────────────────────

FAMILY_SECTIONS_META = {
    'ohaeng_harmony':   '오행 기운 상호작용',
    'role_division':    '가족 역할 & 책임 분담',
    'communication':    '세대 간 소통 패턴',
    'conflict_harmony': '갈등 요인 & 화합 전략',
    'future_relation':  '미래 가족 관계 전망',
    'practical_tips':   '실생활 화합 조언',
}


class FamilyCompatibilityRequest(BaseModel):
    person1: SajuRequest
    person2: SajuRequest
    relation: str = 'family'  # family / parent_child / siblings


@app.post("/api/compatibility/family")
async def family_compatibility(req: FamilyCompatibilityRequest):
    """가족궁합 분석 — 오행 상호작용 + 역할·소통·화합 6섹션"""
    try:
        saju1 = calculate_saju(req.person1.name, req.person1.gender,
                               req.person1.year, req.person1.month, req.person1.day,
                               req.person1.hour, req.person1.minute, req.person1.is_lunar)
        saju2 = calculate_saju(req.person2.name, req.person2.gender,
                               req.person2.year, req.person2.month, req.person2.day,
                               req.person2.hour, req.person2.minute, req.person2.is_lunar)

        comp = analyze_compatibility(saju1, saju2)
        d1 = _saju_to_dict(saju1)
        d2 = _saju_to_dict(saju2)
        ctx1 = _build_saju_context({'name': req.person1.name, 'gender': req.person1.gender}, d1)
        ctx2 = _build_saju_context({'name': req.person2.name, 'gender': req.person2.gender}, d2)

        family_context = f"""[가족궁합 분석 대상]
{req.person1.name}({req.person1.gender}) × {req.person2.name}({req.person2.gender}) — {req.relation}

[{req.person1.name} 사주]
{ctx1}

[{req.person2.name} 사주]
{ctx2}

[기본 오행 점수]
종합: {comp.overall_score}점 | 겉궁합: {comp.outer_score}점 | 속궁합: {comp.inner_score}점
기본 총평: {comp.overall_summary}"""

        system = """당신은 적천수(滴天髓), 자평진전(子平眞詮) 등 고전문헌에 정통한 명리학 전문가입니다.
가족 간 궁합은 연인 궁합과 완전히 다릅니다 — 평생을 함께할 가족으로서 오행 상호작용, 역할 분담, 소통 방식, 화합 전략을 분석합니다.
핵심 원칙:
1. 연인·결혼 관점 표현 완전 배제 — 가족·부모자식·형제자매 관계 중심
2. 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
3. 두 사주 구조의 구체적 특성에서 나오는 분석만 (일반론 금지)
반드시 JSON만 출력하세요."""

        sections_prompt = "\n".join([
            f'    "{sid}": "한 문장 30자 이내 요약"'
            for sid in FAMILY_SECTIONS_META
        ])

        user_prompt = f"""{family_context}

위 두 사람의 가족 관계를 아래 6개 관점으로 분석하고, 각 항목의 30자 이내 핵심 요약과 점수(0~100)를 제시하세요.

반드시 아래 JSON 형식만 출력:
{{
  "family_summary": "두 사람의 가족 관계 종합 평가 2~3문장",
  "scores": {{
{chr(10).join(f'    "{sid}": 점수' for sid in FAMILY_SECTIONS_META)}
  }},
  "items": {{
{sections_prompt}
  }}
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)
        scores = parsed.get('scores', {})
        items_summary = parsed.get('items', {})

        sections = []
        for sid, slabel in FAMILY_SECTIONS_META.items():
            sections.append({
                'group_id': sid,
                'group_label': slabel,
                'icon': '',
                'items': [{
                    'id': sid,
                    'label': slabel,
                    'summary': items_summary.get(sid, '분석 준비 중...'),
                    'score': int(scores.get(sid, 70)),
                    'qaMessages': [],
                    'qaLoading': False,
                }]
            })

        total_score = (sum(int(v) for v in scores.values()) // len(scores)) if scores else comp.overall_score

        return {
            'person1_name': req.person1.name,
            'person2_name': req.person2.name,
            'overall_score': total_score,
            'outer_score': comp.outer_score,
            'inner_score': comp.inner_score,
            'family_summary': parsed.get('family_summary', '가족 관계를 분석했습니다.'),
            'saju_context': family_context,
            'sections': sections,
        }

    except Exception as e:
        print(f"[family/compatibility] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"가족궁합 분석 오류: {str(e)}")


class FamilyDetailRequest(BaseModel):
    saju_context: str
    item_id: str
    item_label: str = ""


@app.post("/api/compatibility/family/detail")
async def family_compatibility_detail(req: FamilyDetailRequest):
    """가족궁합 섹션 상세 분석"""
    try:
        item_label = FAMILY_SECTIONS_META.get(req.item_id, req.item_label or req.item_id)

        system = """당신은 적천수, 자평진전 등 고전문헌에 정통한 명리학 전문가입니다.
가족 관계(부모자식·형제자매·가족 전반) 관점으로 분석하세요. 연인·결혼 표현 사용 금지.
핵심 원칙:
1. 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
2. 두 사람의 실제 사주 구조에서 나오는 구체적 가족 관계 예측만 (일반론 금지)
3. 고전문헌 원리를 근거로 제시
4. 300자 이상 충분하게 작성
5. 반드시 JSON만 출력"""

        user_prompt = f"""{req.saju_context}

위 두 사람의 가족 관계에서 【{item_label}】 항목을 상세하게 분석해주세요.
실제 가족 생활에서 나타날 수 있는 구체적 패턴과 고전문헌 근거, 화합 방법을 포함하세요.

반드시 아래 JSON 형식만 출력:
{{
  "content": "상세 분석 내용 (300자 이상, 가족 관계 관점, 고전문헌 근거, 구체적 패턴)"
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)

        return {
            'item_id': req.item_id,
            'label': item_label,
            'content': parsed.get('content', '상세 분석 결과를 불러오지 못했습니다.'),
        }

    except Exception as e:
        print(f"[family/detail] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"가족궁합 상세 분석 오류: {str(e)}")


# ──────────────────────────────────────────────
# 결혼궁합 엔드포인트
# ──────────────────────────────────────────────

MARRIAGE_SECTIONS_META = {
    'spouse_palace':    '배우자궁 & 정배우자상',
    'home_life':        '가정생활 & 속궁합',
    'values_life':      '가치관 & 인생관 궁합',
    'wealth_economy':   '경제관 & 재물 궁합',
    'parenting_family': '부모 역할 & 시댁·처가',
    'time_axis':        '시간축 & 결혼 적기',
}
MARRIAGE_SECTION_ICONS = {
    'spouse_palace':    '💍',
    'home_life':        '🏠',
    'values_life':      '🌿',
    'wealth_economy':   '💰',
    'parenting_family': '👨‍👩‍👧',
    'time_axis':        '⏳',
}


class MarriageRequest(BaseModel):
    person1: SajuRequest
    person2: SajuRequest


class MarriageDetailRequest(BaseModel):
    saju_context: str
    item_id: str
    item_label: str = ""


@app.post("/api/marriage/analyze")
async def analyze_marriage(req: MarriageRequest):
    try:
        saju1 = calculate_saju(req.person1.name, req.person1.gender,
                               req.person1.year, req.person1.month, req.person1.day,
                               req.person1.hour, req.person1.minute, req.person1.is_lunar)
        saju2 = calculate_saju(req.person2.name, req.person2.gender,
                               req.person2.year, req.person2.month, req.person2.day,
                               req.person2.hour, req.person2.minute, req.person2.is_lunar)

        comp = analyze_compatibility(saju1, saju2)
        d1 = _saju_to_dict(saju1)
        d2 = _saju_to_dict(saju2)

        # 결혼궁합 전용 컨텍스트 구성
        ctx1 = _build_saju_context({'name': req.person1.name, 'gender': req.person1.gender}, d1)
        ctx2 = _build_saju_context({'name': req.person2.name, 'gender': req.person2.gender}, d2)

        marriage_context = f"""[결혼궁합 분석 대상]
{req.person1.name}({req.person1.gender}) × {req.person2.name}({req.person2.gender})

[{req.person1.name} 사주]
{ctx1}

[{req.person2.name} 사주]
{ctx2}

[기본 궁합 수치]
종합: {comp.overall_score}점 | 겉궁합: {comp.outer_score}점 | 속궁합: {comp.inner_score}점

[기본 궁합 총평]
{comp.overall_summary}"""

        system = """당신은 적천수, 자평진전, 궁통보감 등 9대 고전문헌에 정통한 결혼궁합 전문가입니다.
결혼은 연애와 근본적으로 다릅니다 — 장기적 동반자, 가정 경영, 경제적 협력, 자녀 양육의 관점으로 분석하세요.
핵심 원칙:
1. 전문 명리 용어 사용 시 반드시 괄호 안에 한글 설명 병기
2. 추상적 일반론 금지 — 해당 두 사주 구조의 구체적 특성 기반 분석
3. 남녀가 결혼 상대를 선택하는 관점의 차이 반영
반드시 JSON만 출력하세요."""

        sections_prompt = "\n".join([
            f'    "{sid}": "한 문장 30자 이내 요약"'
            for sid in MARRIAGE_SECTIONS_META
        ])

        user_prompt = f"""{marriage_context}

위 두 사람의 결혼궁합을 아래 6개 관점으로 분석하고, 각 항목의 30자 이내 핵심 요약과 점수(0~100)를 제시하세요.

반드시 아래 JSON 형식만 출력:
{{
  "marriage_summary": "두 사람의 결혼궁합 종합 평가 2~3문장",
  "scores": {{
{chr(10).join(f'    "{sid}": 점수' for sid in MARRIAGE_SECTIONS_META)}
  }},
  "items": {{
{sections_prompt}
  }}
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)

        scores = parsed.get('scores', {})
        items_summary = parsed.get('items', {})

        sections = []
        for sid, slabel in MARRIAGE_SECTIONS_META.items():
            sections.append({
                'group_id': sid,
                'group_label': slabel,
                'icon': MARRIAGE_SECTION_ICONS.get(sid, '📋'),
                'items': [{
                    'id': sid,
                    'label': slabel,
                    'summary': items_summary.get(sid, '분석 준비 중...'),
                    'score': int(scores.get(sid, 70)),
                    'qaMessages': [],
                    'qaLoading': False,
                }]
            })

        total_score = (sum(int(v) for v in scores.values()) // len(scores)) if scores else comp.overall_score

        return {
            'person1_name': req.person1.name,
            'person2_name': req.person2.name,
            'overall_score': total_score,
            'outer_score': comp.outer_score,
            'inner_score': comp.inner_score,
            'marriage_summary': parsed.get('marriage_summary', '결혼궁합을 분석했습니다.'),
            'saju_context': marriage_context,
            'sections': sections,
        }

    except Exception as e:
        print(f"[marriage/analyze] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"결혼궁합 분석 오류: {str(e)}")


@app.post("/api/marriage/detail")
async def marriage_detail(req: MarriageDetailRequest):
    try:
        item_label = MARRIAGE_SECTIONS_META.get(req.item_id, req.item_label or req.item_id)

        system = """당신은 적천수, 자평진전, 궁통보감 등 고전문헌에 정통한 결혼궁합 전문가입니다.
결혼 관점(장기 동반자, 가정, 경제, 자녀)으로 분석하세요.
핵심 원칙:
1. 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
2. 두 사람의 실제 사주 구조에서 나오는 구체적 결혼생활 예측만 (일반론 금지)
3. 고전문헌 원리를 근거로 제시
4. 300자 이상 충분하게 작성
5. 반드시 JSON만 출력"""

        user_prompt = f"""{req.saju_context}

위 두 사람의 결혼궁합에서 【{item_label}】 항목을 상세하게 분석해주세요.
실제 결혼생활에서 나타날 구체적 패턴, 고전문헌 근거, 개선 방향을 포함하세요.

반드시 아래 JSON 형식만 출력:
{{
  "content": "상세 분석 내용 (300자 이상, 고전문헌 근거 포함, 결혼생활 패턴 구체적 묘사)"
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)

        return {
            'item_id': req.item_id,
            'label': item_label,
            'content': parsed.get('content', '상세 분석 결과를 불러오지 못했습니다.'),
        }

    except Exception as e:
        print(f"[marriage/detail] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"결혼궁합 상세 분석 오류: {str(e)}")


# ──────────────────────────────────────────────
# 정밀분석 엔드포인트
# ──────────────────────────────────────────────

PRECISION_GROUPS_META = {
    'structure': {'label': '사주 기본 구조', 'icon': '🏛️'},
    'sipsung':   {'label': '십성 분석', 'icon': '⭐'},
    'gyeokguk': {'label': '격국과 용신', 'icon': '🔑'},
    'daewoon':   {'label': '대운과 세운', 'icon': '📅'},
    'domain':    {'label': '인생 영역별 운세', 'icon': '🌟'},
    'special':   {'label': '특수 구조 분석', 'icon': '🔬'},
}

PRECISION_ITEMS_META = {
    # 기본 구조
    'pallja':          '사주팔자 원국 분석',
    'ilgan':           '일간 기질과 성향',
    'ohaeng':          '오행 균형 분석',
    'eumyang':         '음양 구조',
    # 십성
    'bigyeon':         '비견·겁재 (자아·경쟁)',
    'sikshin':         '식신·상관 (표현·창의)',
    'jaesung':         '편재·정재 (재물·가치)',
    'gwansung':        '편관·정관 (권위·규범)',
    'insung':          '편인·정인 (지혜·보호)',
    # 격국
    'gyeok':           '월지 격국 판별',
    'yongshin':        '용신·기신·희신',
    'johoo':           '조후 분석',
    # 대운
    'current_daewoon': '현재 대운 상세 분석',
    'past_daewoon':    '과거 대운 총평',
    'future_daewoon':  '향후 대운 예측',
    'seun':            f'{__import__("datetime").date.today().year}년 세운 분석',
    # 인생 영역
    'career':          '직업·커리어운',
    'wealth':          '재물운',
    'love':            '연애·결혼운',
    'health':          '건강운',
    'family':          '가족관계운',
    # 특수
    'shinsal':         '신살 분석',
    'hapchung':        '합·충·형·파·해',
    'gongmang':        '공망 분석',
}

ITEM_TO_GROUP = {
    'pallja': 'structure', 'ilgan': 'structure', 'ohaeng': 'structure', 'eumyang': 'structure',
    'bigyeon': 'sipsung', 'sikshin': 'sipsung', 'jaesung': 'sipsung', 'gwansung': 'sipsung', 'insung': 'sipsung',
    'gyeok': 'gyeokguk', 'yongshin': 'gyeokguk', 'johoo': 'gyeokguk',
    'current_daewoon': 'daewoon', 'past_daewoon': 'daewoon', 'future_daewoon': 'daewoon', 'seun': 'daewoon',
    'career': 'domain', 'wealth': 'domain', 'love': 'domain', 'health': 'domain', 'family': 'domain',
    'shinsal': 'special', 'hapchung': 'special', 'gongmang': 'special',
}

PRECISION_SYSTEM_PROMPT = """당신은 적천수(滴天髓), 자평진전(子平眞詮), 궁통보감(窮通寶鑑), 명리정종(命理正宗), 연해자평(淵海子平) 등 9대 고전문헌에 정통한 최고 수준의 명리학자입니다.

핵심 원칙:
1. 전문 용어는 반드시 사용하되, 괄호 안에 일반인이 이해할 수 있는 쉬운 설명을 반드시 병기한다.
   예: "식신(食神: 타고난 재능과 표현력을 뜻하는 별)", "편재(偏財: 예상치 못한 재물이나 투자 수익)"
2. 추상적이거나 누구에게나 적용되는 일반론은 절대 금지. 해당 사주 구조에 맞는 구체적이고 실질적인 분석만.
3. 사용자의 이전 삶에서 실제로 일어난 일들을 알아맞추는 수준의 정확도를 목표로 한다.
4. 고전문헌의 원리를 근거로 들어 설명한다.
5. 답변은 한국어로 작성하며, 따뜻하면서도 전문적인 톤을 유지한다.
6. 각 항목은 반드시 200자 이상 충분히 상세하게 작성한다.
7. 반드시 JSON 형식만 출력한다."""


def _build_saju_context(req_dict: dict, saju_dict: dict) -> str:
    """공통 사주 컨텍스트 텍스트 생성"""
    import datetime
    pillars = saju_dict.get('pillars_detail', [])
    pillar_str = ' | '.join([f"{p['name']}: {p['gan']}{p['zhi']}({p['sipsin'] or '일원'})" for p in pillars])
    wuxing = ' '.join([f"{k}:{v}" for k, v in saju_dict.get('wuxing_count', {}).items()])
    daeun = saju_dict.get('current_daeun', {})
    daeun_str = f"{daeun.get('gan','')}{daeun.get('zhi','')}" if daeun else '미상'
    gender = req_dict.get('gender', 'male')
    return f"""【사주팔자】{pillar_str}
【일간】{saju_dict.get('day_master','')}({saju_dict.get('day_master_wuxing_ko','')}) · {saju_dict.get('day_animal','')}
【오행분포】{wuxing}
【현재대운】{daeun_str}
【성별】{'여성' if gender == 'female' else '남성'}
【기준연도】{datetime.date.today().year}년"""


def _parse_llm_json(raw: str) -> dict:
    """LLM 응답에서 JSON 추출"""
    clean = raw.strip()
    for marker in ['```json', '```']:
        if marker in clean:
            parts = clean.split(marker)
            for part in parts:
                part = part.strip().rstrip('`').strip()
                if part.startswith('{'):
                    clean = part
                    break
    try:
        return json.loads(clean)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', clean)
        if m:
            return json.loads(m.group())
        raise


class PrecisionRequest(BaseModel):
    name: str
    gender: str
    year: int
    month: int
    day: int
    hour: int
    minute: int = 0
    is_lunar: bool = False
    selected_items: list[str] = []


class PrecisionDetailRequest(BaseModel):
    # saju_context 만으로 상세 분석이 동작하므로, 아래 프로필 필드는 optional
    name: str = ""
    gender: str = ""
    year: int = 0
    month: int = 0
    day: int = 0
    hour: int = 0
    minute: int = 0
    is_lunar: bool = False
    item_id: str
    saju_context: str  # 1차에서 내려준 컨텍스트 재활용


# ─── 1차: 체크된 항목 전체 한줄 요약 (5~8초) ───
@app.post("/api/saju/precision/summary")
async def precision_summary(req: PrecisionRequest):
    try:
        saju = calculate_saju(req.name, req.gender, req.year, req.month, req.day, req.hour, req.minute, req.is_lunar)
        saju_dict = _saju_to_dict(saju)
        saju_context = _build_saju_context(req.dict(), saju_dict)

        # 체크된 항목만 처리
        selected = [i for i in req.selected_items if i in PRECISION_ITEMS_META]
        if not selected:
            selected = list(PRECISION_ITEMS_META.keys())

        group_order = ['structure', 'sipsung', 'gyeokguk', 'daewoon', 'domain', 'special']
        groups_with_items: dict[str, list[str]] = {g: [] for g in group_order}
        for item_id in selected:
            gid = ITEM_TO_GROUP.get(item_id)
            if gid:
                groups_with_items[gid].append(item_id)

        # 한줄 요약 요청 (항목당 30~40자, 전체 토큰 1500 이내)
        items_prompt = "\n".join(
            f'"{item_id}": "{PRECISION_ITEMS_META[item_id]}의 핵심을 30자 이내로 요약"'
            for item_id in selected
        )

        system = """명리학 전문가입니다. 사주를 보고 각 항목의 핵심을 30자 이내 한 문장으로 요약하세요.
전문 용어 사용 시 반드시 괄호로 한글 설명을 병기하세요. 반드시 JSON만 출력하세요."""

        user_prompt = f"""{saju_context}

아래 항목들의 핵심을 각각 30자 이내 한 문장으로 요약해주세요.

반드시 아래 JSON 형식만 출력:
{{
  "saju_summary": "이 사주의 전체 핵심 특성 2문장 (인생 방향 포함)",
  "items": {{
{items_prompt}
  }}
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)

        # 섹션별 구조로 조립
        sections = []
        for gid in group_order:
            group_items = []
            for item_id in groups_with_items[gid]:
                summary_text = parsed.get('items', {}).get(item_id, '분석 준비 중...')
                group_items.append({
                    'id': item_id,
                    'label': PRECISION_ITEMS_META.get(item_id, item_id),
                    'summary': summary_text,
                })
            if group_items:
                meta = PRECISION_GROUPS_META.get(gid, {'label': gid, 'icon': '📋'})
                sections.append({
                    'group_id': gid,
                    'group_label': meta['label'],
                    'icon': meta['icon'],
                    'items': group_items,
                })

        return {
            'name': req.name,
            'saju_summary': parsed.get('saju_summary', f'{req.name}님의 사주를 분석했습니다.'),
            'saju_context': saju_context,  # 2차 상세 요청에서 재활용
            'sections': sections,
        }

    except Exception as e:
        print(f"[precision/summary] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"정밀분석 요약 오류: {str(e)}")


# ─── 2차: 특정 항목 상세 분석 (클릭 시 5~10초) ───
@app.post("/api/saju/precision/detail")
async def precision_detail(req: PrecisionDetailRequest):
    try:
        item_label = PRECISION_ITEMS_META.get(req.item_id, req.item_id)

        system = """당신은 적천수, 자평진전, 궁통보감 등 9대 고전문헌에 정통한 명리학 전문가입니다.
핵심 원칙:
1. 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
2. 해당 사주 구조에 맞는 구체적이고 실질적인 분석만 (일반론 금지)
3. 고전문헌 원리를 근거로 들어 설명
4. 250자 이상 충분하게 작성
5. 반드시 JSON만 출력"""

        user_prompt = f"""{req.saju_context}

위 사주에서 【{item_label}】 항목을 상세하게 분석해주세요.
이 사주 구조의 구체적 특성과 실생활에서 나타나는 패턴, 고전문헌 근거를 포함하세요.

반드시 아래 JSON 형식만 출력:
{{
  "content": "상세 분석 내용 (250자 이상, 고전문헌 근거 포함, 구체적 사례 포함)"
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)

        return {
            'item_id': req.item_id,
            'label': item_label,
            'content': parsed.get('content', '상세 분석 결과를 불러오지 못했습니다.'),
        }

    except Exception as e:
        print(f"[precision/detail] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"항목 상세 분석 오류: {str(e)}")


# ─── 분석 결과 저장 ───
class PrecisionSaveRequest(BaseModel):
    device_id: str
    user_id: Optional[str] = None
    profile_name: str
    saju_context: str
    saju_summary: str
    sections: list = []
    selected_items: list[str] = []


@app.post("/api/saju/precision/save")
async def precision_save(req: PrecisionSaveRequest):
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return {"id": None, "saved": False, "message": "Supabase 미연결"}
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        row = {
            "device_id": req.device_id,
            "user_id": req.user_id or None,
            "profile_name": req.profile_name,
            "saju_context": req.saju_context,
            "saju_summary": req.saju_summary,
            "sections": json.dumps(req.sections, ensure_ascii=False),
            "selected_items": json.dumps(req.selected_items, ensure_ascii=False),
        }
        result = sb.table("precision_analyses").insert(row).execute()
        analysis_id = result.data[0]["id"] if result.data else None
        return {"id": analysis_id, "saved": True}
    except Exception as e:
        print(f"[precision/save] 오류: {e}")
        return {"id": None, "saved": False, "message": str(e)}


# ─── Q&A 엔드포인트 (최대 10회차) ───
class QAMessage(BaseModel):
    question: str
    answer: str


class PrecisionQARequest(BaseModel):
    analysis_id: Optional[str] = None
    device_id: str
    item_id: Optional[str] = None
    item_label: Optional[str] = None
    saju_context: str
    item_detail: Optional[str] = None  # 해당 항목 상세 분석 내용
    conversation_history: list[QAMessage] = []  # 이전 Q&A 기록
    question: str
    round_number: int = 1


@app.post("/api/saju/precision/qa")
async def precision_qa(req: PrecisionQARequest):
    if req.round_number > 10:
        raise HTTPException(status_code=400, detail="최대 10회까지 질문할 수 있습니다.")
    try:
        # 대화 이력 구성
        history_text = ""
        if req.conversation_history:
            history_text = "\n\n【이전 대화 기록】\n" + "\n".join(
                f"Q{i+1}: {m.question}\nA{i+1}: {m.answer}"
                for i, m in enumerate(req.conversation_history)
            )

        item_context = ""
        if req.item_label and req.item_detail:
            item_context = f"\n\n【분석 항목】{req.item_label}\n【상세 분석 내용】\n{req.item_detail}"

        system = """당신은 적천수, 자평진전, 궁통보감 등 9대 고전문헌에 정통한 명리학 상담 전문가입니다.

핵심 원칙:
1. 사용자의 사주와 질문 맥락을 정확히 반영하여 구체적으로 답변한다
2. 전문 용어 사용 시 반드시 괄호 안에 한글 설명 병기
3. 이전 대화 맥락을 이어받아 일관성 있게 답변한다
4. 실제 사주 상담사처럼 따뜻하고 성의 있게 답변한다
5. 반드시 JSON만 출력한다"""

        user_prompt = f"""{req.saju_context}{item_context}{history_text}

【새 질문 ({req.round_number}회차)】{req.question}

위 사주 분석 내용과 대화 맥락을 바탕으로 성의 있게 답변해주세요.

반드시 아래 JSON 형식만 출력:
{{
  "answer": "질문에 대한 상세하고 구체적인 답변 (고전문헌 근거 포함, 200자 이상)"
}}"""

        raw = await generate_dream_json(system, user_prompt)
        parsed = _parse_llm_json(raw)
        answer = parsed.get("answer", "답변을 생성하는 데 문제가 발생했습니다.")

        # DB 저장
        if req.analysis_id and SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                sb.table("precision_qa").insert({
                    "analysis_id": req.analysis_id,
                    "device_id": req.device_id,
                    "item_id": req.item_id or None,
                    "item_label": req.item_label or None,
                    "question": req.question,
                    "answer": answer,
                    "round_number": req.round_number,
                }).execute()
            except Exception as db_e:
                print(f"[precision/qa] DB 저장 실패 (무시): {db_e}")

        return {
            "answer": answer,
            "round_number": req.round_number,
            "remaining": 10 - req.round_number,
        }

    except Exception as e:
        print(f"[precision/qa] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Q&A 오류: {str(e)}")


# ──────────────────────────────────────────────
# 꿈해몽 엔드포인트
# ──────────────────────────────────────────────

class SajuContextPayload(BaseModel):
    ilgan: str = ""
    ilganKr: str = ""
    ilganElement: str = ""
    yongshin: Optional[str] = None
    dayPillar: Optional[str] = None
    currentDaeun: Optional[str] = None
    daeunElement: Optional[str] = None
    currentSeun: Optional[str] = None
    todayIlgin: Optional[str] = None
    todayIlginElement: Optional[str] = None
    elementDistribution: Optional[dict] = None


class DreamRequest(BaseModel):
    dreamText: str
    experienceText: Optional[str] = None
    sajuContext: Optional[SajuContextPayload] = None
    dreamDate: Optional[str] = None


class DreamDomain(BaseModel):
    name: str
    rating: str
    summary: str


class LiteratureRef(BaseModel):
    source: str
    originalText: str = ""
    translation: str = ""


class DreamResponse(BaseModel):
    overallSentiment: str
    overallSummary: str
    mainInterpretation: str
    domains: list[DreamDomain] = []
    todaysAdvice: str = ""
    luckyColor: str = ""
    luckyNumbers: list[int] = []
    literatureRefs: list[LiteratureRef] = []
    detectedSymbols: list[str] = []
    needsMoreDetail: bool = False
    additionalQuestion: Optional[str] = None


# 꿈 상징 키워드 추출 (로컬 규칙 기반)
SYMBOL_KEYWORDS = [
    "뱀", "용", "호랑이", "돼지", "말", "소", "개", "고양이", "쥐", "닭", "토끼",
    "물고기", "새", "독수리", "봉황", "학", "나비", "꿀벌", "거북",
    "물", "불", "산", "강", "바다", "비", "눈", "바람", "달", "태양", "해", "별", "무지개", "구름",
    "집", "건물", "관", "차", "배", "칼", "검", "보석", "황금", "금", "돈",
    "변", "똥", "대변", "오물", "분뇨", "변기",
    "이빨", "치아", "머리카락", "피", "눈물",
    "어머니", "아버지", "죽은", "고인", "황제", "임금", "신선", "아이",
    "결혼", "혼례", "임신", "출산", "시험", "합격",
    "날다", "비상", "추락", "떨어지다", "쫓기다", "도망", "싸우다", "이기다", "울다",
]


def extract_symbols_local(text: str) -> list[str]:
    """꿈 텍스트에서 주요 상징 키워드 추출"""
    found = []
    for kw in SYMBOL_KEYWORDS:
        if kw in text:
            found.append(kw)
    return found[:8]


async def generate_dream_json(system_prompt: str, user_prompt: str) -> str:
    """꿈해몽 전용 LLM 호출 — JSON 모드 강제, 파싱 보장"""
    import os, httpx
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY가 설정되지 않았습니다.")

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 3000,
                "response_format": {"type": "json_object"},  # JSON 모드 강제
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def generate_embedding_openai(text: str) -> list[float] | None:
    """OpenAI text-embedding-3-large 임베딩 생성"""
    if not OPENAI_API_KEY:
        return None
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        resp = await client.embeddings.create(
            model="text-embedding-3-large",
            input=text,
            dimensions=3072,
        )
        return resp.data[0].embedding
    except Exception as e:
        print(f"[dream] 임베딩 생성 실패: {e}")
        return None


async def search_dream_chunks_vector(symbols: list[str], saju_ctx: Optional[SajuContextPayload]) -> list[dict]:
    """match_chunks() 벡터 유사도 검색 (ILIKE 금지, 벡터 검색만 사용)"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return []

    query_parts = symbols[:6]
    if saju_ctx and saju_ctx.ilgan:
        query_parts.append(f"{saju_ctx.ilgan} {saju_ctx.ilganElement}")
    query_parts.append("꿈해몽 고전문헌 해석")
    query_text = " ".join(query_parts)

    embedding = await generate_embedding_openai(query_text)

    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)

        if embedding:
            # 벡터 유사도 검색 (match_chunks RPC)
            result = sb.rpc("match_chunks", {
                "query_embedding": embedding,
                "match_threshold": 0.25,
                "match_count": 5,
            }).execute()
        else:
            # OpenAI 미연결 시: 심볼 태그 기반 메타데이터 검색 (JSONB contains)
            # 주의: 이것도 ILIKE가 아닌 JSONB 인덱스 검색임
            result = sb.table("chunks").select(
                "content, translation, metadata"
            ).limit(5).execute()

        return result.data or []
    except Exception as e:
        print(f"[dream] Supabase 검색 실패: {e}")
        return []


def build_saju_context_text(ctx: Optional[SajuContextPayload]) -> str:
    if not ctx or not ctx.ilgan:
        return "사주 정보 없음 (일반 해몽)"
    parts = [f"일주: {ctx.dayPillar or ctx.ilgan}({ctx.ilganKr}) · 오행: {ctx.ilganElement}"]
    if ctx.yongshin:
        parts.append(f"용신: {ctx.yongshin}")
    if ctx.currentDaeun:
        parts.append(f"현재 대운: {ctx.currentDaeun}({ctx.daeunElement or ''})")
    if ctx.currentSeun:
        parts.append(f"현재 세운: {ctx.currentSeun}")
    if ctx.todayIlgin:
        parts.append(f"오늘 일진: {ctx.todayIlgin}({ctx.todayIlginElement or ''})")
    if ctx.elementDistribution:
        dist = " ".join(f"{k}:{v}" for k, v in ctx.elementDistribution.items())
        parts.append(f"오행 분포: {dist}")
    return " | ".join(parts)


def build_literature_context(chunks: list[dict]) -> str:
    if not chunks:
        return "고전문헌 검색 결과 없음 (주공해몽 기반 일반 해몽 원칙 적용)"
    lines = []
    for i, c in enumerate(chunks[:3]):
        meta = c.get("metadata") or {}
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except Exception:
                meta = {}
        src = meta.get("source_title", "주공해몽")
        orig = meta.get("original_text", "")
        summary = meta.get("interpretation_summary", "")
        auspicious = meta.get("auspiciousness", "")
        translation = c.get("translation", "")
        lines.append(
            f"[{i+1}] 출처: {src}\n"
            f"원문: {orig}\n"
            f"번역: {translation}\n"
            f"해석요약: {summary}\n"
            f"길흉: {auspicious}"
        )
    return "\n\n".join(lines)


DREAM_SYSTEM_PROMPT = """당신은 동양 전통 꿈해몽과 사주명리학을 결합한 최고 전문가입니다.
『주공해몽(周公解夢)』, 『몽점일지(夢占逸旨)』 등 고전문헌에 정통합니다.

## 해몽 핵심 원칙
1. 사주 일간의 오행을 기준으로 꿈 상징의 길흉을 판단한다
2. 꿈 꾼 날의 일진과 현재 대운·세운을 반드시 반영한다
3. 용신 오행이 꿈에 강하게 나타나면 吉, 기신 오행이면 주의로 해석한다
4. 고전문헌 근거를 반드시 하나 이상 인용한다
5. 단정적 예언보다 "가능성과 에너지의 흐름"으로 서술한다
6. 어떤 꿈이든 반드시 해석한다 — 해석 불가 응답 절대 금지
7. 명리학 용어 사용 시 반드시 괄호 안에 한글 설명 병기
8. 어조: 따뜻하고 수용적 구어체
9. 변/똥 꿈은 주공해몽에서 재물운의 강력한 길조로 반드시 해석한다
10. 추가 정보가 필요하면 needsMoreDetail: true로 표시

반드시 아래 JSON 형식만 출력:
{
  "overallSentiment": "대길|길|중길|평|주의|흉 중 하나",
  "overallSummary": "전체 판정 한 줄 요약 (30자 이내)",
  "mainInterpretation": "사주 맥락과 고전문헌 결합 핵심 해몽 (200~300자)",
  "domains": [
    {"name": "재물운|직업운|연애운|건강운|가정운 중 관련 항목", "rating": "대길|길|중길|평|주의|흉", "summary": "영역별 50자 이내"}
  ],
  "todaysAdvice": "실용적 행동 조언 50자 이내",
  "luckyColor": "행운색 (오행 근거 포함, 예: 흰색·은색(金 오행))",
  "luckyNumbers": [숫자 2~3개],
  "literatureRefs": [
    {"source": "출처명", "originalText": "한문 원문", "translation": "한글 번역"}
  ],
  "needsMoreDetail": false,
  "additionalQuestion": "추가 정보 요청 문장 (needsMoreDetail true일 때만)"
}"""


@app.post("/api/dream/interpret", response_model=DreamResponse)
async def interpret_dream(req: DreamRequest):
    import datetime
    try:
        dream_date = req.dreamDate or datetime.date.today().strftime("%Y.%m.%d")
        symbols = extract_symbols_local(req.dreamText)

        # 벡터 유사도 검색 (match_chunks 사용, ILIKE 금지)
        chunks = await search_dream_chunks_vector(symbols, req.sajuContext)
        lit_context = build_literature_context(chunks)
        saju_text = build_saju_context_text(req.sajuContext)
        exp_text = f"\n【최근 경험】{req.experienceText}" if req.experienceText else ""

        user_prompt = f"""【꿈 날짜】{dream_date}
【꿈 내용】{req.dreamText}
【감지된 상징】{", ".join(symbols) if symbols else "상징 분석 중"}
{exp_text}
【사주 컨텍스트】
{saju_text}

【고전문헌 검색 결과 (match_chunks 벡터 유사도 검색)】
{lit_context}

위 정보를 종합하여 따뜻하고 깊이 있는 꿈해몽을 작성해주세요."""

        # JSON 모드로 LLM 호출
        raw = await generate_dream_json(DREAM_SYSTEM_PROMPT, user_prompt)
        print(f"[dream] LLM 응답 {len(raw)}자")

        # 다단계 JSON 파싱
        clean = raw.strip()
        parsed = None

        # 1차: 직접 파싱
        try:
            parsed = json.loads(clean)
        except Exception:
            pass

        # 2차: 코드 블록 제거 후 파싱
        if parsed is None:
            for marker in ["```json", "```"]:
                if marker in clean:
                    parts = clean.split(marker)
                    for part in parts:
                        part = part.strip().rstrip("`").strip()
                        try:
                            parsed = json.loads(part)
                            break
                        except Exception:
                            continue
                if parsed:
                    break

        # 3차: 정규식으로 JSON 블록 추출
        if parsed is None:
            match = re.search(r'\{[\s\S]*\}', clean)
            if match:
                try:
                    parsed = json.loads(match.group())
                except Exception:
                    pass

        # 4차: 파싱 완전 실패 시 기본 응답 구성 (에러 대신 응답 반환)
        if parsed is None:
            print(f"[dream] JSON 파싱 실패, 원문 일부: {clean[:200]}")
            parsed = {
                "overallSentiment": "평",
                "overallSummary": "꿈해몽 결과",
                "mainInterpretation": clean[:400] if len(clean) > 20 else "꿈해몽 분석을 완료했습니다. 다시 시도해주세요.",
                "domains": [],
                "todaysAdvice": "꿈의 내용을 더 자세히 적어주시면 정확한 해몽이 가능합니다.",
                "luckyColor": "흰색",
                "luckyNumbers": [3, 7],
                "literatureRefs": [],
                "needsMoreDetail": True,
                "additionalQuestion": "꿈에서 느낀 감정과 등장한 인물, 색상을 더 자세히 적어주시겠어요?",
            }

        domains = [DreamDomain(**d) for d in parsed.get("domains", [])]
        lit_refs = [LiteratureRef(**r) for r in parsed.get("literatureRefs", [])]

        return DreamResponse(
            overallSentiment=parsed.get("overallSentiment", "평"),
            overallSummary=parsed.get("overallSummary", ""),
            mainInterpretation=parsed.get("mainInterpretation", ""),
            domains=domains,
            todaysAdvice=parsed.get("todaysAdvice", ""),
            luckyColor=parsed.get("luckyColor", ""),
            luckyNumbers=parsed.get("luckyNumbers", []),
            literatureRefs=lit_refs,
            detectedSymbols=symbols,
            needsMoreDetail=parsed.get("needsMoreDetail", False),
            additionalQuestion=parsed.get("additionalQuestion"),
        )

    except Exception as e:
        print(f"[dream] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"꿈해몽 분석 오류: {str(e)}")


# ──────────────────────────────────────────────
# 손금 보기 엔드포인트
# ──────────────────────────────────────────────

PALM_LINES = {
    'life':    ('생명선(生命線)', '생명력·건강·활력'),
    'heart':   ('감정선(感情線)', '감정·애정·인간관계'),
    'head':    ('지능선(知能線)', '지성·사고력·판단력'),
    'fate':    ('운명선(運命線)', '사회운·직업·성취'),
    'finance': ('재물선(財物線)', '재물운·금전·사업'),
}


async def _call_vision_llm(image_base64: str, prompt: str) -> str:
    """Vision LLM 호출 — OpenAI GPT-4o (우선) 또는 DeepSeek fallback"""
    import httpx, base64

    # 1순위: OpenAI GPT-4o Vision
    if OPENAI_API_KEY:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-4o",
                    "messages": [{"role": "user", "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}", "detail": "high"}},
                        {"type": "text", "text": prompt},
                    ]}],
                    "max_tokens": 4096,
                    "temperature": 0.7,
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]

    # 2순위: DeepSeek (Vision 지원 모델 — 미지원 시 텍스트 분석 fallback)
    deepseek_key = os.getenv("DEEPSEEK_API_KEY", "")
    if deepseek_key:
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {deepseek_key}", "Content-Type": "application/json"},
                    json={
                        "model": "deepseek-vl2",
                        "messages": [{"role": "user", "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                            {"type": "text", "text": prompt},
                        ]}],
                        "max_tokens": 4096,
                    },
                )
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
        except Exception:
            # Vision 미지원 시 텍스트 전용 분석
            return await generate_dream_json(
                "당신은 전통 손금 전문가입니다. 반드시 JSON만 출력하세요.",
                f"사용자의 손금 이미지가 업로드되었습니다. 일반적인 손금 분석 관점에서 {prompt}"
            )

    raise HTTPException(status_code=503, detail="Vision LLM이 설정되지 않았습니다. OPENAI_API_KEY를 .env에 추가해주세요.")


class PalmAnalyzeRequest(BaseModel):
    image_base64: str          # data:image/jpeg;base64,... 혹은 base64 only
    hand_type: str = 'right'   # right / left
    device_id: str = ''
    user_id: Optional[str] = None


class PalmQARequest(BaseModel):
    reading_id: str
    device_id: str
    section: str               # life / heart / head / fate / finance / overall
    question: str
    round_number: int = 1
    context: str = ''          # 해당 섹션 분석 내용 컨텍스트


@app.post("/api/palm/analyze")
async def palm_analyze(req: PalmAnalyzeRequest):
    """손금 이미지 분석 — Vision LLM 기반"""
    try:
        # base64 prefix 제거
        b64 = req.image_base64
        if ',' in b64:
            b64 = b64.split(',', 1)[1]

        hand_label = '오른손' if req.hand_type == 'right' else '왼손'

        # 손별 해석 프레임
        if req.hand_type == 'left':
            hand_frame = "왼손 = 태생운(胎生運): 타고난 잠재력, 원래의 숙명, 전생의 기운을 담고 있습니다."
            hand_focus = "이 손에서 그 사람이 태어날 때 가지고 온 원래의 운명, 잠재력, 타고난 성품을 읽어주세요."
        else:
            hand_frame = "오른손 = 현재운(現在運): 살아온 노력·환경·의지로 달라진 현재의 운명을 담고 있습니다."
            hand_focus = "이 손에서 그 사람이 실제로 살아온 과정과 현재의 운명, 노력으로 변화된 부분을 읽어주세요."

        vision_prompt = f"""이 사진은 {hand_label} 손금입니다.
전통 손금학(手相學) 전문가의 관점에서 정밀하게 분석해주세요.

[해석 관점]
{hand_frame}
{hand_focus}

분석 기준:
- 생명선(生命線): 길이·깊이·선명도·끊김 여부 → 건강·생명력
- 감정선(感情線): 형태·곡선·끝부분 → 애정운·감성
- 지능선(知能線): 길이·방향·갈래 → 지성·사고 유형
- 운명선(運命線): 유무·출발점·선명도 → 사회운·직업운
- 재물선(財物線): 유무·선명도 → 금전운

반드시 아래 JSON만 출력:
{{
  "overall_score": 0~100,
  "overall_summary": "손금 전체 종합 인상 3문장",
  "life_line": {{"score": 0~100, "features": "선의 특징 묘사", "analysis": "해석 2문장", "keywords": ["키워드1", "키워드2"]}},
  "heart_line": {{"score": 0~100, "features": "선의 특징 묘사", "analysis": "해석 2문장", "keywords": ["키워드1", "키워드2"]}},
  "head_line": {{"score": 0~100, "features": "선의 특징 묘사", "analysis": "해석 2문장", "keywords": ["키워드1", "키워드2"]}},
  "fate_line": {{"score": 0~100, "features": "선의 특징 묘사 (없으면 없음이라고)", "analysis": "해석 2문장", "keywords": ["키워드1", "키워드2"]}},
  "finance_line": {{"score": 0~100, "features": "선의 특징 묘사 (없으면 없음이라고)", "analysis": "해석 2문장", "keywords": ["키워드1", "키워드2"]}},
  "minor_signs": "기타 특이 손금 소견 (손가락·손바닥 구 분석 포함) 2~3문장",
  "vitality_score": 0~100,
  "emotion_score": 0~100,
  "intellect_score": 0~100,
  "fortune_score": 0~100,
  "personality": "성격·기질 분석 2~3문장",
  "love_tendency": "애정·연애 성향 2문장",
  "career_tendency": "직업·커리어 성향 2문장",
  "health_tendency": "건강 주의사항 2문장",
  "lucky_keywords": ["행운 키워드 3~5개"]
}}"""

        raw = await _call_vision_llm(b64, vision_prompt)
        parsed = _parse_llm_json(raw)

        # DB 저장
        reading_id = None
        if req.device_id and SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                row = {
                    "device_id": req.device_id,
                    "user_id": req.user_id or None,
                    "hand_type": req.hand_type,
                    "overall_score": parsed.get("overall_score"),
                    "overall_summary": parsed.get("overall_summary", ""),
                    "life_line": parsed.get("life_line", {}),
                    "heart_line": parsed.get("heart_line", {}),
                    "head_line": parsed.get("head_line", {}),
                    "fate_line": parsed.get("fate_line", {}),
                    "finance_line": parsed.get("finance_line", {}),
                    "minor_signs": parsed.get("minor_signs", ""),
                    "vitality_score": parsed.get("vitality_score"),
                    "emotion_score": parsed.get("emotion_score"),
                    "intellect_score": parsed.get("intellect_score"),
                    "fortune_score": parsed.get("fortune_score"),
                    "personality": parsed.get("personality", ""),
                    "love_tendency": parsed.get("love_tendency", ""),
                    "career_tendency": parsed.get("career_tendency", ""),
                    "health_tendency": parsed.get("health_tendency", ""),
                    "lucky_keywords": parsed.get("lucky_keywords", []),
                }
                result = sb.table("palm_readings").insert(row).execute()
                if result.data:
                    reading_id = result.data[0]["id"]
            except Exception as e:
                print(f"[palm] DB 저장 오류: {e}")

        return {**parsed, "reading_id": reading_id}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[palm/analyze] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"손금 분석 오류: {str(e)}")


class PalmCompareRequest(BaseModel):
    left_image_base64: str
    right_image_base64: str
    device_id: str = ''
    user_id: Optional[str] = None


@app.post("/api/palm/compare")
async def palm_compare(req: PalmCompareRequest):
    """왼손(태생운) + 오른손(현재운) 비교 분석"""
    try:
        lb64 = req.left_image_base64.split(',', 1)[-1] if ',' in req.left_image_base64 else req.left_image_base64
        rb64 = req.right_image_base64.split(',', 1)[-1] if ',' in req.right_image_base64 else req.right_image_base64

        # 왼손 분석
        left_prompt = """이것은 왼손(태생운) 손금입니다.
태어날 때 가지고 온 타고난 잠재력과 원래의 숙명을 분석하세요.

반드시 아래 JSON만 출력:
{
  "overall_score": 0~100,
  "overall_summary": "태생운 종합 2문장",
  "life_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "heart_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "head_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "fate_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "finance_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "vitality_score":0~100,"emotion_score":0~100,"intellect_score":0~100,"fortune_score":0~100,
  "personality":"타고난 성품 2문장",
  "destiny_summary":"타고난 숙명 핵심 2문장"
}"""

        right_prompt = """이것은 오른손(현재운) 손금입니다.
노력·환경·의지로 달라진 현재의 운명을 분석하세요.

반드시 아래 JSON만 출력:
{
  "overall_score": 0~100,
  "overall_summary": "현재운 종합 2문장",
  "life_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "heart_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "head_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "fate_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "finance_line": {"score":0~100,"features":"특징","analysis":"해석","keywords":["k1","k2"]},
  "vitality_score":0~100,"emotion_score":0~100,"intellect_score":0~100,"fortune_score":0~100,
  "personality":"현재 성품 2문장",
  "destiny_summary":"현재 운명 핵심 2문장"
}"""

        left_raw, right_raw = await asyncio.gather(
            _call_vision_llm(lb64, left_prompt),
            _call_vision_llm(rb64, right_prompt),
        )
        left_data = _parse_llm_json(left_raw)
        right_data = _parse_llm_json(right_raw)

        # 변화 요약 LLM
        compare_summary_prompt = f"""왼손(태생운)과 오른손(현재운)의 손금 분석 결과입니다.

[왼손 - 태생운]
{left_data.get('destiny_summary','')}\n각 영역 점수: 생명력{left_data.get('vitality_score',0)} 감성{left_data.get('emotion_score',0)} 지성{left_data.get('intellect_score',0)} 재물{left_data.get('fortune_score',0)}

[오른손 - 현재운]
{right_data.get('destiny_summary','')}\n각 영역 점수: 생명력{right_data.get('vitality_score',0)} 감성{right_data.get('emotion_score',0)} 지성{right_data.get('intellect_score',0)} 재물{right_data.get('fortune_score',0)}

위 두 손의 손금을 비교하여 다음 JSON만 출력:
{{
  "change_summary": "타고난 운명에서 현재 운명이 어떻게 달라졌는지 핵심 3문장",
  "improved_aspects": ["노력으로 좋아진 부분 1", "노력으로 좋아진 부분 2"],
  "unchanged_aspects": ["변하지 않은 숙명적 부분 1", "변하지 않은 숙명적 부분 2"],
  "change_score": 0~100,
  "change_score_desc": "변화 점수 해석 (0=전혀 달라지지 않음, 100=완전히 달라짐)",
  "advice": "두 손 비교를 통한 앞으로의 조언 2문장"
}}"""

        compare_raw = await generate_dream_json(
            "당신은 두 손 손금을 비교 분석하는 전문가입니다. 반드시 JSON만 출력하세요.",
            compare_summary_prompt
        )
        compare_data = _parse_llm_json(compare_raw)

        # DB 저장
        reading_id = None
        if req.device_id and SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                row = {
                    "device_id": req.device_id,
                    "user_id": req.user_id or None,
                    "hand_type": "both",
                    "overall_score": (left_data.get("overall_score",0) + right_data.get("overall_score",0)) // 2,
                    "overall_summary": compare_data.get("change_summary",""),
                    "life_line": {"left": left_data.get("life_line",{}), "right": right_data.get("life_line",{})},
                    "heart_line": {"left": left_data.get("heart_line",{}), "right": right_data.get("heart_line",{})},
                    "head_line": {"left": left_data.get("head_line",{}), "right": right_data.get("head_line",{})},
                    "fate_line": {"left": left_data.get("fate_line",{}), "right": right_data.get("fate_line",{})},
                    "finance_line": {"left": left_data.get("finance_line",{}), "right": right_data.get("finance_line",{})},
                    "personality": left_data.get("personality",""),
                    "lucky_keywords": compare_data.get("improved_aspects",[]),
                }
                res = sb.table("palm_readings").insert(row).execute()
                if res.data:
                    reading_id = res.data[0]["id"]
            except Exception as e:
                print(f"[palm/compare] DB 오류: {e}")

        return {
            "mode": "compare",
            "reading_id": reading_id,
            "left": left_data,
            "right": right_data,
            "compare": compare_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[palm/compare] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"비교 분석 오류: {str(e)}")


@app.post("/api/palm/qa")
async def palm_qa(req: PalmQARequest):
    """손금 분석 결과에 대한 Q&A"""
    try:
        section_name = PALM_LINES.get(req.section, ('손금', '전체'))[0]

        system = """당신은 전통 손금 전문가입니다. 사용자의 손금 분석 결과를 기반으로 추가 질문에 답변합니다.
전문 용어 사용 시 괄호 안에 쉬운 설명을 병기하세요. 따뜻하고 구체적인 조언을 제공하세요."""

        user_prompt = f"""[손금 분석 컨텍스트]
{req.context}

[사용자 질문 — {section_name} 관련]
{req.question}

위 손금 분석 결과를 기반으로 질문에 구체적이고 친절하게 답변해주세요."""

        answer = await generate_dream_json(system, user_prompt)
        # JSON이 아닌 자유 텍스트로 반환
        if answer.startswith('{'):
            try:
                parsed = _parse_llm_json(answer)
                answer = parsed.get("answer", answer)
            except Exception:
                pass

        # DB 저장
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                sb.table("palm_reading_qa").insert({
                    "reading_id": req.reading_id,
                    "device_id": req.device_id,
                    "section": req.section,
                    "question": req.question,
                    "answer": answer,
                    "round_number": req.round_number,
                }).execute()
            except Exception as e:
                print(f"[palm/qa] DB 오류: {e}")

        return {"answer": answer, "section": req.section}

    except Exception as e:
        print(f"[palm/qa] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Q&A 오류: {str(e)}")


@app.get("/api/palm/records/{device_id}")
async def palm_records(device_id: str):
    """손금 분석 기록 조회"""
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return []
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        result = (sb.table("palm_readings")
                  .select("id,hand_type,overall_score,overall_summary,lucky_keywords,created_at")
                  .eq("device_id", device_id)
                  .order("created_at", desc=True)
                  .limit(20)
                  .execute())
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────
# 관상 보기 엔드포인트
# ──────────────────────────────────────────────

class FaceAnalyzeRequest(BaseModel):
    image_base64: str
    device_id: str = ''
    user_id: Optional[str] = None


class FaceQARequest(BaseModel):
    reading_id: Optional[str] = None
    device_id: str
    section: str
    question: str
    round_number: int = 1
    context: str = ''


FACE_SECTION_META = {
    'samjeong':   ('삼정(三停)', '이마·코·턱으로 보는 청년·중년·말년 운'),
    'ogwan':      ('오관(五官)', '눈·코·입·귀·눈썹의 관상학적 의미'),
    'gisaek':     ('기색(氣色)', '피부색과 빛깔로 보는 현재 건강·운기'),
    'golsang':    ('골상(骨相)', '얼굴형과 뼈대로 보는 타고난 기질'),
    'myeonggung': ('명궁(命宮)', '미간과 인중으로 보는 운명 종합'),
}


@app.post("/api/face/analyze")
async def face_analyze(req: FaceAnalyzeRequest):
    """관상 분석 — 마의상법·신상전편·유장상법 기반 5대 섹션"""
    try:
        b64 = req.image_base64
        if ',' in b64:
            b64 = b64.split(',', 1)[1]

        vision_prompt = """이 사진을 마의상법(麻衣相法), 신상전편(神相全篇), 유장상법(柳莊相法), 수경집(水鏡集) 등 동양 관상학 고전에 근거하여 정밀하게 분석하세요.

[분석 기준]
① 삼정(三停): 상정(이마·눈썹 위) = 청년기·부모운·관록운 / 중정(눈썹~코끝) = 중년기·자신의 능력 / 하정(코끝~턱끝) = 말년기·부하운·자녀운
② 오관(五官): 耳(귀)=채청관 / 眉(눈썹)=보수관 / 眼(눈)=감찰관 / 鼻(코)=심변관 / 口(입)=출납관 — 각각의 형태와 관상학적 의미
③ 기색(氣色): 피부색·광택·기운·혈색으로 현재 건강·재운·심리 상태 판단
④ 골상(骨相): 얼굴형(천원·지방·목형 등) · 광대·턱·이마 뼈대로 타고난 운명 구조
⑤ 명궁(命宮): 미간(인당)의 넓이·색·형태 + 인중(人中)의 형태 + 전체 얼굴 균형으로 종합 운명 판단

[출력 규칙]
- 반드시 한국어로만 작성
- 추상적 일반론 금지 — 이 얼굴에서 실제로 관찰되는 구체적 특징 기반
- 전문용어 사용 시 괄호 안에 쉬운 설명 병기
- 고전 근거 명시 (예: "마의상법에서 '...'라 하였으니")

반드시 아래 JSON만 출력:
{
  "overall_score": 0~100,
  "overall_summary": "이 얼굴의 관상학적 핵심 특성 2~3문장. 가장 두드러지는 관상 특징과 전반적 운명 방향. 한자 포함 가능.",
  "easy_summary": "위 내용을 전문용어 없이 누구나 이해할 수 있는 쉬운 한국어 2~3문장.",
  "samjeong": {
    "score": 0~100,
    "upper": "상정(이마) 관찰 내용과 청년기·부모운·관록운 해석",
    "middle": "중정(눈~코) 관찰 내용과 중년기 능력·자립운 해석",
    "lower": "하정(코~턱) 관찰 내용과 말년기·자녀운·수명운 해석",
    "analysis": "삼정 전체 균형과 종합 해석 2문장",
    "keywords": ["키워드1", "키워드2"]
  },
  "ogwan": {
    "score": 0~100,
    "eyes": "눈(감찰관) 형태와 관상학적 의미 — 성격·지혜·재운 판단",
    "nose": "코(심변관) 형태와 관상학적 의미 — 재물운·자존심·중년운",
    "mouth": "입(출납관) 형태와 관상학적 의미 — 말복·음식운·대인관계",
    "ears": "귀(채청관) 형태와 관상학적 의미 — 부모운·수명·지혜",
    "eyebrows": "눈썹(보수관) 형태와 관상학적 의미 — 형제운·인간관계·처세",
    "analysis": "오관 종합 해석 2문장",
    "keywords": ["키워드1", "키워드2"]
  },
  "gisaek": {
    "score": 0~100,
    "color": "피부색과 기색 관찰 — 청홍황백흑 오색 기준",
    "luster": "광택과 생기 관찰 — 윤택한지 탁한지",
    "current_energy": "현재 건강·운기 상태 판단",
    "analysis": "기색 종합 해석 2문장",
    "keywords": ["키워드1", "키워드2"]
  },
  "golsang": {
    "score": 0~100,
    "face_shape": "얼굴형 판별 — 천원(원형)·지방(방형)·목형·화형·수형 등",
    "cheekbone": "광대뼈와 측면 골격 관찰",
    "chin": "턱 골격과 형태 — 의지력·말년운 판단",
    "forehead": "이마 골격 — 초년운·지성 판단",
    "analysis": "골상 종합 해석 2문장",
    "keywords": ["키워드1", "키워드2"]
  },
  "myeonggung": {
    "score": 0~100,
    "indang": "인당(미간) 관찰 — 넓이·색·형태로 관록운·운명 판단",
    "injoong": "인중(人中) 관찰 — 길이·형태로 자녀운·수명 판단",
    "balance": "전체 얼굴 균형과 비율 평가",
    "destiny": "명궁 종합 — 이 사람의 운명적 방향과 핵심 과제",
    "keywords": ["키워드1", "키워드2"]
  },
  "vitality_score": 0~100,
  "wisdom_score": 0~100,
  "wealth_score": 0~100,
  "charisma_score": 0~100,
  "personality": "관상에서 읽히는 성격·기질 2~3문장",
  "career_tendency": "직업적 특성과 성공 방향 2문장",
  "wealth_tendency": "재물운 경향과 금전 관리 성향 2문장",
  "health_tendency": "건강 취약 부위와 주의사항 2문장",
  "love_tendency": "애정운과 배우자 복 2문장",
  "lucky_keywords": ["행운 키워드 3~5개"]
}"""

        raw = await _call_vision_llm(b64, vision_prompt)
        parsed = _parse_llm_json(raw)

        # DB 저장
        reading_id = None
        if SUPABASE_URL and SUPABASE_KEY and req.device_id:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                row = {
                    "device_id": req.device_id,
                    "user_id": req.user_id or None,
                    "overall_score": parsed.get("overall_score"),
                    "overall_summary": parsed.get("overall_summary", ""),
                    "easy_summary": parsed.get("easy_summary", ""),
                    "samjeong": parsed.get("samjeong", {}),
                    "ogwan": parsed.get("ogwan", {}),
                    "gisaek": parsed.get("gisaek", {}),
                    "golsang": parsed.get("golsang", {}),
                    "myeonggung": parsed.get("myeonggung", {}),
                    "personality": parsed.get("personality", ""),
                    "career_tendency": parsed.get("career_tendency", ""),
                    "wealth_tendency": parsed.get("wealth_tendency", ""),
                    "health_tendency": parsed.get("health_tendency", ""),
                    "love_tendency": parsed.get("love_tendency", ""),
                    "lucky_keywords": parsed.get("lucky_keywords", []),
                    "vitality_score": parsed.get("vitality_score"),
                    "wisdom_score": parsed.get("wisdom_score"),
                    "wealth_score": parsed.get("wealth_score"),
                    "charisma_score": parsed.get("charisma_score"),
                }
                res = sb.table("face_readings").insert(row).execute()
                if res.data:
                    reading_id = res.data[0]["id"]
            except Exception as e:
                print(f"[face] DB 저장 오류: {e}")

        return {**parsed, "reading_id": reading_id}

    except Exception as e:
        print(f"[face/analyze] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"관상 분석 오류: {str(e)}")


@app.post("/api/face/qa")
async def face_qa(req: FaceQARequest):
    """관상 섹션별 Q&A"""
    try:
        section_label = FACE_SECTION_META.get(req.section, (req.section, ''))[0]

        system = """당신은 마의상법(麻衣相法), 신상전편(神相全篇), 유장상법(柳莊相法) 등 동양 관상학 고전에 정통한 관상 전문가입니다.
이 사람의 관상 분석 결과를 기반으로 추가 질문에 구체적으로 답변합니다.
전문 용어 사용 시 괄호 안에 쉬운 설명을 병기하고, 고전 근거를 명시하세요.
반드시 한국어로 답변하세요."""

        user_prompt = f"""[관상 분석 컨텍스트 — {section_label}]
{req.context}

[사용자 질문]
{req.question}

위 관상 분석 결과를 바탕으로 질문에 구체적이고 깊이 있게 답변해주세요.
고전 근거와 실생활 조언을 함께 포함해 주세요."""

        answer = await generate_dream_json(system, user_prompt)
        if answer.strip().startswith('{'):
            try:
                answer = _parse_llm_json(answer).get('answer', answer)
            except Exception:
                pass

        if SUPABASE_URL and SUPABASE_KEY and req.device_id:
            try:
                from supabase import create_client
                sb = create_client(SUPABASE_URL, SUPABASE_KEY)
                sb.table("face_reading_qa").insert({
                    "reading_id": req.reading_id or None,
                    "device_id": req.device_id,
                    "section": req.section,
                    "question": req.question,
                    "answer": answer,
                    "round_number": req.round_number,
                }).execute()
            except Exception as e:
                print(f"[face/qa] DB 오류: {e}")

        return {"answer": answer, "section": req.section}

    except Exception as e:
        print(f"[face/qa] 오류: {e}")
        raise HTTPException(status_code=500, detail=f"Q&A 오류: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
