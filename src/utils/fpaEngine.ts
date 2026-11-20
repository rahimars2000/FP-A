import {
  CurrencyCode,
  FinancialDrivers,
  FxRate,
  PeriodKey,
  ForecastPeriodKey,
  StatementLineItem,
  MonteCarloTrialResult,
  IntercompanyTransaction,
  WorkforceRole,
  JurisdictionTaxProfile,
  QuarterlyPayrollDelta,
  WorkforceDepartment
} from '../types/fpa';

export const ALL_PERIODS: PeriodKey[] = [
  '2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4',
  '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'
];

export const HISTORICAL_PERIODS: PeriodKey[] = ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'];
export const FORECAST_PERIODS: ForecastPeriodKey[] = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD', compact = false): string {
  const symbols: Record<CurrencyCode, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    SGD: 'S$',
    CHF: 'CHF ',
  };

  const symbol = symbols[currency] || '$';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  if (compact) {
    if (absAmount >= 1_000_000_000) {
      return `${isNegative ? '-' : ''}${symbol}${(absAmount / 1_000_000_000).toFixed(2)}B`;
    }
    if (absAmount >= 1_000_000) {
      return `${isNegative ? '-' : ''}${symbol}${(absAmount / 1_000_000).toFixed(2)}M`;
    }
    if (absAmount >= 1_000) {
      return `${isNegative ? '-' : ''}${symbol}${(absAmount / 1_000).toFixed(1)}K`;
    }
  }

  const formattedNumber = Math.round(absAmount).toLocaleString('en-US');
  if (isNegative) {
    return `(${symbol}${formattedNumber})`;
  }
  return `${symbol}${formattedNumber}`;
}

export function formatPercent(rate: number, decimals = 1): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}

export function formatVariance(actual: number, base: number): { diffAmount: number; diffPercent: number; isFavorable: boolean } {
  const diffAmount = actual - base;
  const diffPercent = base !== 0 ? (diffAmount / Math.abs(base)) : 0;
  return {
    diffAmount,
    diffPercent,
    isFavorable: diffAmount >= 0,
  };
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rateType: 'spot' | 'average' | 'historical',
  rates: FxRate[]
): number {
  if (from === to) return amount;

  // Convert from -> USD first
  let amountInUsd = amount;
  if (from !== 'USD') {
    const fromRate = rates.find((r) => r.from === from && r.to === 'USD');
    const multiplier = fromRate
      ? rateType === 'spot'
        ? fromRate.spotRate
        : rateType === 'average'
        ? fromRate.averageRate
        : fromRate.historicalRate
      : 1;
    amountInUsd = amount * multiplier;
  }

  // Convert USD -> to
  if (to === 'USD') return amountInUsd;

  const toRate = rates.find((r) => r.from === to && r.to === 'USD');
  const divisor = toRate
    ? rateType === 'spot'
      ? toRate.spotRate
      : rateType === 'average'
      ? toRate.averageRate
      : toRate.historicalRate
    : 1;

  return amountInUsd / (divisor || 1);
}

/**
 * Driver-based forecasting engine.
 * Computes forward quarters based on driver assumptions plus optional incremental payroll deltas.
 */
