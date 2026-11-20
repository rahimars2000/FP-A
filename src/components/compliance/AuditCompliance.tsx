import React, { useState } from 'react';
import { AuditLogEntry } from '../../types/fpa';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  FileText,
  Download,
  Key,
  Calendar,
  UserCheck,
  Search,
  ExternalLink
} from 'lucide-react';

interface AuditComplianceProps {
  auditLogs: AuditLogEntry[];
  onSignOffPeriod: (role: string) => void;
  onExportAuditPackage: () => void;
}

export const AuditCompliance: React.FC<AuditComplianceProps> = ({
  auditLogs,
  onSignOffPeriod,
  onExportAuditPackage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cfoSigned, setCfoSigned] = useState(true);
  const [controllerSigned, setControllerSigned] = useState(true);
  const [auditorLocked, setAuditorLocked] = useState(false);

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.hashSignature.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>SOX 404 & IFRS 10 Audit-Ready Compliance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable general ledger change logs, cryptographic signature tracking, and quarterly sign-off governance.
          </p>
        </div>

        <button
          onClick={onExportAuditPackage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Generate Auditor Binder (PDF/ZIP)</span>
        </button>
      </div>

      {/* Governance & Sign-Off Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: SOX 404 Attestation */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>SOX Section 404 Internal Controls</span>
            <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Certified</span>
            </span>
          </div>
          <div className="text-sm font-semibold text-white">Full Segregation of Duties (SoD)</div>
          <p className="text-xs text-slate-400 mt-1">
            Automated change-data-capture enabled. No ledger edits permitted without 2-party dual approval.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>External Auditor:</span>
            <span className="text-slate-200 font-medium">PricewaterhouseCoopers LLP</span>
          </div>
        </div>

        {/* Card 2: Controller Sign-Off */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Financial Controller Sign-Off</span>
              <span className="text-emerald-400 font-mono font-medium">Completed</span>
            </div>
            <div className="text-sm font-semibold text-white">Elena Rostova, CPA</div>
            <p className="text-xs text-slate-400 mt-1">
              Signed off on FY2026-Q3 intercompany elimination journals and CTA foreign translation adjustments.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Timestamp:</span>
            <span className="font-mono text-slate-300">2026-10-01 01:42 UTC</span>
          </div>
        </div>

        {/* Card 3: CFO Executive Certification */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>CFO Executive Certification</span>
              <span className="text-emerald-400 font-mono font-medium">Certified</span>
            </div>
            <div className="text-sm font-semibold text-white">Marcus Sterling, CFO</div>
            <p className="text-xs text-slate-400 mt-1">
              FY2026 Board-approved budget forecast locked into baseline reporting schema.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="font-mono text-cyan-400 font-semibold">Ledger Freeze Active</span>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Cryptographic Immutable Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic verification hash digests computed for every GL modification and consolidation run.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search actor, action, hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action Event</th>
                <th className="py-2.5 px-3">Rule</th>
                <th className="py-2.5 px-3">Audit Details & Adjustments</th>
                <th className="py-2.5 px-3 text-right">Cryptographic Hash Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-200">{log.actor.name}</div>
                    <div className="text-[11px] text-slate-400">{log.actor.role}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-cyan-400 font-semibold text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] text-slate-300 font-mono">{log.complianceRule}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 max-w-sm">
                    <div>{log.description}</div>
                    {log.previousValue && (
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        Prev: {log.previousValue} → New: {log.newValue}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[11px] text-emerald-400">
                    {log.hashSignature}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
