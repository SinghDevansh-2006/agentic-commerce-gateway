import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const duration = 2000; // Total loading time 2s
    const interval = 20;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsLoaded(true), 200);
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const timeout = setTimeout(() => {
        onComplete();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [isLoaded, onComplete]);

  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-spark-bg font-['Inter']"
        >
          {/* Animated Background Grid detail */}
          <div className="absolute inset-0 z-0 overflow-hidden opacity-[0.03] pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="smallGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#smallGrid)" className="text-spark-forestDark" />
            </svg>
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center z-10"
          >
            <div className="flex items-center gap-4 mb-8">
              <motion.div
                animate={{ 
                  boxShadow: ['0 0 0px rgba(180, 241, 5, 0)', '0 0 20px rgba(180, 241, 5, 0.4)', '0 0 0px rgba(180, 241, 5, 0)'],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-12 h-12 rounded-xl bg-spark-forestDark flex items-center justify-center relative overflow-hidden"
              >
                {/* Shimmer sweep effect inside the icon box */}
                <motion.div
                  animate={{ left: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
                <Activity className="w-6 h-6 text-spark-lime relative z-10" />
              </motion.div>

              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-spark-textMain font-['Space_Grotesk']">
                Agentic <span className="font-light text-spark-textMuted">Commerce Gateway</span>
              </h1>
            </div>

            {/* Progress Bar Container */}
            <div className="w-72 h-2 bg-spark-borderLight rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-spark-forestMed via-spark-lime to-spark-limeHover"
                style={{ width: `${progress}%` }}
                layout
              />
            </div>
            
            <motion.div 
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-6 text-[11px] font-semibold tracking-widest uppercase text-spark-textMuted/70 font-mono"
            >
              Initializing Policy Engine
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              >
                ...
              </motion.span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
