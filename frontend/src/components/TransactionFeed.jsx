import React, { useState } from 'react';
import TransactionItem from './TransactionItem';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Inbox, Radio, X } from 'lucide-react';

export default function TransactionFeed({ logs = [], highlightedTxnId = null }) {
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filterOptions = [
    { id: 'ALL', label: 'All Activity' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'LIMIT', label: 'Over Budget' },
    { id: 'TIMEOUT', label: 'Recovered' },
  ];

  // Helper to map log properties and human status words for comprehensive searching
  const getLogSearchString = (log) => {
    const status = (log.decision_status || '').toLowerCase();
    const isApproved = status === 'approved';
    const isTimeout = status.includes('timeout');
    const isLimit = status.includes('limit');

    let humanTerms = '';
    if (isApproved) {
      humanTerms = 'approved settled safe success settled safe completed';
    } else if (isTimeout) {
      humanTerms = 'recovered timeout network drop error 504 auto-recovery restored';
    } else if (isLimit) {
      humanTerms = 'blocked over budget limit exceeded rejected prevented';
    }

    return `${log.transaction_id || ''} ${log.buyer_agent_id || ''} ${log.seller_agent_id || ''} ${log.decision_status || ''} ${humanTerms} AI Procurement Agent AI Cloud Vendor GPU Compute Hours`.toLowerCase();
  };

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || getLogSearchString(log).includes(q);

    if (!matchesSearch) return false;

    if (filter === 'APPROVED') return log.decision_status === 'Approved';
    if (filter === 'TIMEOUT') return log.decision_status?.includes('Timeout');
    if (filter === 'LIMIT') return log.decision_status?.includes('Limit');

    return true;
  });

  return (
    <div id="dashboard-activity" className="p-7 rounded-2xl bg-white border border-spark-borderLight shadow-sm flex flex-col h-full font-['Inter'] scroll-mt-24">
      {/* Header & Filter Controls with clean wrapping and breathing room */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-spark-borderLight">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-spark-forestDark flex items-center justify-center text-spark-lime shadow-xs">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-spark-textMain tracking-tight font-['Space_Grotesk']">
              Live Activity Feed
            </h2>
            <p className="text-xs text-spark-textMuted mt-0.5">Real-time C++ policy audit stream</p>
          </div>
          <span className="text-xs bg-spark-bg text-spark-textMain px-2.5 py-0.5 rounded-full font-bold border border-spark-borderLight font-mono">
            {filteredLogs.length}
          </span>
        </div>

        {/* Filter Pills with generous wrapping gap & smooth sliding active pill */}
        <div className="flex items-center gap-2 flex-wrap pt-1 md:pt-0">
          {filterOptions.map(type => {
            const isActive = filter === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setFilter(type.id)}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 z-10 ${
                  isActive ? 'text-white' : 'text-spark-textMuted hover:text-spark-textMain hover:bg-spark-bg'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFeedFilter"
                    className="absolute inset-0 bg-spark-forestDark rounded-xl shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Live Feed Search Filter Bar with status keywords (blocked, recovered, settled, approved) */}
      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-spark-textMuted absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter by status ('blocked', 'recovered', 'settled', 'approved') or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-spark-bg border border-spark-borderLight rounded-xl pl-10 pr-10 py-2.5 text-xs text-spark-textMain placeholder-spark-textMuted focus:outline-none focus:border-spark-forestDark focus:ring-1 focus:ring-spark-forestDark transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-spark-textMuted hover:text-spark-textMain p-1 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Animated Stream List with clean single-direction slide-down + fade-in & height collapse */}
      <div className="mt-5 space-y-3.5 overflow-y-auto max-h-[620px] pr-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, index) => {
              const isNewlyCreated = highlightedTxnId === log.transaction_id || (index === 0 && highlightedTxnId === 'latest');
              return (
                <motion.div
                  key={log.transaction_id ? `${log.transaction_id}-${index}` : `log-${index}`}
                  layout="position"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ 
                    opacity: 0, 
                    height: 0, 
                    marginBottom: 0,
                    overflow: 'hidden',
                    transition: { duration: 0.28, ease: 'easeInOut' } 
                  }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TransactionItem
                    log={log}
                    isHighlighted={isNewlyCreated}
                  />
                </motion.div>
              );
            })
          ) : (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.25 }}
              className="p-16 text-center flex flex-col items-center justify-center text-spark-textMuted space-y-2.5"
            >
              <Inbox className="w-10 h-10 text-spark-borderLight" />
              <p className="text-sm font-semibold text-spark-textMain font-['Space_Grotesk']">
                No activity matches "{searchQuery}"
              </p>
              <p className="text-xs text-spark-textMuted">
                Try searching for "approved", "settled", "blocked", or "recovered".
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 px-3 py-1 bg-spark-bg text-spark-textMain rounded-lg border border-spark-borderLight text-xs font-semibold hover:bg-white"
                >
                  Clear Search Filter
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
