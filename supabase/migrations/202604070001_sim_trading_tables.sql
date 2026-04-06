-- 모의투자 계좌
CREATE TABLE IF NOT EXISTS sim_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 10000,
  total_deposit NUMERIC NOT NULL DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 활성 포지션
CREATE TABLE IF NOT EXISTS sim_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG','SHORT')),
  entry_price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  margin NUMERIC NOT NULL,
  liq_price NUMERIC NOT NULL,
  tp_price NUMERIC,
  sl_price NUMERIC,
  unrealized_pnl NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','LIQUIDATED')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  close_price NUMERIC
);

-- 미체결 주문
CREATE TABLE IF NOT EXISTS sim_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LONG','SHORT')),
  order_type TEXT NOT NULL CHECK (order_type IN ('LIMIT','STOP_MARKET')),
  price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  tp_price NUMERIC,
  sl_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','FILLED','CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 거래 이력
CREATE TABLE IF NOT EXISTS sim_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES sim_positions(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('OPEN','CLOSE','LIQUIDATION')),
  price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  pnl NUMERIC DEFAULT 0,
  fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sim_positions_user_status ON sim_positions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sim_orders_user_status ON sim_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sim_trades_user ON sim_trades(user_id, created_at DESC);

-- RLS 정책
ALTER TABLE sim_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_sim_accounts" ON sim_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_sim_positions" ON sim_positions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_sim_orders" ON sim_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_sim_trades" ON sim_trades FOR ALL USING (auth.uid() = user_id);
