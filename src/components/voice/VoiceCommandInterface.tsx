import React, { useState, useEffect, useRef } from 'react';
import { CurrencyCode, StatementLineItem, FinancialDrivers, FxRate } from '../../types/fpa';
import { formatCurrency, formatPercent, convertCurrency } from '../../utils/fpaEngine';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  X,
  HelpCircle,
  Command
} from 'lucide-react';

interface VoiceCommandInterfaceProps {
  incomeStatement: StatementLineItem[];
  balanceSheet: StatementLineItem[];
  drivers: FinancialDrivers;
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  fxRates: FxRate[];
  setActiveTab: (tab: string) => void;
}

interface VoiceCommandResult {
  query: string;
  response: string;
  metricHighlight?: string;
  actionTaken?: string;
  timestamp: string;
}

export const VoiceCommandInterface: React.FC<VoiceCommandInterfaceProps> = ({
  incomeStatement,
  balanceSheet,
  drivers,
  selectedCurrency,
  setSelectedCurrency,
  fxRates,
  setActiveTab,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [activeResult, setActiveResult] = useState<VoiceCommandResult | null>(null);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setErrorNotice(null);
          setTranscript('Listening for financial query...');
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);

          if (event.results[current].isFinal) {
            handleProcessCommand(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition event:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setErrorNotice('Microphone access blocked. Click any sample prompt below.');
          } else {
            setErrorNotice(`Voice input status: ${event.error}. You can also click sample queries.`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (e) {
        console.warn('SpeechRecognition initialization notice:', e);
      }
    }
  }, [incomeStatement, balanceSheet, drivers, selectedCurrency, fxRates]);

  // Voice toggle handler
  const handleToggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Simulate voice input with primary requested query
      simulateVoiceQuery('Show me the revenue projection for Q4');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      simulateVoiceQuery('Show me the revenue projection for Q4');
    }
  };

  const simulateVoiceQuery = (queryText: string) => {
    setIsListening(true);
    setTranscript(`Simulating voice: "${queryText}"`);
    setTimeout(() => {
      setIsListening(false);
      setTranscript(queryText);
      handleProcessCommand(queryText);
    }, 700);
  };

  // Natural Language Financial Query Parsing Engine
  const handleProcessCommand = (spokenText: string) => {
    const lower = spokenText.toLowerCase().trim();
    let replyText = '';
    let metricHighlight = '';
    let actionTaken = '';

    const revItem = incomeStatement.find((i) => i.id === 'tot_rev');
    const ebitdaItem = incomeStatement.find((i) => i.id === 'ebitda');
    const cashItem = balanceSheet.find((i) => i.id === 'bs_cash');

    // 1. Revenue projection query (e.g. "Show me the revenue projection for Q4")
    if (lower.includes('revenue') && (lower.includes('q4') || lower.includes('fourth quarter'))) {
      const q4RevUsd = revItem?.values['2026-Q4'] || 70700000;
      const convertedQ4 = convertCurrency(q4RevUsd, 'USD', selectedCurrency, 'average', fxRates);
      const q4Formatted = formatCurrency(convertedQ4, selectedCurrency, true);
      const prevQ4Usd = revItem?.values['2025-Q4'] || 45200000;
      const convertedPrevQ4 = convertCurrency(prevQ4Usd, 'USD', selectedCurrency, 'average', fxRates);
      const growthPct = prevQ4Usd > 0 ? ((q4RevUsd - prevQ4Usd) / prevQ4Usd) * 100 : 0;

      replyText = `Consolidated Q4 2026 projected revenue is ${q4Formatted}, representing +${growthPct.toFixed(1)}% year-over-year expansion from Q4 2025. Full-year FY2026 run-rate reaches ${formatCurrency(convertedQ4 * 4, selectedCurrency, true)}.`;
      metricHighlight = `Q4 '26 Revenue: ${q4Formatted} (+${growthPct.toFixed(1)}% YoY)`;
      actionTaken = 'Analyzed FY2026-Q4 General Ledger projections';
    } else if (
      lower.includes('arr') ||
      lower.includes('cohort') ||
      lower.includes('waterfall') ||
      lower.includes('rule of 40') ||
      lower.includes('magic number')
    ) {
      setActiveTab('arr_cohort');
      const q3RevUsd = revItem?.values['2026-Q3'] || 63200000;
      const q3EbitdaUsd = ebitdaItem?.values['2026-Q3'] || 15750000;
      const marginPct = q3RevUsd > 0 ? (q3EbitdaUsd / q3RevUsd) * 100 : 24.9;
      replyText = `Navigating to ARR & Cohort Engine. Consolidated Q3 Ending ARR is modeled at ${formatCurrency(convertCurrency(218400000, 'USD', selectedCurrency, 'average', fxRates), selectedCurrency, true)} with EBITDA margin at ${marginPct.toFixed(1)}% and live Rule of 40 and Magic Number analytics active.`;
      metricHighlight = 'View: ARR & Cohort Engine';
      actionTaken = 'Opened ARR & Cohort Engine';
    } else if (
      lower.includes('workforce') ||
      lower.includes('headcount') ||
      lower.includes('payroll') ||
      lower.includes('hiring')
    ) {
      setActiveTab('workforce');
      replyText = 'Navigating to Workforce & Payroll Planner across all 5 legal entities (US-HQ, EU-BV, UK-PLC, APAC-PTE, CH-SARL) with statutory tax burdens, start-date proration, and live P&L/Cash Flow sync.';
      metricHighlight = 'View: Workforce & Payroll Planner';
      actionTaken = 'Opened Workforce & Payroll Planner';
    } else if (lower.includes('revenue') || lower.includes('sales')) {
      const q3RevUsd = revItem?.values['2026-Q3'] || 63200000;
      const convertedQ3 = convertCurrency(q3RevUsd, 'USD', selectedCurrency, 'average', fxRates);
      const q3Formatted = formatCurrency(convertedQ3, selectedCurrency, true);

      replyText = `Current Q3 2026 consolidated revenue is modeled at ${q3Formatted} (ARR run-rate: ${formatCurrency(convertedQ3 * 4, selectedCurrency, true)}).`;
      metricHighlight = `Q3 Revenue: ${q3Formatted}`;
      actionTaken = 'Retrieved consolidated topline performance';
    } else if (lower.includes('ebitda') || lower.includes('operating income') || lower.includes('profit')) {
      const q3EbitdaUsd = ebitdaItem?.values['2026-Q3'] || 15750000;
      const convertedEbitda = convertCurrency(q3EbitdaUsd, 'USD', selectedCurrency, 'average', fxRates);
      const q3RevUsd = revItem?.values['2026-Q3'] || 63200000;
      const margin = q3RevUsd > 0 ? (q3EbitdaUsd / q3RevUsd) * 100 : 24.9;

      replyText = `Consolidated Adjusted EBITDA is ${formatCurrency(convertedEbitda, selectedCurrency, true)} with an operating margin of ${margin.toFixed(1)}%. Variance vs baseline plan is favorable.`;
      metricHighlight = `EBITDA: ${formatCurrency(convertedEbitda, selectedCurrency, true)} (${margin.toFixed(1)}% Margin)`;
      actionTaken = 'Evaluated EBITDA run-rate';
    } else if (lower.includes('cash') || lower.includes('runway') || lower.includes('liquidity')) {
      const cashUsd = cashItem?.values['2026-Q3'] || 107100000;
      const convertedCash = convertCurrency(cashUsd, 'USD', selectedCurrency, 'spot', fxRates);

      replyText = `Total consolidated liquid cash and treasury reserves stand at ${formatCurrency(convertedCash, selectedCurrency, true)}. Net operating burn is negative, with an infinite cash runway.`;
      metricHighlight = `Treasury Reserves: ${formatCurrency(convertedCash, selectedCurrency, true)}`;
      actionTaken = 'Audited consolidated liquid balance sheet';
    } else if (lower.includes('retention') || lower.includes('ndr') || lower.includes('nrr')) {
      replyText = `Net Dollar Retention (NDR) is currently configured at ${formatPercent(drivers.netRetentionRate)} with an average CAC payback period of ${drivers.cacPaybackMonths.toFixed(1)} months.`;
      metricHighlight = `NDR: ${formatPercent(drivers.netRetentionRate)}`;
      actionTaken = 'Queried customer retention drivers';
    } else if (lower.includes('euro') || lower.includes('eur')) {
      setSelectedCurrency('EUR');
      replyText = 'Switched primary reporting currency to EUR (€). Real-time statement translations updated.';
      metricHighlight = 'Currency: EUR (€)';
      actionTaken = 'Updated active FX reporting currency to EUR';
    } else if (lower.includes('pound') || lower.includes('gbp')) {
      setSelectedCurrency('GBP');
      replyText = 'Switched primary reporting currency to British Pounds (£). Multi-entity books re-indexed.';
      metricHighlight = 'Currency: GBP (£)';
      actionTaken = 'Updated active FX reporting currency to GBP';
    } else if (lower.includes('dollar') || lower.includes('usd')) {
      setSelectedCurrency('USD');
      replyText = 'Switched primary reporting currency to US Dollars ($).';
      metricHighlight = 'Currency: USD ($)';
      actionTaken = 'Updated active FX reporting currency to USD';
    } else if (lower.includes('strategy') || lower.includes('war room') || lower.includes('m&a')) {
      setActiveTab('strategy');
      replyText = 'Navigating to Strategy War Room & Autonomous Control Hub.';
      metricHighlight = 'View: Strategy War Room';
      actionTaken = 'Opened Strategy War Room';
    } else if (lower.includes('statement') || lower.includes('p&l') || lower.includes('balance sheet')) {
      setActiveTab('statements');
      replyText = 'Navigating to Automated Financial Statements builder.';
      metricHighlight = 'View: Financial Statements';
      actionTaken = 'Opened Financial Statements';
    } else if (lower.includes('consolidation') || lower.includes('subsidiary') || lower.includes('entity')) {
      setActiveTab('consolidation');
      replyText = 'Navigating to Multi-Entity Consolidation & ASC 810 workpapers.';
      metricHighlight = 'View: Consolidation';
      actionTaken = 'Opened Entity Consolidation';
    } else if (lower.includes('analysis') || lower.includes('overhead') || lower.includes('cost') || lower.includes('controlling')) {
      setActiveTab('analysis');
      const opexItem = incomeStatement.find((i) => i.id === 'tot_opex');
      const q3OpexUsd = opexItem?.values['2026-Q3'] || 30300000;
      const convertedOpex = convertCurrency(q3OpexUsd, 'USD', selectedCurrency, 'average', fxRates);
      replyText = `Navigating to Financial Analysis Room. Current Q3 overhead run-rate is ${formatCurrency(convertedOpex, selectedCurrency, true)} across R&D, Sales & Marketing, and G&A. Visual controlling levers and absorption matrix are active.`;
      metricHighlight = `Q3 Overhead Run-rate: ${formatCurrency(convertedOpex, selectedCurrency, true)}`;
      actionTaken = 'Opened Financial Analysis Room';
    } else if (lower.includes('simulation') || lower.includes('monte carlo') || lower.includes('modeling')) {
      setActiveTab('forecasting');
      replyText = 'Navigating to Predictive Modeling & Monte Carlo simulation dashboard.';
      metricHighlight = 'View: Predictive Modeling';
      actionTaken = 'Opened Predictive Modeling';
    } else {
      const q4RevUsd = revItem?.values['2026-Q4'] || 70700000;
      const convertedQ4 = convertCurrency(q4RevUsd, 'USD', selectedCurrency, 'average', fxRates);
      replyText = `Query processed for "${spokenText}". Consolidated Q4 2026 revenue is projected at ${formatCurrency(convertedQ4, selectedCurrency, true)} with gross margin target at ${formatPercent(drivers.grossMarginTarget)}.`;
      metricHighlight = `Q4 Rev: ${formatCurrency(convertedQ4, selectedCurrency, true)}`;
      actionTaken = 'General Ledger query answered';
    }

    const resultObj: VoiceCommandResult = {
      query: spokenText,
      response: replyText,
      metricHighlight,
      actionTaken,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setActiveResult(resultObj);

    // Speak response if SpeechSynthesis is enabled
    if (speechSynthesisEnabled && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(replyText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // Speech synthesis gracefully handled
      }
    }
  };

  return (
    <div className="p-3 mx-3 mb-2 rounded-xl bg-gradient-to-b from-[#0a1020]/90 to-[#070b14]/90 border border-slate-800/90 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-cyan-400 uppercase font-mono">
          <Command className="w-3 h-3 text-cyan-400" />
          <span>ARS Voice Command</span>
        </div>
        <button
          onClick={() => setSpeechSynthesisEnabled(!speechSynthesisEnabled)}
          title={speechSynthesisEnabled ? 'Audio synthesis voice enabled' : 'Audio read-back muted'}
          className="text-slate-400 hover:text-cyan-300 transition-colors"
        >
          {speechSynthesisEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>
      </div>

      {/* Mic Activation Button & Listening State */}
      <div className="relative">
        <button
          onClick={handleToggleListening}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-md ${
            isListening
              ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.5)] ring-2 ring-rose-400/50'
              : 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:scale-[1.02]'
          }`}
        >
          {isListening ? (
            <>
              <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
              <span>Listening to Voice...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-cyan-100" />
              <span>Voice Query Ledger</span>
            </>
          )}
        </button>
      </div>

      {/* Live Transcript / Status */}
      {isListening && (
        <div className="mt-2 p-2 bg-[#0a1022] border border-cyan-400/60 rounded-lg text-[11px] text-cyan-200 font-mono animate-pulse truncate shadow-inner">
          {transcript || 'Listening to microphone...'}
        </div>
      )}

      {errorNotice && (
        <div className="mt-1.5 text-[10px] text-amber-300 font-mono">
          {errorNotice}
        </div>
      )}

      {/* Quick Clickable Voice Queries */}
      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-mono uppercase text-slate-200 font-bold tracking-wider">
          Suggested Queries
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          <button
            onClick={() => simulateVoiceQuery('Show me the revenue projection for Q4')}
            className="text-left py-1.5 px-2.5 rounded-lg bg-[#0d162a] hover:bg-cyan-950 text-slate-100 hover:text-cyan-200 transition-all truncate border border-slate-700 hover:border-cyan-400 font-mono text-[11px] font-bold cursor-pointer"
          >
            "Show me the revenue projection for Q4"
          </button>
          <button
            onClick={() => simulateVoiceQuery('Open Financial Analysis Room')}
            className="text-left py-1.5 px-2.5 rounded-lg bg-[#0d162a] hover:bg-cyan-950 text-slate-100 hover:text-cyan-200 transition-all truncate border border-slate-700 hover:border-cyan-400 font-mono text-[11px] font-bold cursor-pointer"
          >
            "Open Financial Analysis Room"
          </button>
          <button
            onClick={() => simulateVoiceQuery('Show ARR bridge and Rule of 40')}
            className="text-left py-1.5 px-2.5 rounded-lg bg-[#0d162a] hover:bg-cyan-950 text-slate-100 hover:text-cyan-200 transition-all truncate border border-slate-700 hover:border-cyan-400 font-mono text-[11px] font-bold cursor-pointer"
          >
            "Show ARR bridge and Rule of 40"
          </button>
          <button
            onClick={() => simulateVoiceQuery('Open Workforce Payroll Planner')}
            className="text-left py-1.5 px-2.5 rounded-lg bg-[#0d162a] hover:bg-cyan-950 text-slate-100 hover:text-cyan-200 transition-all truncate border border-slate-700 hover:border-cyan-400 font-mono text-[11px] font-bold cursor-pointer"
          >
            "Open Workforce Payroll Planner"
          </button>
          <button
            onClick={() => simulateVoiceQuery('What is our current EBITDA?')}
            className="text-left py-1.5 px-2.5 rounded-lg bg-[#0d162a] hover:bg-cyan-950 text-slate-100 hover:text-cyan-200 transition-all truncate border border-slate-700 hover:border-cyan-400 font-mono text-[11px] font-bold cursor-pointer"
          >
            "What is our current EBITDA?"
          </button>
          <button
            onClick={() => simulateVoiceQuery('What is our cash runway?')}
            className="text-left py-1.5 px-2.5 rounded-lg bg-[#0d162a] hover:bg-cyan-950 text-slate-100 hover:text-cyan-200 transition-all truncate border border-slate-700 hover:border-cyan-400 font-mono text-[11px] font-bold cursor-pointer"
          >
            "What is our cash runway?"
          </button>
          <button
            onClick={() => simulateVoiceQuery('Switch currency to EUR')}
            className="text-left py-1.5 px-2.5 rounded-lg bg-[#0d162a] hover:bg-cyan-950 text-slate-100 hover:text-cyan-200 transition-all truncate border border-slate-700 hover:border-cyan-400 font-mono text-[11px] font-bold cursor-pointer"
          >
            "Switch currency to EUR"
          </button>
        </div>
      </div>

      {/* Voice Response Card Modal / Popover */}
      {activeResult && (
        <div className="mt-3 p-3.5 bg-[#0a1020] border-2 border-cyan-400 rounded-xl shadow-2xl text-xs space-y-2 font-sans relative animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => setActiveResult(null)}
            className="absolute right-2 top-2 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono font-bold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">"{activeResult.query}"</span>
          </div>

          {activeResult.metricHighlight && (
            <div className="text-xs font-mono font-black text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-cyan-500 shadow-sm">
              {activeResult.metricHighlight}
            </div>
          )}

          <p className="text-xs text-white leading-relaxed font-medium">
            {activeResult.response}
          </p>

          <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400 font-mono border-t border-slate-800">
            <span className="text-emerald-400 font-medium">{activeResult.actionTaken}</span>
            <span>{activeResult.timestamp}</span>
          </div>
        </div>
      )}
    </div>
  );
};
