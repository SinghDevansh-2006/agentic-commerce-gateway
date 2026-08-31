import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Coins, Network, ArrowRight, Activity } from 'lucide-react';

export default function LandingHero({ onLaunch }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const features = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-spark-forestDark" />,
      title: 'Spending Limits',
      description: 'Strict programmatic budgets ensure AI agents never exceed their authorized financial allocations.',
      highlight: true,
    },
    {
      icon: <Coins className="w-6 h-6 text-spark-lime" />,
      title: 'Currency Validation',
      description: 'Automated fractional-cent checks prevent precision rounding errors and incorrect charges.',
      highlight: false,
    },
    {
      icon: <Network className="w-6 h-6 text-spark-lime" />,
      title: 'Network Resilience',
      description: 'Graceful fallback mechanisms automatically revert failed transactions when upstream gateways drop.',
      highlight: false,
    },
  ];

  return (
    <div className="min-h-screen bg-spark-bg flex flex-col font-['Inter'] relative overflow-hidden">
      {/* Animated Background Detail - Faint moving grid/nodes */}
      <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none">
        <motion.svg 
          width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"
          animate={{ backgroundPosition: ['0px 0px', '40px 40px'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          <defs>
            <pattern id="nodeGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="0" cy="0" r="2" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#nodeGrid)" className="text-spark-forestDark" />
        </motion.svg>
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-16 relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left Column: Asymmetric Content */}
          <motion.div
            className="lg:col-span-7 flex flex-col items-start text-left"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-spark-borderLight text-xs font-semibold tracking-wide text-spark-forestDark uppercase shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spark-lime opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-spark-limeHover"></span>
              </span>
              Agentic Commerce Gateway
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] font-bold text-spark-textMain tracking-tighter leading-[1.1] mb-6 font-['Space_Grotesk']"
            >
              Autonomous AI <br />
              Financial <br />
              <span className="relative inline-block mt-2">
                <span className="relative z-10">Safeguards &</span>
                <motion.span 
                  className="absolute bottom-1 left-0 w-full h-4 bg-spark-lime/40 -z-0 rounded-sm"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.8, duration: 0.5, ease: 'easeOut' }}
                />
              </span><br />
              <span className="relative inline-block mt-2">
                <span className="relative z-10">Policy Engine</span>
                <motion.span 
                  className="absolute bottom-1 left-0 w-full h-4 bg-spark-lime/40 -z-0 rounded-sm"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 1.0, duration: 0.5, ease: 'easeOut' }}
                />
              </span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg md:text-xl text-spark-textMuted max-w-xl mb-10 font-medium leading-relaxed"
            >
              A high-performance C++20 gateway designed to facilitate secure, precision-critical financial transactions between independent AI agents.
            </motion.p>

            <motion.div variants={itemVariants} className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLaunch}
                className="px-8 py-4 bg-spark-forestDark text-white font-semibold rounded-xl shadow-[0_8px_20px_rgba(5,28,18,0.12)] hover:shadow-[0_12px_24px_rgba(180,241,5,0.2)] transition-all flex items-center gap-3 border border-transparent hover:border-spark-lime/30 group"
              >
                Launch Dashboard
                <ArrowRight className="w-5 h-5 opacity-80 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Column: Highlighted Features */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="lg:col-span-5 flex flex-col gap-5"
          >
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className={`p-6 rounded-2xl transition-all duration-300 flex items-start gap-5 ${
                  feature.highlight 
                  ? 'bg-spark-lime shadow-md scale-100 lg:scale-105 lg:-ml-6 z-10 border-none' 
                  : 'bg-spark-card border border-spark-borderLight shadow-sm hover:shadow-md hover:border-spark-lime/40'
                }`}
              >
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                  feature.highlight ? 'bg-white/40 backdrop-blur-sm' : 'bg-spark-forestDark'
                }`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className={`text-lg font-bold mb-1 font-['Space_Grotesk'] ${
                    feature.highlight ? 'text-spark-forestDark' : 'text-spark-textMain'
                  }`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm font-medium leading-relaxed ${
                    feature.highlight ? 'text-spark-forestDark/80' : 'text-spark-textMuted'
                  }`}>
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
