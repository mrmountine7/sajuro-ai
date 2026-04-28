# Cursor AI 컨텍스트 파일  
## 프로젝트명
사주로(Sajuro) 꿈해몽 지식베이스 구축 프로젝트  
— 『주공해몽(周公解夢)』, 『몽점일지(夢占逸旨)』 고전 기반 벡터DB + 그래프DB 구축 지시서

---

## 1. 이 문서의 목적

이 문서는 Cursor AI가 다음 목표를 달성하도록 지시하기 위한 **정교한 컨텍스트 파일**이다.

목표는 『주공해몽(周公解夢)』, 『몽점일지(夢占逸旨)』 및 관련 전통 꿈해몽 고전/주해 자료를 디지털 지식자산으로 구조화하여,  
향후 **사주팔자(원국/대운/세운/월운)와 결합 가능한 고품질 꿈해몽 엔진**의 기반을 만드는 것이다.

이 프로젝트는 단순 OCR, 단순 문서 저장, 단순 원문 검색이 목적이 아니다.  
반드시 아래 3계층을 동시에 만족해야 한다.

1. **원문 보존 계층**  
   - 고전 원문, 번역문, 주석문, 판본정보, 출처정보를 최대한 충실히 보존한다.

2. **벡터 검색 계층**  
   - 꿈 상징, 사건, 감정, 상황, 해석문, 몽례(사례)를 유사도 검색 가능하도록 임베딩한다.

3. **관계형 지식 계층(그래프DB)**  
   - 꿈의 상징, 조건, 인물, 행위, 감정, 결과, 길흉, 적용대상, 사주적 연결요소를 노드와 엣지로 구조화한다.

즉, Cursor AI는 이 프로젝트를  
**“고전 꿈해몽 문헌을 검색 가능한 지식그래프로 재구성하는 작업”**으로 이해해야 한다.

---

## 2. 최종적으로 Cursor AI가 구현해야 하는 것

Cursor AI는 아래 6개 결과물을 만들도록 설계되어야 한다.

### 2.1 텍스트 정제 파이프라인
- 원문 OCR/텍스트 입력
- 고전 원문/현대어 번역/주석 구분
- 장/절/항목/몽례 단위 구조화
- 메타데이터 정리
- 청킹 기준에 따라 분해

### 2.2 벡터DB 적재 파이프라인
- 청크 생성
- 임베딩 생성
- 메타데이터 부착
- 검색 테스트
- 품질 평가 로그 저장

### 2.3 그래프DB 적재 파이프라인
- 상징 추출
- 행위/감정/상황/인물/결과/길흉/해석규칙 추출
- 개체 정규화(normalization)
- 노드/관계 생성
- 중복 병합

### 2.4 지식 스키마 정의서
- 벡터 청크 구조
- 메타데이터 스키마
- 그래프 노드/엣지 스키마
- 표준 코드체계
- 예외 처리 규칙

### 2.5 검증용 샘플 데이터셋
- 최소 50~100개의 꿈 상징 및 사례
- 원문, 번역, 해석, 그래프 노드/엣지, 벡터 청크가 모두 연결된 샘플
- 검색/응답 테스트 케이스 포함

### 2.6 API/서비스 연동 준비 구조
- 꿈 내용 입력 시
  - 상징 파싱
  - 유사 몽례 검색
  - 관련 해석 그래프 탐색
  - 사주 정보와 결합 가능한 후처리 포인트 반환
- 향후 LLM 응답 생성에 투입 가능한 JSON 결과를 반환하는 구조 설계

---

## 3. 프로젝트의 핵심 철학

Cursor AI는 아래 철학을 엄격히 따라야 한다.

### 3.1 “고전 전체”를 저장하지 말고 “해석 가능한 단위”로 분해하라
고전 텍스트는 그대로 저장하는 것만으로는 서비스 품질이 높아지지 않는다.  
반드시 아래 단위로 분해해야 한다.

- 꿈 상징(Symbol)
- 꿈 행위(Action)
- 등장 객체(Object)
- 등장 인물(Persona)
- 장소(Location)
- 감정(Emotion)
- 결과/길흉(Outcome)
- 해석 논리(Interpretation Rule)
- 사례(Mongrye / Dream Case)
- 조건(Condition)
- 적용 문맥(Context)
- 판본/출처(Source)

