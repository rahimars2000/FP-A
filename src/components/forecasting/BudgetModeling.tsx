import React, { useState } from 'react';
import { FinancialDrivers, CurrencyCode, FxRate, StatementLineItem, ScenarioType, MonteCarloTrialResult } from '../../types/fpa';
import { formatCurrency, formatPercent, runMonteCarloSimulation, convertCurrency } from '../../utils/fpaEngine';
import {
  TrendingUp,
  Play,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Save,
  CheckCircle,
  HelpCircle,
  BarChart3,
  SlidersHorizontal,
  Layers
} from 'lucide-react';

interface BudgetModelingProps {
  drivers: FinancialDrivers;
  onUpdateDrivers: (drivers: FinancialDrivers) => void;
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  incomeStatement: StatementLineItem[];
  onCommitScenario: (scenarioName: string) => void;
}

export const BudgetModeling: React.FC<BudgetModelingProps> = ({
  drivers,
  onUpdateDrivers,
  selectedCurrency,
  fxRates,
  incomeStatement,
  onCommitScenario,
}) => {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('base');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<MonteCarloTrialResult | null>(() =>
    runMonteCarloSimulation(drivers, 107100000, 1000)
  );
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  const handleScenarioChange = (scenario: ScenarioType) => {
    setActiveScenario(scenario);
    if (scenario === 'bull') {
      onUpdateDrivers({
        ...drivers,
        headcountGrowthRate: 0.11,
        netRetentionRate: 1.26,
        grossMarginTarget: 0.84,
        rdOpExRatio: 0.20,
      });
    } else if (scenario === 'bear') {
      onUpdateDrivers({
        ...drivers,
        headcountGrowthRate: 0.03,
        netRetentionRate: 1.05,
        grossMarginTarget: 0.76,
        rdOpExRatio: 0.25,
      });
    } else if (scenario === 'base') {
      onUpdateDrivers({
        headcountGrowthRate: 0.075,
        revenuePerFte: 285000,
        netRetentionRate: 1.18,
        cacPaybackMonths: 12.4,
        grossMarginTarget: 0.81,
        rdOpExRatio: 0.22,
        smOpExRatio: 0.27,
        gaOpExRatio: 0.11,
        capexRevenueRatio: 0.038,
        dsoDays: 42,
        dpoDays: 34,
        inflationIndex: 0.024,
      });
    }
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const result = runMonteCarloSimulation(drivers, 107100000, 1000);
      setSimulationResult(result);
      setIsSimulating(false);
    }, 400);
  };

  const handleCommit = () => {
    const scenarioName =
      activeScenario === 'base'
        ? 'Base Plan 2026'
        : activeScenario === 'bull'
        ? 'Bull Case Expansion'
        : activeScenario === 'bear'
        ? 'Bear Stress Case'
        : 'Custom Adjusted Drivers';

    onCommitScenario(scenarioName);
    setCommitMessage(`Scenario "${scenarioName}" committed to audit log and primary ledger.`);
    setTimeout(() => setCommitMessage(null), 4000);
  };

  // Convert simulated results to selected reporting currency
  const p10Rev = simulationResult ? convertCurrency(simulationResult.p10Revenue, 'USD', selectedCurrency, 'average', fxRates) : 0;
  const p50Rev = simulationResult ? convertCurrency(simulationResult.p50Revenue, 'USD', selectedCurrency, 'average', fxRates) : 0;
  const p90Rev = simulationResult ? convertCurrency(simulationResult.p90Revenue, 'USD', selectedCurrency, 'average', fxRates) : 0;

  const p10Ebitda = simulationResult ? convertCurrency(simulationResult.p10Ebitda, 'USD', selectedCurrency, 'average', fxRates) : 0;
  const p50Ebitda = simulationResult ? convertCurrency(simulationResult.p50Ebitda, 'USD', selectedCurrency, 'average', fxRates) : 0;
  const p90Ebitda = simulationResult ? convertCurrency(simulationResult.p90Ebitda, 'USD', selectedCurrency, 'average', fxRates) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Scenario Tab Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-display">
              ARS FP&A — Predictive Horizon & Monte Carlo Simulation
            </h1>
          </div>
          <p className="text-xs text-slate-200 mt-1">
            Driver-based algorithmic financial forecasting with integrated 1,000-iteration probability engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scenario Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => handleScenarioChange('base')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeScenario === 'base'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm'
                  : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Base Plan
            </button>
            <button
              onClick={() => handleScenarioChange('bull')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeScenario === 'bull'
                  ? 'bg-slate-800 text-emerald-300 shadow-sm'
                  : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Bull Case
            </button>
            <button
              onClick={() => handleScenarioChange('bear')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeScenario === 'bear'
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Bear Stress
            </button>
            <button
              onClick={() => handleScenarioChange('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeScenario === 'custom'
                  ? 'bg-slate-800 text-purple-300 shadow-sm'
                  : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Custom Sandbox
            </button>
          </div>

          {/* Commit Button */}
          <button
            onClick={handleCommit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lock Scenario</span>
          </button>
        </div>
      </div>

      {commitMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{commitMessage}</span>
        </div>
      )}

      {/* Driver Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Group 1: Growth & Topline Levers */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Growth & Customer Retention</span>
            <span className="font-mono text-cyan-400 text-[11px]">Topline Levers</span>
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">Net Dollar Retention (NDR)</span>
                <span className="font-mono font-semibold text-cyan-300">{formatPercent(drivers.netRetentionRate)}</span>
              </div>
              <input
                type="range"
                min="0.95"
                max="1.35"
                step="0.005"
                value={drivers.netRetentionRate}
                onChange={(e) => onUpdateDrivers({ ...drivers, netRetentionRate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>95% (Downside)</span>
                <span>135% (Best-in-Class)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">Gross Margin Target</span>
                <span className="font-mono font-semibold text-cyan-300">{formatPercent(drivers.grossMarginTarget)}</span>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.88"
                step="0.005"
                value={drivers.grossMarginTarget}
                onChange={(e) => onUpdateDrivers({ ...drivers, grossMarginTarget: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>70% (Compute Heavy)</span>
                <span>88% (Pure Software)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">CAC Payback Target</span>
                <span className="font-mono font-semibold text-cyan-300">{drivers.cacPaybackMonths.toFixed(1)} mo</span>
              </div>
              <input
                type="range"
                min="6"
                max="24"
                step="0.5"
                value={drivers.cacPaybackMonths}
                onChange={(e) => onUpdateDrivers({ ...drivers, cacPaybackMonths: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>6 mo (Hyper-efficient)</span>
                <span>24 mo (High Burn)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Group 2: Headcount & Productivity */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Capacity & Headcount</span>
            <span className="font-mono text-cyan-400 text-[11px]">Talent Levers</span>
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">Quarterly Headcount Growth</span>
                <span className="font-mono font-semibold text-cyan-300">{formatPercent(drivers.headcountGrowthRate)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.20"
                step="0.005"
                value={drivers.headcountGrowthRate}
                onChange={(e) => onUpdateDrivers({ ...drivers, headcountGrowthRate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>1.0% (Freeze)</span>
                <span>20.0% (Aggressive)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">Annual Revenue per FTE</span>
                <span className="font-mono font-semibold text-cyan-300">${(drivers.revenuePerFte / 1000).toFixed(0)}K</span>
              </div>
              <input
                type="range"
                min="180000"
                max="450000"
                step="5000"
                value={drivers.revenuePerFte}
                onChange={(e) => onUpdateDrivers({ ...drivers, revenuePerFte: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>$180K</span>
                <span>$450K (High Automation)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">R&D Investment Ratio</span>
                <span className="font-mono font-semibold text-cyan-300">{formatPercent(drivers.rdOpExRatio)}</span>
              </div>
              <input
                type="range"
                min="0.12"
                max="0.32"
                step="0.005"
                value={drivers.rdOpExRatio}
                onChange={(e) => onUpdateDrivers({ ...drivers, rdOpExRatio: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>12%</span>
                <span>32% (Deep Tech)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Group 3: Working Capital & Inflation */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Working Capital & Macro</span>
            <span className="font-mono text-cyan-400 text-[11px]">Balance Sheet</span>
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">Days Sales Outstanding (DSO)</span>
                <span className="font-mono font-semibold text-cyan-300">{drivers.dsoDays} Days</span>
              </div>
              <input
                type="range"
                min="25"
                max="75"
                step="1"
                value={drivers.dsoDays}
                onChange={(e) => onUpdateDrivers({ ...drivers, dsoDays: parseInt(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>25 Days (Fast Cash)</span>
                <span>75 Days (Slow Terms)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">CapEx / Revenue Ratio</span>
                <span className="font-mono font-semibold text-cyan-300">{formatPercent(drivers.capexRevenueRatio)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.08"
                step="0.002"
                value={drivers.capexRevenueRatio}
                onChange={(e) => onUpdateDrivers({ ...drivers, capexRevenueRatio: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>1.0% (Asset-Light)</span>
                <span>8.0% (DC Buildout)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-200">OpEx Wage Inflation Factor</span>
                <span className="font-mono font-semibold text-cyan-300">{formatPercent(drivers.inflationIndex)}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.06"
                step="0.002"
                value={drivers.inflationIndex}
                onChange={(e) => onUpdateDrivers({ ...drivers, inflationIndex: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded"
              />
              <div className="flex justify-between text-[10px] text-slate-200 mt-1 font-mono">
                <span>1.0% (Mild)</span>
                <span>6.0% (Elevated)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monte Carlo Simulation Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Predictive Analytics: Monte Carlo Simulation (1,000 Iterations)</span>
            </h2>
            <p className="text-xs text-slate-200">
              Evaluates confidence intervals across stochastic market variables for FY2026.
            </p>
          </div>
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Computing Iterations...' : 'Re-Run Simulation (1k Trials)'}</span>
          </button>
        </div>

        {/* Statistical Percentiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* P10 Conservative */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="text-[11px] text-slate-200 mb-1 flex items-center justify-between">
              <span>P10 Confidence (Downside Floor)</span>
              <span className="font-mono text-amber-400">90% Beat Probability</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatCurrency(p10Rev, selectedCurrency, true)}
            </div>
            <div className="text-[11px] text-slate-200 mt-2 flex justify-between border-t border-slate-800/80 pt-1.5">
              <span>EBITDA Floor:</span>
              <span className="font-mono text-slate-300 font-semibold">{formatCurrency(p10Ebitda, selectedCurrency, true)}</span>
            </div>
          </div>

          {/* P50 Median */}
          <div className="bg-slate-950/70 border border-cyan-800/50 rounded-lg p-3.5">
            <div className="text-[11px] text-cyan-300 mb-1 flex items-center justify-between">
              <span>P50 Expected Median (Base Case)</span>
              <span className="font-mono text-cyan-400">50% Probability</span>
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {formatCurrency(p50Rev, selectedCurrency, true)}
            </div>
            <div className="text-[11px] text-slate-200 mt-2 flex justify-between border-t border-slate-800/80 pt-1.5">
              <span>Median EBITDA:</span>
              <span className="font-mono text-cyan-200 font-semibold">{formatCurrency(p50Ebitda, selectedCurrency, true)}</span>
            </div>
          </div>

          {/* P90 Bull */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
              <span>P90 Bull Case (Top 10% Upside)</span>
              <span className="font-mono text-emerald-400">10% Outlier</span>
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatCurrency(p90Rev, selectedCurrency, true)}
            </div>
            <div className="text-[11px] text-slate-400 mt-2 flex justify-between border-t border-slate-800/80 pt-1.5">
              <span>Bull EBITDA:</span>
              <span className="font-mono text-slate-300 font-semibold">{formatCurrency(p90Ebitda, selectedCurrency, true)}</span>
            </div>
          </div>
        </div>

        {/* Probability Density Histogram */}
        {simulationResult && (
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>FY2026 Revenue Distribution Curve (Normal-Log Distribution)</span>
              <span className="text-[11px] text-slate-400 font-normal">N = 1,000 trials</span>
            </div>
            <div className="h-28 flex items-end gap-2 pt-4 pb-2 border-b border-slate-800">
              {simulationResult.distributionHistogram.map((bin, idx) => {
                const maxCount = Math.max(...simulationResult.distributionHistogram.map((b) => b.count));
                const heightPercent = Math.max(10, Math.round((bin.count / maxCount) * 100));
                const isCenter = idx >= 3 && idx <= 5;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {bin.count} trials
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t transition-all ${
                        isCenter ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    ></div>
                    <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                      {bin.binLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
