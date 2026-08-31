import React from 'react';
import { Bot, Cloud, Box, ShieldCheck, CheckCircle2, Lock, RefreshCw, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AgentCatalog() {
  const participants = [
    {
      category: 'Autonomous Buyer',
      name: 'AI Procurement Agent',
      limit: '₹10.00 spending limit',
      icon: Bot,
      badge: 'Active Buyer',
      nodeId: 'agent_buyer_001',
    },
    {
      category: 'Verified Merchant',
      name: 'AI Cloud Vendor',
      limit: '₹500.00 settlement limit',
      icon: Cloud,
      badge: 'Merchant Node',
      nodeId: 'agent_seller_002',
    },
    {
      category: 'Catalog Service',
      name: 'GPU Compute Hours',
      limit: '₹2.50 per compute unit',
      icon: Box,
      badge: 'Live Inventory',
      nodeId: 'item_gpu_hours',
    },
  ];

  const policies = [
    {
      id: 'POL-01',
      title: 'Hard Spending Limit',
      rule: 'Max ₹10.00 per transaction for buyer agent',
      status: 'Active Enforcer',
      icon: Lock,
      color: 'text-amber-800 bg-amber-50 border-amber-200',
    },
    {
      id: 'POL-02',
      title: 'Micro-INR Integer Precision',
      rule: '10,000 subunits = ₹1.00 (Zero floating-point drift)',
      status: 'Guaranteed',
      icon: Cpu,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'POL-03',
      title: 'Zero-Loss Timeout Rollback',
      rule: 'Automatic inventory restoration on upstream 504 drops',
      status: 'Self-Healing',
      icon: RefreshCw,
      color: 'text-indigo-800 bg-indigo-50 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-8 font-['Inter']">
      {/* 1. Agents Section */}
      <section id="dashboard-agents" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-spark-lime"></span>
            <h2 className="text-sm font-bold text-spark-textMain uppercase tracking-wider font-['Space_Grotesk']">
              Registered Agent Network
            </h2>
          </div>
          <span className="text-[11px] text-spark-textMuted font-mono">
            3 Entities Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {participants.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 + 0.1, duration: 0.4 }}
                className="p-6 rounded-2xl bg-white border border-spark-borderLight flex items-center space-x-4 shadow-sm hover:shadow-md hover:border-spark-lime/40 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-spark-forestDark flex items-center justify-center text-spark-lime flex-shrink-0 shadow-xs">
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-spark-textMuted block">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-semibold bg-spark-bg text-spark-forestDark px-2 py-0.5 rounded-full border border-spark-borderLight font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-spark-textMain tracking-tight mt-0.5 truncate font-['Space_Grotesk']">
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-semibold text-spark-forestMed">
                      {item.limit}
                    </p>
                    <span className="text-[10px] text-spark-textMuted font-mono">
                      {item.nodeId}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 2. Policies Section */}
      <section id="dashboard-policies" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-spark-forestDark" />
            <h2 className="text-sm font-bold text-spark-textMain uppercase tracking-wider font-['Space_Grotesk']">
              Active Policy Guardrails
            </h2>
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
            All 3 Rules Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {policies.map((policy, idx) => {
            const Icon = policy.icon;
            return (
              <motion.div
                key={policy.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 + 0.15, duration: 0.4 }}
                className="p-5 rounded-2xl bg-white border border-spark-borderLight shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold text-spark-textMuted bg-spark-bg px-2 py-0.5 rounded border border-spark-borderLight">
                      {policy.id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${policy.color}`}>
                      {policy.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-spark-textMain font-['Space_Grotesk'] flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-spark-forestMed" />
                    {policy.title}
                  </h4>
                  <p className="text-xs text-spark-textMuted mt-1 leading-relaxed">
                    {policy.rule}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-spark-borderLight/60 flex items-center justify-between text-[10px] text-spark-textMuted font-mono">
                  <span>Engine: C++20 Core</span>
                  <span className="text-emerald-700 font-semibold">&bull; Active</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
