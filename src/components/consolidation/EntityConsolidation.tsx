import React, { useState } from 'react';
import { Entity, FxRate, CurrencyCode, IntercompanyTransaction } from '../../types/fpa';
import { formatCurrency, formatPercent, convertCurrency, processIntercompanyEliminations } from '../../utils/fpaEngine';
import {
  GitMerge,
  Building2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck2,
  Sliders,
  ChevronRight
} from 'lucide-react';

interface EntityConsolidationProps {
  entities: Entity[];
  fxRates: FxRate[];
  selectedCurrency: CurrencyCode;
  icTransactions: IntercompanyTransaction[];
  onEliminateTransactions: () => void;
  onUpdateFxRate: (from: CurrencyCode, newSpotRate: number) => void;
}

export const EntityConsolidation: React.FC<EntityConsolidationProps> = ({
  entities,
  fxRates,
  selectedCurrency,
  icTransactions,
  onEliminateTransactions,
  onUpdateFxRate,
}) => {
  const [selectedSub, setSelectedSub] = useState<Entity>(entities[1]); // Default EMEA
  const [fxEditMode, setFxEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'fx_matrix' | 'eliminations'>('hierarchy');

  const eliminationSummary = processIntercompanyEliminations(icTransactions, fxRates);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-display">
              ARS FP&A — Sovereign Entity Consolidation (ASC 810)
            </h1>
          </div>
          <p className="text-xs text-slate-200 mt-1">
            Autonomous corporate ledger rollup, multi-currency functional translation (ASC 830 / IAS 21), and automated eliminations.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'hierarchy' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
            }`}
          >
            Subsidiary Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('fx_matrix')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'fx_matrix' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
            }`}
          >
            FX Matrix (ASC 830)
          </button>
          <button
            onClick={() => setActiveTab('eliminations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'eliminations' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
            }`}
          >
            IC Eliminations
          </button>
        </div>
      </div>

      {/* Tab 1: Hierarchy & Subsidiary Rollup */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Entity List / Tree */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Corporate Structure</span>
                <span className="text-[11px] text-slate-200 font-mono">100% Owned</span>
              </div>

              {entities.map((ent) => {
                const isSelected = selectedSub.id === ent.id;
                return (
                  <button
                    key={ent.id}
                    onClick={() => setSelectedSub(ent)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/80 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">{ent.code}</span>
                        {ent.isParent && (
                          <span className="text-[10px] text-slate-200 font-semibold uppercase">Ultimate Parent</span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-semibold text-slate-300">{ent.currency}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 mt-1 truncate">{ent.name}</div>
                    <div className="text-[11px] text-slate-200 mt-1 flex items-center justify-between">
                      <span>{ent.jurisdiction}</span>
                      <span className="font-mono">{ent.headcount} FTE</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Entity Detail & Translation Workpaper */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedSub.name}</h2>
                    <span className="font-mono text-xs text-cyan-400 bg-slate-800 px-2 py-0.5 rounded">
                      {selectedSub.code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 mt-1 flex items-center gap-2">
                    <span>{selectedSub.legalType}</span>
                    <span aria-hidden="true">·</span>
                    <span>Functional Currency: <strong className="font-mono text-slate-200">{selectedSub.currency}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Audit Status: <span className="text-emerald-400 font-medium">SOX 404 Compliant</span></span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400">Ownership Share</div>
                  <div className="text-lg font-bold font-mono text-cyan-300">{selectedSub.ownershipPercent}%</div>
                </div>
              </div>

              {/* Translation Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <div className="text-[11px] text-slate-400">Functional Local Currency</div>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedSub.currency}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Primary operational books</div>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <div className="text-[11px] text-slate-400">P&L Average Conversion Rate</div>
                  <div className="text-base font-bold font-mono text-cyan-300 mt-1">
                    {selectedSub.currency === 'USD'
                      ? '1.0000'
                      : fxRates.find((r) => r.from === selectedSub.currency)?.averageRate.toFixed(4) || '1.0000'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">ASC 830 Period Weighted</div>
                </div>
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
                  <div className="text-[11px] text-slate-400">Balance Sheet Spot Rate</div>
                  <div className="text-base font-bold font-mono text-emerald-300 mt-1">
                    {selectedSub.currency === 'USD'
                      ? '1.0000'
                      : fxRates.find((r) => r.from === selectedSub.currency)?.spotRate.toFixed(4) || '1.0000'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Closing Period Revaluation</div>
                </div>
              </div>

              {/* Consolidation Ledger Workpaper */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Consolidation Rollup Workpaper (FY2026-Q3)
                </h3>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Statement Line</th>
                        <th className="py-2 px-3 text-right">Local Book ({selectedSub.currency})</th>
                        <th className="py-2 px-3 text-right">Applied FX Rate</th>
                        <th className="py-2 px-3 text-right">Consolidated (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      <tr>
                        <td className="py-2 px-3 text-slate-200">Subscription & Service Revenue</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {selectedSub.currency === 'USD' ? '38,900,000' : '14,200,000'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">
                          {selectedSub.currency === 'USD' ? '1.0000' : '1.0780 (Avg)'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-white">
                          ${selectedSub.currency === 'USD' ? '38,900,000' : '15,307,600'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-200">Total Operating Expenses (OpEx)</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {selectedSub.currency === 'USD' ? '22,400,000' : '8,450,000'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">
                          {selectedSub.currency === 'USD' ? '1.0000' : '1.0780 (Avg)'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-white">
                          ${selectedSub.currency === 'USD' ? '22,400,000' : '9,109,100'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-slate-200">Cash & Treasury Equivalents</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {selectedSub.currency === 'USD' ? '68,400,000' : '24,800,000'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">
                          {selectedSub.currency === 'USD' ? '1.0000' : '1.0850 (Spot)'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-white">
                          ${selectedSub.currency === 'USD' ? '68,400,000' : '26,908,000'}
                        </td>
                      </tr>
                      <tr className="bg-slate-950/40">
                        <td className="py-2 px-3 font-semibold text-cyan-300">Cumulative Translation Adj. (CTA)</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">—</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">ASC 830 Reserve</td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-400">
                          +${selectedSub.currency === 'USD' ? '0' : '173,600'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: FX Matrix */}
      {activeTab === 'fx_matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Live Multi-Currency FX Rates & ASC 830 Translation Matrix</h2>
              <p className="text-xs text-slate-400">
                Centralized foreign exchange tables for period consolidation, spot revaluations, and hedging sensitivity.
              </p>
            </div>
            <button
              onClick={() => setFxEditMode(!fxEditMode)}
              className="text-xs font-semibold px-3 py-1.5 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              {fxEditMode ? 'Exit Edit Mode' : 'Modify Spot Rates'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Currency Pair</th>
                  <th className="py-2.5 px-3">Spot Rate (Closing BS)</th>
                  <th className="py-2.5 px-3">Average Rate (P&L Conversion)</th>
                  <th className="py-2.5 px-3">Historical Rate (Equity / CapEx)</th>
                  <th className="py-2.5 px-3">Last Effective Refresh</th>
                  <th className="py-2.5 px-3 text-right">Hedging Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {fxRates.map((rate) => {
                  const isUsd = rate.from === 'USD';
                  return (
                    <tr key={rate.from} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-white">{rate.from} / {rate.to}</span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {fxEditMode && !isUsd ? (
                          <input
                            type="number"
                            step="0.001"
                            defaultValue={rate.spotRate}
                            onChange={(e) => onUpdateFxRate(rate.from, parseFloat(e.target.value))}
                            className="w-24 bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-cyan-300 text-xs font-mono"
                          />
                        ) : (
                          <span className="text-cyan-300 font-semibold">{rate.spotRate.toFixed(4)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{rate.averageRate.toFixed(4)}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{rate.historicalRate.toFixed(4)}</td>
                      <td className="py-3 px-3 text-slate-400">{rate.effectiveDate}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono text-emerald-400">{isUsd ? '100% Base' : '85% Hedged'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Intercompany Eliminations */}
      {activeTab === 'eliminations' && (
        <div className="space-y-6">
          {/* Top Banner Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400 mb-1">Matched Intercompany Volume</div>
              <div className="text-xl font-bold font-mono text-white">
                {formatCurrency(eliminationSummary.matchedTotalUsd, selectedCurrency, true)}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">ASC 810 Elimination Ready</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="text-xs text-slate-400 mb-1">Reconciliation Discrepancies</div>
              <div className="text-xl font-bold font-mono text-amber-400">
                {formatCurrency(eliminationSummary.varianceTotalUsd, selectedCurrency, true)}
              </div>
              <div className="text-[11px] text-amber-300/80 mt-1">1 Unilateral Entry Flagged</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-400 mb-1">Automated Elimination Engine</div>
                <div className="text-xs text-slate-300">One-click journal creation & ledger balancing</div>
              </div>
              <button
                onClick={onEliminateTransactions}
                className="mt-3 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors whitespace-nowrap shadow-sm shadow-cyan-500/20"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Post ASC 810 Eliminations</span>
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Intercompany Cross-Entity Transactions Register</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Reference #</th>
                    <th className="py-2.5 px-3">From Entity</th>
                    <th className="py-2.5 px-3">To Entity</th>
                    <th className="py-2.5 px-3">Nature / Description</th>
                    <th className="py-2.5 px-3 text-right">Amount (Orig)</th>
                    <th className="py-2.5 px-3 text-right">Amount (USD)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {icTransactions.map((tx) => {
                    const fromEnt = entities.find((e) => e.id === tx.fromEntityId);
                    const toEnt = entities.find((e) => e.id === tx.toEntityId);
                    const amountUsd = convertCurrency(tx.amount, tx.currency, 'USD', 'spot', fxRates);

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-200">{tx.referenceNumber}</td>
                        <td className="py-3 px-3 text-slate-300">{fromEnt?.code} ({fromEnt?.name})</td>
                        <td className="py-3 px-3 text-slate-300">{toEnt?.code} ({toEnt?.name})</td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs truncate">{tx.description}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                          {formatCurrency(tx.amount, tx.currency)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-cyan-300">
                          {formatCurrency(amountUsd, 'USD')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {tx.eliminationStatus === 'matched' || tx.eliminationStatus === 'eliminated' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{tx.eliminationStatus === 'eliminated' ? 'Eliminated' : 'Matched'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Variance Flagged</span>
                            </span>
                          )}
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
    </div>
  );
};
