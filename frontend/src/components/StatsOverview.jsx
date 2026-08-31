import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

// Smooth count-up animation component
function CountUpNumber({ value, duration = 600 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const startVal = displayValue;
    const targetVal = Number(value) || 0;
    if (startVal === targetVal) return;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Cubic ease-out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (targetVal - startVal) * easeProgress);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    const animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export default function StatsOverview({ logs = [] }) {
  const totalCount = logs.length;
  const approvedCount = logs.filter(l => l.decision_status === 'Approved').length;
  const timeoutCount = logs.filter(l => l.decision_status?.includes('Timeout')).length;
  const limitCount = logs.filter(l => l.decision_status?.includes('Limit')).length;

  const totalVolume = logs.reduce((sum, l) => sum + (Number(l.requested_amount) || 0), 0);
  const approvedVolume = logs
    .filter(l => l.decision_status === 'Approved')
    .reduce((sum, l) => sum + (Number(l.requested_amount) || 0), 0);

  // Convert fractional subunits (10,000 = 1 INR) to clean INR format
  const formatInr = (subunits) => {
    return '₹' + (subunits / 10000).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const stats = [
    {
      label: 'Total Purchases',
      value: totalCount,
      subtext: `${formatInr(totalVolume)} total volume`,
      icon: ShoppingCart,
      highlight: false,
    },
    {
      label: 'Approved & Settled',
      value: approvedCount,
      subtext: `${formatInr(approvedVolume)} safely paid`,
      icon: CheckCircle2,
      highlight: false,
    },
    {
      label: 'Over-Budget Blocked',
      value: limitCount,
      subtext: 'Protected by budget limits',
      icon: AlertTriangle,
      highlight: true, // Thematic match for "Spending Limits"
    },
    {
      label: 'Network Errors Recovered',
      value: timeoutCount,
      subtext: 'Zero-loss auto-recovery',
      icon: RefreshCw,
      highlight: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-['Inter']">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className={`p-6 rounded-2xl transition-all duration-300 flex flex-col justify-between ${
              stat.highlight
                ? 'bg-spark-lime shadow-md border-none text-spark-forestDark'
                : 'bg-white border border-spark-borderLight shadow-sm hover:shadow-md hover:border-spark-lime/40'
            }`}
          >
            {/* Top row: Label & Icon */}
            <div className="flex items-start justify-between gap-3">
              <span
                className={`text-xs font-semibold uppercase tracking-wider ${
                  stat.highlight ? 'text-spark-forestDark/80' : 'text-spark-textMuted'
                }`}
              >
                {stat.label}
              </span>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  stat.highlight
                    ? 'bg-spark-forestDark text-spark-lime'
                    : 'bg-spark-forestDark text-spark-lime'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>

            {/* Bottom row: Big Metric with CountUp & Subtext */}
            <div className="mt-5">
              <div
                className={`text-4xl font-extrabold tracking-tight font-['Space_Grotesk'] ${
                  stat.highlight ? 'text-spark-forestDark' : 'text-spark-textMain'
                }`}
              >
                <CountUpNumber value={stat.value} />
              </div>
              <p
                className={`mt-1.5 text-xs font-medium ${
                  stat.highlight ? 'text-spark-forestDark/75' : 'text-spark-textMuted'
                }`}
              >
                {stat.subtext}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
