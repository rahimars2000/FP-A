import React from 'react';
import { Entity, CurrencyCode, StatementLineItem, FinancialDrivers, FxRate } from '../../types/fpa';
import {
  LayoutDashboard,
  TrendingUp,
  GitMerge,
  FileSpreadsheet,
  ShieldCheck,
  Cpu,
  Layers,
  Building2,
  DollarSign,
  ChevronDown,
  Zap,
  Sparkles,
  Command,
  SlidersHorizontal,
  BarChart3,
  Users
} from 'lucide-react';
import { VoiceCommandInterface } from '../voice/VoiceCommandInterface';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  entities: Entity[];
  selectedEntityId: string;
  setSelectedEntityId: (id: string) => void;
  unresolvedAlertCount?: number;
  incomeStatement: StatementLineItem[];
  balanceSheet: StatementLineItem[];
  drivers: FinancialDrivers;
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  fxRates: FxRate[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  entities,
  selectedEntityId,
  setSelectedEntityId,
  unresolvedAlertCount = 3,
  incomeStatement,
  balanceSheet,
  drivers,
  selectedCurrency,
  setSelectedCurrency,
  fxRates,
}) => {
  const currentEntity = entities.find((e) => e.id === selectedEntityId);

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-700/80 flex flex-col justify-between shrink-0 select-none shadow-2xl z-20">
      {/* Entity Selector Section */}
      <div className="p-4 border-b border-slate-700/80 bg-[#0d1424]">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="entity-scope-select" className="text-[11px] font-black tracking-wider text-cyan-300 uppercase font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Sovereign Scope
          </label>
          <span className="text-[10px] font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-600">
            ASC 810
          </span>
        </div>
        <div className="relative">
          <select
            id="entity-scope-select"
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="w-full bg-[#11192e] text-white text-xs font-bold rounded-lg border border-slate-600 py-2.5 pl-3 pr-8 appearance-none focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 shadow-sm transition-all hover:border-slate-500 cursor-pointer"
          >
            <option value="all">Consolidated Ledger (5 Entities)</option>
            {entities.map((ent) => (
              <option key={ent.id} value={ent.id} className="bg-slate-900 text-white font-bold">
                {ent.code} · {ent.name} ({ent.currency})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-cyan-300 absolute right-2.5 top-3 pointer-events-none" />
        </div>

        {/* Dynamic entity metadata badge */}
        <div className="mt-2.5 text-xs text-slate-200 flex items-center justify-between bg-[#111a2f] px-2.5 py-1.5 rounded-md border border-slate-700">
          <span className="flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate text-white font-bold text-[11px]">
              {selectedEntityId === 'all'
                ? 'Apex Global Enterprise'
                : `${currentEntity?.legalType}`}
            </span>
          </span>
          <span className="font-mono text-cyan-300 font-extrabold text-[11px] shrink-0">
            {selectedEntityId === 'all' ? '100% Eliminated' : currentEntity?.currency}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
        {/* Section 1: Executive Command */}
        <div>
          <div className="px-2 text-[11px] font-black text-cyan-300 uppercase tracking-widest mb-2 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Command className="w-3 h-3 text-cyan-400" />
              Capital Command
            </span>
            <span className="text-[10px] bg-cyan-950 text-cyan-200 font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-700">
              1-Point Hub
            </span>
          </div>
          <div className="space-y-1">
            {/* Executive Cockpit */}
            <button
              onClick={() => setActiveTab('executive')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeTab === 'executive'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'executive' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Executive Cockpit</span>
            </button>

            {/* Strategy War Room */}
            <button
              onClick={() => setActiveTab('strategy')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeTab === 'strategy'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Zap className={`w-4 h-4 shrink-0 ${activeTab === 'strategy' ? 'text-cyan-400' : 'text-amber-400'}`} />
                <span className="truncate">Strategy War Room</span>
              </div>
              {unresolvedAlertCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black flex items-center justify-center shadow-sm">
                  {unresolvedAlertCount}
                </span>
              )}
            </button>

            {/* Analysis Room (Cost, Overhead & Visual Controller) */}
            <button
              onClick={() => setActiveTab('analysis')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'analysis'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <SlidersHorizontal className={`w-4 h-4 shrink-0 ${activeTab === 'analysis' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Financial Analysis Room</span>
            </button>

            {/* ARR & Cohort Engine */}
            <button
              onClick={() => setActiveTab('arr_cohort')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'arr_cohort'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'arr_cohort' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">ARR & Cohort Engine</span>
            </button>

            {/* Workforce & Payroll Planner */}
            <button
              onClick={() => setActiveTab('workforce')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'workforce'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <Users className={`w-4 h-4 shrink-0 ${activeTab === 'workforce' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Workforce & Payroll</span>
            </button>

            {/* Predictive Modeling */}
            <button
              onClick={() => setActiveTab('forecasting')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                activeTab === 'forecasting'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'forecasting' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Predictive Horizon Model</span>
            </button>
          </div>
        </div>

        {/* Section 2: Sovereign Consolidation */}
        <div>
          <div className="px-2 text-[11px] font-black text-slate-200 uppercase tracking-widest mb-2 font-mono">
            Sovereign Ledger & Statements
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('consolidation')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeTab === 'consolidation'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <GitMerge className={`w-4 h-4 shrink-0 ${activeTab === 'consolidation' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Entity Consolidation</span>
            </button>

            <button
              onClick={() => setActiveTab('statements')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeTab === 'statements'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeTab === 'statements' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Financial Statements</span>
            </button>

            <button
              onClick={() => setActiveTab('intercompany')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeTab === 'intercompany'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'intercompany' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Intercompany Matching</span>
            </button>
          </div>
        </div>

        {/* Section 3: Compliance & Cloud */}
        <div>
          <div className="px-2 text-[11px] font-black text-slate-200 uppercase tracking-widest mb-2 font-mono">
            Continuous Governance & Cloud
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('compliance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeTab === 'compliance'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'compliance' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">SOX 404 & IFRS Sentinel</span>
            </button>

            <button
              onClick={() => setActiveTab('integrations')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeTab === 'integrations'
                  ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-[#101b33] text-white font-black border-l-3 border-cyan-400 shadow-md'
                  : 'text-slate-200 hover:bg-slate-800 hover:text-white font-bold'
              }`}
            >
              <Cpu className={`w-4 h-4 shrink-0 ${activeTab === 'integrations' ? 'text-cyan-400' : 'text-slate-300'}`} />
              <span className="truncate">Enterprise ERP Connectors</span>
            </button>
          </div>
        </div>
      </div>

      {/* Voice-to-Command Interface */}
      <VoiceCommandInterface
        incomeStatement={incomeStatement}
        balanceSheet={balanceSheet}
        drivers={drivers}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        fxRates={fxRates}
        setActiveTab={setActiveTab}
      />

      {/* Controller User Profile & Period Status */}
      <div className="p-3 border-t border-slate-700/80 bg-[#080d19]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xs ring-1 ring-cyan-300 shadow-sm shrink-0">
            ER
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-white truncate">Elena Rostova, CPA</div>
            <div className="text-[11px] text-slate-200 flex items-center gap-1 font-mono font-bold">
              <span className="text-cyan-300 font-bold">Chief Controller</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-extrabold">SOX 404</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
