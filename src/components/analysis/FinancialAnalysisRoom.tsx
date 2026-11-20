import React, { useState, useMemo } from 'react';
import { Entity, CurrencyCode, FinancialDrivers, StatementLineItem, FxRate } from '../../types/fpa';
import { formatCurrency, formatPercent, formatVariance, convertCurrency, ALL_PERIODS } from '../../utils/fpaEngine';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Sliders,
  SlidersHorizontal,
  BarChart2,
  PieChart as PieChartIcon,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Cpu,
  Server,
  Building2,
  Users,
  Filter,
  RefreshCw,
  Zap,
  Sparkles,
  Lock,
  Unlock,
  Play,
  RotateCcw,
  Check,
  Percent,
  Sliders as SlidersIcon,
  LineChart
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface FinancialAnalysisRoomProps {
  incomeStatement: StatementLineItem[];
  balanceSheet: StatementLineItem[];
  entities: Entity[];
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  drivers: FinancialDrivers;
  onUpdateDrivers: (drivers: FinancialDrivers) => void;
  onNavigateTab: (tab: string) => void;
}

interface OverheadCategory {
  id: string;
  name: string;
  department: 'R&D' | 'S&M' | 'G&A' | 'COGS';
  fixedAmountUsd: number;
  variableAmountUsd: number;
  approvedBudgetUsd: number;
  trendMoM: number; // e.g. +3.2%
  policyLocked: boolean;
  notes: string;
}

