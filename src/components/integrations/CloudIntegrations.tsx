import React, { useState } from 'react';
import { ThirdPartyConnector } from '../../types/fpa';
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Play,
  Terminal,
  Server,
  Zap,
  Clock,
  ArrowRight
} from 'lucide-react';

interface CloudIntegrationsProps {
  connectors: ThirdPartyConnector[];
  onSyncConnector: (id: string) => void;
  isSyncingGlobal: boolean;
}

export const CloudIntegrations: React.FC<CloudIntegrationsProps> = ({
  connectors,
  onSyncConnector,
  isSyncingGlobal,
}) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('POST /v2/fpa/intercompany/reconcile');
  const [requestPayload, setRequestPayload] = useState<string>(
    JSON.stringify(
      {
        accountingPeriod: '2026-Q3',
        sourceEntityCode: 'US-HQ',
        targetEntityCode: 'EU-BV',
        eliminationMode: 'ASC_810_STRICT',
        thresholdToleranceUsd: 100.0,
      },
      null,
      2
    )
  );

  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isCallingApi, setIsCallingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<number | null>(null);

  const handleExecuteApi = () => {
    setIsCallingApi(true);
    setTimeout(() => {
      setIsCallingApi(false);
      setApiStatus(200);
      setApiResponse(
        JSON.stringify(
          {
            status: 'SUCCESS',
            httpStatusCode: 200,
            transactionBatchId: 'BATCH-SYNC-2026-9812A',
            executionLatencyMs: 42,
            recordsProcessed: 1420,
            eliminationsGenerated: 4,
            cumulativeVarianceUsd: 0.0,
            reconciliationHash: '0x992b10f84812aa6644bb398d02',
            syncedWith: ['SAP_S4HANA', 'NETSUITE_MULTIBOOK', 'SNOWFLAKE_LAKEHOUSE'],
          },
          null,
          2
        )
      );
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Cloud Synchronization & Enterprise API Connectors</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Bi-directional ledger synchronization with SAP, Oracle NetSuite, Workday, Salesforce, and Snowflake.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Cloud Webhooks Operational</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-300">Avg Latency: 36ms</span>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((conn) => {
          return (
            <div
              key={conn.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-lg p-4 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">
                      {conn.provider} · {conn.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-0.5">{conn.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Sync Cadence:</span>
                    <span className="text-slate-200 font-medium">{conn.syncCadence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Records Synced:</span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {conn.recordsSynced.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Latency:</span>
                    <span className="font-mono text-emerald-400">{conn.healthLatencyMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Ingestion:</span>
                    <span className="text-slate-400">{conn.lastSyncAt}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px]">
                  {conn.endpointUrl}
                </span>
                <button
                  onClick={() => onSyncConnector(conn.id)}
                  disabled={isSyncingGlobal}
                  className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingGlobal ? 'animate-spin' : ''}`} />
                  <span>Sync Now</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive REST API & Webhook Workbench */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Custom Enterprise REST & Webhook Workbench</span>
            </h2>
            <p className="text-xs text-slate-400">
              Test live JSON payloads for automated GL ingestion, intercompany reconciliation, and Monte Carlo queries.
            </p>
          </div>
          <button
            onClick={handleExecuteApi}
            disabled={isCallingApi}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded transition-colors"
          >
            <Play className={`w-3.5 h-3.5 ${isCallingApi ? 'animate-spin' : ''}`} />
            <span>{isCallingApi ? 'Executing Request...' : 'Dispatch Request'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Panel */}
          <div className="space-y-3">
            <div>
              <label htmlFor="api-endpoint-select" className="text-xs font-semibold text-slate-300 block mb-1">Target Endpoint</label>
              <select
                id="api-endpoint-select"
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="POST /v2/fpa/intercompany/reconcile">POST /v2/fpa/intercompany/reconcile</option>
                <option value="POST /v2/fpa/forecast/monte-carlo/run">POST /v2/fpa/forecast/monte-carlo/run</option>
                <option value="POST /v2/fpa/journals/sap-import">POST /v2/fpa/journals/sap-import</option>
                <option value="GET /v2/fpa/consolidation/asc810/summary">GET /v2/fpa/consolidation/asc810/summary</option>
              </select>
            </div>

            <div>
              <label htmlFor="json-payload-editor" className="text-xs font-semibold text-slate-300 block mb-1">Request Payload (JSON)</label>
              <textarea
                id="json-payload-editor"
                rows={8}
                value={requestPayload}
                onChange={(e) => setRequestPayload(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Response Panel */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Live Response Payload</label>
              {apiStatus && (
                <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                  HTTP {apiStatus} OK · 42ms
                </span>
              )}
            </div>

            <pre className="h-[240px] overflow-y-auto bg-slate-950 border border-slate-800 rounded p-3 text-xs font-mono text-cyan-200">
              {apiResponse || '// Dispatch a request to inspect live response schema and headers'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