export function recalculateForecastWithDrivers(
  baseItems: StatementLineItem[],
  drivers: FinancialDrivers,
  scenarioMultiplier: { rev: number; opex: number; margin: number } = { rev: 1.0, opex: 1.0, margin: 1.0 },
  payrollDelta?: QuarterlyPayrollDelta | null
): StatementLineItem[] {
  // Deep clone items
  const updatedItems: StatementLineItem[] = JSON.parse(JSON.stringify(baseItems));

  // Determine starting Q4 2025 revenue
  const revSubItem = updatedItems.find((i) => i.id === 'rev_sub');
  const revServItem = updatedItems.find((i) => i.id === 'rev_services');
  const totRevItem = updatedItems.find((i) => i.id === 'tot_rev');
  const cogsCloudItem = updatedItems.find((i) => i.id === 'cogs_cloud');
  const cogsSupportItem = updatedItems.find((i) => i.id === 'cogs_support');
  const totCogsItem = updatedItems.find((i) => i.id === 'tot_cogs');
  const gpItem = updatedItems.find((i) => i.id === 'gross_profit');
  const rdItem = updatedItems.find((i) => i.id === 'opex_rd');
  const smItem = updatedItems.find((i) => i.id === 'opex_sm');
  const gaItem = updatedItems.find((i) => i.id === 'opex_ga');
  const totOpexItem = updatedItems.find((i) => i.id === 'tot_opex');
  const ebitdaItem = updatedItems.find((i) => i.id === 'ebitda');
  const daItem = updatedItems.find((i) => i.id === 'da');
  const ebitItem = updatedItems.find((i) => i.id === 'ebit');
  const taxItem = updatedItems.find((i) => i.id === 'tax_provision');
  const netIncItem = updatedItems.find((i) => i.id === 'net_income');

  let prevSubRev = revSubItem ? revSubItem.values['2025-Q4'] : 38900000;
  let prevServRev = revServItem ? revServItem.values['2025-Q4'] : 6300000;

  // Forecast quarters: 2026-Q1, 2026-Q2, 2026-Q3, 2026-Q4
  FORECAST_PERIODS.forEach((period, idx) => {
    const qDelta = payrollDelta?.[period] || { rd: 0, sm: 0, ga: 0, cogs: 0 };

    // Growth driven by Net Retention and Headcount productivity
    const quarterlyExpansion = (drivers.netRetentionRate - 1) / 4 + drivers.headcountGrowthRate * 0.45;
    const effectiveGrowth = quarterlyExpansion * scenarioMultiplier.rev;

    const newSubRev = Math.round(prevSubRev * (1 + effectiveGrowth));
    const newServRev = Math.round(prevServRev * (1 + effectiveGrowth * 0.7));

    if (revSubItem) revSubItem.values[period] = newSubRev;
    if (revServItem) revServItem.values[period] = newServRev;

    const totalRev = newSubRev + newServRev;
    if (totRevItem) totRevItem.values[period] = totalRev;

    // Gross Margin target + incremental COGS Support payroll delta
    const grossMargin = drivers.grossMarginTarget * scenarioMultiplier.margin;
    const baseTotalCogs = Math.round(totalRev * (1 - grossMargin));
    const cloudCogs = Math.round(baseTotalCogs * 0.61);
    const supportCogs = Math.max(0, baseTotalCogs - cloudCogs + Math.round(qDelta.cogs));
    const totalCogs = cloudCogs + supportCogs;

    if (cogsCloudItem) cogsCloudItem.values[period] = cloudCogs;
    if (cogsSupportItem) cogsSupportItem.values[period] = supportCogs;
    if (totCogsItem) totCogsItem.values[period] = totalCogs;

    const gp = totalRev - totalCogs;
    if (gpItem) gpItem.values[period] = gp;

    // OpEx allocations + incremental Workforce payroll deltas
    const opexFactor = scenarioMultiplier.opex * (1 + drivers.inflationIndex * (idx + 1) * 0.25);
    const rdExp = Math.max(0, Math.round(totalRev * drivers.rdOpExRatio * opexFactor + qDelta.rd));
    const smExp = Math.max(0, Math.round(totalRev * drivers.smOpExRatio * opexFactor + qDelta.sm));
    const gaExp = Math.max(0, Math.round(totalRev * drivers.gaOpExRatio * opexFactor + qDelta.ga));

    if (rdItem) rdItem.values[period] = rdExp;
    if (smItem) smItem.values[period] = smExp;
    if (gaItem) gaItem.values[period] = gaExp;

    const totalOpex = rdExp + smExp + gaExp;
    if (totOpexItem) totOpexItem.values[period] = totalOpex;

    const ebitda = gp - totalOpex;
    if (ebitdaItem) ebitdaItem.values[period] = ebitda;

    const daVal = Math.round(1400000 + idx * 85000);
    if (daItem) daItem.values[period] = daVal;

    const ebit = ebitda - daVal;
    if (ebitItem) ebitItem.values[period] = ebit;

    const tax = Math.round(Math.max(0, ebit * 0.21));
    if (taxItem) taxItem.values[period] = tax;

    if (netIncItem) netIncItem.values[period] = ebit - tax;

    // Advance iteration state
    prevSubRev = newSubRev;
    prevServRev = newServRev;
  });

  return updatedItems;
}

