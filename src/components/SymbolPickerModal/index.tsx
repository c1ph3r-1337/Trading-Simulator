"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

const DEFAULT_SYMBOLS = [
    "1inchusdt", "aaveusdt", "adausdt", "agixusdt", "algousdt",
    "ankrusdt", "apeusdt", "aptusdt", "arbusdt", "arkusdt",
    "arkmusdt", "arumbusdt", "atomusdt", "avaxusdt", "axsusdt",
    "bchusdt", "beamxusdt", "blurusdt", "bnbusdt", "bonkusdt",
    "btcusdt", "celousdt", "chzusdt", "ckbusdt", "crvusdt",
    "dogeusdt", "dotusdt", "dydusdt", "egldusdt", "enjusdt",
    "ensusdt", "eosusdt", "etcusdt", "ethusdt", "fetusdt",
    "filusdt", "flokiusdt", "flowusdt", "ftmusdt", "galausdt",
    "grtusdt", "hbarusdt", "idexusdt", "imxusdt", "injusdt",
    "iostusdt", "iotausdt", "iotxusdt", "jasmyusdt", "jupusdt",
    "kasusdt", "kavausdt", "kncusdt", "ksmusdt", "ldousdt",
    "linkusdt", "lrcusdt", "ltcusdt", "lunausdt", "manausdt",
    "maskusdt", "maticusdt", "maviausdt", "metisusdt", "minausdt",
    "mkrusdt", "nearusdt", "neousdt", "notusdt", "oceanusdt",
    "omgusdt", "ondousdt", "opusdt", "ordiusdt", "paxgusdt",
    "pendleusdt", "pepeusdt", "pythusdt", "qtumusdt", "rdntusdt",
    "renderusdt", "rswfusdt", "runeusdt", "rvnusdt", "sandusdt",
    "seiusdt", "shibusdt", "snxusdt", "solusdt", "stiusdt",
    "stjusdt", "stxusdt", "suiusdt", "thetausdt", "tiausdt",
    "tonusdt", "trxusdt", "uniusdt", "vetusdt", "wavesusdt",
    "wicpusdt", "wldusdt", "woousdt", "xrpusdt", "xtzusdt",
    "zecusdt", "zenusdt", "zilusdt", "zrxusdt",
];

const POPULAR_SYMBOLS = [
    "btcusdt", "ethusdt", "bnbusdt", "xrpusdt", "solusdt",
    "dogeusdt", "adausdt", "avaxusdt", "dotusdt", "maticusdt",
];

const SYMBOL_NAMES: Record<string, string> = {
    "1inchusdt": "1inch", "aaveusdt": "Aave", "adausdt": "Cardano", "agixusdt": "SingularityNET",
    "algousdt": "Algorand", "ankrusdt": "Ankr", "apeusdt": "ApeCoin", "aptusdt": "Aptos",
    "arbusdt": "Arbitrum", "arkusdt": "ARK", "arkmusdt": "Arkham", "arumbusdt": "Arweave",
    "atomusdt": "Cosmos", "avaxusdt": "Avalanche", "axsusdt": "Axie Infinity", "bchusdt": "Bitcoin Cash",
    "beamxusdt": "BeamX", "blurusdt": "Blur", "bnbusdt": "BNB", "bonkusdt": "Bonk",
    "btcusdt": "Bitcoin", "celousdt": "Celo", "chzusdt": "Chiliz", "ckbusdt": "Nervos",
    "crvusdt": "Curve", "dogeusdt": "Dogecoin", "dotusdt": "Polkadot", "dydusdt": "dYdX",
    "egldusdt": "MultiversX", "enjusdt": "Enjin", "ensusdt": "ENS", "eosusdt": "EOS",
    "etcusdt": "Ethereum Classic", "ethusdt": "Ethereum", "fetusdt": "Fetch.ai", "filusdt": "Filecoin",
    "flokiusdt": "Floki", "flowusdt": "Flow", "ftmusdt": "Fantom", "galausdt": "Gala",
    "grtusdt": "The Graph", "hbarusdt": "Hedera", "idexusdt": "IDEX", "imxusdt": "Immutable X",
    "injusdt": "Injective", "iostusdt": "IOST", "iotausdt": "IOTA", "iotxusdt": "IoTeX",
    "jasmyusdt": "Jasmy", "jupusdt": "Jupiter", "kasusdt": "Kaspa", "kavausdt": "Kava",
    "kncusdt": "Kyber", "ksmusdt": "Kusama", "ldousdt": "Lido DAO", "linkusdt": "Chainlink",
    "lrcusdt": "Loopring", "ltcusdt": "Litecoin", "lunausdt": "Terra", "manausdt": "Decentraland",
    "maskusdt": "Mask", "maticusdt": "Polygon", "maviausdt": "Mavia", "metisusdt": "Metis",
    "minausdt": "Mina", "mkrusdt": "Maker", "nearusdt": "NEAR", "neousdt": "NEO",
    "notusdt": "Notcoin", "oceanusdt": "Ocean", "omgusdt": "OMG", "ondousdt": "Ondo",
    "opusdt": "Optimism", "ordiusdt": "ORDI", "paxgusdt": "PAX Gold", "pendleusdt": "Pendle",
    "pepeusdt": "Pepe", "pythusdt": "Pyth", "qtumusdt": "QTUM", "rdntusdt": "Radiant",
    "renderusdt": "Render", "rswfusdt": "Raydium", "runeusdt": "THORChain", "rvnusdt": "Ravencoin",
    "sandusdt": "Sandbox", "seiusdt": "Sei", "shibusdt": "Shiba Inu", "snxusdt": "Synthetix",
    "solusdt": "Solana", "stiusdt": "SingularityDAO", "stjusdt": "Stratis", "stxusdt": "Stacks",
    "suiusdt": "Sui", "thetausdt": "Theta", "tiausdt": "Celestia", "tonusdt": "Toncoin",
    "trxusdt": "TRON", "uniusdt": "Uniswap", "vetusdt": "VeChain", "wavesusdt": "Waves",
    "wicpusdt": "ICP", "wldusdt": "Worldcoin", "woousdt": "WOO", "xrpusdt": "XRP",
    "xtzusdt": "Tezos", "zecusdt": "Zcash", "zenusdt": "Horizen", "zilusdt": "Zilliqa",
    "zrxusdt": "0x",
};

