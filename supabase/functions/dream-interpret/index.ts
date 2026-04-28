/**
 * 꿈해몽 Supabase Edge Function
 * =================================
 * 8단계 RAG 파이프라인:
 * 1. 꿈 상징 추출 (Claude JSON)
 * 2. 임베딩 쿼리 텍스트 구성
 * 3. OpenAI 임베딩 생성
 * 4. match_chunks() 벡터 유사도 검색 (ILIKE 사용 절대 금지)
 * 5. 사주 컨텍스트 조립
 * 6. 고전문헌 근거 통합 프롬프트 구성
 * 7. Claude 최종 해몽 생성
 * 8. 구조화된 JSON 응답 반환
 *
 * 환경변수 (Supabase Dashboard > Functions > Secrets):
 *   ANTHROPIC_API_KEY
 *   OPENAI_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SajuContext {
  ilgan: string        // 일간 (예: "庚")
  ilganKr: string      // 일간 한글 (예: "경")
  ilganElement: string // 일간 오행 (예: "金")
  yongshin?: string    // 용신 오행
  currentDaeun?: string   // 현재 대운 (예: "甲寅")
  currentSeun?: string    // 현재 세운 (예: "丙午")
  todayIlgin?: string     // 오늘 일진 (예: "庚申")
  todayIlginElement?: string  // 오늘 일진 오행
  daeunElement?: string   // 대운 오행
  dayPillar?: string      // 일주 (예: "庚午")
  elementDistribution?: Record<string, number>
}

interface DreamRequest {
  dreamText: string
  experienceText?: string
  sajuContext?: SajuContext
  dreamDate?: string
}

interface RetrievedChunk {
  id: string
  content: string
  translation: string
  metadata: {
    chunk_id: string
    source_title: string
    symbol_tags: string[]
    auspiciousness: string
    interpretation_summary: string
    original_text: string
    domain_tags: string[]
  }
  similarity: number
}

interface DreamDomain {
  name: string
  rating: string
  summary: string
}

interface DreamResponse {
  overallSentiment: string
  overallSummary: string
  mainInterpretation: string
  domains: DreamDomain[]
  todaysAdvice: string
  luckyColor: string
  luckyNumbers: number[]
  literatureRefs: {
    source: string
    originalText: string
    translation: string
  }[]
  detectedSymbols: string[]
  needsMoreDetail: boolean
  additionalQuestion?: string
}

// ─── Step 1: 꿈 상징 추출 (Claude) ────────────────────────────────────────

async function extractDreamSymbols(
  dreamText: string,
  anthropicKey: string
): Promise<{ animals: string[]; nature: string[]; people: string[]; places: string[]; objects: string[]; actions: string[]; colors: string[]; emotions: string[]; bodily: string[] }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `다음 꿈 내용에서 해몽에 중요한 상징 요소들을 JSON으로 추출하세요.

꿈 내용: ${dreamText}

다음 카테고리별로 추출하세요:
- animals: 동물 (뱀, 호랑이, 돼지 등)
- nature: 자연물 (물, 불, 나무, 산, 비, 눈 등)
- people: 인물 (어머니, 죽은사람, 황제, 신선 등)
- places: 장소 (집, 학교, 강, 산 등)
- objects: 사물 (관, 보석, 칼, 배, 음식, 변기 등)
- actions: 행위 (날다, 달리다, 낳다, 먹다, 눔 등)
- colors: 색상 (황금색, 빨간색, 흰색 등)
- emotions: 감정 (두려움, 기쁨, 평온함 등)
- bodily: 신체 (이빨, 머리카락, 피 등)

반드시 JSON 형식만 출력:
{"animals":[],"nature":[],"people":[],"places":[],"objects":[],"actions":[],"colors":[],"emotions":[],"bodily":[]}`
      }],
    }),
  })

  const data = await response.json()
  const text = data.content[0].text.trim()
  try {
    const clean = text.includes("```") ? text.split("```")[1].replace("json", "").trim() : text
    return JSON.parse(clean)
  } catch {
    return { animals: [], nature: [], people: [], places: [], objects: [], actions: [], colors: [], emotions: [], bodily: [] }
  }
}

// ─── Step 2: 임베딩 쿼리 텍스트 구성 ─────────────────────────────────────

function buildEmbeddingQuery(
  symbols: ReturnType<Awaited<ReturnType<typeof extractDreamSymbols>> extends infer T ? () => T : never>,
  rawSymbols: Awaited<ReturnType<typeof extractDreamSymbols>>,
  sajuContext?: SajuContext
): string {
  const allSymbols = [
    ...rawSymbols.animals,
    ...rawSymbols.nature,
    ...rawSymbols.objects,
    ...rawSymbols.bodily,
  ].slice(0, 6)

  const actions = rawSymbols.actions.slice(0, 3)
  const emotions = rawSymbols.emotions.slice(0, 3)
  const sajuHint = sajuContext ? `[사주일간] ${sajuContext.ilgan}(${sajuContext.ilganElement})` : ""

  return [
    allSymbols.length > 0 ? `[상징] ${allSymbols.join(" ")}` : "",
    actions.length > 0 ? `[행위] ${actions.join(" ")}` : "",
    emotions.length > 0 ? `[감정] ${emotions.join(" ")}` : "",
    sajuHint,
    "[해석요약] 꿈 해몽 고전 문헌",
  ].filter(Boolean).join(" ")
}

// ─── Step 3: OpenAI 임베딩 생성 ───────────────────────────────────────────

async function generateEmbedding(text: string, openaiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-large",
      input: text,
      dimensions: 3072,
    }),
  })
  const data = await response.json()
  if (!data.data?.[0]?.embedding) {
    throw new Error(`임베딩 생성 실패: ${JSON.stringify(data)}`)
  }
  return data.data[0].embedding
}

// ─── Step 4: match_chunks() 벡터 유사도 검색 ──────────────────────────────
// 주의: ILIKE 키워드 검색 절대 사용 금지. 반드시 벡터 유사도만 사용.

async function searchClassicalLiterature(
  embedding: number[],
  supabaseUrl: string,
  supabaseKey: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  const client = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await client.rpc("match_chunks", {
    query_embedding: embedding,
    match_threshold: 0.25,
    match_count: topK,
  })

  if (error) {
    console.error("match_chunks 오류:", error)
    return []
  }

  return (data || []) as RetrievedChunk[]
}

// ─── Step 5: 사주 컨텍스트 텍스트 구성 ───────────────────────────────────

function buildSajuContextText(ctx?: SajuContext): string {
  if (!ctx) return "사주 정보 없음 (일반 해몽)"

  const elDist = ctx.elementDistribution
  const distText = elDist
    ? Object.entries(elDist).map(([el, cnt]) => `${el}:${cnt}`).join(" ")
    : ""

  return [
    `일주: ${ctx.dayPillar || ctx.ilgan}(${ctx.ilganKr}) · 오행: ${ctx.ilganElement}`,
    ctx.yongshin ? `용신: ${ctx.yongshin}` : "",
    ctx.currentDaeun ? `현재 대운: ${ctx.currentDaeun}(${ctx.daeunElement || ""})` : "",
    ctx.currentSeun ? `현재 세운: ${ctx.currentSeun}` : "",
    ctx.todayIlgin ? `오늘 일진: ${ctx.todayIlgin}(${ctx.todayIlginElement || ""})` : "",
    distText ? `오행 분포: ${distText}` : "",
  ].filter(Boolean).join(" | ")
}

// ─── Step 6+7: 최종 해몽 생성 (Claude) ────────────────────────────────────

async function generateInterpretation(
  dreamText: string,
  experienceText: string | undefined,
  symbols: Awaited<ReturnType<typeof extractDreamSymbols>>,
  retrievedChunks: RetrievedChunk[],
  sajuContext: SajuContext | undefined,
  dreamDate: string,
  anthropicKey: string
): Promise<DreamResponse> {
  const sajuText = buildSajuContextText(sajuContext)
  const symbolsText = [
    ...symbols.animals, ...symbols.nature, ...symbols.objects,
    ...symbols.actions, ...symbols.colors, ...symbols.bodily,
  ].filter(Boolean).join(", ") || "상징 분석 중"

  const literatureContext = retrievedChunks.length > 0
    ? retrievedChunks
        .filter(c => c.metadata?.source_title)
        .slice(0, 3)
        .map((c, i) => `[${i + 1}] 출처: ${c.metadata.source_title}
원문: ${c.metadata.original_text || ""}
번역: ${c.translation || ""}
해석 요약: ${c.metadata.interpretation_summary || ""}
길흉: ${c.metadata.auspiciousness || ""}`)
        .join("\n\n")
    : "고전문헌 검색 결과 없음 (일반적 명리학 해몽 원칙으로 해석)"

  const experienceContext = experienceText
    ? `\n【최근 경험 맥락】${experienceText}`
    : ""

  const systemPrompt = `당신은 동양 전통 꿈해몽과 사주명리학을 결합한 최고 전문가입니다.
『주공해몽(周公解夢)』, 『몽점일지(夢占逸旨)』 등 고전문헌의 깊은 지식을 갖추고 있습니다.

## 해몽 핵심 원칙
1. 사주 일간의 오행을 기준으로 꿈 상징의 길흉을 판단한다
2. 꿈 꾼 날의 일진과 현재 대운·세운을 반드시 반영한다
3. 용신 오행이 꿈에 강하게 나타나면 吉, 기신 오행이면 주의로 해석한다
4. 고전문헌 근거를 반드시 하나 이상 인용한다
5. 단정적 예언보다 "가능성과 에너지의 흐름"으로 서술한다
6. 어떤 꿈이든 반드시 해석한다 — "해석 불가" 응답 절대 금지
7. 명리학 용어(십성, 오행 등) 사용 시 반드시 괄호 안에 한글 설명 병기
8. 어조: 따뜻하고 수용적 구어체 ("~로 보입니다", "~에 주목해보세요")
9. 추가 정보가 필요하면 needsMoreDetail: true로 표시
10. 변/똥 꿈은 재물운의 강력한 길조로 해석한다 (주공해몽 핵심 원칙)

## 출력 형식: 반드시 아래 JSON만 출력
{
  "overallSentiment": "대길|길|중길|평|주의|흉 중 하나",
  "overallSummary": "전체 판정 한 줄 요약 (30자 이내)",
  "mainInterpretation": "사주 맥락과 고전문헌을 결합한 핵심 해몽 (200~300자)",
  "domains": [
    {"name": "재물운|직업운|연애운|건강운|가정운 중 관련 항목", "rating": "대길|길|중길|평|주의|흉", "summary": "영역별 해석 (50자 이내)"}
  ],
  "todaysAdvice": "실용적 행동 조언 (50자 이내)",
  "luckyColor": "행운색 (오행 근거 포함, 예: '흰색·은색(金 오행)')",
  "luckyNumbers": [숫자 2~3개],
  "literatureRefs": [
    {"source": "출처명", "originalText": "한문 원문", "translation": "한글 번역"}
  ],
  "needsMoreDetail": false,
  "additionalQuestion": "추가 정보 요청 (needsMoreDetail이 true일 때만)"
}`

  const userPrompt = `【꿈 날짜】${dreamDate}
【꿈 내용】${dreamText}
【감지된 상징】${symbolsText}${experienceContext}

【사주 컨텍스트】
${sajuText}

【고전문헌 검색 결과 (match_chunks 벡터 유사도 검색)】
${literatureContext}

위 정보를 종합하여 따뜻하고 깊이 있는 꿈해몽을 작성해주세요.`

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    }),
  })

  const data = await response.json()
  const raw = data.content?.[0]?.text?.trim() || ""

  let parsed: DreamResponse
  try {
    const clean = raw.includes("```") ? raw.split("```")[1].replace(/^json/i, "").trim() : raw
    parsed = JSON.parse(clean)
  } catch {
    // 파싱 실패 시 기본값 반환
    parsed = {
      overallSentiment: "평",
      overallSummary: "꿈해몽 분석 중 오류",
      mainInterpretation: raw.substring(0, 300) || "해석 결과를 가져오는 중 문제가 발생했습니다. 다시 시도해주세요.",
      domains: [],
      todaysAdvice: "잠시 후 다시 시도해보세요.",
      luckyColor: "흰색",
      luckyNumbers: [3, 7],
      literatureRefs: [],
      detectedSymbols: [],
      needsMoreDetail: false,
    }
  }

  return parsed
}

// ─── 메인 핸들러 ────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }

  try {
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

    if (!anthropicKey || !openaiKey) {
      return new Response(
        JSON.stringify({ error: "API 키 설정이 필요합니다." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const body: DreamRequest = await req.json()
    const { dreamText, experienceText, sajuContext, dreamDate } = body

    if (!dreamText?.trim()) {
      return new Response(
        JSON.stringify({ error: "꿈 내용을 입력해주세요." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      )
    }

    const today = dreamDate || new Date().toLocaleDateString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit"
    })

    // Step 1: 상징 추출
    const symbols = await extractDreamSymbols(dreamText, anthropicKey)

    // Step 2: 임베딩 쿼리 텍스트 구성
    const queryText = [
      [...symbols.animals, ...symbols.nature, ...symbols.objects, ...symbols.bodily].slice(0, 6).join(" "),
      symbols.actions.slice(0, 3).join(" "),
      symbols.emotions.slice(0, 3).join(" "),
      sajuContext ? `${sajuContext.ilgan} ${sajuContext.ilganElement}` : "",
      "꿈해몽 해석 고전문헌",
    ].filter(Boolean).join(" ")

    // Step 3+4: 임베딩 생성 + 벡터 유사도 검색 (match_chunks 사용 필수)
    let retrievedChunks: RetrievedChunk[] = []
    if (openaiKey && supabaseUrl && supabaseKey) {
      try {
        const embedding = await generateEmbedding(queryText, openaiKey)
        retrievedChunks = await searchClassicalLiterature(embedding, supabaseUrl, supabaseKey)
        console.log(`match_chunks 검색 결과: ${retrievedChunks.length}개`)
      } catch (e) {
        console.error("벡터 검색 오류 (해몽은 계속 진행):", e)
      }
    }

    // Step 5~7: 사주 컨텍스트 조립 + 프롬프트 구성 + Claude 해몽 생성
    const result = await generateInterpretation(
      dreamText,
      experienceText,
      symbols,
      retrievedChunks,
      sajuContext,
      today,
      anthropicKey
    )

    // 감지된 상징 추가
    result.detectedSymbols = [
      ...symbols.animals, ...symbols.nature, ...symbols.objects,
      ...symbols.bodily,
    ].filter(Boolean).slice(0, 8)

    return new Response(
      JSON.stringify(result),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Edge Function 오류:", error)
    return new Response(
      JSON.stringify({ error: `꿈해몽 서비스 오류: ${error}` }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    )
  }
})