/**
 * Synchronizes Cash Flow Statement forecast quarters with live Net Income
 * (automatically reflecting driver shifts and Workforce Payroll Sync deltas).
 */
export function recalculateCashFlowWithIncomeStatement(
  baseCashFlow: StatementLineItem[],
  currentIncomeStatement: StatementLineItem[]
): StatementLineItem[] {
  const updatedCf: StatementLineItem[] = JSON.parse(JSON.stringify(baseCashFlow));
  const netIncPnl = currentIncomeStatement.find((i) => i.id === 'net_income');
  const daPnl = currentIncomeStatement.find((i) => i.id === 'da');

  const cfNetInc = updatedCf.find((i) => i.id === 'cf_net_inc');
  const cfDa = updatedCf.find((i) => i.id === 'cf_da');
  const cfWorkingCap = updatedCf.find((i) => i.id === 'cf_working_cap');
  const cfTotOps = updatedCf.find((i) => i.id === 'cf_tot_ops');
  const cfCapex = updatedCf.find((i) => i.id === 'cf_capex');
  const cfDebt = updatedCf.find((i) => i.id === 'cf_debt_service');
  const cfNetChange = updatedCf.find((i) => i.id === 'cf_net_change');

  FORECAST_PERIODS.forEach((period) => {
    const netInc = netIncPnl?.values[period] ?? cfNetInc?.values[period] ?? 0;
    const da = daPnl?.values[period] ?? cfDa?.values[period] ?? 0;
    const wc = cfWorkingCap?.values[period] ?? 0;
    const capex = cfCapex?.values[period] ?? 0;
    const debt = cfDebt?.values[period] ?? 0;

    if (cfNetInc) cfNetInc.values[period] = netInc;
    if (cfDa) cfDa.values[period] = da;

    const totOps = netInc + da + wc;
    if (cfTotOps) cfTotOps.values[period] = totOps;
    if (cfNetChange) cfNetChange.values[period] = totOps + capex + debt;
  });

  return updatedCf;
}

/**
 * Computes exact day-level start-date proration factor (0.0 to 1.0) for a given FY2026 quarter.
 */
export function getQuarterProrationFactor(startDate: string, period: ForecastPeriodKey): number {
  const quarterBounds: Record<ForecastPeriodKey, { start: string; end: string }> = {
    '2026-Q1': { start: '2026-01-01', end: '2026-03-31' },
    '2026-Q2': { start: '2026-04-01', end: '2026-06-30' },
    '2026-Q3': { start: '2026-07-01', end: '2026-09-30' },
    '2026-Q4': { start: '2026-10-01', end: '2026-12-31' },
  };

  const bounds = quarterBounds[period];
  if (!startDate) return 1.0;

  const parseUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y || 2025, (m || 1) - 1, d || 1);
  };

  const roleStartMs = parseUtc(startDate);
  const qStartMs = parseUtc(bounds.start);
  const qEndMs = parseUtc(bounds.end);
  const msPerDay = 86_400_000;

  if (roleStartMs <= qStartMs) return 1.0;
  if (roleStartMs > qEndMs) return 0.0;

  const totalDays = Math.round((qEndMs - qStartMs) / msPerDay) + 1;
  const activeDays = Math.round((qEndMs - roleStartMs) / msPerDay) + 1;
  return Math.max(0, Math.min(1, activeDays / totalDays));
}

