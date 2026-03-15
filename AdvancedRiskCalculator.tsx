import React, { useState, useEffect } from 'react';
type AssetClass = 'forex' | 'stocks' | 'crypto';
interface ExchangeRates {
  [key: string]: number;
}
const AdvancedRiskCalculator: React.FC = () => {
  // --- Persistent State (localStorage) ---
  const [capital, setCapital] = useState<number>(() => {
    const saved = localStorage.getItem('trade_capital');
    return saved ? parseFloat(saved) : 10000;
  });
  const [riskPercent, setRiskPercent] = useState<number>(() => {
    const saved = localStorage.getItem('trade_risk_percent');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [baseCurrency, setBaseCurrency] = useState<string>(() => {
    const saved = localStorage.getItem('trade_base_currency');
    return saved ? saved : 'USD';
  });
  // --- Trade Setup State ---
  const [assetClass, setAssetClass] = useState<AssetClass>('forex');
  const [entryPrice, setEntryPrice] = useState<number>(1.1050);
  const [stopLoss, setStopLoss] = useState<number>(1.1000);
  // Advanced Costs
  const [spread, setSpread] = useState<number>(0.0002); // e.g., 2 pips in standard forex
  const [commission, setCommission] = useState<number>(5.00); // Flat commission
  // Partial Take Profits (Scaling Out)
  const [t1Price, setT1Price] = useState<number>(1.1100);
  const [t1Alloc, setT1Alloc] = useState<number>(50); // 50%
  const [t2Price, setT2Price] = useState<number>(1.1150);
  const [t2Alloc, setT2Alloc] = useState<number>(30); // 30%
  const [t3Price, setT3Price] = useState<number>(1.1250);
  const [t3Alloc, setT3Alloc] = useState<number>(20); // 20%
  // Exchange Rates
  const [rates, setRates] = useState<ExchangeRates>({});
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(false);
  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('trade_capital', capital.toString());
    localStorage.setItem('trade_risk_percent', riskPercent.toString());
    localStorage.setItem('trade_base_currency', baseCurrency);
  }, [capital, riskPercent, baseCurrency]);
  useEffect(() => {
    const fetchRates = async () => {
      setIsLoadingRates(true);
      try {
        // Frankfurter API for free exchange rates
        const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`);
        const data = await res.json();
        setRates(data.rates || {});
      } catch (error) {
        console.error("Failed to fetch exchange rates", error);
      } finally {
        setIsLoadingRates(false);
      }
    };
    fetchRates();
  }, [baseCurrency]);
  // --- Calculations ---
  // 1. Risk Amount
  const riskAmount = capital * (riskPercent / 100);
  // 2. Risk Per Unit (Including Spread)
  // If going long (Entry > SL), spread is added to the entry cost.
  const isLong = entryPrice >= stopLoss;
  const effectiveEntry = isLong ? entryPrice + spread : entryPrice - spread;
  const riskPerUnit = Math.abs(effectiveEntry - stopLoss);
  // 3. Position Size
  const totalUnits = riskPerUnit > 0 ? riskAmount / riskPerUnit : 0;
  // 4. Gross Profit (Calculating weighted targets)
  const calcTargetProfit = (targetPrice: number, allocationPercent: number) => {
    if (targetPrice <= 0 || allocationPercent <= 0) return 0;
    const unitsAllocated = totalUnits * (allocationPercent / 100);
    const profitPerUnit = Math.abs(targetPrice - effectiveEntry);
    return unitsAllocated * profitPerUnit;
  };
  const t1Profit = calcTargetProfit(t1Price, t1Alloc);
  const t2Profit = calcTargetProfit(t2Price, t2Alloc);
  const t3Profit = calcTargetProfit(t3Price, t3Alloc);
  const grossProfit = t1Profit + t2Profit + t3Profit;
  // 5. Net Profit (Subtracting commissions)
  const netProfit = grossProfit - commission;
  // Risk/Reward (Net)
  const riskRewardRatio = riskAmount > 0 ? (netProfit / riskAmount) : 0;
  // --- Drawdown Calculations ---
  const calcDrawdown = (streak: number) => {
    let bal = capital;
    for (let i = 0; i < streak; i++) {
      bal -= bal * (riskPercent / 100);
    }
    return bal;
  };
  const balanceAfter5 = calcDrawdown(5);
  const balanceAfter10 = calcDrawdown(10);
  // Helper for formatting currency
  const fmt = (val: number, cur: string = baseCurrency) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(val);
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Pro Risk/Reward Dashboard</h1>
          <div className="flex space-x-2 mt-4 md:mt-0">
            {['forex', 'stocks', 'crypto'].map((type) => (
              <button
                key={type}
                onClick={() => setAssetClass(type as AssetClass)}
                className={`px-4 py-2 rounded-md text-sm font-semibold capitalize transition-colors ${
                  assetClass === type ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-8 space-y-6">
            {/* Account Settings */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <span className="bg-indigo-500/20 text-indigo-400 p-1 rounded mr-2">⚙️</span> Account & Risk Parameters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Base Currency</label>
                  <select 
                    value={baseCurrency} 
                    onChange={(e) => setBaseCurrency(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Initial Capital</label>
                  <input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Risk %</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                    <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </section>
            {/* Trade Execution Setup */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <span className="bg-blue-500/20 text-blue-400 p-1 rounded mr-2">📈</span> Trade Execution
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Entry Price</label>
                    <input type="number" step="0.0001" value={entryPrice} onChange={(e) => setEntryPrice(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Stop Loss</label>
                    <input type="number" step="0.0001" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" />
                  </div>
                </div>
                <div className="space-y-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Spread (Price Units)</label>
                    <input type="number" step="0.0001" value={spread} onChange={(e) => setSpread(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Total Commission ({baseCurrency})</label>
                    <input type="number" step="1" value={commission} onChange={(e) => setCommission(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2.5 text-white" />
                  </div>
                </div>
              </div>
              {/* Targets */}
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Partial Take-Profits (Scaling Out)</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Target 1', price: t1Price, setPrice: setT1Price, alloc: t1Alloc, setAlloc: setT1Alloc },
                    { label: 'Target 2', price: t2Price, setPrice: setT2Price, alloc: t2Alloc, setAlloc: setT2Alloc },
                    { label: 'Target 3', price: t3Price, setPrice: setT3Price, alloc: t3Alloc, setAlloc: setT3Alloc }
                  ].map((t, idx) => (
                    <div key={idx} className="flex items-center space-x-4 bg-gray-800/30 p-2 rounded border border-gray-800">
                      <span className="w-20 text-xs font-bold text-gray-400">{t.label}</span>
                      <div className="flex-1">
                        <input type="number" step="0.0001" value={t.price} onChange={(e) => t.setPrice(Number(e.target.value))} placeholder="Price" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white" />
                      </div>
                      <div className="w-24 relative">
                        <input type="number" value={t.alloc} onChange={(e) => t.setAlloc(Number(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white text-right pr-6" />
                        <span className="absolute right-2 top-2 text-xs text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                  {t1Alloc + t2Alloc + t3Alloc !== 100 && (
                    <p className="text-xs text-red-400 mt-2">Warning: Allocations should sum to 100% (Currently {t1Alloc + t2Alloc + t3Alloc}%)</p>
                  )}
                </div>
              </div>
            </section>
          </div>
          {/* Right Column: Results & Analytics */}
          <div className="lg:col-span-4 space-y-6">
            {/* Sizing Results */}
            <section className="bg-gradient-to-br from-indigo-900/40 to-gray-900 border border-indigo-500/30 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Position Sizing</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-gray-700/50 pb-2">
                  <span className="text-sm text-gray-400">Total Capital Risk</span>
                  <span className="text-xl font-bold text-red-400">{fmt(riskAmount)}</span>
                </div>
                <div className="pt-2">
                  <span className="block text-sm text-gray-400 mb-1">Required Position Size</span>
                  <span className="text-2xl font-black text-white">{totalUnits.toLocaleString(undefined, { maximumFractionDigits: 2 })} Units</span>
                  {assetClass === 'forex' && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-gray-800/80 p-2 rounded border border-gray-700">
                        <span className="block text-gray-500">Standard</span>
                        <span className="font-bold text-gray-300">{(totalUnits / 100000).toFixed(2)}</span>
                      </div>
                      <div className="bg-gray-800/80 p-2 rounded border border-gray-700">
                        <span className="block text-gray-500">Mini</span>
                        <span className="font-bold text-gray-300">{(totalUnits / 10000).toFixed(2)}</span>
                      </div>
                      <div className="bg-gray-800/80 p-2 rounded border border-gray-700">
                        <span className="block text-gray-500">Micro</span>
                        <span className="font-bold text-gray-300">{(totalUnits / 1000).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
            {/* Profitability Results */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Profitability (Net)</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Gross Profit</span>
                  <span className="text-sm font-medium text-gray-300">{fmt(grossProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Deductions (Comm)</span>
                  <span className="text-sm font-medium text-red-400">-{fmt(commission)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-800 pt-3">
                  <span className="text-sm font-bold text-white">Net Profit</span>
                  <span className="text-2xl font-black text-green-400">{fmt(netProfit)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 bg-gray-800/50 p-2 rounded">
                  <span className="text-xs text-gray-400">Net Risk/Reward</span>
                  <span className="text-sm font-bold text-indigo-400">1 : {riskRewardRatio.toFixed(2)}</span>
                </div>
              </div>
            </section>
            {/* Multi-Currency Conversion */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
               <h2 className="text-sm font-semibold text-white mb-3 flex items-center justify-between">
                <span>Global Currency Value</span>
                {isLoadingRates && <span className="text-xs text-indigo-400 animate-pulse">Updating...</span>}
              </h2>
              <div className="space-y-2">
                {['USD', 'EUR', 'GBP', 'JPY'].filter(c => c !== baseCurrency).map(currency => {
                  const rate = rates[currency];
                  if (!rate) return null;
                  const convertedProfit = netProfit * rate;
                  return (
                    <div key={currency} className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">{currency}</span>
                      <span className="font-medium text-green-400/80">{fmt(convertedProfit, currency)}</span>
                    </div>
                  );
                })}
              </div>
            </section>
            {/* Risk Management / Drawdown Table */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-sm font-semibold text-white mb-3 text-red-400">Risk Management (Drawdown)</h2>
              <p className="text-xs text-gray-500 mb-3">Account balance after consecutive losses at current risk %.</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between bg-gray-800/40 p-2 rounded border border-gray-800/50">
                  <span className="text-gray-400">5 Losing Streak</span>
                  <span className="font-bold text-gray-300">{fmt(balanceAfter5)} <span className="text-red-400 text-xs ml-1">(-{((1 - (balanceAfter5/capital))*100).toFixed(1)}%)</span></span>
                </div>
                <div className="flex justify-between bg-gray-800/40 p-2 rounded border border-gray-800/50">
                  <span className="text-gray-400">10 Losing Streak</span>
                  <span className="font-bold text-gray-300">{fmt(balanceAfter10)} <span className="text-red-400 text-xs ml-1">(-{((1 - (balanceAfter10/capital))*100).toFixed(1)}%)</span></span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AdvancedRiskCalculator;