import React, { useState, useMemo } from 'react';
import {
  Entity,
  CurrencyCode,
  FinancialDrivers,
  StatementLineItem,
  FxRate,
  AutonomousAlert,
  StrategicDealModel,
  TreasurySweepRule
} from '../../types/fpa';
import { formatCurrency, formatPercent, convertCurrency } from '../../utils/fpaEngine';
import {
  Compass,
  AlertTriangle,
  CheckCircle2,
  Zap,
  TrendingUp,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Copy,
  Printer,
  Sparkles,
  RefreshCw,
  Layers,
  Percent,
  Check,
  Flame,
  Globe
} from 'lucide-react';

interface StrategyWarRoomProps {
  entities: Entity[];
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  drivers: FinancialDrivers;
  incomeStatement: StatementLineItem[];
  balanceSheet: StatementLineItem[];
  alerts: AutonomousAlert[];
  onResolveAlert: (id: string) => void;
  onExecuteSweep: () => void;
}

export const StrategyWarRoom: React.FC<StrategyWarRoomProps> = ({
  entities,
  selectedCurrency,
  fxRates,
  drivers,
  incomeStatement,
  balanceSheet,
  alerts,
  onResolveAlert,
  onExecuteSweep,
}) => {
  const [activeStrategyTab, setActiveStrategyTab] = useState<'anomalies' | 'ma_simulator' | 'capital_allocation' | 'executive_memo'>('anomalies');
  const [copiedMemo, setCopiedMemo] = useState(false);

  // M&A Simulator State
  const [deal, setDeal] = useState<StrategicDealModel>({
    targetName: 'CloudScale Telemetry Ltd (SaaS)',
    targetRevenue: 28500000,
    targetEbitda: 6800000,
    evMultiple: 6.4,
    debtFinancingPct: 0.40,
    annualSynergies: 4200000,
    integrationCost: 2100000,
  });

  // Base current run-rates
  const currentRevUsd = incomeStatement.find((i) => i.id === 'tot_rev')?.values['2026-Q3'] ? incomeStatement.find((i) => i.id === 'tot_rev')!.values['2026-Q3'] * 4 : 252800000;
  const currentEbitdaUsd = incomeStatement.find((i) => i.id === 'ebitda')?.values['2026-Q3'] ? incomeStatement.find((i) => i.id === 'ebitda')!.values['2026-Q3'] * 4 : 63000000;
  const currentCashUsd = balanceSheet.find((i) => i.id === 'bs_cash')?.values['2026-Q3'] || 107100000;
  const currentDebtUsd = balanceSheet.find((i) => i.id === 'bs_long_debt')?.values['2026-Q3'] || 20000000;

  // Pro-Forma M&A Calculations
  const purchasePriceUsd = deal.targetRevenue * deal.evMultiple;
  const debtFinancedUsd = purchasePriceUsd * deal.debtFinancingPct;
  const equityFinancedUsd = purchasePriceUsd * (1 - deal.debtFinancingPct);
  const proFormaRevUsd = currentRevUsd + deal.targetRevenue;
  const proFormaEbitdaUsd = currentEbitdaUsd + deal.targetEbitda + deal.annualSynergies;
  const proFormaDebtUsd = currentDebtUsd + debtFinancedUsd;
  const netDebtUsd = Math.max(0, proFormaDebtUsd - (currentCashUsd - equityFinancedUsd));
  const leverageRatio = proFormaEbitdaUsd > 0 ? netDebtUsd / proFormaEbitdaUsd : 0;
  const accretionPct = proFormaEbitdaUsd > 0 ? ((proFormaEbitdaUsd - currentEbitdaUsd) / currentEbitdaUsd) * 100 : 0;

  // Generate Executive Strategic Briefing Memo
  const generatedStrategyMemo = useMemo(() => {
    const revStr = formatCurrency(convertCurrency(currentRevUsd, 'USD', selectedCurrency, 'average', fxRates), selectedCurrency, true);
    const ebitdaStr = formatCurrency(convertCurrency(currentEbitdaUsd, 'USD', selectedCurrency, 'average', fxRates), selectedCurrency, true);
    const cashStr = formatCurrency(convertCurrency(currentCashUsd, 'USD', selectedCurrency, 'spot', fxRates), selectedCurrency, true);

    return `EXECUTIVE STRATEGY BRIEFING — ARS FP&A STRATEGIC COMMAND
DATE: OCTOBER 2026 | CLASSIFICATION: CONFIDENTIAL BOARD OF DIRECTORS
SOVEREIGN REPORTING ENTITY: CONSOLIDATED APEX GROUP (${selectedCurrency})

1. FINANCIAL HEALTH & CAPITAL STRUCTURE
- Consolidated ARR Run-Rate: ${revStr} (+28.4% YoY sovereign expansion)
- Adjusted Consolidated EBITDA: ${ebitdaStr} (${formatPercent(currentEbitdaUsd / currentRevUsd)} Operating Margin)
- Total Liquid Cash & Treasury Reserves: ${cashStr} (Net cash generative, runway infinite)
- Gross Margin Target: ${formatPercent(drivers.grossMarginTarget)} | Net Retention (NDR): ${formatPercent(drivers.netRetentionRate)}

2. AUTONOMOUS ANOMALY SCANNER INSIGHTS
- ${alerts.filter((a) => !a.autoResolved).length} pending fiscal variance alerts detected across EMEA, UK, and APAC subsidiaries.
- Primary Variance: Professional services unbilled milestones & cloud infrastructure burst capacity.
- Automated self-healing reconciliation journals are queued for instant SOX 404 sign-off.

3. CAPITAL ALLOCATION & STRATEGIC PRIORITIES
- Core Recommendation: Sweep excess operational balances (€14M across EMEA/APAC) into Swiss Treasury overnight repo to yield 4.85% APY.
- M&A Evaluation Pipeline: Target "${deal.targetName}" is valued at ${formatCurrency(convertCurrency(purchasePriceUsd, 'USD', selectedCurrency, 'spot', fxRates), selectedCurrency, true)} (${deal.evMultiple}x EV) with expected EBITDA accretion of +${accretionPct.toFixed(1)}%.
- Risk Factor: EUR/USD foreign exchange volatility currently insulated through automated 60-day forward hedges at 1.0850.`;
  }, [currentRevUsd, currentEbitdaUsd, currentCashUsd, selectedCurrency, fxRates, drivers, alerts, deal, purchasePriceUsd, accretionPct]);

  const handleCopyMemo = () => {
    navigator.clipboard.writeText(generatedStrategyMemo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display flex items-center gap-2">
              <span>ARS FP&A Strategy War Room & Autonomous Control Hub</span>
            </h1>
          </div>
          <p className="text-xs text-slate-200 font-semibold mt-1">
            Institutional 1-point hub for enterprise capital allocation, autonomous anomaly healing, and board strategy.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-[#090e1b] border border-slate-600 rounded-xl shadow-lg">
          <button
            onClick={() => setActiveStrategyTab('anomalies')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeStrategyTab === 'anomalies'
                ? 'bg-cyan-600 text-white font-extrabold shadow-sm'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
            <span>Autonomous Sentinels ({alerts.filter((a) => !a.autoResolved).length})</span>
          </button>
          <button
            onClick={() => setActiveStrategyTab('ma_simulator')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeStrategyTab === 'ma_simulator'
                ? 'bg-cyan-600 text-white font-extrabold shadow-sm'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
            <span>M&A Pro-Forma Studio</span>
          </button>
          <button
            onClick={() => setActiveStrategyTab('capital_allocation')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeStrategyTab === 'capital_allocation'
                ? 'bg-cyan-600 text-white font-extrabold shadow-sm'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span>Treasury Sweeping</span>
          </button>
          <button
            onClick={() => setActiveStrategyTab('executive_memo')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeStrategyTab === 'executive_memo'
                ? 'bg-cyan-600 text-white font-extrabold shadow-sm'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Board Strategy Memo</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Autonomous Sentinels & Self-Healing Anomalies */}
      {activeStrategyTab === 'anomalies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl">
              <div className="text-xs text-slate-200 font-bold flex items-center justify-between">
                <span>Autonomous Scan Frequency</span>
                <span className="text-emerald-400 font-mono font-bold">Continuous Real-Time</span>
              </div>
              <div className="text-lg font-black font-mono text-white mt-1 font-display">4 Sentinels Active</div>
              <div className="text-xs text-slate-200 font-medium mt-1">GL Balances, Cloud Billing, Headcount & Sovereign FX</div>
            </div>

            <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl">
              <div className="text-xs text-slate-200 font-bold flex items-center justify-between">
                <span>Total Flagged Exposure</span>
                <span className="text-amber-400 font-mono font-bold">Self-Healing Available</span>
              </div>
              <div className="text-lg font-black font-mono text-amber-300 mt-1 font-display">
                {formatCurrency(
                  alerts.filter((a) => !a.autoResolved).reduce((s, a) => s + a.impactAmount, 0),
                  selectedCurrency,
                  true
                )}
              </div>
              <div className="text-xs text-slate-200 font-medium mt-1">Automated journal adjustments pre-calculated</div>
            </div>

            <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl">
              <div className="text-xs text-slate-200 font-bold flex items-center justify-between">
                <span>Autonomous Healing Success</span>
                <span className="text-emerald-400 font-mono font-bold">100% SOX-Ready</span>
              </div>
              <div className="text-lg font-black font-mono text-emerald-400 mt-1 font-display">0 Manual Interventions Required</div>
              <div className="text-xs text-slate-200 font-medium mt-1">Dual cryptographic ledger validation active</div>
            </div>
          </div>

          <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Real-Time Autonomous Financial Sentinels & Auto-Resolution Queue</span>
                </h2>
                <p className="text-xs text-slate-200 font-medium mt-0.5">
                  Continuous anomaly detection across all 5 subsidiaries with 1-click automated self-healing journals.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border transition-all ${
                    alert.autoResolved
                      ? 'bg-[#080d1a] border-slate-800'
                      : 'bg-[#080e1c] border-slate-700 hover:border-cyan-400 shadow-md'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            alert.severity === 'critical'
                              ? 'bg-rose-500'
                              : alert.severity === 'warning'
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                        ></span>
                        <h3 className="text-xs font-black text-white font-display">{alert.title}</h3>
                        <span className="text-xs font-mono font-bold text-cyan-200 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700">
                          {alert.entityCode} · {alert.detectedAt}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium">{alert.recommendedAction}</p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs text-slate-200 font-bold font-mono">Variance Exposure</div>
                        <div className="text-xs font-mono font-black text-white">
                          {formatCurrency(alert.impactAmount, alert.currency)}
                        </div>
                      </div>

                      {alert.autoResolved ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-200 bg-emerald-950 border border-emerald-600 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Resolved</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => onResolveAlert(alert.id)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md transition-all whitespace-nowrap cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-white" />
                          <span>Auto-Resolve Anomaly</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Strategic M&A Deal Simulator */}
      {activeStrategyTab === 'ma_simulator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Controls */}
            <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl space-y-4 shadow-xl">
              <h2 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between font-mono">
                <span>Target Acquisition Inputs</span>
                <span className="text-cyan-300 font-mono text-xs font-bold">Pro-Forma Studio</span>
              </h2>

              <div>
                <label className="text-xs text-slate-100 block mb-1 font-bold">Target Company & Vertical</label>
                <input
                  type="text"
                  value={deal.targetName}
                  onChange={(e) => setDeal({ ...deal, targetName: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-600 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-bold"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-bold">
                  <span className="text-slate-100">Target Revenue (ARR)</span>
                  <span className="font-mono text-cyan-300 font-black">{formatCurrency(deal.targetRevenue, 'USD', true)}</span>
                </div>
                <input
                  type="range"
                  min="5000000"
                  max="60000000"
                  step="1000000"
                  value={deal.targetRevenue}
                  onChange={(e) => setDeal({ ...deal, targetRevenue: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-bold">
                  <span className="text-slate-100">Enterprise Value Multiple</span>
                  <span className="font-mono text-cyan-300 font-black">{deal.evMultiple.toFixed(1)}x EV</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="12.0"
                  step="0.2"
                  value={deal.evMultiple}
                  onChange={(e) => setDeal({ ...deal, evMultiple: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-bold">
                  <span className="text-slate-100">Debt Financing Ratio</span>
                  <span className="font-mono text-cyan-300 font-black">{formatPercent(deal.debtFinancingPct)} Debt</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={deal.debtFinancingPct}
                  onChange={(e) => setDeal({ ...deal, debtFinancingPct: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-bold">
                  <span className="text-slate-100">Annual G&A & R&D Synergies</span>
                  <span className="font-mono text-cyan-300 font-black">{formatCurrency(deal.annualSynergies, 'USD', true)}</span>
                </div>
                <input
                  type="range"
                  min="500000"
                  max="10000000"
                  step="500000"
                  value={deal.annualSynergies}
                  onChange={(e) => setDeal({ ...deal, annualSynergies: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>
            </div>

            {/* Pro-Forma Impact Metrics */}
            <div className="lg:col-span-2 bg-[#0c1222] border border-slate-700 p-5 rounded-xl flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-white font-display">Pro-Forma Post-Merger Enterprise Horizon</h2>
                    <p className="text-xs text-slate-200 font-medium">
                      Simulated combined financial statements & leverage profile for "{deal.targetName}".
                    </p>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-200 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-600 shadow-sm">
                    +{accretionPct.toFixed(1)}% EBITDA Accretive
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-[#080e1c] border border-slate-700 rounded-lg">
                    <div className="text-xs text-slate-200 font-bold">Purchase Valuation</div>
                    <div className="text-base font-black font-mono text-white mt-1">
                      {formatCurrency(purchasePriceUsd, 'USD', true)}
                    </div>
                    <div className="text-xs text-slate-300 font-medium mt-1">{deal.evMultiple}x ARR Multiple</div>
                  </div>

                  <div className="p-3 bg-[#080e1c] border border-slate-700 rounded-lg">
                    <div className="text-xs text-slate-200 font-bold">Cash Check (Equity)</div>
                    <div className="text-base font-black font-mono text-cyan-300 mt-1">
                      {formatCurrency(equityFinancedUsd, 'USD', true)}
                    </div>
                    <div className="text-xs text-slate-300 font-medium mt-1">{formatPercent(1 - deal.debtFinancingPct)} equity funded</div>
                  </div>

                  <div className="p-3 bg-[#080e1c] border border-slate-700 rounded-lg">
                    <div className="text-xs text-slate-200 font-bold">Combined Pro-Forma ARR</div>
                    <div className="text-base font-black font-mono text-emerald-300 mt-1">
                      {formatCurrency(proFormaRevUsd, 'USD', true)}
                    </div>
                    <div className="text-xs text-slate-300 font-medium mt-1">+{formatCurrency(deal.targetRevenue, 'USD', true)} addition</div>
                  </div>

                  <div className="p-3 bg-[#080e1c] border border-slate-700 rounded-lg">
                    <div className="text-xs text-slate-200 font-bold">Pro-Forma Net Leverage</div>
                    <div className="text-base font-black font-mono text-white mt-1">
                      {leverageRatio.toFixed(2)}x
                    </div>
                    <div className="text-xs text-emerald-400 font-bold mt-1">&lt; 3.0x Target Ceiling</div>
                  </div>
                </div>

                {/* Comparative Table */}
                <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#080e1c] text-slate-200 font-black border-b border-slate-700 text-xs font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Metric</th>
                        <th className="py-2.5 px-3 text-right">Standalone Apex</th>
                        <th className="py-2.5 px-3 text-right">Acquisition Target</th>
                        <th className="py-2.5 px-3 text-right">Combined Pro-Forma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700 font-bold">
                      <tr>
                        <td className="py-2.5 px-3 text-slate-100 font-bold">Annual Revenue Run-Rate</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">{formatCurrency(currentRevUsd, 'USD', true)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">{formatCurrency(deal.targetRevenue, 'USD', true)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-white">{formatCurrency(proFormaRevUsd, 'USD', true)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-slate-100 font-bold">Adjusted EBITDA (with Synergies)</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">{formatCurrency(currentEbitdaUsd, 'USD', true)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">{formatCurrency(deal.targetEbitda + deal.annualSynergies, 'USD', true)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400">{formatCurrency(proFormaEbitdaUsd, 'USD', true)}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-slate-100 font-bold">Total Senior Debt Facility</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">{formatCurrency(currentDebtUsd, 'USD', true)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-200">+{formatCurrency(debtFinancedUsd, 'USD', true)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-white">{formatCurrency(proFormaDebtUsd, 'USD', true)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-semibold">
                <span>ARS Model Assessment: Transaction is strongly accretive with conservative post-deal leverage.</span>
                <span className="font-mono text-cyan-300 font-black">Estimated IRR: 24.8%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Treasury Sweeping & Capital Allocation */}
      {activeStrategyTab === 'capital_allocation' && (
        <div className="space-y-6">
          <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Autonomous Multi-Currency Treasury Cash Concentration & Yield Optimizer</span>
                </h2>
                <p className="text-xs text-slate-200 font-medium">
                  Daily automated sweeps of idle subsidiary liquidity to Swiss Treasury overnight repos earning 4.85% APY.
                </p>
              </div>

              <button
                onClick={onExecuteSweep}
                className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-lg shadow-md transition-all whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Execute Autonomous Global Sweep Now</span>
              </button>
            </div>

            <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#080e1c] text-slate-200 font-black border-b border-slate-700 text-xs font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Operating Entity (Source)</th>
                    <th className="py-2.5 px-3">Concentration Vault (Target)</th>
                    <th className="py-2.5 px-3 text-right">Buffer Threshold</th>
                    <th className="py-2.5 px-3 text-right">Repo Yield APY</th>
                    <th className="py-2.5 px-3 text-right">Last Swept Balance</th>
                    <th className="py-2.5 px-3 text-center">Automation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 font-bold">
                  <tr className="hover:bg-slate-800">
                    <td className="py-3 px-3 text-white font-bold">Apex EMEA Enterprise B.V. (EUR)</td>
                    <td className="py-3 px-3 text-slate-200">Apex Swiss Treasury & IP Sàrl (CHF)</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200">€5,000,000</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-black">4.85%</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-white">€3,400,000</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-200 bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Autonomous Daily</span>
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800">
                    <td className="py-3 px-3 text-white font-bold">Apex APAC Solutions Pte. Ltd. (SGD)</td>
                    <td className="py-3 px-3 text-slate-200">Apex Swiss Treasury & IP Sàrl (CHF)</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200">S$4,000,000</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-black">4.85%</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-white">S$2,200,000</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-200 bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Autonomous Daily</span>
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-800">
                    <td className="py-3 px-3 text-white font-bold">Apex UK Technology PLC (GBP)</td>
                    <td className="py-3 px-3 text-slate-200">Apex Global Holdings, Inc. (USD)</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200">£3,000,000</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-black">5.15%</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-white">£1,800,000</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-cyan-200 bg-cyan-950 px-2.5 py-1 rounded-md border border-cyan-600 font-bold">
                        <span>Autonomous Queue</span>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Autonomous Board Strategy Memo */}
      {activeStrategyTab === 'executive_memo' && (
        <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>1-Click Autonomous Executive & Board Strategy Briefing Memo</span>
              </h2>
              <p className="text-xs text-slate-200 font-medium">
                Dynamically synthesized from General Ledger actuals, driver projections, and risk sentinels.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyMemo}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                {copiedMemo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                <span>{copiedMemo ? 'Copied to Clipboard' : 'Copy Memo'}</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-[#080d1a] border border-slate-700 rounded-xl text-xs font-mono text-slate-100 font-bold leading-relaxed whitespace-pre-wrap select-all">
            {generatedStrategyMemo}
          </pre>
        </div>
      )}
    </div>
  );
};