type Props = {
    open: boolean;
    initialSymbol: string;
    onClose: () => void;
    onSelect: (symbol: string) => void;
    symbols?: string[];
};

export default function SymbolPickerModal({
    open,
    initialSymbol,
    onClose,
    onSelect,
    symbols = DEFAULT_SYMBOLS,
}: Props) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(initialSymbol.toLowerCase());
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) {
            setSelected(initialSymbol.toLowerCase());
            setSearch("");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open, initialSymbol]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    const filteredSymbols = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return symbols;
        return symbols.filter((s) => {
            const symbol = s.toLowerCase();
            const name = SYMBOL_NAMES[s]?.toLowerCase() || "";
            return symbol.includes(query) || name.includes(query);
        });
    }, [search, symbols]);

    const popularFiltered = useMemo(() => {
        if (search.trim()) return [];
        return POPULAR_SYMBOLS.filter((s) => symbols.includes(s));
    }, [search, symbols]);

    const otherSymbols = useMemo(() => {
        if (search.trim()) return filteredSymbols;
        return filteredSymbols.filter((s) => !POPULAR_SYMBOLS.includes(s));
    }, [search, filteredSymbols]);

    const handleSelect = (symbol: string) => {
        onSelect(symbol);
        onClose();
    };

    const SymbolButton = ({ symbol }: { symbol: string }) => {
        const isSelected = selected === symbol;
        const displaySymbol = symbol.replace("usdt", "").toUpperCase();
        const name = SYMBOL_NAMES[symbol] || displaySymbol;

        return (
            <button
                onClick={() => handleSelect(symbol)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-neutral-800/50 border-neutral-700/50 text-neutral-300 hover:bg-neutral-700/50 hover:border-neutral-600"
                }`}
            >
                <span className="text-sm font-semibold">{displaySymbol}</span>
                <span className="text-[10px] text-neutral-500 mt-0.5 truncate w-full text-center">
                    {name}
                </span>
            </button>
        );
    };

    const modalContent = (
        <AnimatePresence>
            {open && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative w-full max-w-[480px] max-h-[70vh] rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
                    >
                        <div className="p-4 border-b border-neutral-800">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-white">Select coin</h3>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="BTC, Ethereum"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-500 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {popularFiltered.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium text-amber-400">Popular</span>
                                        <div className="flex-1 h-px bg-neutral-800" />
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {popularFiltered.map((s) => <SymbolButton key={s} symbol={s} />)}
                                    </div>
                                </div>
                            )}

                            <div>
                                {!search.trim() && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-medium text-neutral-500">All</span>
                                        <div className="flex-1 h-px bg-neutral-800" />
                                    </div>
                                )}
                                {otherSymbols.length > 0 ? (
                                    <div className="grid grid-cols-5 gap-2">
                                        {otherSymbols.map((s) => <SymbolButton key={s} symbol={s} />)}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center text-neutral-500 text-sm">No results found</div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 border-t border-neutral-800 bg-neutral-900/80">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-neutral-500">
                                    Current selection: <span className="text-amber-300 font-medium">{selected.replace("usdt", "").toUpperCase()}</span>
                                </span>
                                <span className="text-neutral-600 text-xs">{filteredSymbols.length} coins</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    if (!mounted) return null;
    return createPortal(modalContent, document.body);
}
