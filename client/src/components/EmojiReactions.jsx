import { motion } from 'framer-motion';

const EMOJIS = [
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '💡', label: 'Idea' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '🤯', label: 'Mind Blown' },
  { emoji: '💪', label: 'Strong' },
];

export default function EmojiReactions({ onEmoji }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs uppercase tracking-wider text-text-muted font-semibold">
          Live Emoji Reactions
        </h3>
        <span className="text-[0.7rem] text-text-dim">Broadcast to room</span>
      </div>
      <div className="flex gap-2 justify-around bg-white/2 p-2 rounded-xl flex-wrap">
        {EMOJIS.map(({ emoji, label }) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => onEmoji(emoji)}
            className="text-2xl bg-transparent border-none cursor-pointer p-1 rounded-lg hover:bg-white/5 transition-colors"
            title={`Send ${label}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