### 3.2 “단어 매칭”이 아니라 “해석 구조”를 추출하라
예: “뱀 꿈 = 재물” 식의 1:1 사전 매핑에 머물면 안 된다.  
반드시 아래와 같은 다층 구조를 뽑아야 한다.

- 뱀이 **어떤 색**이었는가
- 뱀이 **어디에 있었는가**
- 뱀이 **사용자를 공격했는가 / 도망갔는가 / 감쌌는가**
- 사용자가 **무서웠는가 / 반가웠는가 / 무감정이었는가**
- 함께 나온 존재는 **가족 / 타인 / 죽은 사람 / 동물 / 관료 / 군사** 중 누구인가
- 그 장면은 **상승 / 하강 / 침입 / 획득 / 상실 / 통과 / 출산 / 죽음 / 결합 / 파손** 중 어느 패턴인가

### 3.3 벡터DB와 그래프DB는 역할이 다르다
- 벡터DB는 “비슷한 문맥/사례”를 찾는 데 사용한다.
- 그래프DB는 “왜 그런 해석이 가능한지”를 구조적으로 설명하는 데 사용한다.

둘 중 하나만으로는 충분하지 않다.  
반드시 **동일 원문/사례로부터 벡터 청크와 그래프 지식을 동시에 생성**해야 한다.

### 3.4 현대 서비스에 맞는 정규화가 필요하다
고전 그대로만 저장하지 말고 서비스에 필요한 현대적 태그를 부착한다.

예:
- 재물운
- 연애운
- 가족관계
- 건강
- 이동/이사/변동
- 시험/합격
- 명예/승진
- 불안/압박
- 창작/발산
- 인간관계 갈등
- 성취/실패
- 경고/주의
- 소망투영
- 심리반영

---

## 4. 대상 문헌 범위

### 4.1 1차 핵심 문헌
반드시 우선 구축 대상에 포함한다.

1. 『주공해몽(周公解夢)』
2. 『몽점일지(夢占逸旨)』

### 4.2 2차 보조 문헌
가능하면 추가 수집 및 확장 가능 구조로 설계한다.

- 관련 중국 전통 몽서
- 한국 고전/민간 꿈해몽 자료
- 주석서, 연구서, 번역서
- 꿈 상징에 대한 현대 해설 자료
- 전통 상징과 오행/음양/십신 연결이 가능한 참고 문헌

### 4.3 문헌 메타정보 필수 항목
모든 문헌/판본은 아래 필드를 가진다.

- source_id
- title_original
- title_korean
- title_english
- author
- editor
- dynasty_or_period
- publication_year_estimated
- edition
- publisher
- language
- script_type (한문, 번역문, 혼합)
- acquisition_method
- copyright_status
- reliability_grade
- notes

---

## 5. 폴더 구조 설계 지침

현재 sqjuro.ai 서비스 폴더 구조 활용


---

## 6. 문헌 정제 및 구조화 규칙

### 6.1 절대 금지
- 원문 전체를 하나의 긴 문서로 임베딩
- 장/절 구분 없이 통째 저장
- 출처 없이 요약문만 저장
- 상징명만 나열하고 관계를 추출하지 않음
- 현대적 감성 문장으로 과도하게 재서술하여 원문을 훼손함

### 6.2 정제 원칙
모든 텍스트는 최소한 아래 4개 계층으로 분리 저장한다.

1. 원문(한문/원전 텍스트)
2. 직역
3. 의역/현대어 번역
4. 구조화 해석 필드

### 6.3 구조화 해석 필드 예시
- dream_symbol_primary
- dream_symbol_secondary
- dream_action
- dream_target
- dream_location
- dream_emotion
- interpretation_summary
- auspiciousness
- domain_tags
- condition_tags
- source_reference
- notes

---

## 7. 청킹(Chunking) 전략

### 7.1 기본 원칙
청킹 단위는 “LLM이 해석 가능한 최소 의미 블록”이어야 한다.

권장 청킹 단위:
- 한 개의 몽례
- 한 개의 상징 항목
- 한 개의 해석 규칙 문단
- 한 개의 조건 분기 문단

### 7.2 청크 타입
모든 청크는 아래 type 중 하나를 가져야 한다.

- `symbol_entry`
- `case_entry`
- `rule_entry`
- `commentary_entry`
- `translation_entry`
- `scholar_note`
- `taxonomy_entry`

### 7.3 청크 메타데이터
모든 청크에 아래 메타데이터를 부착한다.

