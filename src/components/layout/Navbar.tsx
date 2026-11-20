import React from 'react';
import { CurrencyCode } from '../../types/fpa';
import { RefreshCw, Download, Plus, CheckCircle2, ShieldCheck, Compass, Zap, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  onOpenNewJournal: () => void;
  onOpenExportModal: () => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  lastSyncTime: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedCurrency,
  setSelectedCurrency,
  onOpenNewJournal,
  onOpenExportModal,
  isSyncing,
  onTriggerSync,
  lastSyncTime,
}) => {
  const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'CHF'];

  return (
    <header className="h-16 px-6 bg-[#0a0f1d] border-b border-slate-700/80 flex items-center justify-between shrink-0 z-30 shadow-2xl relative">
      {/* Crisp glowing top border line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

      {/* Zone 1: Brand Zone */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('executive');
          }}
          className="text-lg font-bold tracking-tight text-white flex items-center gap-3 group"
        >
          {/* Solid High-Contrast Logo Badge */}
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-mono text-xs font-black shadow-md shadow-cyan-500/20 border border-cyan-300">
            <span className="text-white font-black text-xs tracking-wider">
              ARS
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-white text-base tracking-tight group-hover:text-cyan-300 transition-colors">
                ARS FP&A
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-200 border border-cyan-500/60 font-mono px-2 py-0.5 rounded font-bold tracking-wider">
                ENTERPRISE
              </span>
            </div>
            <span className="text-[11px] text-slate-200 font-semibold tracking-wide">
              Autonomous Financial Intelligence & Capital Command
            </span>
          </div>
        </a>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden xl:flex items-center gap-4 text-[11px] font-bold tracking-wider uppercase">
        <button
          onClick={() => setActiveTab('executive')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'executive'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          Cockpit
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'strategy'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          War Room
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'analysis'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab('arr_cohort')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'arr_cohort'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          ARR & Cohorts
        </button>
        <button
          onClick={() => setActiveTab('workforce')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'workforce'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          Workforce
        </button>
        <button
          onClick={() => setActiveTab('forecasting')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'forecasting'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          Forecasting
        </button>
        <button
          onClick={() => setActiveTab('consolidation')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'consolidation'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          Consolidation
        </button>
        <button
          onClick={() => setActiveTab('statements')}
          className={`transition-all pb-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'statements'
              ? 'text-cyan-300 border-cyan-400 font-extrabold'
              : 'text-slate-300 border-transparent hover:text-white'
          }`}
        >
          Statements
        </button>
      </nav>

      {/* Zone 3: Functional Actions & Currency Selector */}
      <div className="flex items-center gap-3">
        {/* Currency Switcher Pill */}
        <div className="flex items-center bg-[#0d1527] border border-slate-600 rounded-lg px-2.5 py-1.5 shadow-sm">
          <label htmlFor="currency-select" className="text-[10px] text-slate-200 font-mono font-bold mr-2">SOVEREIGN FX:</label>
          <select
            id="currency-select"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
            className="bg-transparent text-xs font-mono font-extrabold text-cyan-300 focus:outline-none cursor-pointer"
          >
            {currencies.map((curr) => (
              <option key={curr} value={curr} className="bg-slate-900 text-slate-100 font-mono font-bold">
                {curr}
              </option>
            ))}
          </select>
        </div>

        {/* Cloud Sync Trigger */}
        <button
          onClick={onTriggerSync}
          disabled={isSyncing}
          title={`Last ledger sync: ${lastSyncTime}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#10192e] hover:bg-[#16223e] border border-slate-600 rounded-lg transition-all shadow-sm whitespace-nowrap group"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isSyncing ? 'Synchronizing...' : 'Live Cloud Sync'}</span>
        </button>

        {/* Audit Export Report */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#10192e] hover:bg-[#16223e] border border-slate-600 rounded-lg transition-all shadow-sm whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden md:inline">Auditor Package</span>
        </button>

        {/* Post Adjustment Journal */}
        <button
          onClick={onOpenNewJournal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-md shadow-cyan-900/40 transition-all whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 text-white" />
          <span>Post Journal</span>
        </button>
      </div>
    </header>
  );
};
