-- ============================================================
-- 정밀분석 저장 + Q&A 테이블
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- 정밀분석 결과 저장
CREATE TABLE IF NOT EXISTS precision_analyses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        text        NOT NULL,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_name     text        NOT NULL,
  saju_context     text,                          -- 사주 컨텍스트 (Q&A 재활용)
  saju_summary     text,                          -- 전체 사주 요약
  sections         jsonb       DEFAULT '[]',      -- 섹션별 항목 + 요약 + 상세
  selected_items   jsonb       DEFAULT '[]',      -- 체크했던 항목 ID 목록
  created_at       timestamptz DEFAULT now()
);

-- Q&A 스레드 (분석 항목별 최대 10회)
CREATE TABLE IF NOT EXISTS precision_qa (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id      uuid        NOT NULL REFERENCES precision_analyses(id) ON DELETE CASCADE,
  device_id        text        NOT NULL,
  item_id          text,                          -- 어떤 항목에 대한 질문인지 (null = 전체)
  item_label       text,
  question         text        NOT NULL,
  answer           text        NOT NULL,
  round_number     smallint    DEFAULT 1,         -- 1~10회차
  created_at       timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_precision_analyses_device ON precision_analyses(device_id);
CREATE INDEX IF NOT EXISTS idx_precision_analyses_user   ON precision_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_precision_analyses_date   ON precision_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_precision_qa_analysis     ON precision_qa(analysis_id);

-- RLS
ALTER TABLE precision_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE precision_qa       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "precision_analyses_all" ON precision_analyses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "precision_qa_all"       ON precision_qa       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