```json
{
  "chunk_id": "",
  "source_id": "",
  "source_title": "",
  "section_path": "",
  "chunk_type": "",
  "symbol_tags": [],
  "action_tags": [],
  "emotion_tags": [],
  "outcome_tags": [],
  "domain_tags": [],
  "condition_tags": [],
  "language": "",
  "script_type": "",
  "dream_entities": [],
  "reliability_grade": "",
  "has_original_text": true,
  "has_translation": true,
  "has_commentary": false
}
```

### 7.4 청크 분할 기준
청크는 다음 조건을 만족해야 한다.

- 하나의 주요 상징 중심
- 하나의 사례 중심
- 하나의 해석 논리 중심
- 길이 너무 길 경우 2차 분할하되 문맥이 끊기지 않게 한다
- 원문/번역/구조화 필드가 상호 참조 가능해야 한다

---

## 8. 벡터DB 설계 지침

### 8.1 목적
벡터DB는 다음 질문에 답할 수 있어야 한다.

- 사용자의 꿈 내용과 가장 유사한 고전 몽례는 무엇인가
- 특정 상징이 포함된 다양한 사례는 무엇인가
- 비슷한 감정/상황/행위를 가진 꿈 사례는 무엇인가
- 동일 상징이 다른 조건에서 어떻게 다르게 해석되는가

### 8.2 임베딩 대상
임베딩 텍스트는 단순 원문만 넣지 말고 아래 결합형으로 구성한다.

권장 예시:

```text
[상징] 뱀
[행위] 몸을 감음
[장소] 집 안
[감정] 두려움
[해석요약] 가까운 인간관계, 재물, 압박, 숨은 위협과 관련된 사건의 신호로 해석될 수 있음
[원문] ...
[번역] ...
```

### 8.3 검색 필터링
검색 시 아래 메타필터를 지원해야 한다.

- 상징
- 감정
- 길흉
- 인생영역(재물/연애/건강/직장 등)
- 출처문헌
- 사례/규칙 여부
- 사주연동 가능 태그

### 8.4 검색 품질 기준
- 동일 상징에 대한 유사 사례가 상위에 안정적으로 노출될 것
- 전혀 다른 상징이 단순 감정 유사성 때문에 과도하게 상위 노출되지 않도록 조정할 것
- 키워드 + 벡터 하이브리드 검색을 기본으로 고려할 것

---

## 9. 그래프DB 설계 지침

### 9.1 핵심 목적
그래프DB는 다음을 가능하게 해야 한다.

- 꿈 상징 간 관계 탐색
- 조건 분기형 해석
- 동일 상징의 다의성 관리
- 문헌별 해석 차이 관리
- 사주 요소와의 후속 연결 가능성 확보

### 9.2 노드 타입
최소 아래 노드 타입을 정의한다.

- `Source`
- `TextUnit`
- `DreamCase`
- `Symbol`
- `Action`
- `Emotion`
- `Location`
- `Object`
- `Persona`
- `Outcome`
- `Auspiciousness`
- `InterpretationRule`
- `Condition`
- `DomainTag`
- `SaJuElement`
- `TenGod`
- `FiveElements`
- `TimeFlow`
- `ModernTheme`

### 9.3 주요 관계 타입
최소 아래 관계를 정의한다.

- `(:DreamCase)-[:HAS_SYMBOL]->(:Symbol)`
- `(:DreamCase)-[:HAS_ACTION]->(:Action)`
- `(:DreamCase)-[:HAS_EMOTION]->(:Emotion)`
- `(:DreamCase)-[:HAS_LOCATION]->(:Location)`
- `(:DreamCase)-[:INVOLVES_PERSONA]->(:Persona)`
- `(:DreamCase)-[:RESULTS_IN]->(:Outcome)`
- `(:DreamCase)-[:HAS_AUSPICIOUSNESS]->(:Auspiciousness)`
- `(:DreamCase)-[:INTERPRETED_BY]->(:InterpretationRule)`
- `(:InterpretationRule)-[:APPLIES_WHEN]->(:Condition)`
- `(:InterpretationRule)-[:BELONGS_TO_DOMAIN]->(:DomainTag)`
- `(:TextUnit)-[:FROM_SOURCE]->(:Source)`
- `(:TextUnit)-[:DESCRIBES_CASE]->(:DreamCase)`
- `(:Symbol)-[:RELATED_TO]->(:Symbol)`
- `(:Symbol)-[:MAY_INDICATE]->(:ModernTheme)`
- `(:ModernTheme)-[:CAN_LINK_TO]->(:SaJuElement)`
- `(:SaJuElement)-[:MAPS_TO]->(:FiveElements)`
- `(:SaJuElement)-[:MAPS_TO]->(:TenGod)`
- `(:TimeFlow)-[:MODULATES]->(:InterpretationRule)`

