import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

function generateRoomCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedName = localStorage.getItem('syncspace-user-name');
    if (savedName) setDisplayName(savedName);

    const queryRoom = searchParams.get('room');
    if (queryRoom) {
      setRoomCode(queryRoom.toLowerCase());
      // If user already has a display name, jump straight to the room
      if (savedName && savedName.trim()) {
        navigate(`/room/${queryRoom.toLowerCase()}`);
      }
    }
  }, [searchParams, navigate]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code or create a new room');
      return;
    }
    localStorage.setItem('syncspace-user-name', displayName.trim());
    localStorage.setItem('syncspace-user-id', localStorage.getItem('syncspace-user-id') || crypto.randomUUID());
    navigate(`/room/${roomCode.trim().toLowerCase()}`);
  };

  const handleCreateRoom = () => {
    if (!displayName.trim()) {
      setError('Please enter your display name first');
      return;
    }
    const newCode = generateRoomCode();
    setRoomCode(newCode);
    localStorage.setItem('syncspace-user-name', displayName.trim());
    localStorage.setItem('syncspace-user-id', localStorage.getItem('syncspace-user-id') || crypto.randomUUID());
    navigate(`/room/${newCode}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Background effects */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(99,102,241,0.12) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.1) 0%, transparent 45%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              boxShadow: '0 0 40px rgba(99, 102, 241, 0.5)',
            }}
          >
            ⚡
          </motion.div>
          <h1 className="text-4xl font-[800] tracking-tight mb-2">
            <span className="gradient-text">SyncSpace</span>
          </h1>
          <p className="text-text-muted text-sm">
            Real-time collaborative workspace. Create or join a room to get started.
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card">
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Your Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
                placeholder="e.g. Alex"
                maxLength={24}
                className="w-full bg-[rgba(10,14,23,0.65)] border border-border rounded-xl px-4 py-3 text-text-main font-medium placeholder:text-text-dim outline-none focus:border-border-focus focus:ring-2 focus:ring-accent-glow transition-all"
                autoFocus
              />
            </div>

            {/* Room Code */}
            <div>
              <label htmlFor="roomCode" className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Room Code
              </label>
              <input
                id="roomCode"
                type="text"
                value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '')); setError(''); }}
                placeholder="Enter room code (e.g. 3xz5kf)"
                maxLength={32}
                className="w-full bg-[rgba(10,14,23,0.65)] border border-border rounded-xl px-4 py-3 font-mono text-text-main placeholder:text-text-dim outline-none focus:border-border-focus focus:ring-2 focus:ring-accent-glow transition-all"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-bad text-sm font-medium"
              >
                {error}
              </motion.p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white cursor-pointer text-sm"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                }}
              >
                Join Room →
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleCreateRoom}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-text-main border border-border cursor-pointer text-sm hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                + New Room
              </motion.button>
            </div>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-text-dim text-xs mt-6">
          Share the room code with teammates to collaborate in real-time ⚡
        </p>
      </motion.div>
    </div>
  );
}