export interface ComputedRolePayroll {
  role: WorkforceRole;
  taxProfile: JurisdictionTaxProfile;
  annualBaseTotalLocal: number;
  annualTaxBurdenLocal: number;
  annualLoadedTotalLocal: number;
  quarterlyProration: Record<ForecastPeriodKey, number>;
  quarterlyLoadedLocal: Record<ForecastPeriodKey, number>;
  quarterlyLoadedUsd: Record<ForecastPeriodKey, number>;
  fy26ProratedLoadedLocal: number;
  fy26ProratedLoadedUsd: number;
  fy26ProratedBaseUsd: number;
  fy26ProratedTaxUsd: number;
}

export interface WorkforceScheduleResult {
  computedRoles: ComputedRolePayroll[];
  quarterlyByDepartmentUsd: Record<ForecastPeriodKey, { rd: number; sm: number; ga: number; cogs: number; total: number }>;
  baselineQuarterlyByDepartmentUsd: Record<ForecastPeriodKey, { rd: number; sm: number; ga: number; cogs: number; total: number }>;
  quarterlyDeltasUsd: QuarterlyPayrollDelta;
  entitySummaries: {
    profile: JurisdictionTaxProfile;
    plannedFte: number;
    baselineFte: number;
    fteDelta: number;
    fy26BaseUsd: number;
    fy26TaxUsd: number;
    fy26LoadedUsd: number;
    fy26LoadedLocal: number;
  }[];
  entityFteDeltas: Record<string, number>;
  totalPlannedFte: number;
  totalBaselineFte: number;
  totalFy26LoadedUsd: number;
  totalFy26BaseUsd: number;
  totalFy26TaxUsd: number;
  weightedBurdenPct: number;
  totalAnnualDeltaUsd: number;
  departmentAnnualDeltasUsd: Record<WorkforceDepartment, number>;
}

function emptyQuarterlyDeptMap() {
  return {
    '2026-Q1': { rd: 0, sm: 0, ga: 0, cogs: 0, total: 0 },
    '2026-Q2': { rd: 0, sm: 0, ga: 0, cogs: 0, total: 0 },
    '2026-Q3': { rd: 0, sm: 0, ga: 0, cogs: 0, total: 0 },
    '2026-Q4': { rd: 0, sm: 0, ga: 0, cogs: 0, total: 0 },
  };
}

/**
 * Computes full FY2026 role-level loaded payroll with start-date proration,
 * jurisdiction-specific statutory tax burdens, FX conversion, and incremental deltas vs. baseline.
 */