### 9.4 그래프 설계 포인트
Cursor AI는 그래프를 만들 때 반드시 다음을 고려해야 한다.

- 하나의 상징은 하나의 의미만 가지지 않는다.
- 상징의 의미는 조건에 따라 분기된다.
- 같은 꿈 사례라도 문헌별/주해별 해석이 다를 수 있다.
- “조건 없는 단정형 해석”은 지양한다.
- 추후 사주 정보와 연결할 수 있는 후킹 포인트를 남겨야 한다.

---

## 10. 사주 연동을 고려한 후킹 포인트 설계

이 단계에서는 사주 계산 엔진을 구현하지 않아도 된다.  
하지만 반드시 아래와 같은 후킹 포인트를 남겨야 한다.

### 10.1 연결 가능한 사주 정보 예시
- 오행 과다/부족
- 십신 강조
- 현재 대운/세운/월운의 테마
- 관성 압박기
- 재성 활성기
- 식상 발현기
- 인성 과다기
- 비겁 경쟁기

### 10.2 꿈해몽과 연결 가능한 태그 예시
- 압박/통제/규범
- 재물/획득/손실
- 관계/이성/매력
- 창작/표현/배설
- 학습/보호/의존
- 경쟁/충돌/탈취
- 이동/변화/이사
- 경고/질병/소모
- 상승/승진/합격
- 죽음/종결/전환

### 10.3 그래프 후킹 예시
예:
- `뱀` → `숨은 위협 / 매혹 / 재물 / 성적 상징 / 얽힘`
- `물` → `감정 / 재물 흐름 / 이동 / 침잠`
- `도망` → `압박 회피 / 관성 스트레스`
- `출산` → `새로운 결과물 / 식상 발현`
- `관료/시험/법정` → `관성/규범/평가`

주의:
이 연결은 **확정 규칙이 아니라 후속 해석 가중치 후보**로 저장해야 한다.

---

## 11. 개체 추출(Entity Extraction) 규칙

### 11.1 추출 대상
최소 아래 개체는 자동/반자동 추출 대상이다.

- 상징 명사
- 행위 동사
- 감정 표현
- 장소 표현
- 인물 관계어
- 결과/판정 표현
- 조건 표현
- 길흉 표현

### 11.2 정규화 규칙
예:
- 뱀 / 사 / 대사 / 독사 → 상위 표준어 `뱀`
- 강 / 바다 / 못 / 우물 → 상위 분류 `물 관련 장소`
- 두렵다 / 놀라다 / 섬뜩하다 → 상위 감정 `공포`

단, 원문 표현은 별도 alias로 반드시 보존한다.

### 11.3 다의성 처리
예:
- “불”은 화재, 분노, 에너지, 명예, 소모로 분기 가능
- “죽음”은 실제 죽음, 관계 종결, 전환, 재생의 은유 가능

따라서 하나의 심볼에 대해 복수 의미를 허용하는 구조로 만든다.

---

## 12. 표준 분류체계(Taxonomy) 설계

Cursor AI는 반드시 별도 taxonomy 파일을 생성해야 한다.

### 12.1 상징 대분류 예시
- 동물
- 인체
- 자연물
- 건축물
- 도구
- 음식
- 물질
- 인간관계
- 사회제도
- 종교/의례
- 생사/변형
- 이동/경계
- 재화/소유물

### 12.2 행위 분류 예시
- 획득
- 상실
- 추락
- 상승
- 침입
- 탈출
- 공격
- 방어
- 결합
- 분리
- 출산
- 사망
- 추격
- 세척
- 먹기
- 마시기
- 숨기기
- 발견하기
- 파괴하기
- 수리하기

### 12.3 감정 분류 예시
- 공포
- 안도
- 기쁨
- 부끄러움
- 욕망
- 분노
- 슬픔
- 당혹
- 기대
- 경외
- 무감정

### 12.4 결과 분류 예시
- 길
- 흉
- 혼합
- 경고
- 전환
- 심리반영
- 소망투영
- 해석유보

---

## 13. 출력 JSON 표준

