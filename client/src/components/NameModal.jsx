import { useState } from 'react';
import { motion } from 'framer-motion';

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please choose a display name to enter the room');
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-sm glass-card border border-border shadow-2xl p-6 rounded-2xl relative"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-2xl">
            👋
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mb-1">
            Welcome to the Room
          </h2>
          <p className="text-xs text-text-muted">
            Enter a display name so peers know who is typing, drawing, and voting.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="modal-name"
              className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5"
            >
              Display Name
            </label>
            <input
              id="modal-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Maya, Jordan, Dev..."
              maxLength={24}
              autoFocus
              className="w-full bg-[rgba(10,14,23,0.7)] border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-main font-medium placeholder:text-text-dim outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-bad font-medium">{error}</p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl font-bold text-white cursor-pointer text-sm shadow-lg transition-transform"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            }}
          >
            Enter Room →
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
