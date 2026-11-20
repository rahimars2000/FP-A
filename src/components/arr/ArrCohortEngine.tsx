import React, { useState, useMemo } from 'react';
import {
  ArrBridgeRecord,
  CohortVintageRow,
  CurrencyCode,
  CustomerSegment,
  FinancialDrivers,
  ForecastPeriodKey,
  FxRate,
  StatementLineItem
} from '../../types/fpa';
import {
  convertCurrency,
  FORECAST_PERIODS,
  formatCurrency,
  formatPercent
} from '../../utils/fpaEngine';
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Grid3X3,
  RotateCcw,
  Sliders,
  TrendingUp
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface ArrCohortEngineProps {
  incomeStatement: StatementLineItem[];
  drivers: FinancialDrivers;
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  arrBridgeData: ArrBridgeRecord[];
  cohortData: CohortVintageRow[];
  onApplyNdrToModel: (newNdr: number) => void;
}

type BridgePeriodSelection = ForecastPeriodKey | 'FY2026';

interface WaterfallDatum {
  key: string;
  label: string;
  baseOffset: number;
  barValue: number;
  signedDelta: number;
  cumulativeEnding: number;
  pctOfBeginning: number;
  fill: string;
  isTotal?: boolean;
}

const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  all: 'All Segments',
  enterprise: 'Enterprise',
  mid_market: 'Mid-Market',
  commercial: 'Commercial',
};

const PERIOD_OPTIONS: { id: BridgePeriodSelection; label: string }[] = [
  { id: '2026-Q1', label: '2026 Q1' },
  { id: '2026-Q2', label: '2026 Q2' },
  { id: '2026-Q3', label: '2026 Q3' },
  { id: '2026-Q4', label: '2026 Q4' },
  { id: 'FY2026', label: 'Full FY26' },
];

const COHORT_QUARTER_HEADERS = ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'];

