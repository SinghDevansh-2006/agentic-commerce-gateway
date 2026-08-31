import React, { useState } from 'react';
import { Send, CheckCircle2, AlertTriangle, RefreshCw, ShoppingBag, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TriggerForm({ onSubmit, isSubmitting, lastDecision }) {
  const [formData, setFormData] = useState({
    transaction_id: `txn_${Math.floor(1000 + Math.random() * 9000)}`,
    buyer_agent_id: 'agent_buyer_001',
    seller_agent_id: 'agent_seller_002',
    item_id: 'item_gpu_hours',
    quantity: 2,
    unit_price_inr: 2.50,
  });

  // Highlight pulse state when scenario buttons are clicked
  const [pulseColor, setPulseColor] = useState(null);

  // Compute quantity safely for display & math
  const displayQuantity = formData.quantity === '' ? '' : Number(formData.quantity);
  const numericQuantity = typeof formData.quantity === 'number' ? formData.quantity : (parseInt(formData.quantity, 10) || 0);
  const totalAmountInr = (numericQuantity * formData.unit_price_inr).toFixed(2);

  const handleQuantityChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setFormData(prev => ({ ...prev, quantity: '' }));
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setFormData(prev => ({ ...prev, quantity: parsed }));
    }
  };

  const handleQuantityBlur = () => {
    if (formData.quantity === '' || Number(formData.quantity) < 1) {
      setFormData(prev => ({ ...prev, quantity: 1 }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = numericQuantity < 1 ? 1 : numericQuantity;
    // Convert standard INR to 10,000 fractional units for C++ policy engine
    const subunitUnitPrice = Math.round(formData.unit_price_inr * 10000);
    const subunitTotalAmount = Math.round(qty * subunitUnitPrice);

    onSubmit({
      transaction_id: formData.transaction_id,
      buyer_agent_id: formData.buyer_agent_id,
      seller_agent_id: formData.seller_agent_id,
      item_id: formData.item_id,
      quantity: qty,
      unit_price: subunitUnitPrice,
      total_amount: subunitTotalAmount,
      currency: 'INR',
    });

    // Prepare next unique transaction ID
    setFormData(prev => ({
      ...prev,
      transaction_id: `txn_${Math.floor(1000 + Math.random() * 9000)}`,
    }));
  };

  const applyPreset = (type) => {
    const baseId = `txn_${type.toLowerCase().replace('_', '')}_${Math.floor(1000 + Math.random() * 9000)}`;
    let qty = 2;
    let color = 'emerald';

    if (type === 'SCENARIO_A') {
      qty = 2;
      color = 'emerald';
    } else if (type === 'SCENARIO_B') {
      qty = 5;
      color = 'amber';
    } else if (type === 'SCENARIO_C') {
      qty = 2;
      color = 'rose';
    }

    // Trigger visual pulse across the form card
    setPulseColor(color);
    setTimeout(() => setPulseColor(null), 700);

    setFormData({
      transaction_id: baseId,
      buyer_agent_id: 'agent_buyer_001',
      seller_agent_id: 'agent_seller_002',
      item_id: 'item_gpu_hours',
      quantity: qty,
      unit_price_inr: 2.50,
    });
  };

  return (
    <motion.div 
      animate={
        pulseColor === 'emerald' ? { backgroundColor: ['#ffffff', '#ecfdf5', '#ffffff'] } :
        pulseColor === 'amber' ? { backgroundColor: ['#ffffff', '#fffbeb', '#ffffff'] } :
        pulseColor === 'rose' ? { backgroundColor: ['#ffffff', '#fff1f2', '#ffffff'] } :
        {}
      }
      transition={{ duration: 0.6 }}
      className="p-7 rounded-2xl bg-white border border-spark-borderLight shadow-sm flex flex-col space-y-6 font-['Inter'] relative overflow-hidden"
    >
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4 border-b border-spark-borderLight">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-spark-forestDark flex items-center justify-center text-spark-lime shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-spark-textMain tracking-tight font-['Space_Grotesk']">
              Simulate AI Purchase
            </h2>
            <p className="text-xs text-spark-textMuted mt-0.5">Test policy rules against live C++ engine</p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2.5 py-1 bg-spark-bg rounded-lg border border-spark-borderLight text-spark-textMuted flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-spark-forestMed" /> Sandbox
        </span>
      </div>

      {/* 3 Test Scenarios with tactile physics and pulse effect */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-spark-textMain uppercase tracking-wider">
            Test Scenarios
          </span>
          <span className="text-[11px] text-spark-textMuted">Click to populate with pulse</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => applyPreset('SCENARIO_A')}
            className={`p-3 rounded-xl border text-left transition-all group ${
              pulseColor === 'emerald'
                ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-300'
                : 'bg-emerald-50/80 hover:bg-emerald-50 border-emerald-200/80'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Standard</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">₹5.00 (Approved)</p>
            <p className="text-[10px] text-emerald-600/80 mt-0.5">Within ₹10 limit</p>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => applyPreset('SCENARIO_B')}
            className={`p-3 rounded-xl border text-left transition-all group ${
              pulseColor === 'amber'
                ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-300'
                : 'bg-amber-50/80 hover:bg-amber-50 border-amber-200/80'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Over Budget</span>
            </div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1">₹12.50 (Blocked)</p>
            <p className="text-[10px] text-amber-600/80 mt-0.5">Exceeds limits</p>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => applyPreset('SCENARIO_C')}
            className={`p-3 rounded-xl border text-left transition-all group ${
              pulseColor === 'rose'
                ? 'bg-rose-100/90 border-rose-400 ring-2 ring-rose-300'
                : 'bg-rose-50/80 hover:bg-rose-50 border-rose-200/80'
            }`}
          >
            <div className="flex items-center space-x-1.5 text-rose-800 font-bold text-xs">
              <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
              <span>Network Drop</span>
            </div>
            <p className="text-[11px] text-rose-700 font-semibold mt-1">Auto-Recovery</p>
            <p className="text-[10px] text-rose-600/80 mt-0.5">Mock 504 Timeout</p>
          </motion.button>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Agent Cards Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-spark-bg border border-spark-borderLight">
            <span className="text-[11px] font-semibold text-spark-textMuted block mb-1">Purchasing Agent</span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-spark-textMain font-['Space_Grotesk']">AI Procurement Agent</span>
              <span className="text-[10px] bg-white border border-spark-borderLight text-spark-forestMed px-2 py-0.5 rounded-md font-semibold font-mono">
                Limit: ₹10.00
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-spark-bg border border-spark-borderLight">
            <span className="text-[11px] font-semibold text-spark-textMuted block mb-1">Merchant Agent</span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-spark-textMain font-['Space_Grotesk']">AI Cloud Vendor</span>
              <span className="text-[10px] bg-white border border-spark-borderLight text-emerald-700 px-2 py-0.5 rounded-md font-semibold">
                Verified
              </span>
            </div>
          </div>
        </div>

        {/* Compute Units (Hours) Input Field - Fixed for full typing + arrows + live flip */}
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="compute-quantity" className="text-xs font-semibold text-spark-textMain block mb-1.5">
              Compute (Hours)
            </label>
            <input
              id="compute-quantity"
              type="number"
              min="1"
              max="100"
              step="1"
              value={displayQuantity}
              onChange={handleQuantityChange}
              onBlur={handleQuantityBlur}
              className="w-full bg-white border border-spark-borderLight rounded-xl px-3.5 py-2 text-xs font-bold text-spark-textMain focus:outline-none focus:border-spark-forestDark focus:ring-1 focus:ring-spark-forestDark transition-all"
              required
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-spark-textMuted block mb-1.5">Unit Price</span>
            <div className="w-full bg-spark-bg border border-spark-borderLight rounded-xl px-3.5 py-2 text-xs font-bold text-spark-textMain">
              ₹{formData.unit_price_inr.toFixed(2)}
            </div>
          </div>

          {/* Calculated Total with subtle number transition animation */}
          <div>
            <span className="text-xs font-semibold text-spark-textMuted block mb-1.5">Calculated Total</span>
            <div className="w-full bg-spark-forestDark/5 border border-spark-forestDark/10 rounded-xl px-3.5 py-2 text-xs font-bold text-spark-forestDark font-['Space_Grotesk'] overflow-hidden flex items-center h-[34px]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={totalAmountInr}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  ₹{totalAmountInr}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Submit CTA Button with Tactile Physics */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-2 py-3.5 px-4 rounded-xl bg-spark-forestDark hover:bg-spark-forestMed text-white font-bold text-xs tracking-wide shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition-all disabled:opacity-50 border border-transparent hover:border-spark-lime/30 group"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-spark-lime" />
              <span>Evaluating Policy Engine Rules...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-spark-lime group-hover:translate-x-0.5 transition-transform" />
              <span>Execute Transaction (₹{totalAmountInr})</span>
            </>
          )}
        </motion.button>
      </form>

      {/* Decision Summary Alert Banner */}
      {lastDecision && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border text-xs ${
            lastDecision.approved
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : lastDecision.status?.includes('Timeout')
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 font-['Space_Grotesk']">
              {lastDecision.approved
                ? '✅ Purchase Approved & Settled'
                : lastDecision.status?.includes('Timeout')
                ? '⚠️ Network Drop Recovered (HTTP 504)'
                : '⛔ Purchase Blocked: Budget Limit Exceeded'}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded-full bg-white/70">
              {lastDecision.approved ? 'Settled' : 'Zero Loss'}
            </span>
          </div>

          <p className="text-xs mt-1.5 opacity-90 leading-relaxed font-medium">
            {lastDecision.approved
              ? 'Complied with all spending limits and settled safely.'
              : lastDecision.status?.includes('Timeout')
              ? 'Simulated upstream gateway timeout caught. Reserved inventory rolled back safely with zero fund loss.'
              : 'Transaction amount exceeds the authorized buyer limit of ₹10.00.'}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
