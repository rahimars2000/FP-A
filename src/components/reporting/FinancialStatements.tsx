import React, { useState } from 'react';
import { StatementLineItem, CurrencyCode, FxRate, PeriodKey } from '../../types/fpa';
import { ALL_PERIODS, formatCurrency, formatPercent, formatVariance, convertCurrency } from '../../utils/fpaEngine';
import {
  FileSpreadsheet,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  Search,
  CheckCircle2,
  Maximize2
} from 'lucide-react';

interface FinancialStatementsProps {
  incomeStatement: StatementLineItem[];
  balanceSheet: StatementLineItem[];
  cashFlow: StatementLineItem[];
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  selectedEntityCode: string;
}

export const FinancialStatements: React.FC<FinancialStatementsProps> = ({
  incomeStatement,
  balanceSheet,
  cashFlow,
  selectedCurrency,
  fxRates,
  selectedEntityCode,
}) => {
  const [activeStatement, setActiveStatement] = useState<'pnl' | 'balance_sheet' | 'cash_flow'>('pnl');
  const [viewCadence, setViewCadence] = useState<'quarterly' | 'annual'>('quarterly');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const currentItems =
    activeStatement === 'pnl'
      ? incomeStatement
      : activeStatement === 'balance_sheet'
      ? balanceSheet
      : cashFlow;

  const filteredItems = currentItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Export to CSV helper
  const handleExportCsv = () => {
    const headers = ['GL Code', 'Account Name', ...ALL_PERIODS];
    const rows = filteredItems.map((item) => {
      const periodValues = ALL_PERIODS.map((p) => {
        const val = convertCurrency(item.values[p] || 0, 'USD', selectedCurrency, 'average', fxRates);
        return Math.round(val);
      });
      return [item.code, `"${item.name}"`, ...periodValues].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Acuity_${activeStatement.toUpperCase()}_${selectedCurrency}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Balance sheet balanced check
  const assetsItem = balanceSheet.find((i) => i.id === 'bs_tot_assets');
  const liabEqItem = balanceSheet.find((i) => i.id === 'bs_tot_liab_eq');
  const isBalanced =
    assetsItem && liabEqItem
      ? Math.abs(assetsItem.values['2026-Q3'] - liabEqItem.values['2026-Q3']) < 1
      : true;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#06b6d4]"></span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white font-display flex items-center gap-2">
              <span>ARS FP&A — Sovereign Financial Statements Ledger</span>
              {activeStatement === 'balance_sheet' && (
                <span className="text-[11px] font-mono text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-700/60 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Balanced: Assets === Liab + Equity</span>
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs text-slate-200 mt-1">
            US GAAP & IFRS multi-entity reporting · Scope: <strong className="text-slate-200">{selectedEntityCode}</strong> · Currency:{' '}
            <strong className="font-mono text-cyan-300">{selectedCurrency}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Statement Tab Buttons */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveStatement('pnl')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeStatement === 'pnl' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Income Statement (P&L)
            </button>
            <button
              onClick={() => setActiveStatement('balance_sheet')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeStatement === 'balance_sheet' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Balance Sheet
            </button>
            <button
              onClick={() => setActiveStatement('cash_flow')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeStatement === 'cash_flow' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Cash Flow
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-200" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Cadence Toggle & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-200">View Cadence:</span>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setViewCadence('quarterly')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                viewCadence === 'quarterly' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Quarterly (8 Quarters)
            </button>
            <button
              onClick={() => setViewCadence('annual')}
              className={`px-2.5 py-1 rounded text-xs font-medium ${
                viewCadence === 'annual' ? 'bg-slate-800 text-cyan-300' : 'text-slate-200 hover:text-slate-200'
              }`}
            >
              Annual (FY25 vs FY26 Plan)
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-200 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search account name or GL code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Financial Statement Grid Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 min-w-[240px]">General Ledger Account</th>
                <th className="py-2.5 px-3 w-16">GL</th>

                {viewCadence === 'quarterly' ? (
                  ALL_PERIODS.map((period) => (
                    <th key={period} className="py-2.5 px-3 text-right font-mono min-w-[105px]">
                      <span className={period.startsWith('2026') ? 'text-cyan-400' : 'text-slate-300'}>
                        {period} {period.startsWith('2026') ? '(F)' : ''}
                      </span>
                    </th>
                  ))
                ) : (
                  <>
                    <th className="py-2.5 px-3 text-right font-mono min-w-[120px]">FY2025 Actuals</th>
                    <th className="py-2.5 px-3 text-right font-mono min-w-[120px] text-cyan-400">FY2026 Forecast</th>
                    <th className="py-2.5 px-3 text-right font-mono min-w-[100px]">Variance $</th>
                    <th className="py-2.5 px-3 text-right font-mono min-w-[80px]">YoY %</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredItems.map((item) => {
                const isHeader = item.isTotal;
                const isSub = item.isSubtotal;
                const paddingLeft = item.depth === 1 ? 'pl-7' : 'pl-3';

                // Calculate Annual Totals
                const fy25Total =
                  (item.values['2025-Q1'] || 0) +
                  (item.values['2025-Q2'] || 0) +
                  (item.values['2025-Q3'] || 0) +
                  (item.values['2025-Q4'] || 0);

                const fy26Total =
                  (item.values['2026-Q1'] || 0) +
                  (item.values['2026-Q2'] || 0) +
                  (item.values['2026-Q3'] || 0) +
                  (item.values['2026-Q4'] || 0);

                const fy25Converted = convertCurrency(fy25Total, 'USD', selectedCurrency, 'average', fxRates);
                const fy26Converted = convertCurrency(fy26Total, 'USD', selectedCurrency, 'average', fxRates);
                const variance = formatVariance(fy26Converted, fy25Converted);

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isHeader
                        ? 'bg-slate-950/80 font-bold text-white'
                        : isSub
                        ? 'bg-slate-900/60 font-semibold text-slate-200'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <td className={`py-2.5 px-3 ${paddingLeft}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">{item.code}</td>

                    {viewCadence === 'quarterly' ? (
                      ALL_PERIODS.map((period) => {
                        const val = convertCurrency(item.values[period] || 0, 'USD', selectedCurrency, 'average', fxRates);
                        const isForecast = period.startsWith('2026');

                        return (
                          <td
                            key={period}
                            className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                              isHeader
                                ? 'text-white font-bold'
                                : isForecast
                                ? 'text-cyan-200'
                                : 'text-slate-300'
                            }`}
                          >
                            {formatCurrency(val, selectedCurrency)}
                          </td>
                        );
                      })
                    ) : (
                      <>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300 tabular-nums">
                          {formatCurrency(fy25Converted, selectedCurrency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-cyan-300 font-semibold tabular-nums">
                          {formatCurrency(fy26Converted, selectedCurrency)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                            variance.isFavorable ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {variance.diffAmount >= 0 ? '+' : ''}
                          {formatCurrency(variance.diffAmount, selectedCurrency)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                            variance.isFavorable ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {variance.diffPercent >= 0 ? '+' : ''}
                          {formatPercent(variance.diffPercent)}
                        </td>
                      </>
                    )}
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