export const ArrCohortEngine: React.FC<ArrCohortEngineProps> = ({
  incomeStatement,
  drivers,
  selectedCurrency,
  fxRates,
  arrBridgeData,
  cohortData,
  onApplyNdrToModel,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<BridgePeriodSelection>('2026-Q3');
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment>('all');
  const [retentionMetric, setRetentionMetric] = useState<'ndr' | 'grr'>('ndr');

  // Interactive Live Bridge Scenario Levers (% adjustments relative to baseline)
  const [newLogoAdjPct, setNewLogoAdjPct] = useState<number>(0);
  const [expansionAdjPct, setExpansionAdjPct] = useState<number>(0);
  const [contractionAdjPct, setContractionAdjPct] = useState<number>(0);
  const [churnAdjPct, setChurnAdjPct] = useState<number>(0);

  const [appliedNdrToast, setAppliedNdrToast] = useState<boolean>(false);
  const [hoveredCohort, setHoveredCohort] = useState<{
    cohort: CohortVintageRow;
    quarterIdx: number;
    value: number;
  } | null>(null);

  const hasSliderChanges =
    newLogoAdjPct !== 0 ||
    expansionAdjPct !== 0 ||
    contractionAdjPct !== 0 ||
    churnAdjPct !== 0;

  const resetLevers = () => {
    setNewLogoAdjPct(0);
    setExpansionAdjPct(0);
    setContractionAdjPct(0);
    setChurnAdjPct(0);
  };

  // Compute aggregated ARR Bridge + Live Rule of 40 + SaaS Magic Number
  const bridgeAnalytics = useMemo(() => {
    const filterBySeg = (rec: ArrBridgeRecord) =>
      selectedSegment === 'all' || rec.segment === selectedSegment;

    let baseBeginningUsd = 0;
    let baseNewLogoUsd = 0;
    let baseExpansionUsd = 0;
    let baseContractionUsd = 0;
    let baseChurnUsd = 0;
    let priorYearEndingArrUsd = 0;
    let periodSmSpendUsd = 0;

    // Pull live S&M and EBITDA from live Income Statement (automatically reflects Workforce Payroll Sync!)
    const revItem = incomeStatement.find((i) => i.id === 'tot_rev');
    const ebitdaItem = incomeStatement.find((i) => i.id === 'ebitda');
    const smItem = incomeStatement.find((i) => i.id === 'opex_sm');

    // Segment S&M allocation share so Magic Number adapts cleanly per segment AND to live P&L S&M
    const segmentSmWeight: Record<CustomerSegment, number> = {
      all: 1.0,
      enterprise: 0.49,
      mid_market: 0.33,
      commercial: 0.18,
    };

    if (selectedPeriod === 'FY2026') {
      const q1Recs = arrBridgeData.filter((r) => r.period === '2026-Q1' && filterBySeg(r));
      const fy26Recs = arrBridgeData.filter(
        (r) => FORECAST_PERIODS.includes(r.period as ForecastPeriodKey) && filterBySeg(r)
      );
      const priorYrRecs = arrBridgeData.filter((r) => r.period === '2025-Q4' && filterBySeg(r));

      baseBeginningUsd = q1Recs.reduce((s, r) => s + r.beginningArrUsd, 0);
      baseNewLogoUsd = fy26Recs.reduce((s, r) => s + r.newLogoArrUsd, 0);
      baseExpansionUsd = fy26Recs.reduce((s, r) => s + r.expansionArrUsd, 0);
      baseContractionUsd = fy26Recs.reduce((s, r) => s + r.contractionArrUsd, 0);
      baseChurnUsd = fy26Recs.reduce((s, r) => s + r.churnArrUsd, 0);
      priorYearEndingArrUsd = priorYrRecs.reduce((s, r) => s + r.endingArrUsd, 0);

      // Sum prior-shifted 4 quarters of S&M (2025-Q4 + 2026-Q1..Q3) from live P&L
      const smQuarters: ('2025-Q4' | '2026-Q1' | '2026-Q2' | '2026-Q3')[] = [
        '2025-Q4',
        '2026-Q1',
        '2026-Q2',
        '2026-Q3',
      ];
      const liveTotalSm = smQuarters.reduce((s, p) => s + (smItem?.values[p] || 0), 0);
      periodSmSpendUsd = liveTotalSm * segmentSmWeight[selectedSegment];
    } else {
      const recs = arrBridgeData.filter((r) => r.period === selectedPeriod && filterBySeg(r));
      const priorYearPeriod = selectedPeriod.replace('2026', '2025') as ArrBridgeRecord['period'];
      const priorYrRecs = arrBridgeData.filter((r) => r.period === priorYearPeriod && filterBySeg(r));

      baseBeginningUsd = recs.reduce((s, r) => s + r.beginningArrUsd, 0);
      baseNewLogoUsd = recs.reduce((s, r) => s + r.newLogoArrUsd, 0);
      baseExpansionUsd = recs.reduce((s, r) => s + r.expansionArrUsd, 0);
      baseContractionUsd = recs.reduce((s, r) => s + r.contractionArrUsd, 0);
      baseChurnUsd = recs.reduce((s, r) => s + r.churnArrUsd, 0);
      priorYearEndingArrUsd = priorYrRecs.reduce((s, r) => s + r.endingArrUsd, 0);

      // Prior quarter S&M from live P&L
      const priorQuarterMap: Record<ForecastPeriodKey, ArrBridgeRecord['period']> = {
        '2026-Q1': '2025-Q4',
        '2026-Q2': '2026-Q1',
        '2026-Q3': '2026-Q2',
        '2026-Q4': '2026-Q3',
      };
      const priorQ = priorQuarterMap[selectedPeriod];
      const livePriorSm = smItem?.values[priorQ] || recs.reduce((s, r) => s + r.priorQuarterSmUsd, 0);
      periodSmSpendUsd = livePriorSm * segmentSmWeight[selectedSegment];
    }

    // Apply live scenario levers
    const adjNewLogoUsd = Math.round(baseNewLogoUsd * (1 + newLogoAdjPct));
    const adjExpansionUsd = Math.round(baseExpansionUsd * (1 + expansionAdjPct));
    const adjContractionUsd = Math.round(baseContractionUsd * (1 + contractionAdjPct));
    const adjChurnUsd = Math.round(baseChurnUsd * (1 + churnAdjPct));

    const netNewArrUsd = adjNewLogoUsd + adjExpansionUsd - adjContractionUsd - adjChurnUsd;
    const endingArrUsd = baseBeginningUsd + netNewArrUsd;

    const baseNetNewArrUsd = baseNewLogoUsd + baseExpansionUsd - baseContractionUsd - baseChurnUsd;
    const baseEndingArrUsd = baseBeginningUsd + baseNetNewArrUsd;
    const endingArrDeltaUsd = endingArrUsd - baseEndingArrUsd;

    // Annualized NDR & GRR from period movements
    const annualizer = selectedPeriod === 'FY2026' ? 1 : 4;
    const impliedNdr =
      baseBeginningUsd > 0
        ? 1 + ((adjExpansionUsd - adjContractionUsd - adjChurnUsd) * annualizer) / baseBeginningUsd
        : drivers.netRetentionRate;
    const impliedGrr =
      baseBeginningUsd > 0
        ? Math.max(0.5, 1 - ((adjContractionUsd + adjChurnUsd) * annualizer) / baseBeginningUsd)
        : 0.94;

    // YoY ARR Growth %
    const yoyArrGrowth =
      priorYearEndingArrUsd > 0 ? (endingArrUsd - priorYearEndingArrUsd) / priorYearEndingArrUsd : 0.35;

    // Live EBITDA Margin % from consolidated P&L
    let ebitdaMargin = 0.249;
    if (selectedPeriod === 'FY2026') {
      const fyRev = FORECAST_PERIODS.reduce((s, p) => s + (revItem?.values[p] || 0), 0);
      const fyEbitda = FORECAST_PERIODS.reduce((s, p) => s + (ebitdaItem?.values[p] || 0), 0);
      ebitdaMargin = fyRev > 0 ? fyEbitda / fyRev : 0.249;
    } else {
      const pRev = revItem?.values[selectedPeriod] || 63200000;
      const pEbitda = ebitdaItem?.values[selectedPeriod] || 15750000;
      ebitdaMargin = pRev > 0 ? pEbitda / pRev : 0.249;
    }

    // Rule of 40 = YoY ARR Growth % + EBITDA Margin %
    const ruleOf40Score = (yoyArrGrowth + ebitdaMargin) * 100;
    const baseYoyGrowth =
      priorYearEndingArrUsd > 0 ? (baseEndingArrUsd - priorYearEndingArrUsd) / priorYearEndingArrUsd : 0.35;
    const baseRuleOf40Score = (baseYoyGrowth + ebitdaMargin) * 100;

    // SaaS Magic Number:
    // Standard Quarterly formula: (Net New ARR) / (Prior-Quarter S&M Spend) — note Net New ARR is ALREADY annualized!
    // For Full FY26: (FY26 Net New ARR) / (Trailing 4Q S&M Spend)
    const magicNumber = periodSmSpendUsd > 0 ? netNewArrUsd / periodSmSpendUsd : 0;
    const baseMagicNumber = periodSmSpendUsd > 0 ? baseNetNewArrUsd / periodSmSpendUsd : 0;

    // Convert waterfall steps into selectedCurrency
    const toDisp = (usd: number) => convertCurrency(usd, 'USD', selectedCurrency, 'average', fxRates);

    const begDisp = toDisp(baseBeginningUsd);
    const newDisp = toDisp(adjNewLogoUsd);
    const expDisp = toDisp(adjExpansionUsd);
    const conDisp = toDisp(adjContractionUsd);
    const churnDisp = toDisp(adjChurnUsd);
    const endDisp = toDisp(endingArrUsd);

    const afterNew = begDisp + newDisp;
    const afterExp = afterNew + expDisp;
    const afterCon = afterExp - conDisp;

    const waterfallData: WaterfallDatum[] = [
      {
        key: 'beginning',
        label: 'Beginning ARR',
        baseOffset: 0,
        barValue: begDisp,
        signedDelta: begDisp,
        cumulativeEnding: begDisp,
        pctOfBeginning: 1,
        fill: '#0284c7',
        isTotal: true,
      },
      {
        key: 'new_logo',
        label: 'New Logo',
        baseOffset: begDisp,
        barValue: newDisp,
        signedDelta: newDisp,
        cumulativeEnding: afterNew,
        pctOfBeginning: begDisp > 0 ? newDisp / begDisp : 0,
        fill: '#10b981',
      },
      {
        key: 'expansion',
        label: 'Expansion',
        baseOffset: afterNew,
        barValue: expDisp,
        signedDelta: expDisp,
        cumulativeEnding: afterExp,
        pctOfBeginning: begDisp > 0 ? expDisp / begDisp : 0,
        fill: '#14b8a6',
      },
      {
        key: 'contraction',
        label: 'Contraction',
        baseOffset: Math.max(0, afterCon),
        barValue: conDisp,
        signedDelta: -conDisp,
        cumulativeEnding: afterCon,
        pctOfBeginning: begDisp > 0 ? -conDisp / begDisp : 0,
        fill: '#f59e0b',
      },
      {
        key: 'churn',
        label: 'Churn',
        baseOffset: Math.max(0, endDisp),
        barValue: churnDisp,
        signedDelta: -churnDisp,
        cumulativeEnding: endDisp,
        pctOfBeginning: begDisp > 0 ? -churnDisp / begDisp : 0,
        fill: '#f43f5e',
      },
      {
        key: 'ending',
        label: 'Ending ARR',
        baseOffset: 0,
        barValue: endDisp,
        signedDelta: endDisp,
        cumulativeEnding: endDisp,
        pctOfBeginning: begDisp > 0 ? endDisp / begDisp : 1,
        fill: '#06b6d4',
        isTotal: true,
      },
    ];

    return {
      begDisp,
      newDisp,
      expDisp,
      conDisp,
      churnDisp,
      endDisp,
      netNewDisp: toDisp(netNewArrUsd),
      endingArrDeltaDisp: toDisp(endingArrDeltaUsd),
      periodSmDisp: toDisp(periodSmSpendUsd),
      yoyArrGrowth,
      ebitdaMargin,
      ruleOf40Score,
      ruleOf40Delta: ruleOf40Score - baseRuleOf40Score,
      magicNumber,
      magicNumberDelta: magicNumber - baseMagicNumber,
      impliedNdr,
      impliedGrr,
      waterfallData,
    };
  }, [
    arrBridgeData,
    selectedPeriod,
    selectedSegment,
    newLogoAdjPct,
    expansionAdjPct,
    contractionAdjPct,
    churnAdjPct,
    incomeStatement,
    drivers.netRetentionRate,
    selectedCurrency,
    fxRates,
  ]);

  // Filter Cohort Heatmap rows by active segment and compute weighted column averages
  const filteredCohorts = useMemo(() => {
    if (selectedSegment === 'all') return cohortData;
    return cohortData.filter((c) => c.segment === selectedSegment);
  }, [cohortData, selectedSegment]);

  const cohortColumnAverages = useMemo(() => {
    return COHORT_QUARTER_HEADERS.map((_, qIdx) => {
      let weightedSum = 0;
      let totalWeight = 0;
      filteredCohorts.forEach((row) => {
        const series = retentionMetric === 'ndr' ? row.ndrQuarters : row.grrQuarters;
        const val = series[qIdx];
        if (val !== null && val !== undefined) {
          weightedSum += val * row.startingArrUsd;
          totalWeight += row.startingArrUsd;
        }
      });
      return totalWeight > 0 ? weightedSum / totalWeight : null;
    });
  }, [filteredCohorts, retentionMetric]);

  const getHeatmapCellStyle = (value: number | null, mode: 'ndr' | 'grr'): string => {
    if (value === null) return 'bg-[#080d19] text-slate-600';
    if (mode === 'ndr') {
      if (value >= 1.2) return 'bg-emerald-600/85 text-white font-bold';
      if (value >= 1.12) return 'bg-emerald-700/75 text-white font-bold';
      if (value >= 1.05) return 'bg-teal-800/75 text-emerald-100 font-semibold';
      if (value >= 1.0) return 'bg-cyan-900/70 text-cyan-100 font-semibold';
      return 'bg-amber-900/70 text-amber-100 font-semibold';
    }
    // GRR scale
    if (value >= 0.98) return 'bg-cyan-700/80 text-white font-bold';
    if (value >= 0.95) return 'bg-cyan-800/75 text-cyan-50 font-bold';
    if (value >= 0.92) return 'bg-blue-900/75 text-slate-100 font-semibold';
    return 'bg-amber-900/75 text-amber-100 font-semibold';
  };

  const handleApplyNdr = () => {
    const clampedNdr = Math.max(0.95, Math.min(1.35, Number(bridgeAnalytics.impliedNdr.toFixed(3))));
    onApplyNdrToModel(clampedNdr);
    setAppliedNdrToast(true);
    setTimeout(() => setAppliedNdrToast(false), 3000);
  };

  const ruleOf40Status =
    bridgeAnalytics.ruleOf40Score >= 40
      ? { label: 'Above 40% Benchmark', color: 'text-emerald-400' }
      : bridgeAnalytics.ruleOf40Score >= 30
      ? { label: 'Approaching Target', color: 'text-amber-400' }
      : { label: 'Below 40% Floor', color: 'text-rose-400' };

  const magicNumberStatus =
    bridgeAnalytics.magicNumber >= 1.0
      ? { label: 'Hyper-Efficient (>= 1.0x)', color: 'text-emerald-400' }
      : bridgeAnalytics.magicNumber >= 0.75
      ? { label: 'Efficient (0.75x - 1.0x)', color: 'text-cyan-300' }
      : { label: 'Optimize GTM (< 0.75x)', color: 'text-amber-400' };

  return (
    <div className="space-y-6">
      {/* Page Header & Filter Controls */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-slate-700/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display text-balance">
            ARR & Cohort Retention Engine
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Recurring revenue waterfall bridge · Multi-vintage NDR & GRR cohort analytics · Live Rule of 40 & SaaS Magic Number ({selectedCurrency})
          </p>
        </div>

        {/* Segmented Period & Segment Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 bg-[#090e1b] border border-slate-700 rounded-lg">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedPeriod(opt.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedPeriod === opt.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center p-1 bg-[#090e1b] border border-slate-700 rounded-lg">
            {(Object.keys(SEGMENT_LABELS) as CustomerSegment[]).map((seg) => (
              <button
                key={seg}
                onClick={() => setSelectedSegment(seg)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedSegment === seg
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {SEGMENT_LABELS[seg]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 4-Card Live SaaS Efficiency KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ending ARR */}
        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between gap-2">
            <span>Ending ARR ({selectedPeriod === 'FY2026' ? 'FY26' : selectedPeriod})</span>
            <span className="font-mono tabular-nums text-emerald-400 font-bold">
              +{formatPercent(bridgeAnalytics.yoyArrGrowth, 1)} YoY
            </span>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-white mt-2">
            {formatCurrency(bridgeAnalytics.endDisp, selectedCurrency, true)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Net New ARR</span>
            <span
              className={`font-mono tabular-nums font-bold ${
                bridgeAnalytics.netNewDisp >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {bridgeAnalytics.netNewDisp >= 0 ? '+' : ''}
              {formatCurrency(bridgeAnalytics.netNewDisp, selectedCurrency, true)}
            </span>
          </div>
        </div>

        {/* KPI 2: Live SaaS Rule of 40 */}
        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between gap-2">
            <span>SaaS Rule of 40</span>
            <span className={`text-xs font-bold ${ruleOf40Status.color}`}>
              {ruleOf40Status.label}
            </span>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-white mt-2 flex items-baseline gap-2">
            <span>{bridgeAnalytics.ruleOf40Score.toFixed(1)}%</span>
            {Math.abs(bridgeAnalytics.ruleOf40Delta) >= 0.05 && (
              <span
                className={`text-xs font-bold ${
                  bridgeAnalytics.ruleOf40Delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({bridgeAnalytics.ruleOf40Delta >= 0 ? '+' : ''}
                {bridgeAnalytics.ruleOf40Delta.toFixed(1)} pts)
              </span>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono tabular-nums">
            <span>{formatPercent(bridgeAnalytics.yoyArrGrowth, 1)} Growth</span>
            <span aria-hidden="true">+</span>
            <span className="text-cyan-300 font-bold">
              {formatPercent(bridgeAnalytics.ebitdaMargin, 1)} EBITDA
            </span>
          </div>
        </div>

        {/* KPI 3: Live SaaS Magic Number */}
        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between gap-2">
            <span>SaaS Magic Number</span>
            <span className={`text-xs font-bold ${magicNumberStatus.color}`}>
              {magicNumberStatus.label}
            </span>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-white mt-2 flex items-baseline gap-2">
            <span>{bridgeAnalytics.magicNumber.toFixed(2)}x</span>
            {Math.abs(bridgeAnalytics.magicNumberDelta) >= 0.005 && (
              <span
                className={`text-xs font-bold ${
                  bridgeAnalytics.magicNumberDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({bridgeAnalytics.magicNumberDelta >= 0 ? '+' : ''}
                {bridgeAnalytics.magicNumberDelta.toFixed(2)}x)
              </span>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Prior S&M Base</span>
            <span className="font-mono tabular-nums text-white font-bold">
              {formatCurrency(bridgeAnalytics.periodSmDisp, selectedCurrency, true)}
            </span>
          </div>
        </div>

        {/* KPI 4: Implied NDR & GRR */}
        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between gap-2">
            <span>Implied Retention (Annualized)</span>
            <span className="text-xs font-mono tabular-nums text-cyan-300 font-bold">
              {SEGMENT_LABELS[selectedSegment]}
            </span>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums tracking-tight text-white mt-2 flex items-baseline gap-2">
            <span>{formatPercent(bridgeAnalytics.impliedNdr, 1)}</span>
            <span className="text-xs font-sans font-semibold text-slate-400">NDR</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Gross Retention (GRR)</span>
            <span className="font-mono tabular-nums text-emerald-400 font-bold">
              {formatPercent(bridgeAnalytics.impliedGrr, 1)}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: ARR Bridge Waterfall (Left 8) + Live Bridge Scenario Levers (Right 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 8 Cols: Interactive ARR Bridge Waterfall */}
        <div className="lg:col-span-8 bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>ARR Bridge Waterfall — {selectedPeriod === 'FY2026' ? 'Full FY2026' : selectedPeriod}</span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Beginning ARR · New Logo · Expansion · Contraction · Churn · Ending ARR ({SEGMENT_LABELS[selectedSegment]})
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                  <span>Additions</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                  <span>Attrition</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span>
                  <span>Totals</span>
                </span>
              </div>
            </div>

            {/* Recharts Floating Waterfall BarChart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bridgeAnalytics.waterfallData}
                  margin={{ top: 14, right: 12, left: -8, bottom: 4 }}
                >
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={(val: number) => {
                      if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
                      if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
                      return String(val);
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as WaterfallDatum;
                      const isNeg = item.signedDelta < 0;
                      return (
                        <div className="bg-[#080d19] border border-cyan-500/80 rounded-lg p-3.5 shadow-2xl text-xs font-mono tabular-nums space-y-1.5">
                          <div className="font-sans font-bold text-white border-b border-slate-700 pb-1.5">
                            {item.label}
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="font-sans text-slate-300">
                              {item.isTotal ? 'Total ARR:' : 'Period Movement:'}
                            </span>
                            <span
                              className={`font-black ${
                                item.isTotal
                                  ? 'text-cyan-300'
                                  : isNeg
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {!item.isTotal && !isNeg ? '+' : ''}
                              {formatCurrency(item.signedDelta, selectedCurrency)}
                            </span>
                          </div>
                          {!item.isTotal && (
                            <div className="flex items-center justify-between gap-6">
                              <span className="font-sans text-slate-300">% of Beginning ARR:</span>
                              <span className="text-slate-100 font-bold">
                                {item.pctOfBeginning >= 0 ? '+' : ''}
                                {(item.pctOfBeginning * 100).toFixed(2)}%
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-800">
                            <span className="font-sans text-slate-300">Running ARR Balance:</span>
                            <span className="text-white font-bold">
                              {formatCurrency(item.cumulativeEnding, selectedCurrency)}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={bridgeAnalytics.begDisp} stroke="#334155" strokeDasharray="3 3" />
                  {/* Invisible offset stack */}
                  <Bar dataKey="baseOffset" stackId="waterfall" fill="transparent" isAnimationActive={false} />
                  {/* Visible waterfall segment */}
                  <Bar dataKey="barValue" stackId="waterfall" radius={[4, 4, 4, 4]} maxBarSize={56}>
                    {bridgeAnalytics.waterfallData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Numeric Bridge Movement Strip */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs font-mono tabular-nums">
            <div>
              <div className="font-sans text-[11px] text-slate-400 font-semibold">Beginning</div>
              <div className="text-white font-bold mt-0.5">
                {formatCurrency(bridgeAnalytics.begDisp, selectedCurrency, true)}
              </div>
            </div>
            <div>
              <div className="font-sans text-[11px] text-slate-400 font-semibold">+ New Logo</div>
              <div className="text-emerald-400 font-bold mt-0.5">
                +{formatCurrency(bridgeAnalytics.newDisp, selectedCurrency, true)}
              </div>
            </div>
            <div>
              <div className="font-sans text-[11px] text-slate-400 font-semibold">+ Expansion</div>
              <div className="text-teal-300 font-bold mt-0.5">
                +{formatCurrency(bridgeAnalytics.expDisp, selectedCurrency, true)}
              </div>
            </div>
            <div>
              <div className="font-sans text-[11px] text-slate-400 font-semibold">- Contraction</div>
              <div className="text-amber-400 font-bold mt-0.5">
                -{formatCurrency(bridgeAnalytics.conDisp, selectedCurrency, true)}
              </div>
            </div>
            <div>
              <div className="font-sans text-[11px] text-slate-400 font-semibold">- Churn</div>
              <div className="text-rose-400 font-bold mt-0.5">
                -{formatCurrency(bridgeAnalytics.churnDisp, selectedCurrency, true)}
              </div>
            </div>
            <div>
              <div className="font-sans text-[11px] text-slate-400 font-semibold">Ending ARR</div>
              <div className="text-cyan-300 font-black mt-0.5">
                {formatCurrency(bridgeAnalytics.endDisp, selectedCurrency, true)}
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Live Bridge Scenario Levers */}
        <div className="lg:col-span-4 bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Live Bridge Levers</span>
              </h2>
              {hasSliderChanges && (
                <button
                  onClick={resetLevers}
                  className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-300 mb-5">
              Stress-test acquisition and retention drivers to watch Rule of 40 and Magic Number recalculate immediately.
            </p>

            <div className="space-y-4">
              {/* Lever 1: New Logo Velocity */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-semibold">
                  <span className="text-slate-100">New Logo Velocity</span>
                  <span className="font-mono tabular-nums text-emerald-400 font-bold">
                    {newLogoAdjPct >= 0 ? '+' : ''}
                    {Math.round(newLogoAdjPct * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-0.30"
                  max="0.50"
                  step="0.02"
                  value={newLogoAdjPct}
                  onChange={(e) => setNewLogoAdjPct(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Lever 2: Expansion Rate */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-semibold">
                  <span className="text-slate-100">Expansion Upsell Lift</span>
                  <span className="font-mono tabular-nums text-teal-300 font-bold">
                    {expansionAdjPct >= 0 ? '+' : ''}
                    {Math.round(expansionAdjPct * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-0.30"
                  max="0.50"
                  step="0.02"
                  value={expansionAdjPct}
                  onChange={(e) => setExpansionAdjPct(parseFloat(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Lever 3: Contraction */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-semibold">
                  <span className="text-slate-100">Seat Contraction Delta</span>
                  <span className="font-mono tabular-nums text-amber-400 font-bold">
                    {contractionAdjPct >= 0 ? '+' : ''}
                    {Math.round(contractionAdjPct * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-0.50"
                  max="0.50"
                  step="0.02"
                  value={contractionAdjPct}
                  onChange={(e) => setContractionAdjPct(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>

              {/* Lever 4: Logo Churn */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-semibold">
                  <span className="text-slate-100">Logo Churn Delta</span>
                  <span className="font-mono tabular-nums text-rose-400 font-bold">
                    {churnAdjPct >= 0 ? '+' : ''}
                    {Math.round(churnAdjPct * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-0.50"
                  max="0.50"
                  step="0.02"
                  value={churnAdjPct}
                  onChange={(e) => setChurnAdjPct(parseFloat(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                />
              </div>
            </div>

            {/* Scenario Variance Readout */}
            <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Simulated ARR Variance</span>
                <span
                  className={`font-mono tabular-nums font-bold ${
                    bridgeAnalytics.endingArrDeltaDisp >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {bridgeAnalytics.endingArrDeltaDisp >= 0 ? '+' : ''}
                  {formatCurrency(bridgeAnalytics.endingArrDeltaDisp, selectedCurrency, true)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Active ERP Model NDR</span>
                <span className="font-mono tabular-nums text-slate-200 font-bold">
                  {formatPercent(drivers.netRetentionRate, 1)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800">
            <button
              onClick={handleApplyNdr}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {appliedNdrToast ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Applied {formatPercent(bridgeAnalytics.impliedNdr, 1)} NDR to Live Model</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  <span>Apply Implied NDR ({formatPercent(bridgeAnalytics.impliedNdr, 1)}) to Live Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Section: Cohort Retention Heatmap */}
      <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <Grid3X3 className="w-4 h-4 text-cyan-400" />
              <span>Multi-Vintage Cohort Retention Heatmap</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Quarterly cohort dollar retention from acquisition quarter (Q0) through Q7 · {filteredCohorts.length} vintages shown
            </p>
          </div>

          {/* NDR / GRR Segmented Control */}
          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 bg-[#090e1b] border border-slate-700 rounded-lg">
              <button
                onClick={() => setRetentionMetric('ndr')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  retentionMetric === 'ndr' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Net Dollar Retention (NDR)
              </button>
              <button
                onClick={() => setRetentionMetric('grr')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  retentionMetric === 'grr' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Gross Retention (GRR)
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Cohort Hover Detail Strip */}
        <div className="mb-4 px-3.5 py-2.5 bg-[#090e1b] border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          {hoveredCohort ? (
            <>
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <span className="font-mono text-cyan-300 font-bold">{hoveredCohort.cohort.cohortLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{SEGMENT_LABELS[hoveredCohort.cohort.segment]}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{hoveredCohort.cohort.customerCount} Logos</span>
                <span aria-hidden="true">·</span>
                <span>Period {COHORT_QUARTER_HEADERS[hoveredCohort.quarterIdx]}</span>
              </div>
              <div className="flex items-center gap-4 font-mono tabular-nums">
                <span className="text-slate-300">
                  Start:{' '}
                  <strong className="text-white">
                    {formatCurrency(
                      convertCurrency(hoveredCohort.cohort.startingArrUsd, 'USD', selectedCurrency, 'average', fxRates),
                      selectedCurrency,
                      true
                    )}
                  </strong>
                </span>
                <span className="text-slate-300">
                  Retained:{' '}
                  <strong className="text-emerald-400">
                    {formatCurrency(
                      convertCurrency(
                        hoveredCohort.cohort.startingArrUsd * hoveredCohort.value,
                        'USD',
                        selectedCurrency,
                        'average',
                        fxRates
                      ),
                      selectedCurrency,
                      true
                    )}
                  </strong>
                </span>
                <span className="text-cyan-300 font-black">
                  {(hoveredCohort.value * 100).toFixed(1)}% {retentionMetric.toUpperCase()}
                </span>
              </div>
            </>
          ) : (
            <div className="text-slate-400">
              Hover any populated cohort cell to inspect vintage starting ARR, retained dollar balance, and customer count.
            </div>
          )}
        </div>

        {/* Heatmap Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300 font-mono text-[11px]">
                <th className="py-2.5 px-3 text-left font-bold">Vintage</th>
                <th className="py-2.5 px-3 text-left font-bold">Segment</th>
                <th className="py-2.5 px-3 text-right font-bold">Starting ARR</th>
                <th className="py-2.5 px-3 text-right font-bold">Logos</th>
                {COHORT_QUARTER_HEADERS.map((qLabel) => (
                  <th key={qLabel} className="py-2.5 px-2 text-center font-bold min-w-[68px]">
                    {qLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCohorts.map((row) => {
                const series = retentionMetric === 'ndr' ? row.ndrQuarters : row.grrQuarters;
                const startArrDisp = convertCurrency(
                  row.startingArrUsd,
                  'USD',
                  selectedCurrency,
                  'average',
                  fxRates
                );
                return (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-white whitespace-nowrap">
                      {row.cohortLabel}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {SEGMENT_LABELS[row.segment]}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-100 font-semibold whitespace-nowrap">
                      {formatCurrency(startArrDisp, selectedCurrency, true)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                      {row.customerCount}
                    </td>
                    {series.map((val, qIdx) => (
                      <td key={qIdx} className="p-1">
                        <div
                          onMouseEnter={() => {
                            if (val !== null) {
                              setHoveredCohort({ cohort: row, quarterIdx: qIdx, value: val });
                            }
                          }}
                          onMouseLeave={() => setHoveredCohort(null)}
                          className={`h-8 rounded flex items-center justify-center font-mono tabular-nums text-xs transition-opacity ${getHeatmapCellStyle(
                            val,
                            retentionMetric
                          )} ${val !== null ? 'cursor-pointer hover:ring-1 hover:ring-cyan-300' : ''}`}
                        >
                          {val !== null ? `${Math.round(val * 100)}%` : '—'}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-700 bg-[#090e1b] font-mono tabular-nums">
                <td colSpan={4} className="py-3 px-3 font-sans font-bold text-white text-left">
                  ARR-Weighted {retentionMetric === 'ndr' ? 'NDR' : 'GRR'} Average
                </td>
                {cohortColumnAverages.map((avg, idx) => (
                  <td key={idx} className="py-3 px-2 text-center font-black text-cyan-300">
                    {avg !== null ? `${(avg * 100).toFixed(1)}%` : '—'}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