Cursor AI는 후속 서비스 연동을 위해 반드시 표준 JSON 출력 구조를 설계한다.

예시:

```json
{
  "dream_input": {
    "raw_text": "",
    "parsed_symbols": [],
    "parsed_actions": [],
    "parsed_emotions": [],
    "parsed_locations": []
  },
  "retrieved_chunks": [],
  "matched_cases": [],
  "graph_paths": [],
  "interpretation_candidates": [
    {
      "title": "",
      "summary": "",
      "evidence": [],
      "conditions": [],
      "domains": [],
      "confidence_type": "symbolic|contextual|conditional"
    }
  ],
  "saju_hooks": [
    {
      "theme": "",
      "possible_links": []
    }
  ],
  "safety_notes": []
}
```

---

## 14. 품질검증(QA) 기준

### 14.1 반드시 수행할 검증
- 동일 상징 검색 테스트
- 유사 사례 검색 테스트
- 반대 맥락 구분 테스트
- 다의어 분기 테스트
- 출처 추적 가능성 테스트
- 그래프 경로 탐색 테스트
- 원문-번역-구조화 해석 연결 테스트

### 14.2 골든셋 구축
최소 50개 이상의 대표 상징/사례에 대해 아래를 사람이 검수한 goldenset으로 만든다.

- 원문
- 번역
- 핵심 상징
- 조건
- 길흉
- 인생영역
- 대표 해석
- 그래프 경로
- 기대 검색 결과

### 14.3 실패 사례 기록
다음 실패를 별도 로그로 남긴다.

- 잘못된 상징 병합
- 감정 추출 오류
- 문헌 출처 누락
- 상징은 맞는데 결과가 다른 사례를 하나로 뭉침
- LLM이 근거 없이 현대적 해석을 덧붙임

---

## 15. Cursor AI에게 요구하는 개발 태도

Cursor AI는 다음 태도를 지켜야 한다.

1. **원문 보존 우선**
2. **구조화 가능성 우선**
3. **확장 가능성 우선**
4. **설명 가능성 우선**
5. **단정형 해석 금지**
6. **서비스 연동 가능성 고려**
7. **추후 사주연동을 위한 후킹 설계 유지**
8. **테스트 가능한 작은 단위로 구현**
9. **임의 추론보다 명시적 필드화 우선**
10. **중복/동의어/판본 차이를 무시하지 말 것**

---

## 16. 권장 기술 방향

아래는 권장안이며, 프로젝트 환경에 맞게 조정 가능하다.

### 16.1 백엔드/스크립트
- Python
- Pydantic
- Pandas
- FastAPI

### 16.2 벡터DB
- pgvector(PostgreSQL)
- Qdrant
- Weaviate
- Milvus

### 16.3 그래프DB
- Neo4j
- ArangoDB
- Memgraph

### 16.4 텍스트 처리
- regex
- spaCy
- HanLP 또는 중국어 형태소 분석 도구
- 사용자 정의 entity extraction 룰셋
- LLM 보조 추출

### 16.5 저장 포맷
- JSONL
- CSV
- Parquet
- Cypher import files

---

## 17. 단계별 구현 순서

### 1단계
- 문헌 수집 대상 정의
- 판본/번역본 목록화
- 메타데이터 정의

### 2단계
- 원문/번역문 정제
- 장/절/몽례 단위 분해
- 샘플 50건 구조화

### 3단계
- 상징/행위/감정/결과 taxonomy 작성
- 개체 정규화 사전 구축
- alias 매핑 구축

### 4단계
- 벡터 청크 생성
- 임베딩 및 검색 테스트

### 5단계
- 그래프 노드/관계 생성
- 중복 병합 및 경로 테스트

### 6단계
- 검색 결과 + 그래프 근거를 함께 반환하는 서비스 인터페이스 정의

### 7단계
- 사주연동 후킹 포인트 설계
- 미래 확장 문서화

---

## 18. Cursor AI에게 내리는 실제 작업 지시

아래 지시를 우선순위대로 수행하라.

### 작업지시 A. 스키마 정의
- 벡터 청크 스키마 정의
- 그래프 노드/엣지 스키마 정의
- taxonomy 정의
- 표준 코드값 정의

### 작업지시 B. 샘플 파이프라인 구현
- 샘플 고전 텍스트 10~20개 항목 입력
- 정제 → 청킹 → 개체추출 → 그래프생성 → 임베딩 적재까지 동작시키기

