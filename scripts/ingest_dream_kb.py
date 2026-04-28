"""
꿈해몽 지식베이스 Supabase 적재 스크립트
=============================================
주공해몽 고전 데이터를 임베딩하여 Supabase pgvector에 적재합니다.

사용법:
  pip install openai supabase python-dotenv
  python scripts/ingest_dream_kb.py

환경변수 (.env):
  VITE_SUPABASE_URL=...
  SUPABASE_SERVICE_KEY=...   # service role key (anon key 아님)
  OPENAI_API_KEY=...
"""

import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / "app" / ".env")

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("VITE_SUPABASE_ANON_KEY", ""))
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

DATA_FILE = Path(__file__).parent.parent / "data" / "dream-kb" / "주공해몽_chunks.jsonl"
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIM = 3072

DREAM_BOOKS = [
    {
        "id": "zgm-001",
        "source_id": "zgm-001",
        "title_original": "周公解夢",
        "title_korean": "주공해몽",
        "title_english": "Duke of Zhou Dream Interpretation",
        "author": "周公",
        "dynasty_or_period": "周",
        "publication_year_estimated": "기원전 1100년경",
        "language": "한문",
        "script_type": "한문/번역",
        "reliability_grade": "A",
        "notes": "동양 꿈해몽의 원전. 꿈 상징 사전의 원형."
    },
    {
        "id": "mji-001",
        "source_id": "mji-001",
        "title_original": "夢占逸旨",
        "title_korean": "몽점일지",
        "title_english": "Essential Points of Dream Divination",
        "author": "불명",
        "dynasty_or_period": "明",
        "publication_year_estimated": "명나라 시대",
        "language": "한문",
        "script_type": "한문/번역",
        "reliability_grade": "B",
        "notes": "오행 기반 몽점 체계를 갖춘 명나라 시대 해몽서."
    }
]


def ensure_books(supabase_client) -> dict:
    """books 테이블에 꿈해몽 문헌 등록 및 ID 반환"""
    book_ids = {}
    for book in DREAM_BOOKS:
        try:
            result = supabase_client.table("books").upsert({
                "title": book["title_korean"],
                "original_title": book["title_original"],
                "author": book.get("author"),
                "dynasty": book.get("dynasty_or_period"),
                "notes": book.get("notes"),
            }, on_conflict="original_title").execute()

            lookup = supabase_client.table("books").select("id").eq(
                "original_title", book["title_original"]
            ).single().execute()
            book_ids[book["title_korean"]] = lookup.data["id"]
            print(f"  ✓ 문헌 등록: {book['title_korean']} (id={book_ids[book['title_korean']]})")
        except Exception as e:
            print(f"  ⚠ 문헌 등록 오류 ({book['title_korean']}): {e}")
            book_ids[book["title_korean"]] = None
    return book_ids


def generate_embedding(client: OpenAI, text: str, retries: int = 3) -> list[float] | None:
    """OpenAI text-embedding-3-large로 임베딩 생성"""
    for attempt in range(retries):
        try:
            response = client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text,
                dimensions=EMBEDDING_DIM,
            )
            return response.data[0].embedding
        except Exception as e:
            if attempt < retries - 1:
                wait = 2 ** attempt
                print(f"  ⚠ 임베딩 오류 (재시도 {attempt+1}/{retries}): {e}, {wait}초 대기")
                time.sleep(wait)
            else:
                print(f"  ✗ 임베딩 실패: {e}")
                return None


def load_chunks() -> list[dict]:
    """JSONL 파일에서 청크 로드"""
    chunks = []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    return chunks


def check_existing_chunks(supabase_client, source_title: str) -> set:
    """이미 적재된 chunk_id 집합 반환"""
    try:
        result = supabase_client.table("chunks").select("metadata->>chunk_id").execute()
        existing = set()
        for row in result.data:
            cid = row.get("metadata->>chunk_id") or row.get("metadata", {}).get("chunk_id")
            if cid:
                existing.add(cid)
        return existing
    except Exception as e:
        print(f"  ⚠ 기존 청크 조회 오류: {e}")
        return set()


