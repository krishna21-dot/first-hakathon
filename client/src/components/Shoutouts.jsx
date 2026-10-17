import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Shoutouts({ shoutouts, onShoutout }) {
  const [message, setMessage] = useState('');
  const [expanded, setExpanded] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [shoutouts]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onShoutout(message.trim());
    setMessage('');
  };

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <span>📢</span>
          Live Shoutouts
          <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
            {shoutouts.length}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-text-dim hover:text-text-main cursor-pointer bg-transparent border-none transition-colors"
        >
          {expanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {/* Messages */}
            <div ref={listRef} className="max-h-52 overflow-y-auto flex flex-col gap-2.5 mb-4 pr-1">
              {shoutouts.length === 0 ? (
                <div className="text-center py-6 text-text-dim text-sm">
                  No shoutouts yet. Be the first! 🎤
                </div>
              ) : (
                shoutouts.map((s, i) => (
                  <motion.div
                    key={s._id || i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3 bg-white/3 rounded-xl p-3 border border-border"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
                    >
                      {(s.userName || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm">{s.userName}</span>
                        <span className="text-[0.65rem] text-text-dim">
                          {new Date(s.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-text-muted leading-relaxed">{s.message}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send a shoutout to the room..."
                maxLength={280}
                className="flex-1 bg-[rgba(10,14,23,0.6)] border border-border rounded-xl px-3 py-2 text-sm text-text-main outline-none focus:border-accent transition-colors placeholder:text-text-dim"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-2 rounded-xl font-bold text-sm cursor-pointer border-none text-white disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}
              >
                Send 📢
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