export function computeWorkforcePayrollSchedule(
  roles: WorkforceRole[],
  baselineRoles: WorkforceRole[],
  taxProfiles: JurisdictionTaxProfile[],
  fxRates: FxRate[]
): WorkforceScheduleResult {
  const defaultProfile = taxProfiles[0];

  const computeSingle = (role: WorkforceRole): ComputedRolePayroll => {
    const profile = taxProfiles.find((p) => p.entityId === role.entityId) || defaultProfile;
    const annualBaseTotalLocal = role.annualBaseLocal * role.fteCount;
    const annualTaxBurdenLocal = annualBaseTotalLocal * profile.totalBurdenPct;
    const annualLoadedTotalLocal = annualBaseTotalLocal + annualTaxBurdenLocal;

    const quarterlyProration = {} as Record<ForecastPeriodKey, number>;
    const quarterlyLoadedLocal = {} as Record<ForecastPeriodKey, number>;
    const quarterlyLoadedUsd = {} as Record<ForecastPeriodKey, number>;

    let fy26ProratedLoadedLocal = 0;
    let fy26ProratedLoadedUsd = 0;
    let fy26ProratedBaseUsd = 0;
    let fy26ProratedTaxUsd = 0;

    FORECAST_PERIODS.forEach((period) => {
      const factor = getQuarterProrationFactor(role.startDate, period);
      const qBaseLocal = (annualBaseTotalLocal / 4) * factor;
      const qTaxLocal = (annualTaxBurdenLocal / 4) * factor;
      const qLoadedLocal = qBaseLocal + qTaxLocal;

      const qBaseUsd = convertCurrency(qBaseLocal, profile.currency, 'USD', 'average', fxRates);
      const qTaxUsd = convertCurrency(qTaxLocal, profile.currency, 'USD', 'average', fxRates);
      const qLoadedUsd = qBaseUsd + qTaxUsd;

      quarterlyProration[period] = factor;
      quarterlyLoadedLocal[period] = qLoadedLocal;
      quarterlyLoadedUsd[period] = qLoadedUsd;

      fy26ProratedLoadedLocal += qLoadedLocal;
      fy26ProratedLoadedUsd += qLoadedUsd;
      fy26ProratedBaseUsd += qBaseUsd;
      fy26ProratedTaxUsd += qTaxUsd;
    });

    return {
      role,
      taxProfile: profile,
      annualBaseTotalLocal,
      annualTaxBurdenLocal,
      annualLoadedTotalLocal,
      quarterlyProration,
      quarterlyLoadedLocal,
      quarterlyLoadedUsd,
      fy26ProratedLoadedLocal,
      fy26ProratedLoadedUsd,
      fy26ProratedBaseUsd,
      fy26ProratedTaxUsd,
    };
  };

  const computedRoles = roles.map(computeSingle);
  const computedBaseline = baselineRoles.map(computeSingle);

  const quarterlyByDepartmentUsd = emptyQuarterlyDeptMap();
  const baselineQuarterlyByDepartmentUsd = emptyQuarterlyDeptMap();

  const accumulate = (
    list: ComputedRolePayroll[],
    target: ReturnType<typeof emptyQuarterlyDeptMap>
  ) => {
    list.forEach((item) => {
      FORECAST_PERIODS.forEach((period) => {
        const val = item.quarterlyLoadedUsd[period];
        if (item.role.department === 'R&D') target[period].rd += val;
        else if (item.role.department === 'S&M') target[period].sm += val;
        else if (item.role.department === 'G&A') target[period].ga += val;
        else target[period].cogs += val;
        target[period].total += val;
      });
    });
  };

  accumulate(computedRoles, quarterlyByDepartmentUsd);
  accumulate(computedBaseline, baselineQuarterlyByDepartmentUsd);

  const quarterlyDeltasUsd: QuarterlyPayrollDelta = {
    '2026-Q1': { rd: 0, sm: 0, ga: 0, cogs: 0 },
    '2026-Q2': { rd: 0, sm: 0, ga: 0, cogs: 0 },
    '2026-Q3': { rd: 0, sm: 0, ga: 0, cogs: 0 },
    '2026-Q4': { rd: 0, sm: 0, ga: 0, cogs: 0 },
  };

  const departmentAnnualDeltasUsd: Record<WorkforceDepartment, number> = {
    'R&D': 0,
    'S&M': 0,
    'G&A': 0,
    'COGS': 0,
  };

  let totalAnnualDeltaUsd = 0;

  FORECAST_PERIODS.forEach((period) => {
    const rd = Math.round(quarterlyByDepartmentUsd[period].rd - baselineQuarterlyByDepartmentUsd[period].rd);
    const sm = Math.round(quarterlyByDepartmentUsd[period].sm - baselineQuarterlyByDepartmentUsd[period].sm);
    const ga = Math.round(quarterlyByDepartmentUsd[period].ga - baselineQuarterlyByDepartmentUsd[period].ga);
    const cogs = Math.round(quarterlyByDepartmentUsd[period].cogs - baselineQuarterlyByDepartmentUsd[period].cogs);

    quarterlyDeltasUsd[period] = { rd, sm, ga, cogs };
    departmentAnnualDeltasUsd['R&D'] += rd;
    departmentAnnualDeltasUsd['S&M'] += sm;
    departmentAnnualDeltasUsd['G&A'] += ga;
    departmentAnnualDeltasUsd['COGS'] += cogs;
    totalAnnualDeltaUsd += rd + sm + ga + cogs;
  });

  const entityFteDeltas: Record<string, number> = {};
  const entitySummaries = taxProfiles.map((profile) => {
    const entityPlanned = computedRoles.filter((c) => c.role.entityId === profile.entityId);
    const entityBase = computedBaseline.filter((c) => c.role.entityId === profile.entityId);

    const plannedFte = entityPlanned.reduce((s, c) => s + c.role.fteCount, 0);
    const baselineFte = entityBase.reduce((s, c) => s + c.role.fteCount, 0);
    const fteDelta = plannedFte - baselineFte;
    entityFteDeltas[profile.entityId] = fteDelta;

    return {
      profile,
      plannedFte,
      baselineFte,
      fteDelta,
      fy26BaseUsd: entityPlanned.reduce((s, c) => s + c.fy26ProratedBaseUsd, 0),
      fy26TaxUsd: entityPlanned.reduce((s, c) => s + c.fy26ProratedTaxUsd, 0),
      fy26LoadedUsd: entityPlanned.reduce((s, c) => s + c.fy26ProratedLoadedUsd, 0),
      fy26LoadedLocal: entityPlanned.reduce((s, c) => s + c.fy26ProratedLoadedLocal, 0),
    };
  });

  const totalPlannedFte = computedRoles.reduce((s, c) => s + c.role.fteCount, 0);
  const totalBaselineFte = computedBaseline.reduce((s, c) => s + c.role.fteCount, 0);
  const totalFy26LoadedUsd = computedRoles.reduce((s, c) => s + c.fy26ProratedLoadedUsd, 0);
  const totalFy26BaseUsd = computedRoles.reduce((s, c) => s + c.fy26ProratedBaseUsd, 0);
  const totalFy26TaxUsd = computedRoles.reduce((s, c) => s + c.fy26ProratedTaxUsd, 0);
  const weightedBurdenPct = totalFy26BaseUsd > 0 ? totalFy26TaxUsd / totalFy26BaseUsd : 0;

  return {
    computedRoles,
    quarterlyByDepartmentUsd,
    baselineQuarterlyByDepartmentUsd,
    quarterlyDeltasUsd,
    entitySummaries,
    entityFteDeltas,
    totalPlannedFte,
    totalBaselineFte,
    totalFy26LoadedUsd,
    totalFy26BaseUsd,
    totalFy26TaxUsd,
    weightedBurdenPct,
    totalAnnualDeltaUsd,
    departmentAnnualDeltasUsd,
  };
}