def ingest_chunks(supabase_client, openai_client, chunks: list[dict], book_ids: dict):
    """청크 임베딩 생성 후 Supabase 적재"""
    existing = check_existing_chunks(supabase_client, "주공해몽")
    print(f"\n기존 적재 청크: {len(existing)}개")

    success, skip, fail = 0, 0, 0

    for i, chunk in enumerate(chunks):
        chunk_id = chunk.get("chunk_id", f"unknown_{i}")

        if chunk_id in existing:
            print(f"  ↷ 건너뜀 [{i+1}/{len(chunks)}]: {chunk_id} (이미 적재됨)")
            skip += 1
            continue

        print(f"  → 처리 중 [{i+1}/{len(chunks)}]: {chunk_id}")

        content = chunk.get("content", "")
        if not content:
            print(f"    ✗ 내용 없음, 건너뜀")
            fail += 1
            continue

        embedding = generate_embedding(openai_client, content)
        if embedding is None:
            fail += 1
            continue

        source_title = chunk.get("source_title", "주공해몽")
        book_id = book_ids.get(source_title)

        metadata = {
            "chunk_id": chunk_id,
            "chunk_type": chunk.get("chunk_type", "symbol_entry"),
            "section_path": chunk.get("section_path", ""),
            "symbol_tags": chunk.get("symbol_tags", []),
            "action_tags": chunk.get("action_tags", []),
            "emotion_tags": chunk.get("emotion_tags", []),
            "outcome_tags": chunk.get("outcome_tags", []),
            "domain_tags": chunk.get("domain_tags", []),
            "condition_tags": chunk.get("condition_tags", []),
            "auspiciousness": chunk.get("auspiciousness", "보통"),
            "interpretation_summary": chunk.get("interpretation_summary", ""),
            "original_text": chunk.get("original_text", ""),
            "source_title": source_title,
        }

        row = {
            "source_id": book_id,
            "content": content,
            "translation": chunk.get("translation", ""),
            "embedding": embedding,
            "metadata": metadata,
        }

        try:
            supabase_client.table("chunks").insert(row).execute()
            print(f"    ✓ 적재 완료: {chunk_id}")
            success += 1
        except Exception as e:
            print(f"    ✗ 적재 실패: {e}")
            fail += 1

        # API 레이트 리밋 방지
        time.sleep(0.3)

    print(f"\n완료: 성공={success}, 건너뜀={skip}, 실패={fail}")
    return success, skip, fail


def verify_search(supabase_client, openai_client):
    """적재 후 벡터 검색 테스트"""
    print("\n=== 벡터 검색 검증 ===")
    test_queries = [
        "황금색 똥을 누는 꿈",
        "뱀이 몸을 감는 꿈",
        "하늘을 자유롭게 날아다니는 꿈",
    ]
    for query in test_queries:
        embedding = generate_embedding(openai_client, query)
        if not embedding:
            continue
        try:
            result = supabase_client.rpc("match_chunks", {
                "query_embedding": embedding,
                "match_threshold": 0.3,
                "match_count": 3,
            }).execute()
            print(f"\n쿼리: '{query}'")
            for row in result.data:
                meta = row.get("metadata", {})
                print(f"  [{meta.get('auspiciousness','?')}] {meta.get('source_title','?')} - {meta.get('interpretation_summary','')[:60]}...")
        except Exception as e:
            print(f"  ✗ 검색 오류: {e}")


def main():
    print("=== 꿈해몽 KB 적재 시작 ===\n")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("✗ VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 환경변수가 없습니다.")
        print("  app/.env 파일을 확인하고 SUPABASE_SERVICE_KEY를 추가하세요.")
        return

    if not OPENAI_API_KEY:
        print("✗ OPENAI_API_KEY 환경변수가 없습니다.")
        print("  app/.env 파일에 OPENAI_API_KEY=sk-... 를 추가하세요.")
        return

    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

    print("1. 문헌 메타데이터 등록 중...")
    book_ids = ensure_books(supabase_client)

    print("\n2. JSONL 청크 로드 중...")
    chunks = load_chunks()
    print(f"  로드된 청크: {len(chunks)}개")

    print("\n3. 임베딩 생성 및 Supabase 적재 중...")
    ingest_chunks(supabase_client, openai_client, chunks, book_ids)

    print("\n4. 벡터 검색 검증 중...")
    verify_search(supabase_client, openai_client)

    print("\n=== 완료 ===")
    print("이제 Supabase Edge Function을 배포하여 꿈해몽 서비스를 사용할 수 있습니다.")
    print("배포: supabase functions deploy dream-interpret")


if __name__ == "__main__":
    main()
