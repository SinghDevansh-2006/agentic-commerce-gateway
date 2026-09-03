import React, { useState, useEffect, useRef } from 'react';
import { 
  RefreshCw, Search, Bell, ChevronDown, Shield, User, 
  Check, Copy, Bot, ShieldCheck, ShoppingBag, Radio, X, CheckCheck, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ 
  isConnected, 
  isPolling, 
  onManualRefresh, 
  lastUpdated, 
  logs = [],
  onSelectTransaction,
}) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [copiedNodeId, setCopiedNodeId] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(() => new Set());
  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => new Set());

  // Helper to compute relative time strings
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      if (isNaN(diffMs) || diffMs < 60000) return 'Just now';
      const mins = Math.floor(diffMs / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch {
      return 'Just now';
    }
  };

  // Map transaction log record to structured notification
  const getNotificationFromLog = (log, isRead = false) => {
    const status = log.decision_status || 'Unknown';
    const amountFormatted = `₹${(Number(log.requested_amount || 0) / 10000).toFixed(2)}`;
    const txnId = log.transaction_id || 'Txn';

    let type = 'info';
    let badge = 'Policy';
    let title = `Transaction ${txnId}`;
    let description = `Transaction evaluated under ACG policy engine.`;

    if (status === 'Approved') {
      type = 'success';
      badge = 'Settled';
      title = 'Purchase Approved & Settled';
      description = `${amountFormatted} settled safely for ${log.buyer_agent_id || 'buyer'}.`;
    } else if (status.includes('Timeout') || status.includes('Gateway') || status.includes('504')) {
      type = 'recovery';
      badge = 'Auto-Recovery';
      title = 'Network Timeout Recovered';
      description = `Upstream gateway timeout caught on ${txnId}. Inventory rolled back with zero loss.`;
    } else if (status.includes('Limit') || status.includes('Exceeds')) {
      type = 'warning';
      badge = 'Policy Blocked';
      title = 'Purchase Blocked: Over Budget';
      description = `${amountFormatted} request exceeded authorized spending limit for ${log.buyer_agent_id || 'buyer'}.`;
    } else if (status.includes('Inventory') || status.includes('Stock')) {
      type = 'warning';
      badge = 'Stock Depleted';
      title = 'Purchase Blocked: Insufficient Stock';
      description = log.rejection_reason || 'Requested quantity exceeds available inventory stock.';
    } else if (status.includes('Currency')) {
      type = 'warning';
      badge = 'Currency Mismatch';
      title = 'Rejected: Currency Mismatch';
      description = log.rejection_reason || 'Transaction currency does not match buyer account currency.';
    } else if (status.includes('Self')) {
      type = 'warning';
      badge = 'Self-Transaction';
      title = 'Rejected: Self-Transaction';
      description = 'Self-transactions between identical agent IDs are prohibited.';
    } else if (status.includes('Inactive')) {
      type = 'warning';
      badge = 'Inactive Agent';
      title = 'Rejected: Agent Inactive';
      description = 'Participant agent account is inactive or disabled.';
    } else {
      type = 'warning';
      badge = 'Policy Rejected';
      title = `Policy Blocked (${txnId})`;
      description = log.rejection_reason || `Transaction failed policy evaluation.`;
    }

    return {
      id: `notif-${txnId}`,
      transactionId: txnId,
      title,
      description,
      time: getRelativeTime(log.timestamp),
      type,
      badge,
      read: isRead,
    };
  };

  // Synchronize notifications dynamically from real transaction logs
  useEffect(() => {
    if (!logs || logs.length === 0) {
      setNotifications([]);
      return;
    }

    // Process most recent transactions
    const recentLogs = logs.slice(0, 8);

    setNotifications(prev => {
      const prevReadMap = new Map();
      prev.forEach(n => {
        prevReadMap.set(n.id, n.read);
      });

      const updated = [];
      for (const log of recentLogs) {
        const notifId = `notif-${log.transaction_id}`;
        // Skip explicitly dismissed notifications
        if (dismissedNotifIds.has(notifId) || dismissedNotifIds.has(log.transaction_id)) {
          continue;
        }

        const isRead = readNotifIds.has(notifId) || (prevReadMap.has(notifId) ? prevReadMap.get(notifId) : false);
        updated.push(getNotificationFromLog(log, isRead));
      }

      return updated;
    });
  }, [logs, readNotifIds, dismissedNotifIds]);

  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Unread badge count calculation
  const unreadCount = notifications.filter(n => !n.read).length;

  // Search catalog index
  const searchableEntities = [
    {
      category: 'Agent',
      title: 'AI Procurement Agent',
      subtitle: 'Buyer entity with ₹10.00 spending cap',
      targetId: 'dashboard-agents',
      icon: Bot,
    },
    {
      category: 'Agent',
      title: 'AI Cloud Vendor',
      subtitle: 'Merchant entity with ₹500.00 limit',
      targetId: 'dashboard-agents',
      icon: Bot,
    },
    {
      category: 'Agent',
      title: 'GPU Compute Hours',
      subtitle: 'Catalog item priced at ₹2.50/unit',
      targetId: 'dashboard-agents',
      icon: ShoppingBag,
    },
    {
      category: 'Policy',
      title: 'Hard Spending Limit (₹10.00)',
      subtitle: 'Rejects transactions exceeding agent budget',
      targetId: 'dashboard-policies',
      icon: ShieldCheck,
    },
    {
      category: 'Policy',
      title: 'Micro-INR Integer Precision',
      subtitle: '10,000 subunits per ₹1 to prevent float drift',
      targetId: 'dashboard-policies',
      icon: ShieldCheck,
    },
    {
      category: 'Policy',
      title: 'Zero-Loss Timeout Rollback',
      subtitle: 'Automatic inventory recovery on 504 drops',
      targetId: 'dashboard-policies',
      icon: ShieldCheck,
    },
    {
      category: 'Simulation',
      title: 'Simulate AI Purchase',
      subtitle: 'Execute live transactions against C++ policy engine',
      targetId: 'dashboard-activity',
      icon: Radio,
    },
  ];

  // Dynamic search results including live logs
  const dynamicResults = [
    ...searchableEntities,
    ...(logs.slice(0, 5).map(l => ({
      category: 'Transaction',
      title: `Txn: ${l.transaction_id || 'ID'}`,
      subtitle: `Status: ${l.decision_status} • ₹${(Number(l.requested_amount || 0)/10000).toFixed(2)}`,
      targetId: `txn-${l.transaction_id}`,
      icon: Radio,
    })))
  ].filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close modals on Outside Click or Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileDropdown(false);
        setShowSearchResults(false);
      }
      // Press '/' to focus search input
      if (event.key === '/' && document.activeElement !== searchInputRef.current) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setShowSearchResults(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchResultClick = (targetId) => {
    setShowSearchResults(false);
    setSearchQuery('');
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-spark-lime', 'rounded-2xl', 'transition-all');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-spark-lime');
      }, 1500);
    } else {
      document.getElementById('dashboard-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCopyNodeId = () => {
    navigator.clipboard.writeText('acg-core-node-01');
    setCopiedNodeId(true);
    setTimeout(() => setCopiedNodeId(false), 2000);
  };

  // Notification click: (a) scroll to transaction, (b) flash row, (c) mark read
  const handleNotificationClick = (notif) => {
    // Mark as read immediately
    setReadNotifIds(prev => new Set([...prev, notif.id, notif.transactionId]));
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));

    if (notif.transactionId) {
      if (onSelectTransaction) {
        onSelectTransaction(notif.transactionId);
      }
      const row = document.getElementById(`txn-${notif.transactionId}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        document.getElementById('dashboard-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const section = document.getElementById('dashboard-activity');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Explicit clear/dismiss separate from viewing
  const handleDismissNotification = (id, transactionId) => {
    setDismissedNotifIds(prev => {
      const next = new Set(prev);
      next.add(id);
      if (transactionId) next.add(transactionId);
      return next;
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = () => {
    setReadNotifIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => {
        next.add(n.id);
        if (n.transactionId) next.add(n.transactionId);
      });
      return next;
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="border-b border-spark-borderLight bg-white/90 backdrop-blur-md sticky top-0 z-30 px-8 h-16 flex items-center justify-between font-['Inter'] shadow-xs">
      {/* Left: Global Search Input with Live Dropdown & Jump-to */}
      <div className="flex items-center space-x-4 flex-1 max-w-md relative" ref={searchRef}>
        <div className="relative w-full">
          <Search className="w-4 h-4 text-spark-textMuted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search agents, policies, transactions (Press '/' to focus)..."
            value={searchQuery}
            onFocus={() => setShowSearchResults(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            className="w-full bg-spark-bg/70 hover:bg-spark-bg focus:bg-white border border-spark-borderLight focus:border-spark-forestDark rounded-xl pl-10 pr-10 py-2 text-xs text-spark-textMain placeholder-spark-textMuted focus:outline-none focus:ring-1 focus:ring-spark-forestDark transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-spark-textMuted hover:text-spark-textMain p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showSearchResults && searchQuery.trim().length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-spark-borderLight shadow-xl p-2 z-50 max-h-80 overflow-y-auto"
            >
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-spark-textMuted font-mono flex justify-between">
                <span>Matching Entities & Records</span>
                <span>{dynamicResults.length} found</span>
              </div>

              {dynamicResults.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {dynamicResults.map((res, i) => {
                    const Icon = res.icon;
                    return (
                      <button
                        key={`${res.title}-${i}`}
                        onClick={() => handleSearchResultClick(res.targetId)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-spark-bg text-left transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-spark-bg group-hover:bg-spark-forestDark group-hover:text-spark-lime flex items-center justify-center text-spark-forestMed transition-colors flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-spark-textMain font-['Space_Grotesk'] truncate">
                              {res.title}
                            </p>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-spark-bg text-spark-textMuted border border-spark-borderLight">
                              {res.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-spark-textMuted truncate">
                            {res.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-spark-textMuted">
                  No matching agents, policies, or transactions found.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Actions, Sync, Notifications, Profile */}
      <div className="flex items-center space-x-3.5">
        {/* Live Sync Status & Manual Refresh */}
        <div className="flex items-center space-x-2.5 bg-spark-bg/80 border border-spark-borderLight px-3 py-1.5 rounded-xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-spark-textMuted hidden sm:inline font-mono">
            Sync: 2.5s
          </span>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onManualRefresh}
            title="Force sync live logs"
            className="flex items-center space-x-1 p-1 hover:bg-white rounded-lg text-spark-textMain transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-spark-forestDark' : 'text-spark-textMuted'}`} />
          </motion.button>
        </div>

        {/* 2. Interactive Notification Bell with Live Unread Badge */}
        <div className="relative" ref={notificationRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileDropdown(false);
            }}
            className="p-2 rounded-xl bg-spark-bg border border-spark-borderLight hover:bg-white text-spark-textMain transition-colors relative"
            title="View system alerts and notifications"
          >
            <Bell className="w-4 h-4 text-spark-textMuted" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-spark-lime text-spark-forestDark font-bold text-[10px] flex items-center justify-center ring-2 ring-white font-mono shadow-xs">
                {unreadCount}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-spark-borderLight shadow-xl p-4 z-50 text-xs"
              >
                {/* Notification Header */}
                <div className="flex items-center justify-between pb-3 border-b border-spark-borderLight">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-spark-textMain font-['Space_Grotesk']">System Alerts</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono transition-colors ${
                      unreadCount > 0
                        ? 'text-spark-forestDark bg-spark-lime'
                        : 'text-spark-textMuted bg-spark-bg'
                    }`}>
                      {unreadCount} Unread
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        title="Mark all as read"
                        className="p-1 rounded-md text-[10px] text-spark-forestMed hover:bg-spark-bg font-semibold flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Mark read</span>
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg hover:bg-spark-bg text-spark-textMuted hover:text-spark-textMain"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Staggered animated notifications list */}
                <div className="py-2.5 space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {notifications.length > 0 ? (
                    notifications.map((notif, index) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${
                          notif.read
                            ? 'bg-spark-bg/40 border-spark-borderLight/60 opacity-65 hover:opacity-100 hover:bg-spark-bg'
                            : 'bg-spark-bg/90 border-spark-borderLight hover:bg-spark-bg shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-spark-lime flex-shrink-0" />
                            )}
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              notif.type === 'warning' ? 'bg-amber-100 text-amber-900' :
                              notif.type === 'recovery' ? 'bg-rose-100 text-rose-900' :
                              notif.type === 'success' ? 'bg-emerald-100 text-emerald-900' :
                              'bg-spark-forestDark text-spark-lime'
                            }`}>
                              {notif.badge}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] text-spark-textMuted font-mono">{notif.time}</span>
                            {/* Explicit dismiss control */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissNotification(notif.id, notif.transactionId);
                              }}
                              title="Dismiss notification"
                              className="p-1 rounded-md text-spark-textMuted hover:text-spark-textMain hover:bg-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <p className="font-bold text-spark-textMain text-xs mt-1.5 font-['Space_Grotesk']">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-spark-textMuted mt-0.5 leading-relaxed">
                          {notif.description}
                        </p>
                        <p className="text-[10px] text-spark-forestMed font-semibold mt-1.5 flex items-center gap-1">
                          <span>Click to locate transaction</span> &rarr;
                        </p>
                      </motion.div>
                    ))
                  ) : logs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-spark-textMuted px-4">
                      <Bell className="w-8 h-8 mx-auto text-spark-textMuted/40 mb-2.5" />
                      <p className="font-bold text-spark-textMain font-['Space_Grotesk']">No notifications yet</p>
                      <p className="text-[11px] mt-1 text-spark-textMuted leading-relaxed">
                        Run a test scenario to see live policy evaluation alerts here.
                      </p>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-spark-textMuted px-4">
                      <CheckCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2.5 opacity-80" />
                      <p className="font-bold text-spark-textMain font-['Space_Grotesk']">All caught up!</p>
                      <p className="text-[11px] mt-1 text-spark-textMuted">No active unread alerts or notifications.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown: Read-only Session Details */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifications(false);
            }}
            className="flex items-center space-x-2.5 p-1.5 pr-3 rounded-xl bg-spark-bg hover:bg-white border border-spark-borderLight transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-spark-forestDark flex items-center justify-center text-spark-lime font-bold text-xs font-['Space_Grotesk']">
              AC
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-spark-textMain leading-none font-['Space_Grotesk']">Security Admin</p>
              <p className="text-[10px] text-spark-textMuted mt-0.5 leading-none font-mono">gateway-ops</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-spark-textMuted ml-1 transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showProfileDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-spark-borderLight shadow-xl p-4 z-50 text-xs"
              >
                {/* Header */}
                <div className="pb-3 border-b border-spark-borderLight flex items-start justify-between">
                  <div>
                    <span className="font-bold text-spark-textMain text-sm font-['Space_Grotesk']">Security Admin</span>
                    <p className="text-[10px] text-spark-textMuted font-mono">admin@gateway.internal</p>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Live Session
                  </span>
                </div>

                {/* Read-Only Node Info Panel */}
                <div className="py-3 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-spark-bg border border-spark-borderLight flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-spark-textMuted uppercase font-semibold block">Gateway Node</span>
                      <span className="font-mono text-xs font-bold text-spark-textMain">acg-core-node-01</span>
                    </div>
                    <button
                      onClick={handleCopyNodeId}
                      title="Copy Node ID"
                      className="p-1.5 rounded-lg bg-white border border-spark-borderLight hover:bg-spark-bg text-spark-textMain transition-colors"
                    >
                      {copiedNodeId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-spark-textMuted" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-spark-bg border border-spark-borderLight">
                      <span className="text-[10px] text-spark-textMuted uppercase block">Uptime</span>
                      <span className="font-bold text-spark-textMain font-mono">99.99% Core</span>
                    </div>
                    <div className="p-2 rounded-xl bg-spark-bg border border-spark-borderLight">
                      <span className="text-[10px] text-spark-textMuted uppercase block">Policy Latency</span>
                      <span className="font-bold text-emerald-700 font-mono">&lt; 2ms In-Memory</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-spark-bg border border-spark-borderLight">
                    <span className="text-[10px] text-spark-textMuted uppercase block">Core Engine</span>
                    <span className="font-mono text-xs text-spark-forestMed font-semibold">
                      C++20 Zero-Loss Policy Engine
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-spark-borderLight text-center text-[10px] text-spark-textMuted">
                  Read-only Gateway Operations Console
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
