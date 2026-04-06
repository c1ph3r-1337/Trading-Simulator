-- 포지션에 margin_mode 컬럼 추가
ALTER TABLE sim_positions ADD COLUMN IF NOT EXISTS margin_mode TEXT DEFAULT 'CROSS';

-- 주문에 margin_mode 컬럼 추가
ALTER TABLE sim_orders ADD COLUMN IF NOT EXISTS margin_mode TEXT DEFAULT 'CROSS';

-- 레버리지를 NUMERIC으로 변경 (가중 평균 레버리지 지원)
ALTER TABLE sim_positions ALTER COLUMN leverage TYPE NUMERIC USING leverage::NUMERIC;
ALTER TABLE sim_orders ALTER COLUMN leverage TYPE NUMERIC USING leverage::NUMERIC;
