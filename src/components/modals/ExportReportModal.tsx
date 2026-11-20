import React, { useState } from 'react';
import { CurrencyCode } from '../../types/fpa';
import { X, Download, FileText, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: CurrencyCode;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  selectedCurrency,
}) => {
  const [includePnl, setIncludePnl] = useState(true);
  const [includeBs, setIncludeBs] = useState(true);
  const [includeCf, setIncludeCf] = useState(true);
  const [includeEliminations, setIncludeEliminations] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);

      // Trigger dummy download of JSON package
      const binderData = {
        corporation: 'Apex Global Holdings, Inc. & Subsidiaries',
        reportingStandard: 'US GAAP & IFRS 10 / ASC 810',
        reportingCurrency: selectedCurrency,
        generatedAt: new Date().toISOString(),
        certification: 'SOX 404 Executive Sign-off Active',
        sections: {
          consolidatedPnL: includePnl ? 'Included' : 'Excluded',
          balanceSheet: includeBs ? 'Included' : 'Excluded',
          cashFlows: includeCf ? 'Included' : 'Excluded',
          intercompanyEliminations: includeEliminations ? 'Included' : 'Excluded',
          auditTrail: includeAuditLogs ? 'Included' : 'Excluded',
        },
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(binderData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Apex_FP&A_Executive_Binder_${selectedCurrency}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setTimeout(() => {
        setExportComplete(false);
        onClose();
      }, 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Generate Executive Audit Package</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <p className="text-slate-300">
            Select the reporting modules to package into an audit-ready, board-level financial review binder.
          </p>

          <div className="space-y-2.5 bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
            <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includePnl}
                onChange={(e) => setIncludePnl(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Consolidated Income Statement (P&L 8-Quarter Horizon)</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBs}
                onChange={(e) => setIncludeBs(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Consolidated Balance Sheet & CTA Reserves</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCf}
                onChange={(e) => setIncludeCf(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Statement of Cash Flows (Direct & Indirect)</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeEliminations}
                onChange={(e) => setIncludeEliminations(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>ASC 810 Intercompany Elimination Workpapers</span>
            </label>

            <label className="flex items-center gap-2.5 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAuditLogs}
                onChange={(e) => setIncludeAuditLogs(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>SOX 404 Cryptographic Audit Trail Digest</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-3">
            <span>Reporting Currency: <strong className="font-mono text-cyan-300">{selectedCurrency}</strong></span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PwC Ready</span>
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-slate-400 hover:text-slate-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'Packaging Files...' : exportComplete ? 'Downloaded!' : 'Download Package'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
