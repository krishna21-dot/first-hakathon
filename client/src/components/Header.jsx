import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Header({
  roomId, userName, myColor, connectionStatus,
  accentColor, onCopyLink, onNewRoom, onNameChange,
}) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(userName);
  const [copyText, setCopyText] = useState('Copy Link');

  const handleNameSave = () => {
    if (nameVal.trim() && nameVal.trim() !== userName) {
      onNameChange(nameVal.trim());
    }
    setEditing(false);
  };

  const handleCopy = () => {
    onCopyLink();
    setCopyText('Copied! ✓');
    setTimeout(() => setCopyText('Copy Link'), 2000);
  };

  const statusMap = {
    connected: { label: 'Connected', dot: 'bg-ok pulse-dot' },
    connecting: { label: 'Connecting...', dot: 'bg-warn' },
    reconnecting: { label: 'Reconnecting...', dot: 'bg-bad' },
    disconnected: { label: 'Disconnected', dot: 'bg-bad' },
  };
  const status = statusMap[connectionStatus] || statusMap.connecting;

  return (
    <header className="sticky top-0 z-40 border-b border-border" style={{
      background: 'rgba(10, 14, 23, 0.8)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    }}>
      <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3">
        {/* Brand */}
        <a href="/" className="flex items-center gap-3 no-underline text-inherit">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-lg"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, #ec4899 100%)`,
              boxShadow: `0 0 20px ${accentColor}80`,
            }}
          >⚡</div>
          <div>
            <h1 className="text-lg font-[800] tracking-tight flex items-center gap-2">
              SyncSpace
              <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  background: `${accentColor}30`,
                  color: accentColor,
                  border: `1px solid ${accentColor}50`,
                }}
              >Live</span>
            </h1>
          </div>
        </a>

        {/* Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Room pill */}
          <div className="inline-flex items-center gap-2 bg-white/4 border border-border rounded-lg px-3 py-1.5 font-mono text-sm">
            <span className="text-text-dim text-xs uppercase">Room:</span>
            <strong>{roomId}</strong>
          </div>

          {/* Name pill */}
          <div className="inline-flex items-center gap-1.5 bg-white/4 border border-border rounded-lg px-2.5 py-1">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: myColor }} />
            {editing ? (
              <input
                type="text"
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                className="bg-transparent border-none text-text-main font-semibold text-sm w-24 outline-none"
                autoFocus
                maxLength={24}
              />
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="bg-transparent border-none text-text-main font-semibold text-sm cursor-pointer"
              >
                {userName}
              </button>
            )}
          </div>

          {/* Copy Link */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 font-semibold text-[0.84rem] px-3.5 py-1.5 rounded-lg border border-border bg-white/6 text-text-main cursor-pointer hover:bg-white/12 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copyText}
          </motion.button>

          {/* New Room */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNewRoom}
            className="inline-flex items-center gap-1.5 font-semibold text-[0.84rem] px-3.5 py-1.5 rounded-lg border border-border bg-white/6 text-text-main cursor-pointer hover:bg-white/12 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Room
          </motion.button>

          {/* Status */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/4 border border-border text-text-muted">
            <span className={`w-2 h-2 rounded-full ${status.dot}`}
              style={status.dot.includes('ok') ? { boxShadow: '0 0 10px rgba(16,185,129,0.3)' } : {}}
            />
            {status.label}
          </div>
        </div>
      </div>
    </header>
  );
}
