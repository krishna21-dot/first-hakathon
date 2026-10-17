import { motion } from 'framer-motion';

export default function Presence({ peers, mySocketId, accentColor }) {
  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <svg className="w-[18px] h-[18px] text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Active Peers
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style={{
            background: `${accentColor}25`,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
          }}
        >
          {peers.length} Online
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {peers.map((peer) => (
          <motion.li
            key={peer.socketId}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 bg-white/3 border border-border rounded-xl px-3.5 py-2.5"
          >
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{
                backgroundColor: peer.color || '#6366f1',
                boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
              }}
            >
              {(peer.userName || 'G')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm flex items-center gap-1.5 truncate">
                {peer.userName}
                {peer.socketId === mySocketId && (
                  <span className="text-[0.65rem] px-1.5 py-0.5 rounded bg-accent/25 text-accent font-bold uppercase">YOU</span>
                )}
              </div>
              <div className="text-[0.72rem] text-ok flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                Active in room
              </div>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="text-[0.78rem] text-text-dim leading-relaxed border-t border-border pt-3 mt-4">
        💡 <strong>Live Cursors:</strong> Move your mouse over this page. Other connected tabs will see your pointer and name tag move in real-time.
      </div>
    </div>
  );
}
