import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuizPanel from './QuizPanel';
import PollPanel from './PollPanel';
import Whiteboard from './Whiteboard';

const TABS = [
  { id: 'quiz', label: '🎯 Quiz', icon: '🎯' },
  { id: 'poll', label: '📊 Poll', icon: '📊' },
  { id: 'whiteboard', label: '🎨 Canvas', icon: '🎨' },
];

export default function WorkspacePanel({
  roomId, userId, userName,
  polls, quiz, whiteboardStrokes, accentColor,
}) {
  const [activeTab, setActiveTab] = useState('quiz');

  // Automatically switch to Quiz tab when a quiz is active
  useEffect(() => {
    if (quiz && quiz.isActive) {
      setActiveTab('quiz');
    }
  }, [quiz]);

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-4">
        <span>🧩</span>
        Interactive Workspace
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-white/3 rounded-xl p-1 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all border-none ${
              activeTab === tab.id
                ? 'bg-white/12 text-text-main shadow-sm'
                : 'bg-transparent text-text-dim hover:text-text-muted'
            }`}
            style={activeTab === tab.id ? {
              background: `${accentColor}25`,
              color: accentColor,
            } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'quiz' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <QuizPanel
              roomId={roomId}
              userId={userId}
              userName={userName}
              quiz={quiz}
              accentColor={accentColor}
            />
          </motion.div>
        )}
        {activeTab === 'poll' && (
          <motion.div key="poll" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <PollPanel
              roomId={roomId}
              userId={userId}
              userName={userName}
              polls={polls}
              accentColor={accentColor}
            />
          </motion.div>
        )}
        {activeTab === 'whiteboard' && (
          <motion.div key="whiteboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Whiteboard
              roomId={roomId}
              strokes={whiteboardStrokes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
