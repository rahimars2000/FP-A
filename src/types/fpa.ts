export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'SGD' | 'CHF';

export type ScenarioType = 'base' | 'bull' | 'bear' | 'custom';

export type PeriodKey = '2025-Q1' | '2025-Q2' | '2025-Q3' | '2025-Q4' | '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4';

export interface Entity {
  id: string;
  code: string;
  name: string;
  legalType: string;
  jurisdiction: string;
  currency: CurrencyCode;
  ownershipPercent: number;
  isParent: boolean;
  status: 'active' | 'audited' | 'pending_close';
  headcount: number;
}

export interface FxRate {
  from: CurrencyCode;
  to: CurrencyCode;
  spotRate: number;
  averageRate: number;
  historicalRate: number;
  effectiveDate: string;
}

export interface FinancialDrivers {
  headcountGrowthRate: number; // e.g. 0.08 (8%)
  revenuePerFte: number; // e.g. 240,000
  netRetentionRate: number; // e.g. 1.14 (114%)
  cacPaybackMonths: number; // e.g. 14 months
  grossMarginTarget: number; // e.g. 0.78 (78%)
  rdOpExRatio: number; // e.g. 0.22 (22%)
  smOpExRatio: number; // e.g. 0.28 (28%)
  gaOpExRatio: number; // e.g. 0.12 (12%)
  capexRevenueRatio: number; // e.g. 0.04 (4%)
  dsoDays: number; // Days Sales Outstanding
  dpoDays: number; // Days Payable Outstanding
  inflationIndex: number; // e.g. 0.025
}

export interface StatementLineItem {
  id: string;
  code: string;
  name: string;
  category: 'revenue' | 'cogs' | 'opex' | 'other_income' | 'tax' | 'current_assets' | 'non_current_assets' | 'current_liabilities' | 'long_term_liabilities' | 'equity' | 'operating_cf' | 'investing_cf' | 'financing_cf';
  values: Record<PeriodKey, number>;
  isSubtotal?: boolean;
  isTotal?: boolean;
  depth?: number;
  formula?: string;
  drilldownDetails?: {
    entityId: string;
    localCurrency: CurrencyCode;
    localAmount: number;
    translatedAmount: number;
  }[];
}

export interface FinancialStatementData {
  incomeStatement: StatementLineItem[];
  balanceSheet: StatementLineItem[];
  cashFlow: StatementLineItem[];
}

export interface IntercompanyTransaction {
  id: string;
  referenceNumber: string;
  fromEntityId: string;
  toEntityId: string;
  transactionType: 'management_fee' | 'ip_royalty' | 'intercompany_loan' | 'shared_services' | 'transfer_pricing';
  period: PeriodKey;
  amount: number;
  currency: CurrencyCode;
  description: string;
  sourceRecorded: boolean;
  targetRecorded: boolean;
  varianceAmount: number;
  eliminationStatus: 'matched' | 'variance_flagged' | 'eliminated';
  eliminationJournalRef?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: {
    name: string;
    role: string;
    email: string;
  };
  entityId: string;
  action: 'ADJUSTMENT_POSTED' | 'CONSOLIDATION_RUN' | 'IC_ELIMINATED' | 'FX_RATE_UPDATED' | 'SCENARIO_COMMITTED' | 'PERIOD_CLOSED';
  description: string;
  previousValue?: string;
  newValue?: string;
  complianceRule: 'SOX_404' | 'ASC_810_CONSOLIDATION' | 'ASC_830_FOREIGN_CURRENCY' | 'IFRS_10';
  hashSignature: string;
}

export interface ThirdPartyConnector {
  id: string;
  name: string;
  provider: 'SAP' | 'NetSuite' | 'Workday' | 'Salesforce' | 'Snowflake' | 'Stripe';
  category: 'ERP_CORE' | 'CRM_BILLING' | 'HRIS_PAYROLL' | 'DATA_LAKE';
  status: 'active' | 'syncing' | 'error' | 'paused';
  lastSyncAt: string;
  syncCadence: 'Real-Time Webhook' | 'Every 15 min' | 'Hourly' | 'Daily Close';
  recordsSynced: number;
  endpointUrl: string;
  version: string;
  healthLatencyMs: number;
}

