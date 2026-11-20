import React, { useState } from 'react';
import { Entity, CurrencyCode } from '../../types/fpa';
import { X, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  onPostJournal: (entry: {
    entityId: string;
    debitAccount: string;
    creditAccount: string;
    amount: number;
    currency: CurrencyCode;
    description: string;
    rule: string;
  }) => void;
}

export const ManualJournalModal: React.FC<ManualJournalModalProps> = ({
  isOpen,
  onClose,
  entities,
  onPostJournal,
}) => {
  const [entityId, setEntityId] = useState(entities[0]?.id || 'ent_parent');
  const [debitAccount, setDebitAccount] = useState('6100 Research & Product Engineering (R&D)');
  const [creditAccount, setCreditAccount] = useState('2010 Accounts Payable');
  const [amount, setAmount] = useState<number>(150000);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [description, setDescription] = useState('Q3 Cloud Compute Optimization Accrual Adjustment');
  const [rule, setRule] = useState('SOX_404');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onPostJournal({
        entityId,
        debitAccount,
        creditAccount,
        amount,
        currency,
        description,
        rule,
      });
      setIsSubmitting(false);
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h2 className="text-sm font-bold text-white">Post Adjusting General Ledger Journal</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label htmlFor="journal-entity-select" className="text-slate-300 font-semibold block mb-1">Target Legal Entity</label>
            <select
              id="journal-entity-select"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.code} - {ent.name} ({ent.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="journal-debit-select" className="text-slate-300 font-semibold block mb-1">Debit GL Account</label>
              <select
                id="journal-debit-select"
                value={debitAccount}
                onChange={(e) => setDebitAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
              >
                <option value="6100 Research & Product Engineering (R&D)">6100 R&D Expense</option>
                <option value="6200 Sales & Go-to-Market Expansion">6200 S&M Expense</option>
                <option value="5100 Cloud Infrastructure & Compute">5100 Cloud COGS</option>
                <option value="1010 Cash & Short-Term Liquid">1010 Cash Assets</option>
              </select>
            </div>

            <div>
              <label htmlFor="journal-credit-select" className="text-slate-300 font-semibold block mb-1">Credit GL Account</label>
              <select
                id="journal-credit-select"
                value={creditAccount}
                onChange={(e) => setCreditAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-[11px]"
              >
                <option value="2010 Accounts Payable">2010 Accounts Payable</option>
                <option value="2030 Deferred SaaS Revenue">2030 Deferred Revenue</option>
                <option value="1090 Intercompany Receivables">1090 IC Receivables</option>
                <option value="3000 Retained Earnings">3000 Retained Earnings</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="journal-amount-input" className="text-slate-300 font-semibold block mb-1">Adjustment Amount</label>
              <input
                id="journal-amount-input"
                type="number"
                min="1"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono font-semibold focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label htmlFor="journal-currency-select" className="text-slate-300 font-semibold block mb-1">Currency</label>
              <select
                id="journal-currency-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="CHF">CHF (CHF)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="journal-description-input" className="text-slate-300 font-semibold block mb-1">Business Purpose & Justification</label>
            <textarea
              id="journal-description-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-[11px] text-slate-400">
            <span>Governance Rule: <strong>SOX Section 404</strong></span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sign-off: Elena Rostova</span>
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-slate-400 hover:text-slate-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? 'Posting to Ledger...' : 'Post Adjusting Journal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
