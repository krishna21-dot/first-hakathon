import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Counter({ value, logs, accentColor, onAction }) {
  const [showLog, setShowLog] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs uppercase tracking-wider text-text-muted font-semibold">
          Shared Room Counter
        </h3>
        <button
          onClick={() => setShowLog(!showLog)}
          className="text-[0.7rem] text-text-dim hover:text-text-main cursor-pointer transition-colors"
        >
          {showLog ? 'Hide' : 'Show'} Log
        </button>
      </div>

      {/* Counter Display */}
      <motion.div
        key={value}
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        className="font-mono text-5xl font-[800] text-center py-4 rounded-xl border border-border bg-white/3"
        style={{
          textShadow: `0 0 20px ${accentColor}40`,
          color: '#fff',
        }}
      >
        {value}
      </motion.div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onAction('+1')}
          className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm cursor-pointer border-none"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
            boxShadow: `0 4px 14px ${accentColor}55`,
          }}
        >
          +1 for Everyone
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onAction('-1')}
          className="px-4 py-2.5 rounded-xl font-bold text-text-main text-sm cursor-pointer border border-border bg-white/6 hover:bg-white/12 transition-colors"
        >
          -1
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onAction('reset')}
          className="px-4 py-2.5 rounded-xl font-bold text-text-main text-sm cursor-pointer border border-border bg-white/6 hover:bg-white/12 transition-colors"
        >
          Reset
        </motion.button>
      </div>

      {/* Activity Log */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-border pt-3 max-h-36 overflow-y-auto">
              <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-text-dim mb-2">Activity Log</h4>
              {logs.length === 0 ? (
                <p className="text-xs text-text-dim text-center py-2">No actions yet</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {logs.slice(-15).reverse().map((log, i) => (
                    <div key={i} className="text-xs text-text-muted flex items-center gap-2">
                      <span className={`text-[0.7rem] font-mono font-bold ${log.actionType === '+1' ? 'text-ok' : log.actionType === '-1' ? 'text-bad' : 'text-warn'}`}>
                        {log.actionType === '+1' ? '▲' : log.actionType === '-1' ? '▼' : '⟲'}
                      </span>
                      <span>
                        <strong>{log.userName}</strong> {log.actionType === 'reset' ? 'reset counter' : `${log.actionType === '+1' ? 'increased' : 'decreased'} to ${log.newValue}`}
                      </span>
                      <span className="text-text-dim ml-auto text-[0.65rem]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
