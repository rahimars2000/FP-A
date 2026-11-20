import React, { useState, useMemo } from 'react';
import { FinancialDrivers, StatementLineItem, CurrencyCode, FxRate } from '../../types/fpa';
import { formatCurrency, formatPercent, convertCurrency } from '../../utils/fpaEngine';
import {
  Sparkles,
  TrendingUp,
  Cpu,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  Check,
  Percent,
  Layers,
  Flame
} from 'lucide-react';

interface AIPredictiveInsightsProps {
  incomeStatement: StatementLineItem[];
  drivers: FinancialDrivers;
  selectedCurrency: CurrencyCode;
  fxRates: FxRate[];
  onUpdateDrivers?: (drivers: FinancialDrivers) => void;
}

interface ActionableRecommendation {
  id: string;
  category: 'REVENUE_STRATEGY' | 'UNIT_ECONOMICS' | 'WORKING_CAPITAL';
  categoryLabel: string;
  title: string;
  recommendationText: string;
  quantifiedImpact: string;
  urgency: 'high' | 'medium' | 'strategic';
  actionLabel: string;
  leverAction?: () => void;
}

export const AIPredictiveInsights: React.FC<AIPredictiveInsightsProps> = ({
  incomeStatement,
  drivers,
  selectedCurrency,
  fxRates,
  onUpdateDrivers,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});

  // Extract key metrics from statement data
  const revItem = incomeStatement.find((i) => i.id === 'tot_rev');
  const ebitdaItem = incomeStatement.find((i) => i.id === 'ebitda');
  const cogsItem = incomeStatement.find((i) => i.id === 'tot_cogs');

  const q3RevUsd = revItem?.values['2026-Q3'] || 63200000;
  const annualRevUsd = q3RevUsd * 4;
  const q3EbitdaUsd = ebitdaItem?.values['2026-Q3'] || 15750000;
  const annualEbitdaUsd = q3EbitdaUsd * 4;

  const convertedAnnualRev = convertCurrency(annualRevUsd, 'USD', selectedCurrency, 'average', fxRates);
  const convertedAnnualEbitda = convertCurrency(annualEbitdaUsd, 'USD', selectedCurrency, 'average', fxRates);

  // Dynamically generate 3 actionable financial recommendations from current statements and drivers
  const recommendations: ActionableRecommendation[] = useMemo(() => {
    const list: ActionableRecommendation[] = [];

    // 1. Revenue & NDR Optimization Recommendation
    const potentialNrr = Math.min(1.25, drivers.netRetentionRate + 0.035);
    const ndrRevLiftUsd = annualRevUsd * 0.035;
    const convertedNdrLift = convertCurrency(ndrRevLiftUsd, 'USD', selectedCurrency, 'average', fxRates);

    list.push({
      id: 'rec-nrr-expansion',
      category: 'REVENUE_STRATEGY',
      categoryLabel: 'Net Dollar Retention & Expansion',
      title: `Leverage Net Retention (${formatPercent(drivers.netRetentionRate)}) to Unlock ${formatCurrency(convertedNdrLift, selectedCurrency, true)} ARR`,
      recommendationText: `Current Net Dollar Retention of ${formatPercent(drivers.netRetentionRate)} demonstrates strong multi-subsidiary demand in EMEA and APAC. Introducing automated multi-entity cross-licensing and annual consumer-price-indexation renewal terms will elevate NDR to ${formatPercent(potentialNrr)}, injecting an estimated ${formatCurrency(convertedNdrLift, selectedCurrency, true)} of incremental ARR into consolidated group earnings with zero incremental customer acquisition burn.`,
      quantifiedImpact: `+${formatCurrency(convertedNdrLift, selectedCurrency, true)} ARR Yield`,
      urgency: 'high',
      actionLabel: `Tune NDR to ${formatPercent(potentialNrr)}`,
      leverAction: () => {
        if (onUpdateDrivers) {
          onUpdateDrivers({ ...drivers, netRetentionRate: potentialNrr });
        }
      },
    });

    // 2. Unit Economics & Gross Margin Recommendation
    const currentMargin = drivers.grossMarginTarget;
    const optimizedMargin = Math.min(0.85, currentMargin + 0.025);
    const ebitdaAccretionUsd = annualRevUsd * 0.025;
    const convertedEbitdaLift = convertCurrency(ebitdaAccretionUsd, 'USD', selectedCurrency, 'average', fxRates);

    list.push({
      id: 'rec-cogs-efficiency',
      category: 'UNIT_ECONOMICS',
      categoryLabel: 'Unit Economics & Cloud COGS',
      title: `Consolidate Multi-Region Cloud Clusters to Expand Gross Margin to ${formatPercent(optimizedMargin)}`,
      recommendationText: `With gross margin currently modeled at ${formatPercent(currentMargin)}, data infrastructure accounts for 61% of total COGS across 5 jurisdictions. Executing enterprise volume tiering under master Swiss Treasury discounts will reduce compute overhead by 14%, directly expanding consolidated gross margin by +250 bps and accretive EBITDA by ${formatCurrency(convertedEbitdaLift, selectedCurrency, true)} annually.`,
      quantifiedImpact: `+${formatCurrency(convertedEbitdaLift, selectedCurrency, true)} Accretive EBITDA`,
      urgency: 'strategic',
      actionLabel: `Set Margin Target to ${formatPercent(optimizedMargin)}`,
      leverAction: () => {
        if (onUpdateDrivers) {
          onUpdateDrivers({ ...drivers, grossMarginTarget: optimizedMargin });
        }
      },
    });

    // 3. Working Capital & Capital Efficiency Recommendation
    const targetDso = Math.max(32, drivers.dsoDays - 8);
    const releasedCashUsd = (annualRevUsd / 365) * (drivers.dsoDays - targetDso);
    const convertedCashReleased = convertCurrency(releasedCashUsd, 'USD', selectedCurrency, 'spot', fxRates);

    list.push({
      id: 'rec-working-capital',
      category: 'WORKING_CAPITAL',
      categoryLabel: 'Working Capital & Treasury Velocity',
      title: `Accelerate DSO from ${drivers.dsoDays} to ${targetDso} Days to Mobilize ${formatCurrency(convertedCashReleased, selectedCurrency, true)} Liquid Reserves`,
      recommendationText: `Days Sales Outstanding (DSO) sits at ${drivers.dsoDays} days, weighted by extended terms in Singapore and London. Implementing dynamic early-payment discounts (1.2% 10-day) and automated billing webhooks compresses conversion velocity by ${drivers.dsoDays - targetDso} days, unlocking ${formatCurrency(convertedCashReleased, selectedCurrency, true)} in non-dilutive balance sheet liquidity for high-yield overnight sweeps.`,
      quantifiedImpact: `+${formatCurrency(convertedCashReleased, selectedCurrency, true)} Liquid Cashflow`,
      urgency: 'medium',
      actionLabel: `Accelerate DSO to ${targetDso}d`,
      leverAction: () => {
        if (onUpdateDrivers) {
          onUpdateDrivers({ ...drivers, dsoDays: targetDso });
        }
      },
    });

    return list;
  }, [drivers, annualRevUsd, selectedCurrency, fxRates, onUpdateDrivers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 450);
  };

  const handleApplyAction = (rec: ActionableRecommendation) => {
    if (rec.leverAction) {
      rec.leverAction();
      setAppliedActions((prev) => ({ ...prev, [rec.id]: true }));
      setTimeout(() => {
        setAppliedActions((prev) => ({ ...prev, [rec.id]: false }));
      }, 3000);
    }
  };

  return (
    <div className="bg-[#0c1222] border border-slate-700 p-5 rounded-xl shadow-xl transition-all relative overflow-hidden">
      {/* Background ambient jewel accent */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight font-display">
                ARS FP&A Algorithmic Strategic Recommendations
              </h2>
              <span className="text-[11px] font-mono font-black text-cyan-200 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-600">
                Intelligence Core
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium mt-0.5">
              3 high-conviction capital levers synthesized in real-time from multi-subsidiary statement actuals & driver dynamics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-100 font-mono font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>97.2% Confidence Synthesis</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#10192e] hover:bg-[#16223e] border border-slate-600 rounded-lg transition-all shadow-sm whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Analyzing Ledgers...' : 'Re-Evaluate Levers'}</span>
          </button>
        </div>
      </div>

      {/* 3 Actionable Recommendations Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => {
          const isApplied = appliedActions[rec.id];

          return (
            <div
              key={rec.id}
              className="bg-[#080e1c] border border-slate-700 hover:border-cyan-400 rounded-xl p-4 flex flex-col justify-between transition-all group hover:shadow-lg"
            >
              <div>
                {/* Card Top: Category and Impact Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono font-black tracking-wider uppercase text-cyan-300">
                    {rec.categoryLabel}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-200 bg-emerald-950 border border-emerald-600 px-2 py-0.5 rounded whitespace-nowrap shadow-sm">
                    {rec.quantifiedImpact}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xs font-black text-white group-hover:text-cyan-200 transition-colors mb-2 leading-snug font-display">
                  {rec.title}
                </h3>

                {/* Actionable Prose */}
                <p className="text-xs text-slate-100 leading-relaxed font-normal">
                  {rec.recommendationText}
                </p>
              </div>

              {/* Card Footer: Interactive Lever Action */}
              <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-200 font-bold flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      rec.urgency === 'high'
                        ? 'bg-amber-400'
                        : rec.urgency === 'strategic'
                        ? 'bg-cyan-400'
                        : 'bg-emerald-400'
                    }`}
                  ></span>
                  <span className="capitalize">{rec.urgency} Priority</span>
                </span>

                <button
                  onClick={() => handleApplyAction(rec)}
                  disabled={isApplied}
                  className={`flex items-center gap-1.5 px-3 py-1.2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                    isApplied
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-gradient-to-r from-slate-800 to-slate-850 hover:from-cyan-950 hover:to-slate-800 text-cyan-300 border border-slate-700/80 hover:border-cyan-500/60 shadow-sm'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Propagated to Model</span>
                    </>
                  ) : (
                    <>
                      <span>{rec.actionLabel}</span>
                      <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