export const FinancialAnalysisRoom: React.FC<FinancialAnalysisRoomProps> = ({
  incomeStatement,
  balanceSheet,
  entities,
  selectedCurrency,
  fxRates,
  drivers,
  onUpdateDrivers,
  onNavigateTab,
}) => {
  // View states
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<'trends' | 'controller' | 'cost_breakdown' | 'absorption'>('trends');
  const [metricDisplayMode, setMetricDisplayMode] = useState<'dollars' | 'percent_rev'>('dollars');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');
  
  // Interactive Cost Optimization Levers
  const [cloudOptimizationPct, setCloudOptimizationPct] = useState<number>(0.12); // 12% savings
  const [saasConsolidationPct, setSaasConsolidationPct] = useState<number>(0.08); // 8% savings
  const [travelCapPct, setTravelCapPct] = useState<number>(0.18); // 18% savings
  const [gaAutomationPct, setGaAutomationPct] = useState<number>(0.06); // 6% savings
  const [appliedSimulation, setAppliedSimulation] = useState<boolean>(false);

  // Policy lock states for spending lines
  const [policyLocks, setPolicyLocks] = useState<Record<string, boolean>>({
    cloud_burst: true,
    travel_entertainment: true,
    recruiting_fees: false,
    external_consulting: true,
    software_seat_expansion: false,
  });

  // Extract base revenue and costs from statement
  const revItem = incomeStatement.find((i) => i.id === 'tot_rev');
  const cogsCloud = incomeStatement.find((i) => i.id === 'cogs_cloud');
  const cogsSupport = incomeStatement.find((i) => i.id === 'cogs_support');
  const totCogs = incomeStatement.find((i) => i.id === 'tot_cogs');
  const opexRd = incomeStatement.find((i) => i.id === 'opex_rd');
  const opexSm = incomeStatement.find((i) => i.id === 'opex_sm');
  const opexGa = incomeStatement.find((i) => i.id === 'opex_ga');
  const totOpex = incomeStatement.find((i) => i.id === 'tot_opex');
  const ebitda = incomeStatement.find((i) => i.id === 'ebitda');

  // Q3 '26 reference metrics
  const q3RevUsd = revItem?.values['2026-Q3'] || 63200000;
  const q3CogsUsd = totCogs?.values['2026-Q3'] || 11600000;
  const q3RdUsd = opexRd?.values['2026-Q3'] || 13200000;
  const q3SmUsd = opexSm?.values['2026-Q3'] || 16100000;
  const q3GaUsd = opexGa?.values['2026-Q3'] || 5800000;
  const q3TotalOpexUsd = q3RdUsd + q3SmUsd + q3GaUsd;
  const q3TotalOverheadCostUsd = q3CogsUsd + q3TotalOpexUsd;
  const q3EbitdaUsd = ebitda?.values['2026-Q3'] || 15750000;

  // Currency converted figures
  const q3Rev = convertCurrency(q3RevUsd, 'USD', selectedCurrency, 'average', fxRates);
  const q3Cogs = convertCurrency(q3CogsUsd, 'USD', selectedCurrency, 'average', fxRates);
  const q3Opex = convertCurrency(q3TotalOpexUsd, 'USD', selectedCurrency, 'average', fxRates);
  const q3TotalCost = convertCurrency(q3TotalOverheadCostUsd, 'USD', selectedCurrency, 'average', fxRates);
  const q3Ebitda = convertCurrency(q3EbitdaUsd, 'USD', selectedCurrency, 'average', fxRates);

  // Headcount & efficiency
  const totalHeadcount = entities.reduce((sum, e) => sum + e.headcount, 0);
  const costPerFteUsd = totalHeadcount > 0 ? (q3TotalOverheadCostUsd * 4) / totalHeadcount : 0;
  const costPerFte = convertCurrency(costPerFteUsd, 'USD', selectedCurrency, 'average', fxRates);

  // Fixed vs Variable Split
  const fixedRatio = 0.64; // 64% fixed commitments (salaries, data leases, enterprise licenses)
  const variableRatio = 0.36; // 36% variable (cloud compute burst, media spend, variable bonuses)
  const fixedCostVal = q3TotalCost * fixedRatio;
  const variableCostVal = q3TotalCost * variableRatio;

  // Granular Overhead Categories with Approved Budgets and Variances
  const overheadCategories: OverheadCategory[] = useMemo(() => [
    {
      id: 'cat_cloud',
      name: 'Cloud & Elastic Compute (AWS/Azure/Snowflake)',
      department: 'COGS',
      fixedAmountUsd: 4200000,
      variableAmountUsd: 2900000,
      approvedBudgetUsd: 6900000,
      trendMoM: 3.4,
      policyLocked: policyLocks['cloud_burst'] || false,
      notes: 'AI model training cluster workload driving 3.4% variance over budget baseline.',
    },
    {
      id: 'cat_rd_eng',
      name: 'R&D Product Engineering & Tooling',
      department: 'R&D',
      fixedAmountUsd: 10800000,
      variableAmountUsd: 2400000,
      approvedBudgetUsd: 13000000,
      trendMoM: 1.8,
      policyLocked: policyLocks['software_seat_expansion'] || false,
      notes: 'Core development talent and CI/CD pipelines within approved envelope.',
    },
    {
      id: 'cat_gtm_media',
      name: 'Paid Acquisition & Go-to-Market Media',
      department: 'S&M',
      fixedAmountUsd: 4500000,
      variableAmountUsd: 6800000,
      approvedBudgetUsd: 11000000,
      trendMoM: 2.7,
      policyLocked: policyLocks['recruiting_fees'] || false,
      notes: 'Accelerated enterprise outbound campaigns targeting European enterprise tier.',
    },
    {
      id: 'cat_saas_licenses',
      name: 'Internal SaaS Tools & Core Software Stack',
      department: 'G&A',
      fixedAmountUsd: 2100000,
      variableAmountUsd: 450000,
      approvedBudgetUsd: 2700000,
      trendMoM: -1.2,
      policyLocked: policyLocks['software_seat_expansion'] || false,
      notes: 'Consolidation of overlapping communication tools yields favorable variance.',
    },
    {
      id: 'cat_facilities',
      name: 'Global Real Estate, Leases & Utilities',
      department: 'G&A',
      fixedAmountUsd: 1800000,
      variableAmountUsd: 250000,
      approvedBudgetUsd: 2100000,
      trendMoM: -0.5,
      policyLocked: true,
      notes: 'Stable multi-year facility master leases in London, Singapore and Zurich.',
    },
    {
      id: 'cat_travel_events',
      name: 'Executive Travel, Client Dinners & Offsites',
      department: 'G&A',
      fixedAmountUsd: 200000,
      variableAmountUsd: 950000,
      approvedBudgetUsd: 1000000,
      trendMoM: 14.2,
      policyLocked: policyLocks['travel_entertainment'] || false,
      notes: 'High travel frequency in Q3; guardrail lock recommended to freeze discretionary bookings.',
    },
    {
      id: 'cat_legal_compliance',
      name: 'External Audit, SOX Testing & Legal Counsel',
      department: 'G&A',
      fixedAmountUsd: 850000,
      variableAmountUsd: 420000,
      approvedBudgetUsd: 1200000,
      trendMoM: 4.8,
      policyLocked: policyLocks['external_consulting'] || false,
      notes: 'Year-end SOX 404 readiness reviews and transfer pricing documentation.',
    },
  ], [policyLocks]);

  // Historical and Forward Multi-Period Overhead Trend Data
  const trendData = useMemo(() => {
    return ALL_PERIODS.map((period) => {
      const pRevUsd = revItem?.values[period] || 50000000;
      const pCogsUsd = totCogs?.values[period] || 9500000;
      const pRdUsd = opexRd?.values[period] || 11000000;
      const pSmUsd = opexSm?.values[period] || 13500000;
      const pGaUsd = opexGa?.values[period] || 4800000;
      const pTotCostUsd = pCogsUsd + pRdUsd + pSmUsd + pGaUsd;
      const pEbitdaUsd = pRevUsd - pTotCostUsd;

      // Currency conversions
      const revenue = convertCurrency(pRevUsd, 'USD', selectedCurrency, 'average', fxRates);
      const cogs = convertCurrency(pCogsUsd, 'USD', selectedCurrency, 'average', fxRates);
      const rd = convertCurrency(pRdUsd, 'USD', selectedCurrency, 'average', fxRates);
      const sm = convertCurrency(pSmUsd, 'USD', selectedCurrency, 'average', fxRates);
      const ga = convertCurrency(pGaUsd, 'USD', selectedCurrency, 'average', fxRates);
      const totalOverhead = convertCurrency(pTotCostUsd, 'USD', selectedCurrency, 'average', fxRates);
      const ebitdaVal = convertCurrency(pEbitdaUsd, 'USD', selectedCurrency, 'average', fxRates);

      const opexIntensityPct = revenue > 0 ? (totalOverhead / revenue) * 100 : 0;
      const ebitdaMarginPct = revenue > 0 ? (ebitdaVal / revenue) * 100 : 0;

      return {
        period: period.replace('20', "'"),
        rawPeriod: period,
        revenue,
        cogs,
        rd,
        sm,
        ga,
        totalOverhead,
        ebitdaVal,
        opexIntensityPct,
        ebitdaMarginPct,
        budgetCeiling: totalOverhead * 1.025,
      };
    });
  }, [revItem, totCogs, opexRd, opexSm, opexGa, selectedCurrency, fxRates]);

  // Calculate simulated cost savings from visual levers
  const simulatedSavings = useMemo(() => {
    const cloudAnnualUsd = (cogsCloud?.values['2026-Q3'] || 7100000) * 4;
    const gaAnnualUsd = (opexGa?.values['2026-Q3'] || 5800000) * 4;
    const smAnnualUsd = (opexSm?.values['2026-Q3'] || 16100000) * 4;

    const cloudSaveUsd = cloudAnnualUsd * cloudOptimizationPct;
    const saasSaveUsd = gaAnnualUsd * 0.35 * saasConsolidationPct;
    const travelSaveUsd = (gaAnnualUsd * 0.20 + smAnnualUsd * 0.15) * travelCapPct;
    const gaSaveUsd = gaAnnualUsd * 0.45 * gaAutomationPct;

    const totalAnnualSavingsUsd = cloudSaveUsd + saasSaveUsd + travelSaveUsd + gaSaveUsd;
    const annualRevUsd = q3RevUsd * 4;
    const marginAccretionBps = annualRevUsd > 0 ? (totalAnnualSavingsUsd / annualRevUsd) * 10000 : 0;

    const convertedSavings = convertCurrency(totalAnnualSavingsUsd, 'USD', selectedCurrency, 'average', fxRates);

    return {
      cloudSave: convertCurrency(cloudSaveUsd, 'USD', selectedCurrency, 'average', fxRates),
      saasSave: convertCurrency(saasSaveUsd, 'USD', selectedCurrency, 'average', fxRates),
      travelSave: convertCurrency(travelSaveUsd, 'USD', selectedCurrency, 'average', fxRates),
      gaSave: convertCurrency(gaSaveUsd, 'USD', selectedCurrency, 'average', fxRates),
      totalSavings: convertedSavings,
      marginAccretionBps: Math.round(marginAccretionBps),
      newEbitdaMargin: ((q3EbitdaUsd * 4 + totalAnnualSavingsUsd) / annualRevUsd),
    };
  }, [cogsCloud, opexGa, opexSm, q3RevUsd, q3EbitdaUsd, cloudOptimizationPct, saasConsolidationPct, travelCapPct, gaAutomationPct, selectedCurrency, fxRates]);

  // Toggle Policy Lock
  const handleTogglePolicyLock = (key: string) => {
    setPolicyLocks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Commit Simulated Levers into Main Driver State
  const handleApplySimulatedLevers = () => {
    // Applying the cost optimization enhances grossMarginTarget and trims OpEx ratios
    const newGrossMargin = Math.min(0.86, drivers.grossMarginTarget + (cloudOptimizationPct * 0.03));
    const newRdRatio = Math.max(0.18, drivers.rdOpExRatio - (saasConsolidationPct * 0.01));
    const newSmRatio = Math.max(0.23, drivers.smOpExRatio - (travelCapPct * 0.015));
    const newGaRatio = Math.max(0.08, drivers.gaOpExRatio - (gaAutomationPct * 0.02));

    onUpdateDrivers({
      ...drivers,
      grossMarginTarget: newGrossMargin,
      rdOpExRatio: newRdRatio,
      smOpExRatio: newSmRatio,
      gaOpExRatio: newGaRatio,
    });

    setAppliedSimulation(true);
    setTimeout(() => setAppliedSimulation(false), 3500);
  };

  // Overhead Absorption Matrix across 5 legal entities
  const absorptionBreakdown = useMemo(() => {
    const totalOverheadUsd = q3TotalOverheadCostUsd;
    return entities.map((ent, idx) => {
      // Absorption weights based on FTE headcount and revenue generation
      const weights = [0.38, 0.28, 0.16, 0.12, 0.06];
      const absorbedUsd = totalOverheadUsd * (weights[idx] || 0.1);
      const absorbedConverted = convertCurrency(absorbedUsd, 'USD', selectedCurrency, 'average', fxRates);
      const burdenRatio = ent.headcount > 0 ? (absorbedConverted / ent.headcount) : 0;

      return {
        id: ent.id,
        code: ent.code,
        name: ent.name,
        jurisdiction: ent.jurisdiction,
        currency: ent.currency,
        headcount: ent.headcount,
        weightPct: (weights[idx] || 0.1) * 100,
        absorbedAmount: absorbedConverted,
        costPerFte: burdenRatio,
        transferPricingModel: idx === 4 ? 'Swiss IP Licensing (5.5%)' : idx === 0 ? 'HQ Cost-Plus 8%' : 'Regional Direct Shared',
      };
    });
  }, [entities, q3TotalOverheadCostUsd, selectedCurrency, fxRates]);

  return (
    <div className="space-y-6">
      {/* Top Header & Context Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display flex items-center gap-2">
              <span>ARS FP&A — Financial Analysis Room</span>
            </h1>
          </div>
          <p className="text-xs text-slate-200 font-semibold mt-1">
            Cost structure analytics, overhead trend monitoring, policy guardrails & interactive visual controlling engine.
          </p>
        </div>

        {/* View Mode Navigation Switcher */}
        <div className="flex items-center p-1 bg-[#090e1b] border border-slate-600 rounded-xl shadow-lg flex-wrap gap-1">
          <button
            onClick={() => setActiveAnalysisMode('trends')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAnalysisMode === 'trends'
                ? 'bg-cyan-600 text-white font-black shadow-md'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Overhead Trends</span>
          </button>

          <button
            onClick={() => setActiveAnalysisMode('controller')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAnalysisMode === 'controller'
                ? 'bg-cyan-600 text-white font-black shadow-md'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Visual Controller & Levers</span>
          </button>

          <button
            onClick={() => setActiveAnalysisMode('cost_breakdown')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAnalysisMode === 'cost_breakdown'
                ? 'bg-cyan-600 text-white font-black shadow-md'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Cost Category Deep Dive</span>
          </button>

          <button
            onClick={() => setActiveAnalysisMode('absorption')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeAnalysisMode === 'absorption'
                ? 'bg-cyan-600 text-white font-black shadow-md'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overhead Absorption (ASC 810)</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Ribbon: Real-Time Cost & Overhead Pulse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Overhead Burden */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-cyan-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Total Overhead Burden (Q3)</span>
            <span className="text-cyan-300 font-mono font-black text-xs bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700">
              {formatPercent(q3Rev > 0 ? q3TotalCost / q3Rev : 0.75)} of Rev
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {formatCurrency(q3TotalCost, selectedCurrency, true)}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>COGS + OpEx Combined:</span>
            <span className="font-mono text-slate-100 font-bold">
              {formatCurrency(q3Cogs, selectedCurrency, true)} + {formatCurrency(q3Opex, selectedCurrency, true)}
            </span>
          </div>
        </div>

        {/* KPI 2: Fixed vs Variable Distribution */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-emerald-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Fixed vs Variable Ratio</span>
            <span className="text-emerald-300 font-mono font-bold text-xs bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
              64% / 36%
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline gap-2">
            <span>{formatCurrency(fixedCostVal, selectedCurrency, true)}</span>
            <span className="text-xs font-normal text-slate-300">Fixed Baseline</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>Variable Elastic Buffer:</span>
            <span className="font-mono text-cyan-300 font-bold">
              {formatCurrency(variableCostVal, selectedCurrency, true)}
            </span>
          </div>
        </div>

        {/* KPI 3: Cost Efficiency per FTE */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-purple-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Cost Burden per FTE</span>
            <span className="text-purple-300 font-mono font-bold text-xs bg-purple-950 px-2 py-0.5 rounded border border-purple-700">
              {totalHeadcount} Global FTE
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-white">
            {formatCurrency(costPerFte, selectedCurrency, true)}
            <span className="text-xs font-normal text-slate-300"> / year</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>Annual Productivity Ratio:</span>
            <span className="font-mono text-emerald-400 font-bold">
              ${(drivers.revenuePerFte / 1000).toFixed(0)}K ARR / FTE
            </span>
          </div>
        </div>

        {/* KPI 4: Net Budget Variance Status */}
        <div className="bg-[#0c1222] border border-slate-700 p-4.5 rounded-xl relative overflow-hidden group hover:border-amber-400 transition-all shadow-md">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500"></div>
          <div className="flex items-center justify-between text-xs text-slate-200 font-bold mb-2">
            <span>Budget Tolerance Status</span>
            <span className="text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 font-mono font-bold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Controlled
            </span>
          </div>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
            -$1.45M Favorable
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-medium">
            <span>Active Spending Locks:</span>
            <span className="font-mono text-cyan-300 font-bold">
              {Object.values(policyLocks).filter(Boolean).length} Guardrails Active
            </span>
          </div>
        </div>
      </div>

      {/* MODE 1: OVERHEAD TRENDS MONITORING */}
      {activeAnalysisMode === 'trends' && (
        <div className="space-y-6">
          <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Multi-Period Overhead Run-Rate & Cost Trajectory (FY2025–FY2026)</span>
                </h2>
                <p className="text-xs text-slate-200 font-medium mt-0.5">
                  Quarterly evolution of Direct COGS and OpEx pillars (R&D, S&M, G&A) compared against revenue growth.
                </p>
              </div>

              {/* Metric Mode Toggle */}
              <div className="flex items-center p-1 bg-[#090d19] border border-slate-600 rounded-lg">
                <button
                  onClick={() => setMetricDisplayMode('dollars')}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    metricDisplayMode === 'dollars' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Absolute Amount ({selectedCurrency})
                </button>
                <button
                  onClick={() => setMetricDisplayMode('percent_rev')}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    metricDisplayMode === 'percent_rev' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  % of Revenue Intensity
                </button>
              </div>
            </div>

            {/* Recharts Area / Composed Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {metricDisplayMode === 'dollars' ? (
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="period"
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
                        if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
                        if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
                        return String(val);
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const current = payload[0].payload;
                          return (
                            <div className="bg-[#0b1120] border-2 border-cyan-400 rounded-xl p-3.5 shadow-2xl text-xs space-y-2 font-mono">
                              <div className="font-sans font-bold text-white border-b border-slate-700 pb-1.5 flex items-center justify-between gap-4">
                                <span>Period: {current.rawPeriod}</span>
                                <span className="text-cyan-300 font-bold">Total: {formatCurrency(current.totalOverhead, selectedCurrency)}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4 text-emerald-300">
                                  <span>Gross Revenue:</span>
                                  <span className="font-bold">{formatCurrency(current.revenue, selectedCurrency)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-sky-400">
                                  <span>Direct COGS & Cloud:</span>
                                  <span className="font-bold">{formatCurrency(current.cogs, selectedCurrency)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-indigo-300">
                                  <span>R&D Engineering:</span>
                                  <span className="font-bold">{formatCurrency(current.rd, selectedCurrency)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-purple-300">
                                  <span>Sales & Marketing:</span>
                                  <span className="font-bold">{formatCurrency(current.sm, selectedCurrency)}</span>
                                </div>
                                <div className="flex justify-between gap-4 text-amber-300">
                                  <span>General & Admin:</span>
                                  <span className="font-bold">{formatCurrency(current.ga, selectedCurrency)}</span>
                                </div>
                              </div>
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

                    {/* Revenue reference line */}
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Gross Net Revenue"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#38bdf8' }}
                      activeDot={{ r: 6 }}
                    />

                    {/* Stacked Cost Pillars */}
                    <Bar dataKey="cogs" name="COGS & Hosting" stackId="a" fill="#0284c7" />
                    <Bar dataKey="rd" name="R&D Engineering" stackId="a" fill="#6366f1" />
                    <Bar dataKey="sm" name="Sales & Go-to-Market" stackId="a" fill="#a855f7" />
                    <Bar dataKey="ga" name="G&A Administrative" stackId="a" fill="#f59e0b" />
                  </ComposedChart>
                ) : (
                  <AreaChart
                    data={trendData}
                    margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="period"
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
                      tickFormatter={(val) => `${val.toFixed(0)}%`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const current = payload[0].payload;
                          return (
                            <div className="bg-[#0b1120] border-2 border-cyan-400 rounded-xl p-3 shadow-2xl text-xs space-y-1.5 font-mono">
                              <div className="font-sans font-bold text-white border-b border-slate-700 pb-1">
                                {current.rawPeriod} OpEx Efficiency
                              </div>
                              <div className="flex justify-between gap-4 text-cyan-300">
                                <span>Total Cost / Revenue:</span>
                                <span className="font-bold">{current.opexIntensityPct.toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between gap-4 text-emerald-400">
                                <span>Operating EBITDA Margin:</span>
                                <span className="font-bold">{current.ebitdaMarginPct.toFixed(1)}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="opexIntensityPct"
                      name="Total Cost Intensity (% of Rev)"
                      stroke="#06b6d4"
                      fill="#0891b2"
                      fillOpacity={0.25}
                      strokeWidth={2.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="ebitdaMarginPct"
                      name="EBITDA Margin (% of Rev)"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#10b981' }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-200 font-semibold gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>Operating leverage trend: OpEx intensity compressed from 81.2% (Q1 '25) to 74.8% (Q3 '26)</span>
              </span>
              <span className="font-mono text-cyan-300 font-bold">Consolidated Run-Rate</span>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: VISUAL CONTROLLER & INTERACTIVE LEVERS */}
      {activeAnalysisMode === 'controller' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Interactive Cost Levers & Margin Simulator */}
            <div className="lg:col-span-7 bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Visual Cost Controller & Margin Expansion Simulator</span>
                  </h2>
                  <p className="text-xs text-slate-200 font-medium mt-0.5">
                    Modulate corporate spending guardrails to simulate immediate annualized savings and EBITDA accretion.
                  </p>
                </div>
              </div>

              {/* Slider 1: Cloud & Compute Optimization */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>Cloud Compute & Data Cluster Optimization</span>
                  </span>
                  <span className="font-mono text-cyan-300 font-black text-sm">
                    -{formatPercent(cloudOptimizationPct, 0)} ({formatCurrency(simulatedSavings.cloudSave, selectedCurrency, true)}/yr)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.25"
                  step="0.01"
                  value={cloudOptimizationPct}
                  onChange={(e) => setCloudOptimizationPct(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-300 font-medium font-mono">
                  <span>0% (As-is)</span>
                  <span>10% (Reserved Instances)</span>
                  <span>25% (Aggressive FinOps)</span>
                </div>
              </div>

              {/* Slider 2: SaaS & Tooling Stack Consolidation */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>Enterprise SaaS & License Seat Trimming</span>
                  </span>
                  <span className="font-mono text-indigo-300 font-black text-sm">
                    -{formatPercent(saasConsolidationPct, 0)} ({formatCurrency(simulatedSavings.saasSave, selectedCurrency, true)}/yr)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.20"
                  step="0.01"
                  value={saasConsolidationPct}
                  onChange={(e) => setSaasConsolidationPct(parseFloat(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-300 font-medium font-mono">
                  <span>0% (Full License Count)</span>
                  <span>8% (Seat Audit)</span>
                  <span>20% (Single-Vendor Suite)</span>
                </div>
              </div>

              {/* Slider 3: Discretionary Travel & Event Spending */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>Travel, Entertainment & Discretionary Cap</span>
                  </span>
                  <span className="font-mono text-amber-300 font-black text-sm">
                    -{formatPercent(travelCapPct, 0)} ({formatCurrency(simulatedSavings.travelSave, selectedCurrency, true)}/yr)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.35"
                  step="0.01"
                  value={travelCapPct}
                  onChange={(e) => setTravelCapPct(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-300 font-medium font-mono">
                  <span>0% (Unconstrained)</span>
                  <span>15% (Tiered Approvals)</span>
                  <span>35% (Virtual-First Policy)</span>
                </div>
              </div>

              {/* Slider 4: G&A Administrative Automation */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Autonomous Close & Back-Office Automation</span>
                  </span>
                  <span className="font-mono text-emerald-300 font-black text-sm">
                    -{formatPercent(gaAutomationPct, 0)} ({formatCurrency(simulatedSavings.gaSave, selectedCurrency, true)}/yr)
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.15"
                  step="0.01"
                  value={gaAutomationPct}
                  onChange={(e) => setGaAutomationPct(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
                />
                <div className="flex justify-between text-[11px] text-slate-300 font-medium font-mono">
                  <span>0% (Manual Workflows)</span>
                  <span>6% (Automated Reconciliation)</span>
                  <span>15% (Full RPA Ledger)</span>
                </div>
              </div>

              {/* Actions & Commit Button */}
              <div className="pt-4 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setCloudOptimizationPct(0.12);
                    setSaasConsolidationPct(0.08);
                    setTravelCapPct(0.18);
                    setGaAutomationPct(0.06);
                  }}
                  className="text-xs text-slate-300 hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Reset Levers to Default Guardrail
                </button>

                <button
                  onClick={handleApplySimulatedLevers}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-md transition-all whitespace-nowrap cursor-pointer hover:scale-102"
                >
                  {appliedSimulation ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Applied to Primary Model</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>Commit Cost Levers to Live Model</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right 5 Cols: Visual Impact Output Panel */}
            <div className="lg:col-span-5 bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                    Projected Financial Impact
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600">
                    Live Propagation
                  </span>
                </div>

                <div className="space-y-4 my-4">
                  <div className="p-4 bg-[#080e1c] border border-slate-700 rounded-xl">
                    <span className="text-xs text-slate-200 font-bold block">Annualized Cost Extraction</span>
                    <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                      {formatCurrency(simulatedSavings.totalSavings, selectedCurrency, true)}
                    </div>
                    <span className="text-xs text-slate-300 font-medium mt-1 block">
                      Direct cash yield reclaimed from operating overhead
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-[#080e1c] border border-slate-700 rounded-xl">
                      <span className="text-[11px] text-slate-200 font-bold block">EBITDA Accretion</span>
                      <div className="text-xl font-black font-mono text-cyan-300 mt-1">
                        +{simulatedSavings.marginAccretionBps} bps
                      </div>
                      <span className="text-[10px] text-slate-300 font-medium">Margin lift</span>
                    </div>

                    <div className="p-3 bg-[#080e1c] border border-slate-700 rounded-xl">
                      <span className="text-[11px] text-slate-200 font-bold block">Simulated Margin</span>
                      <div className="text-xl font-black font-mono text-white mt-1">
                        {formatPercent(simulatedSavings.newEbitdaMargin)}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">vs 24.9% Base</span>
                    </div>
                  </div>
                </div>

                {/* Spending Policy Guardrails Checklist */}
                <div className="mt-4 pt-3 border-t border-slate-700 space-y-2">
                  <span className="text-xs text-slate-200 font-bold block mb-2 font-mono">
                    Active Governance Policy Locks
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080e1c] border border-slate-700">
                      <span className="text-slate-100 font-semibold flex items-center gap-2">
                        {policyLocks['cloud_burst'] ? <Lock className="w-3.5 h-3.5 text-cyan-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                        Cap Elastic Cloud Burst (&gt; $5k/day)
                      </span>
                      <button
                        onClick={() => handleTogglePolicyLock('cloud_burst')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          policyLocks['cloud_burst'] ? 'bg-cyan-950 text-cyan-300 border border-cyan-600' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {policyLocks['cloud_burst'] ? 'Enforced' : 'Unrestricted'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080e1c] border border-slate-700">
                      <span className="text-slate-100 font-semibold flex items-center gap-2">
                        {policyLocks['travel_entertainment'] ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                        Freeze Non-Essential Travel Bookings
                      </span>
                      <button
                        onClick={() => handleTogglePolicyLock('travel_entertainment')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          policyLocks['travel_entertainment'] ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {policyLocks['travel_entertainment'] ? 'Enforced' : 'Unrestricted'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#080e1c] border border-slate-700">
                      <span className="text-slate-100 font-semibold flex items-center gap-2">
                        {policyLocks['external_consulting'] ? <Lock className="w-3.5 h-3.5 text-purple-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-400" />}
                        Pre-approval for External Consulting
                      </span>
                      <button
                        onClick={() => handleTogglePolicyLock('external_consulting')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          policyLocks['external_consulting'] ? 'bg-purple-950 text-purple-300 border border-purple-600' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {policyLocks['external_consulting'] ? 'Enforced' : 'Unrestricted'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-300">
                <span>Guardrails feed directly into SOX-404 compliance</span>
                <span className="font-mono text-cyan-300 font-bold">Continuous Sentinel</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: COST CATEGORY DEEP DIVE */}
      {activeAnalysisMode === 'cost_breakdown' && (
        <div className="space-y-6">
          <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <PieChartIcon className="w-4 h-4 text-cyan-400" />
                  <span>Granular Overhead Category Variance & Spend Controller</span>
                </h2>
                <p className="text-xs text-slate-200 font-medium">
                  Detailed inspection of internal cost centers, fixed vs variable obligations, and budget compliance status.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b-2 border-slate-700 text-slate-200 font-black uppercase tracking-wider text-xs font-mono bg-[#090e1b]">
                    <th className="py-3 px-3">Overhead Category & Description</th>
                    <th className="py-3 px-3">Dept</th>
                    <th className="py-3 px-3 text-right">Fixed Cost ({selectedCurrency})</th>
                    <th className="py-3 px-3 text-right">Variable ({selectedCurrency})</th>
                    <th className="py-3 px-3 text-right">Actual Q3 Spend</th>
                    <th className="py-3 px-3 text-right">Approved Budget</th>
                    <th className="py-3 px-3 text-right">Variance vs Plan</th>
                    <th className="py-3 px-3 text-center">Policy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 font-medium">
                  {overheadCategories.map((cat) => {
                    const actualUsd = cat.fixedAmountUsd + cat.variableAmountUsd;
                    const actualConverted = convertCurrency(actualUsd, 'USD', selectedCurrency, 'average', fxRates);
                    const fixedConverted = convertCurrency(cat.fixedAmountUsd, 'USD', selectedCurrency, 'average', fxRates);
                    const varConverted = convertCurrency(cat.variableAmountUsd, 'USD', selectedCurrency, 'average', fxRates);
                    const budgetConverted = convertCurrency(cat.approvedBudgetUsd, 'USD', selectedCurrency, 'average', fxRates);
                    const varianceAmount = actualConverted - budgetConverted;
                    const variancePct = budgetConverted > 0 ? (varianceAmount / budgetConverted) * 100 : 0;
                    const isOver = varianceAmount > 0;

                    return (
                      <tr key={cat.id} className="hover:bg-slate-800 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-black text-white text-xs">{cat.name}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5">{cat.notes}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            cat.department === 'COGS'
                              ? 'bg-sky-950 text-sky-200 border border-sky-700'
                              : cat.department === 'R&D'
                              ? 'bg-indigo-950 text-indigo-200 border border-indigo-700'
                              : cat.department === 'S&M'
                              ? 'bg-purple-950 text-purple-200 border border-purple-700'
                              : 'bg-amber-950 text-amber-200 border border-amber-700'
                          }`}>
                            {cat.department}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold">
                          {formatCurrency(fixedConverted, selectedCurrency, true)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold">
                          {formatCurrency(varConverted, selectedCurrency, true)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-white">
                          {formatCurrency(actualConverted, selectedCurrency, true)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold">
                          {formatCurrency(budgetConverted, selectedCurrency, true)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span className={isOver ? 'text-rose-400' : 'text-emerald-400'}>
                            {isOver ? '+' : ''}{variancePct.toFixed(1)}% ({formatCurrency(varianceAmount, selectedCurrency, true)})
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded font-bold ${
                            cat.policyLocked
                              ? 'bg-cyan-950 text-cyan-200 border border-cyan-600'
                              : isOver
                              ? 'bg-rose-950 text-rose-200 border border-rose-600'
                              : 'bg-slate-800 text-slate-200'
                          }`}>
                            {cat.policyLocked ? <Lock className="w-3 h-3 text-cyan-400" /> : <Unlock className="w-3 h-3 text-slate-400" />}
                            <span>{cat.policyLocked ? 'Locked' : isOver ? 'Warning' : 'Normal'}</span>
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
      )}

      {/* MODE 4: OVERHEAD ABSORPTION MATRIX (ASC 810) */}
      {activeAnalysisMode === 'absorption' && (
        <div className="space-y-6">
          <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Subsidiary Overhead Absorption & Shared Service Allocation (ASC 810)</span>
                </h2>
                <p className="text-xs text-slate-200 font-medium">
                  Centralized shared services (HQ R&D, Swiss IP Treasury, Executive Management) allocated by headcount & economic nexus.
                </p>
              </div>

              <div className="text-xs font-mono text-cyan-300 font-bold bg-[#090e1b] px-3 py-1.5 rounded-lg border border-slate-600">
                Total Group Overhead: {formatCurrency(q3TotalCost, selectedCurrency, true)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b-2 border-slate-700 text-slate-200 font-black uppercase tracking-wider text-xs font-mono bg-[#090e1b]">
                    <th className="py-3 px-3">Subsidiary Entity</th>
                    <th className="py-3 px-3">Jurisdiction</th>
                    <th className="py-3 px-3 text-right">Headcount</th>
                    <th className="py-3 px-3 text-right">Nexus Share %</th>
                    <th className="py-3 px-3 text-right">Absorbed Overhead ({selectedCurrency})</th>
                    <th className="py-3 px-3 text-right">Burden per FTE</th>
                    <th className="py-3 px-3">Transfer Pricing Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 font-bold">
                  {absorptionBreakdown.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-black text-white text-xs">{row.name}</div>
                        <div className="text-[11px] text-cyan-300 font-mono">{row.code}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-200">{row.jurisdiction}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-100">{row.headcount} FTE</td>
                      <td className="py-3 px-3 text-right font-mono text-cyan-300">{row.weightPct.toFixed(1)}%</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-white">
                        {formatCurrency(row.absorbedAmount, selectedCurrency, true)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-400">
                        {formatCurrency(row.costPerFte, selectedCurrency, true)} / FTE
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-600">
                          {row.transferPricingModel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-200 font-semibold">
              <span>Fully compliant with OECD Transfer Pricing Guidelines & ASC 810 Intercompany Eliminations</span>
              <button
                onClick={() => onNavigateTab('consolidation')}
                className="text-cyan-300 hover:text-white font-black flex items-center gap-1 cursor-pointer"
              >
                <span>View Intercompany Elimination Journal</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
