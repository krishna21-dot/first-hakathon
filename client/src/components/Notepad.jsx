import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Y from 'yjs';
import socket from '../lib/socket';

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export default function Notepad({ roomId, userId, userName, initialContent, editHistory, typingUsers }) {
  const ydocRef = useRef(null);
  const textareaRef = useRef(null);
  const [text, setText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const isRemoteUpdate = useRef(false);
  const typingTimerRef = useRef(null);

  // Initialize Yjs document
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const ytext = ydoc.getText('notepad');

    // Listen for remote Yjs updates
    const onYjsUpdate = ({ update }) => {
      try {
        const binaryUpdate = base64ToUint8Array(update);
        isRemoteUpdate.current = true;
        Y.applyUpdate(ydoc, binaryUpdate);
        isRemoteUpdate.current = false;
      } catch (err) {
        console.error('Yjs update error:', err);
      }
    };

    // Sync initial state
    const onYjsSync = ({ update }) => {
      try {
        const binaryUpdate = base64ToUint8Array(update);
        isRemoteUpdate.current = true;
        Y.applyUpdate(ydoc, binaryUpdate);
        isRemoteUpdate.current = false;
      } catch (err) {
        console.error('Yjs sync error:', err);
      }
    };

    socket.on('yjs-update', onYjsUpdate);
    socket.on('yjs-sync', onYjsSync);

    // Observe text changes
    ytext.observe(() => {
      const newText = ytext.toString();
      setText(newText);

      if (textareaRef.current && isRemoteUpdate.current) {
        const el = textareaRef.current;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.value = newText;
        try {
          // Keep cursor within valid text length
          const clampedStart = Math.min(start, newText.length);
          const clampedEnd = Math.min(end, newText.length);
          el.setSelectionRange(clampedStart, clampedEnd);
        } catch (e) { /* ignore */ }
      }
    });

    // Initialize with server content if Yjs is empty
    if (initialContent && ytext.toString() === '') {
      ydoc.transact(() => {
        ytext.insert(0, initialContent);
      });
    }

    return () => {
      socket.off('yjs-update', onYjsUpdate);
      socket.off('yjs-sync', onYjsSync);
      ydoc.destroy();
    };
  }, [roomId]);

  // Set initial content when it arrives
  useEffect(() => {
    if (initialContent && ydocRef.current) {
      const ytext = ydocRef.current.getText('notepad');
      if (ytext.toString() === '' && initialContent) {
        ydocRef.current.transact(() => {
          ytext.insert(0, initialContent);
        });
      }
    }
  }, [initialContent]);

  const handleInput = useCallback((e) => {
    const newText = e.target.value;
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const ytext = ydoc.getText('notepad');
    const oldText = ytext.toString();

    // Calculate diff and apply as Yjs operations
    ydoc.transact(() => {
      // Find common prefix
      let prefixLen = 0;
      while (prefixLen < oldText.length && prefixLen < newText.length && oldText[prefixLen] === newText[prefixLen]) {
        prefixLen++;
      }

      // Find common suffix
      let oldSuffixLen = 0;
      let newSuffixLen = 0;
      while (
        oldSuffixLen < (oldText.length - prefixLen) &&
        newSuffixLen < (newText.length - prefixLen) &&
        oldText[oldText.length - 1 - oldSuffixLen] === newText[newText.length - 1 - newSuffixLen]
      ) {
        oldSuffixLen++;
        newSuffixLen++;
      }

      const deleteLen = oldText.length - prefixLen - oldSuffixLen;
      const insertText = newText.substring(prefixLen, newText.length - newSuffixLen);

      if (deleteLen > 0) {
        ytext.delete(prefixLen, deleteLen);
      }
      if (insertText) {
        ytext.insert(prefixLen, insertText);
      }
    });

    // Send update to peers
    const update = Y.encodeStateAsUpdate(ydoc);
    const base64 = uint8ArrayToBase64(update);
    socket.emit('yjs-update', { update: base64, userId, userName });

    // Typing indicator
    socket.emit('typing', { isTyping: true });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing', { isTyping: false });
    }, 1200);
  }, [userId, userName]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const typingList = Object.values(typingUsers);

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <svg className="w-[18px] h-[18px] text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Collaborative Live Notepad
        </div>

        <div className="flex items-center gap-3">
          {typingList.length > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-accent font-medium"
            >
              ✏️ {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...
            </motion.span>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-text-muted hover:text-text-main cursor-pointer transition-colors bg-white/5 border border-border rounded-lg px-2.5 py-1"
          >
            📝 History
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        className="collaborative-textarea"
        value={text}
        onChange={handleInput}
        placeholder="Type here in real-time... Open this URL in multiple tabs to see live sync! Every keystroke syncs via CRDT."
      />

      <div className="flex items-center justify-between mt-2 text-xs text-text-dim">
        <span>{wordCount} words · {charCount} characters</span>
        <span>⚡ Conflict-free CRDT sync via Yjs</span>
      </div>

      {/* Edit History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-border pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Revision History</h4>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-2">
                {editHistory.length === 0 ? (
                  <p className="text-xs text-text-dim text-center py-4">No edits yet</p>
                ) : (
                  editHistory.slice(-20).reverse().map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs bg-white/3 rounded-lg px-3 py-2 border border-border">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
                      >
                        {(entry.userName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-main">
                          {entry.userName} <span className="text-text-dim font-normal">{entry.diff}</span>
                        </p>
                        <p className="text-text-dim mt-0.5">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
