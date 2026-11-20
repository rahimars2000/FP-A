import React, { useState, useMemo } from 'react';
import {
  CurrencyCode,
  Entity,
  FinancialDrivers,
  FxRate,
  StatementLineItem,
  IntercompanyTransaction,
  AuditLogEntry,
  ThirdPartyConnector,
  AutonomousAlert,
  WorkforceRole,
  QuarterlyPayrollDelta,
  WorkforceSyncPayload
} from './types/fpa';
import {
  INITIAL_ENTITIES,
  INITIAL_FX_RATES,
  INITIAL_DRIVERS,
  INITIAL_INCOME_STATEMENT,
  INITIAL_BALANCE_SHEET,
  INITIAL_CASH_FLOW,
  INITIAL_IC_TRANSACTIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_CONNECTORS,
  INITIAL_AUTONOMOUS_ALERTS,
  INITIAL_ARR_BRIDGE_DATA,
  INITIAL_COHORT_RETENTION,
  INITIAL_JURISDICTION_TAX_PROFILES,
  BASELINE_WORKFORCE_ROLES,
  INITIAL_WORKFORCE_ROLES
} from './data/initialData';
import {
  recalculateForecastWithDrivers,
  recalculateCashFlowWithIncomeStatement
} from './utils/fpaEngine';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { StrategyWarRoom } from './components/strategy/StrategyWarRoom';
import { FinancialAnalysisRoom } from './components/analysis/FinancialAnalysisRoom';
import { ArrCohortEngine } from './components/arr/ArrCohortEngine';
import { WorkforcePayrollPlanner } from './components/workforce/WorkforcePayrollPlanner';
import { BudgetModeling } from './components/forecasting/BudgetModeling';
import { EntityConsolidation } from './components/consolidation/EntityConsolidation';
import { FinancialStatements } from './components/reporting/FinancialStatements';
import { AuditCompliance } from './components/compliance/AuditCompliance';
import { CloudIntegrations } from './components/integrations/CloudIntegrations';
import { ManualJournalModal } from './components/modals/ManualJournalModal';
import { ExportReportModal } from './components/modals/ExportReportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('executive');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
  const [entities] = useState<Entity[]>(INITIAL_ENTITIES);
  const [fxRates, setFxRates] = useState<FxRate[]>(INITIAL_FX_RATES);
  const [drivers, setDrivers] = useState<FinancialDrivers>(INITIAL_DRIVERS);
  const [baseIncomeStatement] = useState<StatementLineItem[]>(INITIAL_INCOME_STATEMENT);
  const [balanceSheet] = useState<StatementLineItem[]>(INITIAL_BALANCE_SHEET);
  const [baseCashFlow] = useState<StatementLineItem[]>(INITIAL_CASH_FLOW);
  const [workforceRoles, setWorkforceRoles] = useState<WorkforceRole[]>(INITIAL_WORKFORCE_ROLES);
  const [syncedPayrollDelta, setSyncedPayrollDelta] = useState<QuarterlyPayrollDelta | null>(null);
  const [syncedEntityFteDeltas, setSyncedEntityFteDeltas] = useState<Record<string, number>>({});
  const [lastPayrollSyncAt, setLastPayrollSyncAt] = useState<string | null>(null);
  const [icTransactions, setIcTransactions] = useState<IntercompanyTransaction[]>(INITIAL_IC_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [connectors, setConnectors] = useState<ThirdPartyConnector[]>(INITIAL_CONNECTORS);
  const [alerts, setAlerts] = useState<AutonomousAlert[]>(INITIAL_AUTONOMOUS_ALERTS);

  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');

  // Dynamic Entities reflecting synced headcount deltas
  const effectiveEntities = useMemo(() => {
    return entities.map((ent) => ({
      ...ent,
      headcount: Math.max(0, ent.headcount + (syncedEntityFteDeltas[ent.id] || 0)),
    }));
  }, [entities, syncedEntityFteDeltas]);

  // Dynamic Income Statement calculated from drivers + synced Workforce payroll delta overlay
  const currentIncomeStatement = useMemo(() => {
    return recalculateForecastWithDrivers(baseIncomeStatement, drivers, undefined, syncedPayrollDelta);
  }, [baseIncomeStatement, drivers, syncedPayrollDelta]);

  // Dynamic Cash Flow Statement automatically synced to live Net Income (including payroll delta)
  const currentCashFlow = useMemo(() => {
    return recalculateCashFlowWithIncomeStatement(baseCashFlow, currentIncomeStatement);
  }, [baseCashFlow, currentIncomeStatement]);

  // Handler for driver changes
  const handleUpdateDrivers = (newDrivers: FinancialDrivers) => {
    setDrivers(newDrivers);
  };

  // Handler for applying implied ARR Bridge NDR to live drivers
  const handleApplyArrNdr = (newNdr: number) => {
    const prevNdr = drivers.netRetentionRate;
    setDrivers((prev) => ({ ...prev, netRetentionRate: newNdr }));
    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_ndr_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'Marcus Sterling',
        role: 'Chief Financial Officer',
        email: 'm.sterling@apexerp.com',
      },
      entityId: 'ent_parent',
      action: 'SCENARIO_COMMITTED',
      description: `ARR & Cohort Engine implied NDR synced to live driver forecast (${(newNdr * 100).toFixed(1)}%)`,
      previousValue: `${(prevNdr * 100).toFixed(1)}% NDR`,
      newValue: `${(newNdr * 100).toFixed(1)}% NDR`,
      complianceRule: 'SOX_404',
      hashSignature: `0x${randomHex}a419e2`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler for 1-click Workforce & Payroll delta sync to P&L OpEx & Cash Flow
  const handleSyncWorkforcePayroll = (payload: WorkforceSyncPayload) => {
    setSyncedPayrollDelta(payload.quarterlyDeltas);
    setSyncedEntityFteDeltas(payload.entityFteDeltas);
    setLastPayrollSyncAt(payload.syncedAt);

    const randomHex = Math.random().toString(16).substring(2, 10);
    const deltaSign = payload.totalAnnualDeltaUsd >= 0 ? '+' : '-';
    const formattedDelta = `${deltaSign}$${Math.abs(Math.round(payload.totalAnnualDeltaUsd)).toLocaleString()}`;
    const fteSign = payload.totalFteDelta >= 0 ? '+' : '';
    const newLog: AuditLogEntry = {
      id: `audit_wf_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'Elena Rostova',
        role: 'Global Financial Controller',
        email: 'e.rostova@apexerp.com',
      },
      entityId: 'ent_parent',
      action: 'ADJUSTMENT_POSTED',
      description: `Workforce & Payroll Plan synced to FY2026 P&L OpEx & Cash Flow (${fteSign}${payload.totalFteDelta} FTE, ${formattedDelta} USD prorated loaded delta)`,
      previousValue: 'Baseline Payroll Plan',
      newValue: `${formattedDelta} FY26 Delta`,
      complianceRule: 'SOX_404',
      hashSignature: `0x${randomHex}7f33c9`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler to revert synced Workforce payroll overlay back to baseline statements
  const handleRevertWorkforceSync = () => {
    setSyncedPayrollDelta(null);
    setSyncedEntityFteDeltas({});
    setLastPayrollSyncAt(null);

    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_wf_rev_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'Elena Rostova',
        role: 'Global Financial Controller',
        email: 'e.rostova@apexerp.com',
      },
      entityId: 'ent_parent',
      action: 'ADJUSTMENT_POSTED',
      description: 'Reverted Workforce & Payroll incremental delta overlay; P&L OpEx and Cash Flow restored to baseline driver model.',
      complianceRule: 'SOX_404',
      hashSignature: `0x${randomHex}b902d4`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler for FX rate updates
  const handleUpdateFxRate = (from: CurrencyCode, newSpotRate: number) => {
    setFxRates((prev) =>
      prev.map((r) => (r.from === from ? { ...r, spotRate: newSpotRate } : r))
    );

    // Record audit log for FX update
    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_fx_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'Elena Rostova',
        role: 'Global Financial Controller',
        email: 'e.rostova@apexerp.com',
      },
      entityId: 'ent_parent',
      action: 'FX_RATE_UPDATED',
      description: `Spot rate updated for ${from}/USD to ${newSpotRate.toFixed(4)}`,
      previousValue: 'Previous Spot Rate',
      newValue: newSpotRate.toFixed(4),
      complianceRule: 'ASC_830_FOREIGN_CURRENCY',
      hashSignature: `0x${randomHex}ab4419`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler to execute ASC 810 eliminations
  const handleEliminateTransactions = () => {
    setIcTransactions((prev) =>
      prev.map((tx) =>
        tx.eliminationStatus === 'matched' ? { ...tx, eliminationStatus: 'eliminated' } : tx
      )
    );

    // Add audit log
    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_elim_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'Daisuke Tanaka',
        role: 'VP Corporate Treasury',
        email: 'd.tanaka@apexerp.com',
      },
      entityId: 'ent_swiss',
      action: 'IC_ELIMINATED',
      description: 'Automated ASC 810 elimination entries posted for Q3 matched transactions ($5.48M USD)',
      complianceRule: 'ASC_810_CONSOLIDATION',
      hashSignature: `0x${randomHex}77e812`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler for autonomous alert self-resolution
  const handleResolveAlert = (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, autoResolved: true } : a))
    );

    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_auto_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'ARS Autonomous Sentinel',
        role: 'Continuous Self-Healing Engine',
        email: 'sentinel@ars-fpa.internal',
      },
      entityId: alert?.entityCode === 'EU-BV' ? 'ent_emea' : alert?.entityCode === 'UK-PLC' ? 'ent_uk' : 'ent_parent',
      action: 'ADJUSTMENT_POSTED',
      description: `Autonomous self-healing action completed: ${alert?.title}. ${alert?.recommendedAction}`,
      complianceRule: 'SOX_404',
      hashSignature: `0x${randomHex}ee9102`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler for global automated treasury sweep
  const handleExecuteSweep = () => {
    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_swp_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'ARS Autonomous Treasury',
        role: 'Liquidity Optimization Engine',
        email: 'treasury@ars-fpa.internal',
      },
      entityId: 'ent_swiss',
      action: 'ADJUSTMENT_POSTED',
      description: 'Autonomous global liquidity sweep executed: €3.4M (EMEA) and S$2.2M (APAC) swept to Swiss Treasury overnight repo @ 4.85% APY.',
      complianceRule: 'SOX_404',
      hashSignature: `0x${randomHex}4491c1`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    // Also mark sweep alert resolved if present
    setAlerts((prev) =>
      prev.map((a) => (a.category === 'TREASURY_SWEEP' ? { ...a, autoResolved: true } : a))
    );
  };

  // Handler for committing a forecast scenario
  const handleCommitScenario = (scenarioName: string) => {
    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_scen_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'Marcus Sterling',
        role: 'Chief Financial Officer',
        email: 'm.sterling@apexerp.com',
      },
      entityId: 'ent_parent',
      action: 'SCENARIO_COMMITTED',
      description: `Board-approved scenario "${scenarioName}" committed to primary reporting ledger`,
      complianceRule: 'SOX_404',
      hashSignature: `0x${randomHex}cd2109`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler for posting manual adjusting journal
  const handlePostJournal = (entry: {
    entityId: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    currency: CurrencyCode;
    description: string;
    rule: string;
  }) => {
    const randomHex = Math.random().toString(16).substring(2, 10);
    const newLog: AuditLogEntry = {
      id: `audit_je_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      actor: {
        name: 'Elena Rostova',
        role: 'Global Financial Controller',
        email: 'e.rostova@apexerp.com',
      },
      entityId: entry.entityId,
      action: 'ADJUSTMENT_POSTED',
      description: `Manual adjusting journal #${Date.now().toString().slice(-4)}: Debit ${entry.debitAccount} / Credit ${entry.creditAccount} for ${entry.currency} ${entry.amount.toLocaleString()} - ${entry.description}`,
      complianceRule: 'SOX_404',
      hashSignature: `0x${randomHex}ff8820`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Handler for global cloud synchronization
  const handleTriggerSync = () => {
    setIsSyncingGlobal(true);
    setTimeout(() => {
      setIsSyncingGlobal(false);
      setLastSyncTime('Just now');
      setConnectors((prev) =>
        prev.map((c) => ({
          ...c,
          recordsSynced: c.recordsSynced + Math.floor(Math.random() * 45) + 5,
          lastSyncAt: 'Just now',
        }))
      );
    }, 700);
  };

  // Handler for individual connector sync
  const handleSyncConnector = (id: string) => {
    setIsSyncingGlobal(true);
    setTimeout(() => {
      setIsSyncingGlobal(false);
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, recordsSynced: c.recordsSynced + 120, lastSyncAt: 'Just now' }
            : c
        )
      );
    }, 500);
  };

  const selectedEntity = effectiveEntities.find((e) => e.id === selectedEntityId);
  const selectedEntityCode = selectedEntity ? `${selectedEntity.code} (${selectedEntity.name})` : 'Consolidated Group (All 5 Entities)';
  const unresolvedAlertCount = alerts.filter((a) => !a.autoResolved).length;

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950 to-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar with ARS - FP&A Branding */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        onOpenNewJournal={() => setIsJournalModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        isSyncing={isSyncingGlobal}
        onTriggerSync={handleTriggerSync}
        lastSyncTime={lastSyncTime}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          entities={effectiveEntities}
          selectedEntityId={selectedEntityId}
          setSelectedEntityId={setSelectedEntityId}
          unresolvedAlertCount={unresolvedAlertCount}
          incomeStatement={currentIncomeStatement}
          balanceSheet={balanceSheet}
          drivers={drivers}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          fxRates={fxRates}
        />

        {/* Center Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/70">
          <div className="max-w-[1440px] mx-auto">
            {activeTab === 'executive' && (
              <ExecutiveDashboard
                incomeStatement={currentIncomeStatement}
                balanceSheet={balanceSheet}
                entities={effectiveEntities}
                selectedCurrency={selectedCurrency}
                fxRates={fxRates}
                drivers={drivers}
                onUpdateDrivers={handleUpdateDrivers}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'strategy' && (
              <StrategyWarRoom
                entities={effectiveEntities}
                selectedCurrency={selectedCurrency}
                fxRates={fxRates}
                drivers={drivers}
                incomeStatement={currentIncomeStatement}
                balanceSheet={balanceSheet}
                alerts={alerts}
                onResolveAlert={handleResolveAlert}
                onExecuteSweep={handleExecuteSweep}
              />
            )}

            {activeTab === 'analysis' && (
              <FinancialAnalysisRoom
                incomeStatement={currentIncomeStatement}
                balanceSheet={balanceSheet}
                entities={effectiveEntities}
                selectedCurrency={selectedCurrency}
                fxRates={fxRates}
                drivers={drivers}
                onUpdateDrivers={handleUpdateDrivers}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'arr_cohort' && (
              <ArrCohortEngine
                incomeStatement={currentIncomeStatement}
                drivers={drivers}
                selectedCurrency={selectedCurrency}
                fxRates={fxRates}
                arrBridgeData={INITIAL_ARR_BRIDGE_DATA}
                cohortData={INITIAL_COHORT_RETENTION}
                onApplyNdrToModel={handleApplyArrNdr}
              />
            )}

            {activeTab === 'workforce' && (
              <WorkforcePayrollPlanner
                roles={workforceRoles}
                baselineRoles={BASELINE_WORKFORCE_ROLES}
                taxProfiles={INITIAL_JURISDICTION_TAX_PROFILES}
                entities={effectiveEntities}
                selectedCurrency={selectedCurrency}
                fxRates={fxRates}
                incomeStatement={currentIncomeStatement}
                cashFlow={currentCashFlow}
                syncedPayrollDelta={syncedPayrollDelta}
                lastPayrollSyncAt={lastPayrollSyncAt}
                onUpdateRoles={setWorkforceRoles}
                onSyncToStatements={handleSyncWorkforcePayroll}
                onRevertSync={handleRevertWorkforceSync}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'forecasting' && (
              <BudgetModeling
                drivers={drivers}
                onUpdateDrivers={handleUpdateDrivers}
                selectedCurrency={selectedCurrency}
                fxRates={fxRates}
                incomeStatement={currentIncomeStatement}
                onCommitScenario={handleCommitScenario}
              />
            )}

            {(activeTab === 'consolidation' || activeTab === 'intercompany') && (
              <EntityConsolidation
                entities={effectiveEntities}
                fxRates={fxRates}
                selectedCurrency={selectedCurrency}
                icTransactions={icTransactions}
                onEliminateTransactions={handleEliminateTransactions}
                onUpdateFxRate={handleUpdateFxRate}
              />
            )}

            {activeTab === 'statements' && (
              <FinancialStatements
                incomeStatement={currentIncomeStatement}
                balanceSheet={balanceSheet}
                cashFlow={currentCashFlow}
                selectedCurrency={selectedCurrency}
                fxRates={fxRates}
                selectedEntityCode={selectedEntityCode}
              />
            )}

            {activeTab === 'compliance' && (
              <AuditCompliance
                auditLogs={auditLogs}
                onSignOffPeriod={(role) => handleCommitScenario(`${role} Certified Close`)}
                onExportAuditPackage={() => setIsExportModalOpen(true)}
              />
            )}

            {activeTab === 'integrations' && (
              <CloudIntegrations
                connectors={connectors}
                onSyncConnector={handleSyncConnector}
                isSyncingGlobal={isSyncingGlobal}
              />
            )}
          </div>
        </main>
      </div>

      {/* Manual Journal Modal */}
      <ManualJournalModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        entities={effectiveEntities}
        onPostJournal={handlePostJournal}
      />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedCurrency={selectedCurrency}
      />
    </div>
  );
}
