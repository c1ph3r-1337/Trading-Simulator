export type PositionSide = "LONG" | "SHORT";
export type MarginMode = "CROSS" | "ISOLATED";
export type PositionStatus = "OPEN" | "CLOSED" | "LIQUIDATED";
export type OrderType = "MARKET" | "LIMIT" | "STOP_MARKET";
export type OrderStatus = "PENDING" | "FILLED" | "CANCELLED";
export type TradeType = "OPEN" | "CLOSE" | "LIQUIDATION";

export interface SimAccount {
    user_id: string;
    balance: number;
    total_deposit: number;
    created_at: string;
    updated_at: string;
}

export interface SimPosition {
    id: string;
    user_id: string;
    symbol: string;
    side: PositionSide;
    entry_price: number;
    quantity: number;
    leverage: number;
    margin: number;
    liq_price: number;
    margin_mode: MarginMode;
    tp_price: number | null;
    sl_price: number | null;
    unrealized_pnl: number;
    status: PositionStatus;
    opened_at: string;
    closed_at: string | null;
    close_price: number | null;
}

export interface SimOrder {
    id: string;
    user_id: string;
    symbol: string;
    side: PositionSide;
    order_type: OrderType;
    price: number;
    quantity: number;
    leverage: number;
    margin_mode: MarginMode;
    tp_price: number | null;
    sl_price: number | null;
    status: OrderStatus;
    created_at: string;
}

export interface SimTrade {
    id: string;
    user_id: string;
    position_id: string | null;
    symbol: string;
    side: PositionSide;
    type: TradeType;
    price: number;
    quantity: number;
    pnl: number;
    fee: number;
    created_at: string;
}

/** 주문 생성 시 사용하는 input */
export interface OpenPositionInput {
    symbol: string;
    side: PositionSide;
    orderType: OrderType;
    price: number; // 시장가일 경우 현재가
    quantityUsdt: number; // USDT 기준 주문량
    leverage: number;
    tpPrice?: number;
    slPrice?: number;
    marginMode?: MarginMode;
}
