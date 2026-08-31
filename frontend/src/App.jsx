import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import AgentCatalog from './components/AgentCatalog';
import TransactionFeed from './components/TransactionFeed';
import TriggerForm from './components/TriggerForm';
import LoadingScreen from './components/LoadingScreen';
import LandingHero from './components/LandingHero';
import { getAuditLogs, getHealthStatus, submitTransaction } from './services/api';
import { ShieldCheck, Cpu } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState('loading'); // 'loading' | 'landing' | 'dashboard'
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDecision, setLastDecision] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [highlightedTxnId, setHighlightedTxnId] = useState(null);

  // Fetch live logs and backend status
  const fetchLogs = useCallback(async () => {
    setIsPolling(true);
    try {
      const [health, auditLogs] = await Promise.all([
        getHealthStatus(),
        getAuditLogs(),
      ]);
      setIsConnected(!!health);
      if (auditLogs && auditLogs.length >= 0) {
        setLogs([...auditLogs].reverse());
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error polling ACG backend:', err);
      setIsConnected(false);
    } finally {
      setIsPolling(false);
    }
  }, []);

  // Initial load and polling every 2.5 seconds (only when in dashboard state)
  useEffect(() => {
    if (appState !== 'dashboard') return;
    
    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, [fetchLogs, appState]);

  // Scrollspy to automatically synchronize sidebar active state with scroll position
  useEffect(() => {
    if (appState !== 'dashboard') return;

    const sections = [
      { id: 'dashboard-overview', name: 'Dashboard' },
      { id: 'dashboard-agents', name: 'Agents' },
      { id: 'dashboard-policies', name: 'Policies' },
      { id: 'dashboard-activity', name: 'Activity Log' },
    ];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveTab(sections[i].name);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [appState]);

  // Handle manual form submission with live link highlight flash
  const handleTransactionSubmit = async (payload) => {
    setIsSubmitting(true);
    try {
      const response = await submitTransaction(payload);
      setLastDecision(response.data);
      // Mark transaction for real-time visual highlight flash in feed
      setHighlightedTxnId(payload.transaction_id);
      await fetchLogs();

      // Clear highlight after animation completes
      setTimeout(() => {
        setHighlightedTxnId(null);
      }, 3500);
    } catch (err) {
      setLastDecision({
        status: 'Connection Error',
        approved: false,
        reason: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (appState === 'loading') {
    return <LoadingScreen onComplete={() => setAppState('landing')} />;
  }

  if (appState === 'landing') {
    return <LandingHero onLaunch={() => setAppState('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-spark-bg bg-grid-pattern text-spark-textMain flex font-['Inter'] selection:bg-spark-lime selection:text-spark-forestDark antialiased">
      {/* 1. Left Sidebar Navigation with Scrollspy & Smooth Scroll */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar with Global Search & Jump, Notifications Modal, Profile Panel */}
        <Navbar
          isConnected={isConnected}
          isPolling={isPolling}
          onManualRefresh={fetchLogs}
          lastUpdated={lastUpdated}
          logs={logs}
          onSelectTransaction={(txnId) => {
            setHighlightedTxnId(txnId);
            setTimeout(() => {
              setHighlightedTxnId(null);
            }, 3500);
          }}
        />

        {/* Scrollable Dashboard Viewport with Sections */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-8 space-y-10">
          {/* Section: Overview / Stats */}
          <section id="dashboard-overview" className="scroll-mt-24">
            <StatsOverview logs={logs} />
          </section>

          {/* Section: Agents and Policy Guardrails */}
          <AgentCatalog />

          {/* Section: Simulation Workspace + Live Activity Stream */}
          <section id="dashboard-activity" className="scroll-mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Simulation Trigger Card (5 cols) */}
              <div className="lg:col-span-5">
                <TriggerForm
                  onSubmit={handleTransactionSubmit}
                  isSubmitting={isSubmitting}
                  lastDecision={lastDecision}
                />
              </div>

              {/* Right: Live Activity Stream Card with Technical Details Drawer (7 cols) */}
              <div className="lg:col-span-7">
                <TransactionFeed
                  logs={logs}
                  highlightedTxnId={highlightedTxnId}
                />
              </div>
            </div>
          </section>
        </main>

        {/* Light Theme Footer */}
        <footer className="border-t border-spark-borderLight bg-white py-4 px-8 text-xs text-spark-textMuted flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-spark-forestMed" />
            <span className="font-semibold text-spark-textMain">Agentic Commerce Gateway</span>
            <span>&bull;</span>
            <span>Autonomous Budget Protection & Policy Engine</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-spark-textMuted">
            <Cpu className="w-3.5 h-3.5 text-spark-forestDark" />
            <span>C++20 Zero-Loss Memory Core</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
