import { useState } from 'react';
import { motion } from 'framer-motion';
import socket from '../lib/socket';

export default function PollPanel({ roomId, userId, userName, polls, accentColor }) {
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions(prev => [...prev, '']);
  };

  const handleOptionChange = (idx, value) => {
    setOptions(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleCreate = () => {
    if (!question.trim()) return;
    const validOpts = options.filter(o => o.trim());
    if (validOpts.length < 2) return;

    socket.emit('create-poll', { question, options: validOpts, userId, userName });
    setCreating(false);
    setQuestion('');
    setOptions(['', '']);
  };

  const handleVote = (pollId, optionIndex) => {
    socket.emit('vote-poll', { pollId, optionIndex, userId, userName });
  };

  const handleClose = (pollId) => {
    socket.emit('close-poll', { pollId });
  };

  if (creating) {
    return (
      <div>
        <h4 className="font-bold text-sm mb-3">Create a Poll</h4>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Your question..."
          className="w-full bg-[rgba(10,14,23,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-main outline-none focus:border-accent mb-3 placeholder:text-text-dim"
        />
        <div className="flex flex-col gap-2 mb-3">
          {options.map((opt, i) => (
            <input
              key={i}
              type="text"
              value={opt}
              onChange={(e) => handleOptionChange(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="w-full bg-[rgba(10,14,23,0.6)] border border-border rounded-lg px-3 py-2 text-sm text-text-main outline-none focus:border-accent placeholder:text-text-dim"
            />
          ))}
        </div>
        <div className="flex gap-2">
          {options.length < 6 && (
            <button onClick={handleAddOption} className="flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border border-border bg-white/5 text-text-muted hover:bg-white/10 transition-colors">+ Option</button>
          )}
          <button onClick={handleCreate} className="flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer border-none text-white" style={{ background: accentColor }}>Create Poll 📊</button>
          <button onClick={() => setCreating(false)} className="px-3 py-2 rounded-lg text-xs cursor-pointer border border-border bg-transparent text-text-dim hover:text-text-main transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-text-dim text-sm mb-4">No active polls. Create one to get the room's opinion!</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setCreating(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer border-none text-white"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            boxShadow: `0 4px 14px ${accentColor}40`,
          }}
        >
          📊 Create Poll
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-dim">Active Polls</h4>
        <button
          onClick={() => setCreating(true)}
          className="text-xs font-semibold cursor-pointer border border-border bg-white/5 text-text-muted hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
        >
          + New
        </button>
      </div>

      {polls.map((poll) => {
        const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
        const myVote = poll.options.findIndex(o => o.votes?.some(v => v.userId === userId));
        const isCreator = poll.creatorId === userId;

        return (
          <div key={poll._id} className="bg-white/3 rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold flex-1">{poll.question}</p>
              {isCreator && (
                <button
                  onClick={() => handleClose(poll._id)}
                  className="text-[0.65rem] text-bad cursor-pointer bg-transparent border-none hover:underline ml-2"
                >
                  Close
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {poll.options.map((opt, i) => {
                const voteCount = opt.votes?.length || 0;
                const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                const isVoted = myVote === i;

                return (
                  <motion.button
                    key={i}
                    whileHover={myVote === -1 ? { scale: 1.01 } : {}}
                    whileTap={myVote === -1 ? { scale: 0.99 } : {}}
                    onClick={() => myVote === -1 && handleVote(poll._id, i)}
                    className="poll-bar relative cursor-pointer border-none text-left w-full"
                    disabled={myVote !== -1}
                  >
                    <div
                      className="poll-bar-fill absolute inset-y-0 left-0"
                      style={{
                        width: `${percentage}%`,
                        background: isVoted ? `${accentColor}40` : 'rgba(255,255,255,0.08)',
                      }}
                    />
                    <div className="relative z-10 flex items-center justify-between px-3 py-1.5 text-xs">
                      <span className={`font-medium ${isVoted ? 'text-text-main' : 'text-text-muted'}`}>
                        {isVoted && '✓ '}{opt.text}
                      </span>
                      <span className="font-mono font-bold text-text-dim">
                        {percentage}% ({voteCount})
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <p className="text-[0.65rem] text-text-dim mt-2">
              {totalVotes} total vote{totalVotes !== 1 ? 's' : ''} · by {poll.creatorName}
            </p>
          </div>
        );
      })}
    </div>
  );
}
