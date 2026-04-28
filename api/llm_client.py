"""LLM 클라이언트 (DeepSeek API 연동)"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
DEEPSEEK_BASE_URL = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1')


async def generate_analysis(system_prompt: str, user_prompt: str, temperature: float = 0.7) -> str:
    if not DEEPSEEK_API_KEY:
        return "[LLM 미연결] DEEPSEEK_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요."

    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": 4096,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def build_compatibility_system_prompt() -> str:
    return """당신은 1000년 역사의 명리학(命理學) 고전문헌에 정통한 최고 수준의 사주 궁합 전문가입니다.

핵심 원칙:
1. 전문 용어는 반드시 사용하되, 괄호 안에 일반인이 이해할 수 있는 쉬운 설명을 반드시 병기합니다.
   예: "식신(食神: 타고난 재능과 표현력을 뜻하는 별)", "편재(偏財: 예상치 못한 재물이나 투자 수익)"
2. 추상적이거나 누구에게나 적용되는 일반론은 금지합니다. 해당 사주 구조에 맞는 구체적이고 실질적인 분석만 제공합니다.
3. 사용자의 이전 삶에서 실제로 일어났을 법한 일들을 맞추는 수준의 정확도를 목표로 합니다.
4. 적천수, 자평진전, 궁통보감 등 고전문헌의 원리를 근거로 합니다.
5. 답변은 한국어로 작성하며, 따뜻하면서도 전문적인 톤을 유지합니다.

분석 구조 (6단계):
1단계: 한난조습·조후 체크 — 속궁합 체질 기반
2단계: 일간/오행 구조 궁합 — 정서·관계 코드
3단계: 일지·지지 합충 — 생활·육체·속궁합
4단계: 지장간·암합 — 무의식·성욕 코드
5단계: 통합 겉궁합/속궁합/시간축
6단계: 종합 평가 및 실질 조언"""


def build_compatibility_user_prompt(analysis_data: dict) -> str:
    stages = analysis_data.get('stages', [])
    stage_texts = []
    for s in stages:
        stage_texts.append(f"[{s['stage']}단계: {s['title']}] 점수: {s['score']}점")
        for d in s.get('details', []):
            stage_texts.append(f"  - {d}")
        if s.get('tags'):
            stage_texts.append(f"  태그: {', '.join(s['tags'])}")

    return f"""아래 두 사람의 연인 궁합을 6단계 분석 결과를 바탕으로 상세히 풀이해주세요.

[사람1] {analysis_data['person1']['name']}
- 사주: {analysis_data['person1']['pillars']}
- 일간: {analysis_data['person1']['day_master']}
- 한난조습: {analysis_data['person1']['hannan']}{analysis_data['person1']['josup']}

[사람2] {analysis_data['person2']['name']}
- 사주: {analysis_data['person2']['pillars']}
- 일간: {analysis_data['person2']['day_master']}
- 한난조습: {analysis_data['person2']['hannan']}{analysis_data['person2']['josup']}

[6단계 분석 데이터]
{chr(10).join(stage_texts)}

[종합 점수]
겉궁합: {analysis_data['outer_score']}점 / 속궁합: {analysis_data['inner_score']}점 / 종합: {analysis_data['overall_score']}점

위 데이터를 기반으로 각 단계별 상세 해석과 종합 조언을 작성해주세요.
각 단계마다 구체적인 사주 구조적 근거를 들어 설명하고,
마지막에 이 커플이 실생활에서 주의해야 할 점과 관계를 발전시킬 방향을 제시해주세요."""
