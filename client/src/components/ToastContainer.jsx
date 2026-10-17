import { motion, AnimatePresence } from 'framer-motion';

export default function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md border text-sm font-medium flex items-center gap-2 ${
              toast.isError
                ? 'bg-bad/20 border-bad/40 text-bad'
                : 'bg-card/90 border-border text-text-main shadow-[0_8px_30px_rgb(0,0,0,0.4)]'
            }`}
          >
            <span>{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
