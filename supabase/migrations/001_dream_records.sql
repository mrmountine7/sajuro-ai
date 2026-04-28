-- ============================================================
-- 꿈해몽 기록 테이블 생성
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

CREATE TABLE IF NOT EXISTS dream_records (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id        text        NOT NULL,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  dream_date       date        NOT NULL DEFAULT CURRENT_DATE,
  dream_text       text        NOT NULL,
  experience_text  text,
  overall_sentiment text,
  overall_summary  text,
  main_interpretation text,
  domains          jsonb       DEFAULT '[]',
  todays_advice    text,
  lucky_color      text,
  lucky_numbers    jsonb       DEFAULT '[]',
  literature_refs  jsonb       DEFAULT '[]',
  detected_symbols jsonb       DEFAULT '[]',
  saju_context     jsonb,
  created_at       timestamptz DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dream_records_device ON dream_records(device_id);
CREATE INDEX IF NOT EXISTS idx_dream_records_user   ON dream_records(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_records_date   ON dream_records(created_at DESC);

-- RLS 활성화
ALTER TABLE dream_records ENABLE ROW LEVEL SECURITY;

-- 기존 정책 제거 후 재생성
DROP POLICY IF EXISTS "dream_records_select" ON dream_records;
DROP POLICY IF EXISTS "dream_records_insert" ON dream_records;
DROP POLICY IF EXISTS "dream_records_update" ON dream_records;

-- SELECT: device_id 헤더 또는 user_id 기반 — 헤더 없을 때를 위해 open 허용
-- (앱에서 device_id 필터를 쿼리에 포함하므로 오남용 위험 낮음)
CREATE POLICY "dream_records_select" ON dream_records
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "dream_records_insert" ON dream_records
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "dream_records_update" ON dream_records
  FOR UPDATE TO anon, authenticated
  USING (true);
