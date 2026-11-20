import React, { useState, useMemo } from 'react';
import {
  CurrencyCode,
  Entity,
  ForecastPeriodKey,
  FxRate,
  JurisdictionTaxProfile,
  QuarterlyPayrollDelta,
  StatementLineItem,
  WorkforceDepartment,
  WorkforceRole,
  WorkforceSyncPayload
} from '../../types/fpa';
import {
  computeWorkforcePayrollSchedule,
  convertCurrency,
  FORECAST_PERIODS,
  formatCurrency,
  formatPercent,
  getQuarterProrationFactor
} from '../../utils/fpaEngine';
import {
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface WorkforcePayrollPlannerProps {
  roles: WorkforceRole[];
  baselineRoles: WorkforceRole[];
  taxProfiles: JurisdictionTaxProfile[];
  entities: Entity[];
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  incomeStatement: StatementLineItem[];
  cashFlow: StatementLineItem[];
  syncedPayrollDelta: QuarterlyPayrollDelta | null;
  lastPayrollSyncAt: string | null;
  onUpdateRoles: (roles: WorkforceRole[]) => void;
  onSyncToStatements: (payload: WorkforceSyncPayload) => void;
  onRevertSync: () => void;
  onNavigateTab: (tab: string) => void;
}

const DEPARTMENTS: WorkforceDepartment[] = ['R&D', 'S&M', 'G&A', 'COGS'];

const EMPTY_ROLE_FORM: Omit<WorkforceRole, 'id'> = {
  title: '',
  department: 'R&D',
  entityId: 'ent_parent',
  fteCount: 2,
  annualBaseLocal: 155000,
  startDate: '2026-04-01',
  status: 'planned',
  isBaseline: false,
};

export const WorkforcePayrollPlanner: React.FC<WorkforcePayrollPlannerProps> = ({
  roles,
  baselineRoles,
  taxProfiles,
  entities,
  selectedCurrency,
  fxRates,
  syncedPayrollDelta,
  lastPayrollSyncAt,
  onUpdateRoles,
  onSyncToStatements,
  onRevertSync,
  onNavigateTab,
}) => {
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<'all' | WorkforceDepartment>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Omit<WorkforceRole, 'id'>>(EMPTY_ROLE_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [justSyncedToast, setJustSyncedToast] = useState<boolean>(false);

  // Full dynamic schedule & incremental delta vs baseline
  const schedule = useMemo(() => {
    return computeWorkforcePayrollSchedule(roles, baselineRoles, taxProfiles, fxRates);
  }, [roles, baselineRoles, taxProfiles, fxRates]);

  // Check if the current calculated quarterly deltas differ from what is already synced
  const hasUnsyncedChanges = useMemo(() => {
    if (!syncedPayrollDelta) {
      return schedule.totalAnnualDeltaUsd !== 0 || schedule.totalPlannedFte !== schedule.totalBaselineFte;
    }
    return FORECAST_PERIODS.some((p) => {
      const curr = schedule.quarterlyDeltasUsd[p];
      const sync = syncedPayrollDelta[p];
      return (
        curr.rd !== sync.rd ||
        curr.sm !== sync.sm ||
        curr.ga !== sync.ga ||
        curr.cogs !== sync.cogs
      );
    });
  }, [schedule, syncedPayrollDelta]);

  const toDisp = (usd: number) => convertCurrency(usd, 'USD', selectedCurrency, 'average', fxRates);

  // Quarterly chart data
  const quarterlyChartData = useMemo(() => {
    return FORECAST_PERIODS.map((period) => {
      const cur = schedule.quarterlyByDepartmentUsd[period];
      const base = schedule.baselineQuarterlyByDepartmentUsd[period];
      return {
        period: period.replace('2026-', '26 '),
        rawPeriod: period,
        rd: toDisp(cur.rd),
        sm: toDisp(cur.sm),
        ga: toDisp(cur.ga),
        cogs: toDisp(cur.cogs),
        total: toDisp(cur.total),
        baselineTotal: toDisp(base.total),
        delta: toDisp(cur.total - base.total),
      };
    });
  }, [schedule, selectedCurrency, fxRates]);

  // Filtered role list
  const filteredComputedRoles = useMemo(() => {
    return schedule.computedRoles.filter((item) => {
      if (entityFilter !== 'all' && item.role.entityId !== entityFilter) return false;
      if (deptFilter !== 'all' && item.role.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.role.title.toLowerCase().includes(q);
        const matchEntity =
          item.taxProfile.entityCode.toLowerCase().includes(q) ||
          item.taxProfile.entityName.toLowerCase().includes(q);
        const matchDept = item.role.department.toLowerCase().includes(q);
        if (!matchTitle && !matchEntity && !matchDept) return false;
      }
      return true;
    });
  }, [schedule.computedRoles, entityFilter, deptFilter, searchQuery]);

  // Modal handlers
  const openAddModal = () => {
    setEditingRoleId(null);
    const defaultEntityId = entityFilter !== 'all' ? entityFilter : 'ent_parent';
    const defaultSalaryByEntity: Record<string, number> = {
      ent_parent: 160000,
      ent_emea: 98000,
      ent_uk: 92000,
      ent_apac: 115000,
      ent_swiss: 155000,
    };
    setFormState({
      ...EMPTY_ROLE_FORM,
      entityId: defaultEntityId,
      department: deptFilter !== 'all' ? deptFilter : 'R&D',
      annualBaseLocal: defaultSalaryByEntity[defaultEntityId] || 140000,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (role: WorkforceRole) => {
    setEditingRoleId(role.id);
    setFormState({
      title: role.title,
      department: role.department,
      entityId: role.entityId,
      fteCount: role.fteCount,
      annualBaseLocal: role.annualBaseLocal,
      startDate: role.startDate,
      status: role.status,
      isBaseline: role.isBaseline,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title.trim()) {
      setFormError('Please enter a role or requisition title.');
      return;
    }
    if (formState.fteCount < 1 || formState.annualBaseLocal <= 0) {
      setFormError('FTE count must be at least 1 and annual salary must be positive.');
      return;
    }

    if (editingRoleId) {
      onUpdateRoles(
        roles.map((r) => (r.id === editingRoleId ? { ...formState, id: editingRoleId } : r))
      );
    } else {
      const newRole: WorkforceRole = {
        ...formState,
        id: `wf_custom_${Date.now()}`,
        isBaseline: false,
      };
      onUpdateRoles([newRole, ...roles]);
    }
    setIsModalOpen(false);
  };

  const handleDuplicateRole = (role: WorkforceRole) => {
    const copy: WorkforceRole = {
      ...role,
      id: `wf_dup_${Date.now()}`,
      title: `${role.title} (Copy)`,
      status: 'planned',
      isBaseline: false,
    };
    onUpdateRoles([copy, ...roles]);
  };

  const handleDeleteRole = (id: string) => {
    onUpdateRoles(roles.filter((r) => r.id !== id));
  };

  const handleResetRosterToBaseline = () => {
    onUpdateRoles(JSON.parse(JSON.stringify(baselineRoles)));
  };

  const handleSyncClick = () => {
    const payload: WorkforceSyncPayload = {
      quarterlyDeltas: schedule.quarterlyDeltasUsd,
      entityFteDeltas: schedule.entityFteDeltas,
      totalAnnualDeltaUsd: schedule.totalAnnualDeltaUsd,
      totalFteDelta: schedule.totalPlannedFte - schedule.totalBaselineFte,
      syncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    onSyncToStatements(payload);
    setJustSyncedToast(true);
    setTimeout(() => setJustSyncedToast(false), 3500);
  };

  // Modal live proration & burden preview
  const modalPreview = useMemo(() => {
    const profile = taxProfiles.find((p) => p.entityId === formState.entityId) || taxProfiles[0];
    const baseTotalLocal = formState.annualBaseLocal * Math.max(0, formState.fteCount);
    const taxTotalLocal = baseTotalLocal * profile.totalBurdenPct;
    const loadedAnnualLocal = baseTotalLocal + taxTotalLocal;

    const qProrations = FORECAST_PERIODS.map((period) => ({
      period,
      factor: getQuarterProrationFactor(formState.startDate, period),
    }));

    const fy26LoadedLocal = qProrations.reduce(
      (sum, q) => sum + (loadedAnnualLocal / 4) * q.factor,
      0
    );
    const fy26LoadedDisp = convertCurrency(
      fy26LoadedLocal,
      profile.currency,
      selectedCurrency,
      'average',
      fxRates
    );

    return {
      profile,
      baseTotalLocal,
      taxTotalLocal,
      loadedAnnualLocal,
      qProrations,
      fy26LoadedLocal,
      fy26LoadedDisp,
    };
  }, [formState, taxProfiles, selectedCurrency, fxRates]);

  // After-tax Cash Flow impact (21% effective corporate tax shield on incremental OpEx)
  const fy26DeltaDisp = toDisp(schedule.totalAnnualDeltaUsd);
  const fy26EbitdaImpactDisp = -fy26DeltaDisp;
  const fy26OperatingCfImpactDisp = -fy26DeltaDisp * 0.79;
  const fteDeltaTotal = schedule.totalPlannedFte - schedule.totalBaselineFte;

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-slate-700/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display text-balance">
            Workforce & Global Payroll Planner
          </h1>
          <p className="text-xs text-slate-300 font-medium mt-1">
            Role-level headcount planning across 5 legal entities · Jurisdiction statutory tax burdens · Start-date proration · Live P&L & Cash Flow sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {syncedPayrollDelta && (
            <button
              onClick={onRevertSync}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-200 bg-[#10192e] hover:bg-slate-800 border border-slate-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
              <span>Revert Sync</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#10192e] hover:bg-slate-800 border border-slate-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Add Role</span>
          </button>

          <button
            onClick={handleSyncClick}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-md shadow-cyan-950/50"
          >
            {justSyncedToast ? (
              <>
                <Check className="w-4 h-4" />
                <span>Synced to P&L & Cash Flow</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>
                  {hasUnsyncedChanges ? 'Sync Delta to P&L & Cash Flow' : 'Re-Sync P&L & Cash Flow'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pre-Sync / Synced Impact Bridge Strip */}
      <div className="bg-[#0c1222] border border-slate-700/80 p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <span>Incremental FY2026 Statement Overlay</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            {syncedPayrollDelta && !hasUnsyncedChanges ? (
              <span className="text-emerald-400 font-mono">
                Synced at {lastPayrollSyncAt || 'just now'}
              </span>
            ) : (
              <span className="text-amber-400 font-mono">
                {schedule.totalAnnualDeltaUsd === 0
                  ? 'Matches Baseline'
                  : 'Pending Sync to Live P&L & Cash Flow'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-300">
            <span>
              R&D:{' '}
              <strong className="text-white">
                {schedule.departmentAnnualDeltasUsd['R&D'] >= 0 ? '+' : ''}
                {formatCurrency(toDisp(schedule.departmentAnnualDeltasUsd['R&D']), selectedCurrency, true)}
              </strong>
            </span>
            <span>
              S&M:{' '}
              <strong className="text-white">
                {schedule.departmentAnnualDeltasUsd['S&M'] >= 0 ? '+' : ''}
                {formatCurrency(toDisp(schedule.departmentAnnualDeltasUsd['S&M']), selectedCurrency, true)}
              </strong>
            </span>
            <span>
              G&A:{' '}
              <strong className="text-white">
                {schedule.departmentAnnualDeltasUsd['G&A'] >= 0 ? '+' : ''}
                {formatCurrency(toDisp(schedule.departmentAnnualDeltasUsd['G&A']), selectedCurrency, true)}
              </strong>
            </span>
            <span>
              COGS:{' '}
              <strong className="text-white">
                {schedule.departmentAnnualDeltasUsd['COGS'] >= 0 ? '+' : ''}
                {formatCurrency(toDisp(schedule.departmentAnnualDeltasUsd['COGS']), selectedCurrency, true)}
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs font-mono tabular-nums">
          <div>
            <span className="font-sans text-[11px] text-slate-400 block">FY26 EBITDA Impact</span>
            <span
              className={`font-black text-sm ${
                fy26EbitdaImpactDisp <= 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {fy26EbitdaImpactDisp >= 0 ? '+' : ''}
              {formatCurrency(fy26EbitdaImpactDisp, selectedCurrency, true)}
            </span>
          </div>
          <div>
            <span className="font-sans text-[11px] text-slate-400 block">Operating CF Impact</span>
            <span
              className={`font-black text-sm ${
                fy26OperatingCfImpactDisp <= 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {fy26OperatingCfImpactDisp >= 0 ? '+' : ''}
              {formatCurrency(fy26OperatingCfImpactDisp, selectedCurrency, true)}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('statements')}
            className="font-sans text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <span>Inspect Statements</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4-Card Workforce KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between">
            <span>Total Planned Headcount</span>
            <span className="font-mono tabular-nums text-cyan-300 font-bold">
              {fteDeltaTotal >= 0 ? `+${fteDeltaTotal}` : fteDeltaTotal} vs Base
            </span>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-white mt-2">
            {schedule.totalPlannedFte.toLocaleString()} <span className="text-xs font-sans font-semibold text-slate-400">FTE</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Baseline Roster</span>
            <span className="font-mono tabular-nums text-white font-bold">
              {schedule.totalBaselineFte.toLocaleString()} FTE
            </span>
          </div>
        </div>

        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between">
            <span>FY26 Loaded Payroll (Prorated)</span>
            <span className="font-mono tabular-nums text-slate-300 font-bold">{selectedCurrency}</span>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-white mt-2">
            {formatCurrency(toDisp(schedule.totalFy26LoadedUsd), selectedCurrency, true)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Base Compensation</span>
            <span className="font-mono tabular-nums text-white font-bold">
              {formatCurrency(toDisp(schedule.totalFy26BaseUsd), selectedCurrency, true)}
            </span>
          </div>
        </div>

        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between">
            <span>Weighted Employer Burden</span>
            <span className="font-mono tabular-nums text-cyan-300 font-bold">5 Jurisdictions</span>
          </div>
          <div className="text-2xl font-black font-mono tabular-nums text-white mt-2">
            {formatPercent(schedule.weightedBurdenPct, 1)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>FY26 Statutory Tax & Benefits</span>
            <span className="font-mono tabular-nums text-amber-300 font-bold">
              {formatCurrency(toDisp(schedule.totalFy26TaxUsd), selectedCurrency, true)}
            </span>
          </div>
        </div>

        <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
          <div className="text-xs text-slate-300 font-semibold flex items-center justify-between">
            <span>Incremental FY26 Payroll Delta</span>
            <span className={`font-mono font-bold ${hasUnsyncedChanges ? 'text-amber-400' : 'text-emerald-400'}`}>
              {hasUnsyncedChanges ? 'Unsynced' : 'Synced'}
            </span>
          </div>
          <div
            className={`text-2xl font-black font-mono tabular-nums mt-2 ${
              fy26DeltaDisp > 0 ? 'text-amber-300' : fy26DeltaDisp < 0 ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {fy26DeltaDisp >= 0 ? '+' : ''}
            {formatCurrency(fy26DeltaDisp, selectedCurrency, true)}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Active Requisitions</span>
            <span className="font-mono tabular-nums text-white font-bold">
              {roles.filter((r) => !r.isBaseline).length} Planned Roles
            </span>
          </div>
        </div>
      </div>

      {/* Middle 2-Column Analytics: Quarterly Loaded Payroll Trajectory + Entity Tax Burden Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Quarterly Loaded Payroll by Department */}
        <div className="lg:col-span-7 bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-white font-display">
                FY2026 Quarterly Prorated Payroll by Department
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Fully-loaded compensation (Base + Employer Tax Burden) vs. Baseline Plan ({selectedCurrency})
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={quarterlyChartData}
                  margin={{ top: 10, right: 12, left: -8, bottom: 0 }}
                >
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="period"
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
                    tickFormatter={(val: number) => `${(val / 1_000_000).toFixed(0)}M`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#080d19] border border-cyan-500/80 rounded-lg p-3.5 shadow-2xl text-xs font-mono tabular-nums space-y-1.5">
                          <div className="font-sans font-bold text-white border-b border-slate-700 pb-1">
                            {d.rawPeriod} Loaded Payroll
                          </div>
                          <div className="flex justify-between gap-6 text-indigo-300">
                            <span>R&D:</span>
                            <span className="font-bold">{formatCurrency(d.rd, selectedCurrency, true)}</span>
                          </div>
                          <div className="flex justify-between gap-6 text-cyan-300">
                            <span>S&M:</span>
                            <span className="font-bold">{formatCurrency(d.sm, selectedCurrency, true)}</span>
                          </div>
                          <div className="flex justify-between gap-6 text-amber-300">
                            <span>G&A:</span>
                            <span className="font-bold">{formatCurrency(d.ga, selectedCurrency, true)}</span>
                          </div>
                          <div className="flex justify-between gap-6 text-emerald-300">
                            <span>COGS Support:</span>
                            <span className="font-bold">{formatCurrency(d.cogs, selectedCurrency, true)}</span>
                          </div>
                          <div className="flex justify-between gap-6 pt-1 border-t border-slate-800 text-white">
                            <span>Planned Total:</span>
                            <span className="font-black">{formatCurrency(d.total, selectedCurrency, true)}</span>
                          </div>
                          <div className="flex justify-between gap-6 text-slate-300">
                            <span>Delta vs Base:</span>
                            <span className={d.delta > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {d.delta >= 0 ? '+' : ''}
                              {formatCurrency(d.delta, selectedCurrency, true)}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
                    iconType="circle"
                    formatter={(val) => <span className="text-slate-200 font-sans text-xs font-semibold">{val}</span>}
                  />
                  <Bar dataKey="rd" name="R&D" stackId="pay" fill="#6366f1" maxBarSize={52} />
                  <Bar dataKey="sm" name="S&M" stackId="pay" fill="#06b6d4" maxBarSize={52} />
                  <Bar dataKey="ga" name="G&A" stackId="pay" fill="#f59e0b" maxBarSize={52} />
                  <Bar dataKey="cogs" name="COGS Support" stackId="pay" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={52} />
                  <Line
                    type="monotone"
                    dataKey="baselineTotal"
                    name="Baseline Payroll Plan"
                    stroke="#f8fafc"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#f8fafc' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Jurisdiction Employer Tax & Burden Matrix */}
        <div className="lg:col-span-5 bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>Jurisdiction Tax Burden Matrix</span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Click any entity row to filter roles below
                </p>
              </div>
              {entityFilter !== 'all' && (
                <button
                  onClick={() => setEntityFilter('all')}
                  className="text-xs font-bold text-cyan-300 hover:text-white cursor-pointer"
                >
                  Show All
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-300 font-mono text-[11px]">
                    <th className="py-2 pr-2 font-bold">Entity</th>
                    <th className="py-2 px-2 text-right font-bold">Tax + Pen.</th>
                    <th className="py-2 px-2 text-right font-bold">Burden %</th>
                    <th className="py-2 px-2 text-right font-bold">FTE</th>
                    <th className="py-2 pl-2 text-right font-bold">FY26 Loaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {schedule.entitySummaries.map((ent) => {
                    const isSelected = entityFilter === ent.profile.entityId;
                    return (
                      <tr
                        key={ent.profile.entityId}
                        onClick={() =>
                          setEntityFilter(isSelected ? 'all' : ent.profile.entityId)
                        }
                        title={ent.profile.statutorySummary}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-950/60' : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <td className="py-2.5 pr-2">
                          <div className="font-mono font-bold text-white flex items-center gap-1.5">
                            <span>{ent.profile.entityCode}</span>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {ent.profile.currency}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {ent.profile.jurisdiction}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-300">
                          {formatPercent(ent.profile.statutoryPayrollTaxPct, 1)} /{' '}
                          {formatPercent(ent.profile.pensionSocialPct, 1)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-bold text-cyan-300">
                          {formatPercent(ent.profile.totalBurdenPct, 1)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-white font-bold">
                          {ent.plannedFte}
                          {ent.fteDelta !== 0 && (
                            <span className="text-[10px] text-emerald-400 ml-1">
                              ({ent.fteDelta > 0 ? `+${ent.fteDelta}` : ent.fteDelta})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-white font-bold">
                          {formatCurrency(toDisp(ent.fy26LoadedUsd), selectedCurrency, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Statutory burdens include employer payroll taxes, social security / pension contributions, and local health benefits translated via ASC 830 average FX rates.
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Role-Level Planning Registry */}
      <div className="bg-[#0c1222] border border-slate-700/80 p-5 rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Role-Level Headcount & Compensation Roster</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Showing {filteredComputedRoles.length} of {roles.length} role bands · Exact day-level start-date proration across FY2026 quarters
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center p-1 bg-[#090e1b] border border-slate-700 rounded-lg">
              <button
                onClick={() => setEntityFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  entityFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                All
              </button>
              {taxProfiles.map((tp) => (
                <button
                  key={tp.entityId}
                  onClick={() => setEntityFilter(tp.entityId)}
                  className={`px-2.5 py-1 text-xs font-bold font-mono rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    entityFilter === tp.entityId
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tp.entityCode}
                </button>
              ))}
            </div>

            <div className="flex items-center p-1 bg-[#090e1b] border border-slate-700 rounded-lg">
              <button
                onClick={() => setDeptFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  deptFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                All Depts
              </button>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    deptFilter === dept ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search role or entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#090e1b] border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              onClick={handleResetRosterToBaseline}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Reset working roster back to 1,005 baseline FTE"
            >
              Reset Roster
            </button>
          </div>
        </div>

        {/* Role Table or Empty State */}
        {filteredComputedRoles.length === 0 ? (
          <div className="py-12 px-4 text-center border border-dashed border-slate-700 rounded-xl bg-[#090e1b]">
            <div className="text-sm font-bold text-white">No workforce roles match your current filter</div>
            <p className="text-xs text-slate-400 mt-1">
              Clear active filters or add a new planned hire for this subsidiary and department.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setEntityFilter('all');
                  setDeptFilter('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                onClick={openAddModal}
                className="px-3.5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg cursor-pointer"
              >
                Add Role
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-[#090e1b] text-slate-300 font-mono text-[11px]">
                  <th className="py-2.5 px-3 font-bold min-w-[210px]">Role & Status</th>
                  <th className="py-2.5 px-2.5 font-bold">Dept</th>
                  <th className="py-2.5 px-2.5 font-bold">Entity</th>
                  <th className="py-2.5 px-2.5 text-right font-bold">FTE</th>
                  <th className="py-2.5 px-2.5 text-right font-bold">Annual Base (Local)</th>
                  <th className="py-2.5 px-2.5 text-right font-bold">Tax Burden</th>
                  <th className="py-2.5 px-2.5 font-bold">Start Date</th>
                  <th className="py-2.5 px-2.5 text-center font-bold">Q1 · Q2 · Q3 · Q4</th>
                  <th className="py-2.5 px-3 text-right font-bold">FY26 Loaded ({selectedCurrency})</th>
                  <th className="py-2.5 px-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredComputedRoles.map((item) => {
                  const { role, taxProfile, quarterlyProration } = item;
                  const fy26Disp = toDisp(item.fy26ProratedLoadedUsd);

                  return (
                    <tr key={role.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{role.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span
                            className={
                              role.status === 'planned'
                                ? 'text-cyan-300 font-semibold'
                                : role.status === 'backfill'
                                ? 'text-amber-300 font-semibold'
                                : 'text-emerald-400 font-semibold'
                            }
                          >
                            {role.status === 'planned'
                              ? 'Planned Hire'
                              : role.status === 'backfill'
                              ? 'Backfill'
                              : 'Active Base'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{role.isBaseline ? 'Baseline' : 'Incremental'}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2.5 font-mono font-bold text-slate-200 whitespace-nowrap">
                        {role.department}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-cyan-300 font-bold whitespace-nowrap">
                        {taxProfile.entityCode}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-white font-bold">
                        {role.fteCount}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                        {formatCurrency(role.annualBaseLocal, taxProfile.currency)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        +{formatPercent(taxProfile.totalBurdenPct, 1)}
                      </td>
                      <td className="py-2.5 px-2.5 font-mono tabular-nums text-slate-200 whitespace-nowrap">
                        {role.startDate}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-mono tabular-nums text-[11px] whitespace-nowrap">
                        {FORECAST_PERIODS.map((p, i) => {
                          const pct = Math.round(quarterlyProration[p] * 100);
                          return (
                            <span key={p}>
                              <span
                                className={
                                  pct === 100
                                    ? 'text-slate-200 font-semibold'
                                    : pct > 0
                                    ? 'text-cyan-300 font-black'
                                    : 'text-slate-600'
                                }
                              >
                                {pct}%
                              </span>
                              {i < 3 && <span className="text-slate-600 mx-1">/</span>}
                            </span>
                          );
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-black text-white whitespace-nowrap">
                        {formatCurrency(fy26Disp, selectedCurrency, true)}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(role)}
                            title="Edit Role"
                            className="p-1.5 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateRole(role)}
                            title="Duplicate Role"
                            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            title="Remove Role"
                            className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1222] border border-slate-700 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white font-display">
                {editingRoleId ? 'Edit Workforce Role' : 'Add Planned Role Requisition'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-700 rounded-lg text-rose-200 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-slate-200 font-semibold block mb-1">Role / Team Title</label>
                <input
                  type="text"
                  placeholder="e.g. Principal FP&A Data Engineer"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-200 font-semibold block mb-1">Legal Entity & Tax Jurisdiction</label>
                  <select
                    value={formState.entityId}
                    onChange={(e) => setFormState({ ...formState, entityId: e.target.value })}
                    className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-medium"
                  >
                    {entities.map((ent) => {
                      const tp = taxProfiles.find((p) => p.entityId === ent.id);
                      return (
                        <option key={ent.id} value={ent.id} className="bg-slate-900 text-white">
                          {ent.code} · {ent.jurisdiction} ({ent.currency}, +{formatPercent(tp?.totalBurdenPct || 0.18, 1)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-slate-200 font-semibold block mb-1">P&L Department</label>
                  <select
                    value={formState.department}
                    onChange={(e) =>
                      setFormState({ ...formState, department: e.target.value as WorkforceDepartment })
                    }
                    className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-medium"
                  >
                    <option value="R&D" className="bg-slate-900">R&D (OpEx 6100)</option>
                    <option value="S&M" className="bg-slate-900">S&M (OpEx 6200)</option>
                    <option value="G&A" className="bg-slate-900">G&A (OpEx 6300)</option>
                    <option value="COGS" className="bg-slate-900">COGS Support (5200)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-200 font-semibold block mb-1">FTE Headcount</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={formState.fteCount}
                    onChange={(e) =>
                      setFormState({ ...formState, fteCount: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono tabular-nums focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-200 font-semibold block mb-1">
                    Annual Base ({modalPreview.profile.currency} / FTE)
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    value={formState.annualBaseLocal}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        annualBaseLocal: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono tabular-nums focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-slate-200 font-semibold block mb-1">Hiring Status</label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        status: e.target.value as WorkforceRole['status'],
                      })
                    }
                    className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-medium"
                  >
                    <option value="planned" className="bg-slate-900">Planned Hire</option>
                    <option value="active" className="bg-slate-900">Active</option>
                    <option value="backfill" className="bg-slate-900">Backfill</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-200 font-semibold">Start Date (Drives FY26 Proration)</label>
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    {[
                      { label: 'Q1 Start', val: '2026-01-01' },
                      { label: 'Mid-Q1', val: '2026-02-15' },
                      { label: 'Q2 Start', val: '2026-04-01' },
                      { label: 'Q3 Start', val: '2026-07-01' },
                      { label: 'Q4 Start', val: '2026-10-01' },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setFormState({ ...formState, startDate: preset.val })}
                        className="text-cyan-300 hover:text-white cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="date"
                  value={formState.startDate}
                  onChange={(e) => setFormState({ ...formState, startDate: e.target.value })}
                  className="w-full bg-[#080d19] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Live Tax Burden & Quarterly Proration Preview */}
              <div className="p-3.5 bg-[#080d19] border border-slate-700 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-bold text-white">
                    {modalPreview.profile.entityCode} Statutory Burden (+
                    {formatPercent(modalPreview.profile.totalBurdenPct, 1)})
                  </span>
                  <span className="font-mono text-cyan-300">
                    {modalPreview.profile.currency} → {selectedCurrency}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {modalPreview.profile.statutorySummary}
                </div>
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-center font-mono tabular-nums">
                  {modalPreview.qProrations.map((q) => (
                    <div key={q.period} className="bg-[#0c1222] rounded py-1.5 px-2 border border-slate-800">
                      <div className="text-[10px] text-slate-400">{q.period.replace('2026-', '')}</div>
                      <div className="text-xs font-bold text-cyan-300">
                        {Math.round(q.factor * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-mono tabular-nums">
                  <span className="font-sans text-slate-300">FY26 Prorated Loaded Cost:</span>
                  <span className="text-sm font-black text-emerald-400">
                    {formatCurrency(modalPreview.fy26LoadedDisp, selectedCurrency)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors cursor-pointer"
                >
                  {editingRoleId ? 'Save Role Changes' : 'Add Role to Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
