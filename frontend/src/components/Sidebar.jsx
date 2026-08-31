import React from 'react';
import { LayoutDashboard, Bot, ShieldCheck, Activity, Radio, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ activeTab = 'Dashboard', setActiveTab, isConnected }) {
  const navItems = [
    { name: 'Dashboard', targetId: 'dashboard-overview', icon: LayoutDashboard, badge: null },
    { name: 'Agents', targetId: 'dashboard-agents', icon: Bot, badge: '3 active' },
    { name: 'Policies', targetId: 'dashboard-policies', icon: ShieldCheck, badge: 'Enforced' },
    { name: 'Activity Log', targetId: 'dashboard-activity', icon: Radio, badge: 'Live' },
  ];

  const handleNavClick = (targetId, tabName) => {
    setActiveTab(tabName);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-spark-borderLight flex flex-col justify-between h-screen sticky top-0 z-40 select-none font-['Inter']">
      <div>
        {/* Brand Header - Clicking scrolls to top */}
        <div 
          onClick={() => handleNavClick('dashboard-overview', 'Dashboard')}
          className="p-6 border-b border-spark-borderLight flex items-center space-x-3 cursor-pointer hover:bg-spark-bg/50 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-spark-forestDark flex items-center justify-center shadow-xs flex-shrink-0 relative overflow-hidden">
            <Activity className="w-5 h-5 text-spark-lime" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm tracking-tight text-spark-textMain font-['Space_Grotesk'] truncate">
              Agentic Commerce
            </h1>
            <p className="text-[11px] font-medium text-spark-textMuted truncate">
              Autonomous Policy Gateway
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-spark-textMuted/70 font-mono">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.targetId, item.name)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left relative group ${
                  isActive
                    ? 'bg-spark-bg text-spark-textMain shadow-xs border border-spark-borderLight font-bold'
                    : 'text-spark-textMuted hover:text-spark-textMain hover:bg-spark-bg/60 border border-transparent'
                }`}
              >
                {/* Active left indicator pill with spring motion */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-2 bottom-2 w-1 bg-spark-lime rounded-r-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Icon formatted with loading screen mark style */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                    isActive
                      ? 'bg-spark-forestDark text-spark-lime shadow-xs'
                      : 'bg-spark-bg text-spark-textMuted group-hover:text-spark-textMain'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <span className="truncate">{item.name}</span>

                {item.badge && (
                  <span
                    className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                      item.name === 'Activity Log'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-spark-bg text-spark-textMuted border border-spark-borderLight'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / System Health Pill */}
      <div className="p-4 border-t border-spark-borderLight">
        <div className="p-3 rounded-xl bg-spark-bg border border-spark-borderLight flex items-center space-x-3 shadow-xs">
          <div className="relative flex h-2.5 w-2.5 flex-shrink-0">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-spark-textMain truncate">
              {isConnected ? 'Policy Engine Online' : 'Connecting Core Engine...'}
            </p>
            <p className="text-[10px] text-spark-textMuted font-mono flex items-center gap-1">
              <Cpu className="w-3 h-3 text-spark-forestMed inline" /> C++20 Zero-Loss
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