/**
 * Monte Carlo Simulation Engine
 * Runs 1,000 statistical iterations with stochastic distributions
 * on driver variables (NRR, Gross Margin, Sales Cycle / CAC Payback).
 */
export function runMonteCarloSimulation(
  baseDrivers: FinancialDrivers,
  currentCashReserves: number,
  iterations = 1000
): MonteCarloTrialResult {
  const annualRevResults: number[] = [];
  const annualEbitdaResults: number[] = [];

  // Seeded normal distribution generator using Box-Muller transform
  function randomNormal(mean: number, stdDev: number): number {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  for (let i = 0; i < iterations; i++) {
    // Stochastic drivers
    const simNrr = Math.max(0.92, randomNormal(baseDrivers.netRetentionRate, 0.045));
    const simMargin = Math.min(0.88, Math.max(0.70, randomNormal(baseDrivers.grossMarginTarget, 0.025)));
    const simHeadcountGrowth = Math.max(0.01, randomNormal(baseDrivers.headcountGrowthRate, 0.02));

    // Calculate full year 2026 projected revenue
    let rev = 45200000; // Q4 2025 base
    let total2026Rev = 0;
    let total2026Ebitda = 0;

    for (let q = 0; q < 4; q++) {
      const qGrowth = (simNrr - 1) / 4 + simHeadcountGrowth * 0.4;
      rev = rev * (1 + qGrowth);
      total2026Rev += rev;

      const qGp = rev * simMargin;
      const qOpex = rev * (baseDrivers.rdOpExRatio + baseDrivers.smOpExRatio + baseDrivers.gaOpExRatio);
      total2026Ebitda += (qGp - qOpex);
    }

    annualRevResults.push(total2026Rev);
    annualEbitdaResults.push(total2026Ebitda);
  }

  // Sort results
  annualRevResults.sort((a, b) => a - b);
  annualEbitdaResults.sort((a, b) => a - b);

  const p10Index = Math.floor(iterations * 0.1);
  const p50Index = Math.floor(iterations * 0.5);
  const p90Index = Math.floor(iterations * 0.9);

  const p10Revenue = annualRevResults[p10Index];
  const p50Revenue = annualRevResults[p50Index];
  const p90Revenue = annualRevResults[p90Index];

  const p10Ebitda = annualEbitdaResults[p10Index];
  const p50Ebitda = annualEbitdaResults[p50Index];
  const p90Ebitda = annualEbitdaResults[p90Index];

  // Cash Runway P50 calculation
  const quarterlyBurnOrGeneration = p50Ebitda / 4;
  const runwayMonthsP50 = quarterlyBurnOrGeneration > 0
    ? 99 // Infinite / cash flow positive
    : Math.round((currentCashReserves / Math.abs(quarterlyBurnOrGeneration)) * 3);

  // Generate 8-bucket distribution histogram
  const minVal = annualRevResults[0];
  const maxVal = annualRevResults[iterations - 1];
  const bucketSize = (maxVal - minVal) / 8;
  const distributionHistogram: { binLabel: string; count: number }[] = [];

  for (let b = 0; b < 8; b++) {
    const low = minVal + b * bucketSize;
    const high = low + bucketSize;
    const count = annualRevResults.filter((v) => v >= low && (b === 7 ? v <= high : v < high)).length;
    const binLabel = `$${(low / 1_000_000).toFixed(0)}M - $${(high / 1_000_000).toFixed(0)}M`;
    distributionHistogram.push({ binLabel, count });
  }

  return {
    p10Revenue,
    p50Revenue,
    p90Revenue,
    p10Ebitda,
    p50Ebitda,
    p90Ebitda,
    runwayMonthsP50,
    distributionHistogram,
  };
}

/**
 * Intercompany Elimination Engine
 * Reconciles cross-entity trades and generates ASC 810 eliminations
 */
export function processIntercompanyEliminations(
  transactions: IntercompanyTransaction[],
  fxRates: FxRate[]
): {
  matchedTotalUsd: number;
  varianceTotalUsd: number;
  eliminatedCount: number;
  eliminationJournalLines: {
    debitAccount: string;
    creditAccount: string;
    amountUsd: number;
    description: string;
  }[];
} {
  let matchedTotalUsd = 0;
  let varianceTotalUsd = 0;
  let eliminatedCount = 0;
  const eliminationJournalLines: {
    debitAccount: string;
    creditAccount: string;
    amountUsd: number;
    description: string;
  }[] = [];

  transactions.forEach((tx) => {
    const amountUsd = convertCurrency(tx.amount, tx.currency, 'USD', 'spot', fxRates);

    if (tx.eliminationStatus === 'matched' || tx.eliminationStatus === 'eliminated') {
      matchedTotalUsd += amountUsd;
      eliminatedCount++;

      eliminationJournalLines.push({
        debitAccount: '2090 Intercompany Payables (Liability)',
        creditAccount: '1090 Intercompany Receivables (Asset)',
        amountUsd: Math.round(amountUsd),
        description: `ASC 810 Elimination of ${tx.referenceNumber}: ${tx.description}`,
      });
    } else {
      const varianceUsd = convertCurrency(tx.varianceAmount, tx.currency, 'USD', 'spot', fxRates);
      varianceTotalUsd += varianceUsd;
    }
  });

  return {
    matchedTotalUsd: Math.round(matchedTotalUsd),
    varianceTotalUsd: Math.round(varianceTotalUsd),
    eliminatedCount,
    eliminationJournalLines,
  };
}