export interface MonteCarloTrialResult {
  p10Revenue: number;
  p50Revenue: number;
  p90Revenue: number;
  p10Ebitda: number;
  p50Ebitda: number;
  p90Ebitda: number;
  runwayMonthsP50: number;
  distributionHistogram: { binLabel: string; count: number }[];
}

export interface AutonomousAlert {
  id: string;
  title: string;
  category: 'GL_ANOMALY' | 'BUDGET_BREACH' | 'FX_EXPOSURE' | 'TREASURY_SWEEP';
  severity: 'critical' | 'warning' | 'info';
  impactAmount: number;
  currency: CurrencyCode;
  entityCode: string;
  detectedAt: string;
  autoResolved: boolean;
  recommendedAction: string;
}

export interface StrategicDealModel {
  targetName: string;
  targetRevenue: number;
  targetEbitda: number;
  evMultiple: number;
  debtFinancingPct: number;
  annualSynergies: number;
  integrationCost: number;
}

export interface TreasurySweepRule {
  id: string;
  sourceEntity: string;
  targetEntity: string;
  minRetainedCash: number;
  yieldRate: number;
  autoSweepActive: boolean;
  lastSweptAmount: number;
}

// --- ARR & Cohort Engine Types ---

export type CustomerSegment = 'all' | 'enterprise' | 'mid_market' | 'commercial';

export type ForecastPeriodKey = '2026-Q1' | '2026-Q2' | '2026-Q3' | '2026-Q4';

export interface ArrBridgeRecord {
  period: PeriodKey;
  segment: Exclude<CustomerSegment, 'all'>;
  beginningArrUsd: number;
  newLogoArrUsd: number;
  expansionArrUsd: number;
  contractionArrUsd: number; // stored as positive magnitude, subtracted in waterfall
  churnArrUsd: number; // stored as positive magnitude, subtracted in waterfall
  endingArrUsd: number;
  priorQuarterSmUsd: number;
}

export interface CohortVintageRow {
  id: string;
  cohortLabel: string; // e.g. "2024-Q3"
  segment: Exclude<CustomerSegment, 'all'>;
  startingArrUsd: number;
  customerCount: number;
  // Retention ratios (e.g. 1.00 = 100%, 1.18 = 118%) for Q0..Q7; null if future period
  ndrQuarters: (number | null)[];
  grrQuarters: (number | null)[];
}

// --- Workforce & Payroll Planner Types ---

export type WorkforceDepartment = 'R&D' | 'S&M' | 'G&A' | 'COGS';

export interface JurisdictionTaxProfile {
  entityId: string;
  entityCode: string;
  entityName: string;
  jurisdiction: string;
  currency: CurrencyCode;
  statutoryPayrollTaxPct: number; // e.g. 0.0765
  pensionSocialPct: number; // e.g. 0.04
  benefitsPct: number; // e.g. 0.0685
  totalBurdenPct: number; // sum of above
  statutorySummary: string;
}

export interface WorkforceRole {
  id: string;
  title: string;
  department: WorkforceDepartment;
  entityId: string;
  fteCount: number;
  annualBaseLocal: number; // Annual base salary per FTE in entity's functional currency
  startDate: string; // YYYY-MM-DD (dates <= 2025-12-31 are full-year active in FY2026)
  status: 'active' | 'planned' | 'backfill';
  isBaseline?: boolean;
}

export type QuarterlyDepartmentDelta = {
  rd: number;
  sm: number;
  ga: number;
  cogs: number;
};

export type QuarterlyPayrollDelta = Record<ForecastPeriodKey, QuarterlyDepartmentDelta>;

export interface WorkforceSyncPayload {
  quarterlyDeltas: QuarterlyPayrollDelta;
  entityFteDeltas: Record<string, number>;
  totalAnnualDeltaUsd: number;
  totalFteDelta: number;
  syncedAt: string;
}


