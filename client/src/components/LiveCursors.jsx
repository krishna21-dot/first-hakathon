import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../lib/socket';

export default function LiveCursors({ currentUserId }) {
  const [cursors, setCursors] = useState({});
  const [clickRipples, setClickRipples] = useState([]);

  useEffect(() => {
    const handleCursorMove = (data) => {
      // data: { socketId, userId, x, y, userName, color }
      if (!data || !data.socketId) return;
      // Never render our own cursor
      if (data.socketId === socket.id || (currentUserId && data.userId === currentUserId)) return;

      setCursors((prev) => ({
        ...prev,
        [data.socketId]: {
          socketId: data.socketId,
          userId: data.userId,
          x: data.x,
          y: data.y,
          userName: data.userName || 'Peer',
          color: data.color || '#6366f1',
          lastSeen: Date.now(),
        },
      }));
    };

    const handleCursorClick = (data) => {
      if (!data || data.socketId === socket.id || (currentUserId && data.userId === currentUserId)) return;

      const rippleId = `${data.socketId}-${Date.now()}`;
      setClickRipples((prev) => [
        ...prev.slice(-10),
        {
          id: rippleId,
          x: data.x,
          y: data.y,
          color: data.color || '#6366f1',
          userName: data.userName || 'Peer',
        },
      ]);

      setTimeout(() => {
        setClickRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 1200);
    };

    const handlePeerLeft = ({ socketId }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    const handleCursorRemove = ({ socketId }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    };

    socket.on('cursor-move', handleCursorMove);
    socket.on('cursor-click', handleCursorClick);
    socket.on('peer-left', handlePeerLeft);
    socket.on('cursor-remove', handleCursorRemove);

    // Periodic cleanup of stale cursors (inactive > 8s)
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let changed = false;
        const next = {};
        for (const [id, c] of Object.entries(prev)) {
          if (now - c.lastSeen < 8000) {
            next[id] = c;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 3000);

    return () => {
      socket.off('cursor-move', handleCursorMove);
      socket.off('cursor-click', handleCursorClick);
      socket.off('peer-left', handlePeerLeft);
      socket.off('cursor-remove', handleCursorRemove);
      clearInterval(interval);
    };
  }, [currentUserId]);

  const activeCursors = Object.values(cursors);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none">
      {/* Click ripples */}
      <AnimatePresence>
        {clickRipples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${Math.round(ripple.x * window.innerWidth)}px`,
              top: `${Math.round(ripple.y * window.innerHeight)}px`,
              width: '40px',
              height: '40px',
              marginLeft: '-20px',
              marginTop: '-20px',
              border: `2px solid ${ripple.color}`,
              boxShadow: `0 0 15px ${ripple.color}`,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Peer Cursors */}
      {activeCursors.map((cursor) => {
        const left = Math.round(cursor.x * window.innerWidth);
        const top = Math.round(cursor.y * window.innerHeight);

        return (
          <div
            key={cursor.socketId}
            className="absolute pointer-events-none transition-transform duration-75 ease-out will-change-transform"
            style={{
              transform: `translate3d(${left}px, ${top}px, 0)`,
            }}
          >
            {/* SVG Arrow Pointer */}
            <svg
              className="w-5 h-5 -rotate-45 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              viewBox="0 0 24 24"
              fill={cursor.color}
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="M3 3l7 18 3-7 7-3L3 3z" />
            </svg>

            {/* Glowing Name Tag Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap ml-3.5 -mt-2 shadow-[0_4px_16px_rgba(0,0,0,0.5)] border border-white/20"
              style={{
                backgroundColor: cursor.color,
                boxShadow: `0 4px 14px ${cursor.color}55`,
              }}
            >
              {/* Dot indicator */}
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{cursor.userName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