### 작업지시 C. 검증환경 구축
- retrieval 테스트
- graph path 테스트
- source trace 테스트
- JSON output 테스트

### 작업지시 D. 산출물 문서화
- README
- schema docs
- ingestion guide
- data quality guide
- example queries
- known limitations

---

## 19. Cursor AI가 생성해야 하는 파일 목록

최소 아래 파일들을 생성하라.

```text
README.md
docs/schema/vector_schema.md
docs/schema/graph_schema.md
docs/schema/taxonomy.md
docs/qa/goldenset.md
src/pipelines/ingest_pipeline.py
src/pipelines/chunk_pipeline.py
src/pipelines/entity_extraction.py
src/pipelines/graph_builder.py
src/pipelines/embed_pipeline.py
src/services/retrieval_service.py
src/services/graph_query_service.py
src/models/schemas.py
tests/retrieval/test_retrieval.py
tests/graph/test_graph_paths.py
tests/integration/test_pipeline_e2e.py
data/processed/chunks/sample_chunks.jsonl
data/processed/graph/sample_nodes.jsonl
data/processed/graph/sample_edges.jsonl
```

---

## 20. 샘플 그래프 모델 예시

예시: “집 안에서 검은 뱀이 몸을 감아 무서웠다”

가능한 그래프 예시:

- DreamCase: `CASE_0001`
- Symbol: `뱀`
- Condition: `검은색`
- Location: `집`
- Action: `몸을 감음`
- Emotion: `공포`
- ModernTheme: `숨은 위협`
- ModernTheme: `관계 얽힘`
- ModernTheme: `재물/압박 혼재`
- InterpretationRule: `위협 또는 얽힘이 가까운 생활권에서 발생 가능`
- SaJuHook: `관성 압박`, `재성/관계`, `비겁 갈등`

관계 예:
- `CASE_0001 -HAS_SYMBOL-> 뱀`
- `CASE_0001 -HAS_LOCATION-> 집`
- `CASE_0001 -HAS_ACTION-> 몸을 감음`
- `CASE_0001 -HAS_EMOTION-> 공포`
- `뱀 -MAY_INDICATE-> 숨은 위협`
- `뱀 -MAY_INDICATE-> 유혹/얽힘`
- `공포 -MODULATES-> 위협 해석 강화`
- `집 -SCOPES_TO-> 생활권/가정`
- `숨은 위협 -CAN_LINK_TO-> 관성 압박`

---

## 21. 응답 생성용 룰

향후 LLM이 최종 답변을 만들 때는 아래 원칙을 따라야 한다.

- 고전 근거를 우선 제시
- 유사 몽례가 있으면 함께 제시
- 상징 해석과 상황 해석을 구분
- 길흉 단정 대신 조건형 문장 사용
- 사주 정보와 연결할 경우 “가능성”으로 표현
- 심리적 반영 가능성을 항상 보조 해석으로 포함
- 사용자에게 과도한 확신을 주지 말 것

---

## 22. 한계 및 주의사항

이 프로젝트는 전통 상징 해석 서비스의 품질을 높이는 것이 목적이지, 과학적 예언 시스템을 만드는 것이 아니다.  
따라서 Cursor AI는 아래를 명확히 문서화해야 한다.

- 고전 간 해석 차이 존재
- 문화권 맥락 차이 존재
- 동일 상징의 다의성 존재
- 현대 사용자 꿈은 심리/일상경험의 영향도 큼
- 결과는 “해석 후보”이지 절대적 단정이 아님

---

## 23. 최종 지시문

Cursor AI는 이 프로젝트를 단순 문헌 저장 프로젝트로 처리하지 말고,  
**“고전 꿈해몽 지식을 서비스 가능한 검색·추론·설명 구조로 재구성하는 작업”**으로 수행하라.

특히 다음을 반드시 지켜라.

- 고전 원문/번역/주석/사례를 분리 보존할 것
- 벡터DB와 그래프DB를 동시에 설계할 것
- 상징/행위/감정/조건/결과를 추출할 것
- 다의성과 조건 분기를 허용할 것
- 추후 사주연동이 가능하도록 후킹 포인트를 설계할 것
- 테스트 가능한 샘플 데이터셋과 검증 코드까지 함께 만들 것
- 모든 결과는 재현 가능하고 출처 추적 가능해야 한다

이 문서를 프로젝트의 최상위 컨텍스트로 사용하라.
