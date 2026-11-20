import React, { useState, useMemo } from 'react';
import { Entity, CurrencyCode, FinancialDrivers, StatementLineItem, FxRate } from '../../types/fpa';
import { formatCurrency, formatPercent, formatVariance, convertCurrency } from '../../utils/fpaEngine';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building,
  Sliders,
  DollarSign,
  Users,
  PieChart,
  Activity,
  Layers,
  BarChart2,
  Calendar,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { AIPredictiveInsights } from './AIPredictiveInsights';

interface ExecutiveDashboardProps {
  incomeStatement: StatementLineItem[];
  balanceSheet: StatementLineItem[];
  entities: Entity[];
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  drivers: FinancialDrivers;
  onUpdateDrivers: (drivers: FinancialDrivers) => void;
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  incomeStatement,
  balanceSheet,
  entities,
  selectedCurrency,
  fxRates,
  drivers,
  onUpdateDrivers,
  onNavigateTab,
}) => {
  const [chartViewMode, setChartViewMode] = useState<'both' | 'revenue' | 'ebitda'>('both');
  const [chartTimeframe, setChartTimeframe] = useState<'full_year' | 'h2'>('full_year');

  // Extract key metrics from current statement data (e.g. 2026-Q3 current quarter and FY2026 run-rate)
  const revItem = incomeStatement.find((i) => i.id === 'tot_rev');
  const gpItem = incomeStatement.find((i) => i.id === 'gross_profit');
  const ebitdaItem = incomeStatement.find((i) => i.id === 'ebitda');
  const netIncItem = incomeStatement.find((i) => i.id === 'net_income');
  const cashItem = balanceSheet.find((i) => i.id === 'bs_cash');

  const q3RevUsd = revItem?.values['2026-Q3'] || 63200000;
  const q3PrevUsd = revItem?.values['2025-Q3'] || 40400000;
  const q3Rev = convertCurrency(q3RevUsd, 'USD', selectedCurrency, 'average', fxRates);
  const q3Prev = convertCurrency(q3PrevUsd, 'USD', selectedCurrency, 'average', fxRates);
  const revYoy = formatVariance(q3Rev, q3Prev);

  const q3EbitdaUsd = ebitdaItem?.values['2026-Q3'] || 15750000;
  const q3Ebitda = convertCurrency(q3EbitdaUsd, 'USD', selectedCurrency, 'average', fxRates);
  const ebitdaMargin = q3Rev > 0 ? q3Ebitda / q3Rev : 0.249;

  const currentCashUsd = cashItem?.values['2026-Q3'] || 107100000;
  const currentCash = convertCurrency(currentCashUsd, 'USD', selectedCurrency, 'spot', fxRates);

  const q3NetIncUsd = netIncItem?.values['2026-Q3'] || 11210100;
  const q3NetInc = convertCurrency(q3NetIncUsd, 'USD', selectedCurrency, 'average', fxRates);

  const totalHeadcount = entities.reduce((acc, curr) => acc + curr.headcount, 0);

  // Derive granular 12-Month performance and budget targets from quarterly statements and drivers
  const monthlyData = useMemo(() => {
    const q1Rev = revItem?.values['2026-Q1'] || 50500000;
    const q2Rev = revItem?.values['2026-Q2'] || 56500000;
    const q3Rev = revItem?.values['2026-Q3'] || 63200000;
    const q4Rev = revItem?.values['2026-Q4'] || 70700000;

    const q1Ebitda = ebitdaItem?.values['2026-Q1'] || 11800000;
    const q2Ebitda = ebitdaItem?.values['2026-Q2'] || 13700000;
    const q3Ebitda = ebitdaItem?.values['2026-Q3'] || 15750000;
    const q4Ebitda = ebitdaItem?.values['2026-Q4'] || 18200000;

    // Intra-quarter seasonality distribution weights: 31%, 33%, 36%
    const monthConfigs = [
      { name: 'Jan 26', qRev: q1Rev, qEbitda: q1Ebitda, weight: 0.312, budgetRevRatio: 0.985, isActual: true },
      { name: 'Feb 26', qRev: q1Rev, qEbitda: q1Ebitda, weight: 0.330, budgetRevRatio: 0.990, isActual: true },
      { name: 'Mar 26', qRev: q1Rev, qEbitda: q1Ebitda, weight: 0.358, budgetRevRatio: 0.978, isActual: true },
      { name: 'Apr 26', qRev: q2Rev, qEbitda: q2Ebitda, weight: 0.315, budgetRevRatio: 0.982, isActual: true },
      { name: 'May 26', qRev: q2Rev, qEbitda: q2Ebitda, weight: 0.332, budgetRevRatio: 0.988, isActual: true },
      { name: 'Jun 26', qRev: q2Rev, qEbitda: q2Ebitda, weight: 0.353, budgetRevRatio: 0.975, isActual: true },
      { name: 'Jul 26', qRev: q3Rev, qEbitda: q3Ebitda, weight: 0.318, budgetRevRatio: 0.980, isActual: true },
      { name: 'Aug 26', qRev: q3Rev, qEbitda: q3Ebitda, weight: 0.334, budgetRevRatio: 0.984, isActual: true },
      { name: 'Sep 26', qRev: q3Rev, qEbitda: q3Ebitda, weight: 0.348, budgetRevRatio: 0.970, isActual: true },
      { name: 'Oct 26', qRev: q4Rev, qEbitda: q4Ebitda, weight: 0.320, budgetRevRatio: 1.000, isActual: false },
      { name: 'Nov 26', qRev: q4Rev, qEbitda: q4Ebitda, weight: 0.335, budgetRevRatio: 1.000, isActual: false },
      { name: 'Dec 26', qRev: q4Rev, qEbitda: q4Ebitda, weight: 0.345, budgetRevRatio: 1.000, isActual: false },
    ];

    const data = monthConfigs.map((cfg) => {
      const rawRevUsd = Math.round(cfg.qRev * cfg.weight);
      const rawEbitdaUsd = Math.round(cfg.qEbitda * cfg.weight);

      const targetRevUsd = Math.round(rawRevUsd * cfg.budgetRevRatio);
      const targetEbitdaUsd = Math.round(rawEbitdaUsd * (cfg.budgetRevRatio * 0.96));

      const actualRevenue = convertCurrency(rawRevUsd, 'USD', selectedCurrency, 'average', fxRates);
      const targetRevenue = convertCurrency(targetRevUsd, 'USD', selectedCurrency, 'average', fxRates);
      const actualEbitda = convertCurrency(rawEbitdaUsd, 'USD', selectedCurrency, 'average', fxRates);
      const targetEbitda = convertCurrency(targetEbitdaUsd, 'USD', selectedCurrency, 'average', fxRates);

      const revVariancePercent = targetRevenue > 0 ? ((actualRevenue - targetRevenue) / targetRevenue) * 100 : 0;
      const ebitdaVariancePercent = targetEbitda > 0 ? ((actualEbitda - targetEbitda) / targetEbitda) * 100 : 0;

      return {
        month: cfg.name,
        actualRevenue,
        targetRevenue,
        actualEbitda,
        targetEbitda,
        revVariancePercent,
        ebitdaVariancePercent,
        isActual: cfg.isActual,
      };
    });

    if (chartTimeframe === 'h2') {
      return data.slice(6); // Jul to Dec
    }
    return data;
  }, [revItem, ebitdaItem, selectedCurrency, fxRates, chartTimeframe]);

  // Aggregate YTD totals for summary banner
  const ytdMetrics = useMemo(() => {
    const closedMonths = monthlyData.filter((d) => d.isActual);
    const totalActualRev = closedMonths.reduce((sum, d) => sum + d.actualRevenue, 0);
    const totalTargetRev = closedMonths.reduce((sum, d) => sum + d.targetRevenue, 0);
    const totalActualEbitda = closedMonths.reduce((sum, d) => sum + d.actualEbitda, 0);
    const totalTargetEbitda = closedMonths.reduce((sum, d) => sum + d.targetEbitda, 0);

    const revVarianceVal = totalActualRev - totalTargetRev;
    const revVariancePct = totalTargetRev > 0 ? (revVarianceVal / totalTargetRev) * 100 : 0;

    const ebitdaVarianceVal = totalActualEbitda - totalTargetEbitda;
    const ebitdaVariancePct = totalTargetEbitda > 0 ? (ebitdaVarianceVal / totalTargetEbitda) * 100 : 0;

    return {
      totalActualRev,
      totalTargetRev,
      revVarianceVal,
      revVariancePct,
      totalActualEbitda,
      totalTargetEbitda,
      ebitdaVarianceVal,
      ebitdaVariancePct,
    };
  }, [monthlyData]);

  return (
    <div className="space-y-6">
      {/* Top Header & Sovereign Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
              ARS FP&A — Autonomous Financial Command
            </h1>
          </div>
          <p className="text-xs text-slate-200 font-semibold mt-1">
            Consolidated enterprise performance · Continuous multi-entity close FY2026 · Sovereign currency:{' '}
            <span className="font-mono text-cyan-300 font-black bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500">
              {selectedCurrency}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="flex items-center gap-1.5 bg-emerald-950 text-emerald-200 px-3 py-1.5 rounded-lg border border-emerald-600 font-mono text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Continuous Autonomous Close
          </span>
          <span className="bg-[#0f172a] text-slate-100 font-bold px-2.5 py-1.5 rounded-lg border border-slate-600 font-mono text-xs">
            ASC 810 Consolidated
          </span>
          <span className="font-mono text-cyan-200 bg-cyan-950 px-2.5 py-1.5 rounded-lg border border-cyan-700 font-bold text-xs">
            5 Ledgers Synchronized
          </span>
        </div>
      </div>

      {/* Autonomous Command & 1-Point Strategy Alert Strip */}
      <div className="relative overflow-hidden p-4 rounded-xl bg-[#0d1424] border border-cyan-500/50 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-400 via-blue-500 to-indigo-500"></div>
        <div className="flex items-center gap-3.5 pl-2">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-sm shrink-0">
            <Activity className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="text-xs font-black text-white flex items-center gap-2">
              <span className="font-display tracking-wide text-sm">Autonomous Sentinel Active: 4 Diagnostic Engines Scanning Group Ledgers</span>
              <span className="text-[10px] bg-emerald-900 text-emerald-100 px-2.5 py-0.5 rounded border border-emerald-500 font-mono font-bold">
                100% SOX-404 Compliant
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium mt-0.5">
              Automated anomaly detection, idle cash yield sweep, and M&A pro-forma simulators active in War Room.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('strategy')}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-black text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-lg shadow-cyan-950/50 transition-all whitespace-nowrap self-start md:self-auto hover:scale-[1.02] cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>Launch Strategy War Room</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* KPI Cards Row with high contrast and zero text fading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Revenue */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-cyan-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Sovereign Net Revenue (Q3)</span>
            <span className="text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 flex items-center font-mono font-bold text-xs">
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
              +{formatPercent(revYoy.diffPercent)} YoY
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {formatCurrency(q3Rev, selectedCurrency, true)}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>Annual Run-Rate (ARR):</span>
            <span className="font-mono text-cyan-300 font-black">
              {formatCurrency(q3Rev * 4, selectedCurrency, true)}
            </span>
          </div>
        </div>

        {/* Card 2: Adjusted EBITDA */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-emerald-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Operational EBITDA Yield</span>
            <span className="text-cyan-200 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700 font-mono font-bold text-xs">
              {formatPercent(ebitdaMargin)} Margin
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {formatCurrency(q3Ebitda, selectedCurrency, true)}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>Budget Outperformance:</span>
            <span className="font-mono text-emerald-400 font-black">+$2.1M Favorable</span>
          </div>
        </div>

        {/* Card 3: Treasury Cash & Runway */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-blue-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Treasury Liquidity Reserves</span>
            <span className="text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 font-mono font-bold text-xs">
              Self-Sustaining
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {formatCurrency(currentCash, selectedCurrency, true)}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>Capital Burn Status:</span>
            <span className="font-mono text-emerald-300 font-black">Net Cash Generative</span>
          </div>
        </div>

        {/* Card 4: Operating Drivers */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-purple-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-cyan-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Gross Margin & Retention</span>
            <span className="text-white font-mono text-xs font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-600">{totalHeadcount} FTE</span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {formatPercent(drivers.grossMarginTarget)} <span className="text-xs font-normal text-slate-300">GM</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>Net Dollar Retention:</span>
            <span className="font-mono text-cyan-300 font-black">{formatPercent(drivers.netRetentionRate)}</span>
          </div>
        </div>
      </div>

      {/* AIPredictiveInsights: 3 Actionable Text-Based Financial Recommendations */}
      <AIPredictiveInsights
        incomeStatement={incomeStatement}
        drivers={drivers}
        selectedCurrency={selectedCurrency}
        fxRates={fxRates}
        onUpdateDrivers={onUpdateDrivers}
      />

      {/* Main Section: Trend Visualization Chart using Recharts & Driver Sensitivity Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Month-over-Month Trend Visualization Chart with Recharts */}
        <div className="lg:col-span-2 bg-[#0c1222] border border-slate-700 p-5 rounded-xl flex flex-col justify-between shadow-xl">
          <div>
            {/* Header with Title and Mode Toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <span>Month-over-Month Revenue & EBITDA vs Budget Plan</span>
                </h2>
                <p className="text-xs text-slate-200 font-medium mt-0.5">
                  Audited actuals (Jan–Sep) and forward run-rates (Oct–Dec) benchmarked to approved enterprise budget targets.
                </p>
              </div>

              {/* Controls: View Metric & Timeframe */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {/* Metric Mode Filter */}
                <div className="flex items-center p-1 bg-[#090d19] border border-slate-600 rounded-lg">
                  <button
                    onClick={() => setChartViewMode('both')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      chartViewMode === 'both' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    onClick={() => setChartViewMode('revenue')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      chartViewMode === 'revenue' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setChartViewMode('ebitda')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      chartViewMode === 'ebitda' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    EBITDA
                  </button>
                </div>

                {/* Timeframe Filter */}
                <div className="flex items-center p-1 bg-[#090d19] border border-slate-600 rounded-lg">
                  <button
                    onClick={() => setChartTimeframe('full_year')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      chartTimeframe === 'full_year' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Full FY26
                  </button>
                  <button
                    onClick={() => setChartTimeframe('h2')}
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                      chartTimeframe === 'h2' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    H2 Horizon
                  </button>
                </div>
              </div>
            </div>

            {/* Micro KPI Adjacency Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 bg-[#080e1c] border border-slate-700 rounded-lg text-xs font-mono">
              <div>
                <span className="text-[11px] text-slate-200 font-bold block font-sans">YTD Net Revenue</span>
                <span className="font-black text-white text-sm">
                  {formatCurrency(ytdMetrics.totalActualRev, selectedCurrency, true)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-200 font-bold block font-sans">Plan Revenue Variance</span>
                <span className="font-black text-emerald-400 text-sm">
                  +{ytdMetrics.revVariancePct.toFixed(1)}% (+{formatCurrency(ytdMetrics.revVarianceVal, selectedCurrency, true)})
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-200 font-bold block font-sans">YTD EBITDA Output</span>
                <span className="font-black text-cyan-300 text-sm">
                  {formatCurrency(ytdMetrics.totalActualEbitda, selectedCurrency, true)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-200 font-bold block font-sans">EBITDA Accretion vs Plan</span>
                <span className="font-black text-emerald-400 text-sm">
                  +{ytdMetrics.ebitdaVariancePct.toFixed(1)}% (+{formatCurrency(ytdMetrics.ebitdaVarianceVal, selectedCurrency, true)})
                </span>
              </div>
            </div>

            {/* Recharts Trend Chart Container */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                    tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={(val) => {
                      if (Math.abs(val) >= 1_000_000) {
                        return `${(val / 1_000_000).toFixed(0)}M`;
                      }
                      if (Math.abs(val) >= 1_000) {
                        return `${(val / 1_000).toFixed(0)}k`;
                      }
                      return String(val);
                    }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const current = payload[0].payload;
                        return (
                          <div className="bg-[#0b1120] border-2 border-cyan-400 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 font-mono">
                            <div className="font-sans font-black text-white border-b border-slate-700 pb-1.5 flex items-center justify-between gap-4">
                              <span className="text-sm font-bold">{label}</span>
                              <span className="text-xs text-cyan-200 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-600 font-mono font-bold">
                                {current.isActual ? 'Audited Actual' : 'ARS Forecast Pro-Forma'}
                              </span>
                            </div>

                            {(chartViewMode === 'both' || chartViewMode === 'revenue') && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-cyan-300 font-sans font-bold">Delivered Revenue:</span>
                                  <span className="font-black text-white text-sm">
                                    {formatCurrency(current.actualRevenue, selectedCurrency)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-slate-200">
                                  <span className="font-sans font-semibold">Budget Baseline:</span>
                                  <span className="font-bold">{formatCurrency(current.targetRevenue, selectedCurrency)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-200 font-sans font-semibold">Variance Delta:</span>
                                  <span
                                    className={`font-black ${
                                      current.revVariancePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {current.revVariancePercent >= 0 ? '+' : ''}
                                    {current.revVariancePercent.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )}

                            {(chartViewMode === 'both' || chartViewMode === 'ebitda') && (
                              <div className="space-y-1 pt-1.5 border-t border-slate-700">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-emerald-300 font-sans font-bold">EBITDA Generated:</span>
                                  <span className="font-black text-white text-sm">
                                    {formatCurrency(current.actualEbitda, selectedCurrency)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4 text-slate-200">
                                  <span className="font-sans font-semibold">Budget Target:</span>
                                  <span className="font-bold">{formatCurrency(current.targetEbitda, selectedCurrency)}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-slate-200 font-sans font-semibold">Variance Delta:</span>
                                  <span
                                    className={`font-black ${
                                      current.ebitdaVariancePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    {current.ebitdaVariancePercent >= 0 ? '+' : ''}
                                    {current.ebitdaVariancePercent.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
                    iconType="circle"
                    formatter={(val) => <span className="text-white font-sans text-xs font-bold">{val}</span>}
                  />

                  {/* Reference line between actuals and forecast */}
                  <ReferenceLine
                    x="Sep 26"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{
                      value: 'ARS Forecast Horizon →',
                      fill: '#38bdf8',
                      fontSize: 11,
                      position: 'top',
                      fontWeight: 800
                    }}
                  />

                  {/* Revenue Bar */}
                  {(chartViewMode === 'both' || chartViewMode === 'revenue') && (
                    <Bar
                      dataKey="actualRevenue"
                      name="Actual / Projected Net Revenue"
                      fill="#0284c7"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  )}

                  {/* Revenue Target Line */}
                  {(chartViewMode === 'both' || chartViewMode === 'revenue') && (
                    <Line
                      type="monotone"
                      dataKey="targetRevenue"
                      name="Revenue Target Baseline"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3, fill: '#38bdf8' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {/* EBITDA Bar or Line */}
                  {(chartViewMode === 'both' || chartViewMode === 'ebitda') && (
                    <Line
                      type="monotone"
                      dataKey="actualEbitda"
                      name="Operational EBITDA"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981' }}
                      activeDot={{ r: 6 }}
                    />
                  )}

                  {/* EBITDA Target Line */}
                  {(chartViewMode === 'both' || chartViewMode === 'ebitda') && (
                    <Line
                      type="monotone"
                      dataKey="targetEbitda"
                      name="EBITDA Target Baseline"
                      stroke="#34d399"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={{ r: 3, fill: '#34d399' }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Footer of Left Col */}
          <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span>Recharts trend engine calibrated with dynamic driver simulation</span>
            </div>
            <button
              onClick={() => onNavigateTab('forecasting')}
              className="text-cyan-300 hover:text-white font-black flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Monte Carlo Engine</span>
              <ArrowUpRight className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Right 1 Col: Quick Driver Sensitivity Controls */}
        <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Driver Sensitivity Sandbox</span>
              </h2>
            </div>
            <p className="text-xs text-slate-200 font-medium mb-5">
              Tune strategic capital levers to test immediate consolidated propagation across the full P&L and trend charts.
            </p>

            <div className="space-y-4">
              {/* Driver 1: Headcount Growth */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-100">Quarterly Headcount Expansion</span>
                  <span className="font-mono text-cyan-300 font-black">
                    {formatPercent(drivers.headcountGrowthRate, 1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.20"
                  step="0.005"
                  value={drivers.headcountGrowthRate}
                  onChange={(e) =>
                    onUpdateDrivers({ ...drivers, headcountGrowthRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Driver 2: Net Revenue Retention */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-100">Net Dollar Retention (NDR)</span>
                  <span className="font-mono text-cyan-300 font-black">
                    {formatPercent(drivers.netRetentionRate, 1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.95"
                  max="1.35"
                  step="0.01"
                  value={drivers.netRetentionRate}
                  onChange={(e) =>
                    onUpdateDrivers({ ...drivers, netRetentionRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Driver 3: Gross Margin Target */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-100">Gross Margin Target</span>
                  <span className="font-mono text-cyan-300 font-black">
                    {formatPercent(drivers.grossMarginTarget, 1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="0.88"
                  step="0.005"
                  value={drivers.grossMarginTarget}
                  onChange={(e) =>
                    onUpdateDrivers({ ...drivers, grossMarginTarget: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Driver 4: R&D OpEx Ratio */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-slate-100">R&D Capital Investment / Rev</span>
                  <span className="font-mono text-cyan-300 font-black">
                    {formatPercent(drivers.rdOpExRatio, 1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.14"
                  max="0.32"
                  step="0.01"
                  value={drivers.rdOpExRatio}
                  onChange={(e) =>
                    onUpdateDrivers({ ...drivers, rdOpExRatio: parseFloat(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700 flex items-center justify-between text-xs">
            <button
              onClick={() =>
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
                })
              }
              className="text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
            >
              Reset to Base Model
            </button>
            <span className="text-emerald-400 font-mono font-black flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Real-Time Recalculated
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Entity Portfolio Health Breakdown Table */}
      <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white font-display">Multi-Entity Sovereign Breakdown (ASC 810)</h2>
            <p className="text-xs text-slate-200 font-medium">
              Subsidiary balance consolidation and FX translation into reporting sovereign currency ({selectedCurrency})
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('consolidation')}
            className="text-xs text-cyan-300 hover:text-white font-black flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Consolidation Workpapers</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-2 border-slate-700 text-slate-200 font-black uppercase tracking-wider text-xs font-mono bg-[#090e1b]">
                <th className="py-3 px-3">Entity & Legal Designation</th>
                <th className="py-3 px-3">Jurisdiction</th>
                <th className="py-3 px-3">Currency</th>
                <th className="py-3 px-3 text-right">Headcount</th>
                <th className="py-3 px-3 text-right">Delivered Q3 Rev ({selectedCurrency})</th>
                <th className="py-3 px-3 text-right">Group Share</th>
                <th className="py-3 px-3 text-center">SOX Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 font-medium">
              {entities.map((ent, idx) => {
                const weights = [0.46, 0.24, 0.14, 0.12, 0.04];
                const entityRev = q3Rev * (weights[idx] || 0.1);
                const percent = weights[idx] || 0.1;

                return (
                  <tr key={ent.id} className="hover:bg-slate-800 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-black text-white text-xs">{ent.name}</div>
                      <div className="text-[11px] text-cyan-300 font-mono font-bold">{ent.code} · {ent.legalType}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-100 font-bold">{ent.jurisdiction}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-cyan-200 font-black bg-cyan-950 px-2 py-0.5 rounded border border-cyan-600">
                        {ent.currency}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-100 font-bold">{ent.headcount} FTE</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-white">
                      {formatCurrency(entityRev, selectedCurrency, true)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-100 font-bold">
                      {formatPercent(percent, 1)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs text-white bg-[#0e1628] px-2.5 py-1 rounded-md border border-slate-600 font-bold">
                        <span className={`w-2 h-2 rounded-full ${ent.status === 'audited' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        <span>{ent.status === 'audited' ? 'SOX Certified' : ent.status === 'pending_close' ? 'Reviewing' : 'Active'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
