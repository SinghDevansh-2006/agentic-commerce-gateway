import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Code2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransactionItem({ log, isHighlighted = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isApproved = log.decision_status === 'Approved';
  const isTimeout = log.decision_status?.includes('Timeout');
  const isLimitExceeded = log.decision_status?.includes('Limit');

  // Format currency in clean standard INR (e.g. ₹5.00)
  const formattedInr = '₹' + (Number(log.requested_amount || 0) / 10000).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Status Left-Border Color Coding (4px left border)
  let statusBorderClass = "border-l-slate-400";
  let statusBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
  let humanSummary = "Purchase Processed";
  let humanSubtext = "Transaction verified by C++ policy engine.";
  let highlightFlashBg = ['rgba(244, 246, 245, 0.6)', 'rgba(244, 246, 245, 0.6)'];

  if (isApproved) {
    statusBorderClass = "border-l-emerald-500";
    statusBadgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
    humanSummary = "Purchase Approved & Settled";
    humanSubtext = "Autonomous purchase complied with spending limit.";
    highlightFlashBg = ['rgba(209, 250, 229, 0.95)', 'rgba(244, 246, 245, 0.6)'];
  } else if (isTimeout) {
    statusBorderClass = "border-l-rose-500";
    statusBadgeClass = "bg-rose-50 text-rose-800 border-rose-200";
    humanSummary = "Network Drop Recovered";
    humanSubtext = "Mock gateway timeout caught. Funds restored safely.";
    highlightFlashBg = ['rgba(254, 226, 226, 0.95)', 'rgba(244, 246, 245, 0.6)'];
  } else if (isLimitExceeded) {
    statusBorderClass = "border-l-amber-500";
    statusBadgeClass = "bg-amber-50 text-amber-800 border-amber-200";
    humanSummary = "Purchase Blocked: Over Budget";
    humanSubtext = "Attempted purchase exceeded the agent's spending limit.";
    highlightFlashBg = ['rgba(254, 243, 199, 0.95)', 'rgba(244, 246, 245, 0.6)'];
  }

  // Friendly time format
  const formattedTime = log.timestamp
    ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <motion.div
      id={`txn-${log.transaction_id}`}
      animate={
        isHighlighted
          ? {
              backgroundColor: highlightFlashBg,
              transition: { duration: 1.2, ease: "easeOut" }
            }
          : {}
      }
      className={`p-5 rounded-2xl bg-spark-bg/60 hover:bg-spark-bg border border-spark-borderLight border-l-4 ${statusBorderClass} relative shadow-xs hover:shadow-sm transition-all font-['Inter'] scroll-mt-28 ${
        isHighlighted ? 'ring-2 ring-spark-forestMed/30' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left Side: 3-Tier Typography (Human summary + Plain Flow) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-spark-textMain tracking-tight font-['Space_Grotesk']">
              {humanSummary}
            </h4>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClass}`}>
              {isApproved ? 'Settled' : isTimeout ? 'Recovered' : 'Blocked'}
            </span>
            {isHighlighted && (
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[9px] bg-spark-lime text-spark-forestDark px-1.5 py-0.2 rounded font-bold uppercase tracking-wider"
              >
                Active
              </motion.span>
            )}
          </div>

          <p className="text-xs text-spark-textMuted mt-1">
            {humanSubtext}
          </p>

          {/* Participant Flow without raw IDs */}
          <div className="mt-3 flex items-center space-x-2 text-xs text-spark-textMain">
            <span className="bg-white px-2.5 py-1 rounded-lg border border-spark-borderLight font-semibold text-[11px] shadow-xs">
              AI Procurement Agent
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-spark-textMuted flex-shrink-0" />
            <span className="bg-white px-2.5 py-1 rounded-lg border border-spark-borderLight font-semibold text-[11px] shadow-xs">
              AI Cloud Vendor
            </span>
          </div>
        </div>

        {/* Right Side: Clean Price & Time */}
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-extrabold text-spark-textMain tracking-tight font-['Space_Grotesk']">
            {formattedInr}
          </div>
          <span className="text-[11px] text-spark-textMuted mt-1 block font-mono">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Progressive Disclosure: Collapsible Expander Trigger Row */}
      <div className="mt-4 pt-3 border-t border-spark-borderLight flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1.5 text-xs text-spark-forestMed hover:text-spark-forestDark font-semibold transition-colors group py-0.5"
        >
          <Code2 className="w-3.5 h-3.5 text-spark-forestMed group-hover:rotate-12 transition-transform" />
          <span>{isExpanded ? 'Hide Raw Audit Payload' : 'View Raw Audit Payload'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <span className="text-[11px] text-spark-textMuted font-mono">
          ID: {log.transaction_id || 'txn_unknown'}
        </span>
      </div>

      {/* Technical Details Drawer: Smooth height animation on expand */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-800 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-slate-500 text-[10px] uppercase tracking-wider pb-2 border-b border-slate-200">
                <span className="font-semibold">C++ Policy Audit Ledger Payload</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                  {log.currency || 'INR'} &bull; Status: {log.decision_status}
                </span>
              </div>
              <pre className="overflow-x-auto text-slate-800 leading-relaxed font-mono text-[11px] bg-white p-3 rounded-lg border border-slate-200">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
