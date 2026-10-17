import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../lib/socket';
import Header from '../components/Header';
import Notepad from '../components/Notepad';
import Counter from '../components/Counter';
import EmojiReactions from '../components/EmojiReactions';
import Shoutouts from '../components/Shoutouts';
import Presence from '../components/Presence';
import WorkspacePanel from '../components/WorkspacePanel';
import TaskList from '../components/TaskList';
import LiveCursors from '../components/LiveCursors';
import NameModal from '../components/NameModal';
import ToastContainer from '../components/ToastContainer';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [userName, setUserName] = useState(() => localStorage.getItem('syncspace-user-name') || '');
  const [userId] = useState(() => {
    let id = localStorage.getItem('syncspace-user-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('syncspace-user-id', id);
    }
    return id;
  });

  const [showNameModal, setShowNameModal] = useState(!userName);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [myColor, setMyColor] = useState('#6366f1');
  const [accentColor, setAccentColor] = useState('#6366f1');

  // Room state
  const [notepadContent, setNotepadContent] = useState('');
  const [counterValue, setCounterValue] = useState(0);
  const [counterLogs, setCounterLogs] = useState([]);
  const [editHistory, setEditHistory] = useState([]);
  const [peers, setPeers] = useState([]);
  const [shoutouts, setShoutouts] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [toasts, setToasts] = useState([]);

  // Poll & Quiz state
  const [polls, setPolls] = useState([]);
  const [quiz, setQuiz] = useState(null);

  // Whiteboard
  const [whiteboardStrokes, setWhiteboardStrokes] = useState([]);

  const toastIdRef = useRef(0);

  const addToast = useCallback((message, isError = false) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // Handle name submission from modal
  const handleNameSubmit = (name) => {
    localStorage.setItem('syncspace-user-name', name);
    setUserName(name);
    setShowNameModal(false);
  };

  // Connect to socket when name is set
  useEffect(() => {
    if (!userName || !roomId) return;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join-room', { roomId, userId, userName });

    // Connection events
    const onConnect = () => {
      setConnected(true);
      setConnectionStatus('connected');
      socket.emit('join-room', { roomId, userId, userName });
    };

    const onDisconnect = () => {
      setConnected(false);
      setConnectionStatus('disconnected');
    };

    const onReconnect = () => {
      setConnectionStatus('reconnecting');
    };

    // Room state
    const onRoomState = (state) => {
      setNotepadContent(state.notepadContent || '');
      setCounterValue(state.counterValue || 0);
      setAccentColor(state.accentColor || '#6366f1');
      setMyColor(state.color || '#6366f1');
      setConnected(true);
      setConnectionStatus('connected');
    };

    // Edit history
    const onEditHistory = (history) => setEditHistory(history);

    // Counter
    const onCounterUpdate = ({ value, log }) => {
      setCounterValue(value);
      setCounterLogs(prev => [...prev, log]);
    };
    const onCounterLogs = (logs) => setCounterLogs(logs);

    // Accent color
    const onAccentColor = ({ color, userName: who }) => {
      setAccentColor(color);
      if (who) addToast(`🎨 ${who} changed the room theme`);
    };

    // Emoji reactions
    const onEmojiReaction = ({ emoji, userName: who, userId: fromId }) => {
      if (fromId !== userId) {
        spawnFloatingEmoji(emoji, who);
      }
    };

    // Presence
    const onPresenceUpdate = (list) => setPeers(list);
    const onPeerJoined = ({ userName: who }) => addToast(`👋 ${who} joined the room`);
    const onPeerLeft = ({ userName: who }) => { if (who) addToast(`👋 ${who} left the room`); };

    // Typing
    const onTyping = ({ userId: typistId, userName: typistName, isTyping }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        if (isTyping) {
          next[typistId] = typistName;
        } else {
          delete next[typistId];
        }
        return next;
      });
    };

    // Shoutouts
    const onShoutoutsHistory = (list) => setShoutouts(list);
    const onNewShoutout = (shoutout) => {
      setShoutouts(prev => [...prev, shoutout]);
      addToast(`📢 ${shoutout.userName}: "${shoutout.message.substring(0, 50)}"`);
    };

    // Polls
    const onPollsState = (list) => setPolls(list);
    const onNewPoll = (poll) => {
      setPolls(prev => [...prev, poll]);
      addToast(`📊 ${poll.creatorName} created a new poll`);
    };
    const onPollUpdated = (poll) => {
      setPolls(prev => prev.map(p => p._id === poll._id ? poll : p));
    };
    const onPollClosed = ({ pollId }) => {
      setPolls(prev => prev.filter(p => p._id !== pollId));
    };

    // Quiz
    const onQuizState = (q) => setQuiz(q);
    const onQuizEnded = () => { setQuiz(null); addToast('🎯 Quiz has ended!'); };

    // Whiteboard
    const onWhiteboardState = (strokes) => setWhiteboardStrokes(strokes);
    const onWhiteboardDraw = ({ stroke }) => setWhiteboardStrokes(prev => [...prev, stroke]);
    const onWhiteboardClear = () => setWhiteboardStrokes([]);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnecting', onReconnect);
    socket.on('room-state', onRoomState);
    socket.on('edit-history', onEditHistory);
    socket.on('counter-update', onCounterUpdate);
    socket.on('counter-logs', onCounterLogs);
    socket.on('accent-color', onAccentColor);
    socket.on('emoji-reaction', onEmojiReaction);
    socket.on('presence-update', onPresenceUpdate);
    socket.on('peer-joined', onPeerJoined);
    socket.on('peer-left', onPeerLeft);
    socket.on('typing', onTyping);
    socket.on('shoutouts-history', onShoutoutsHistory);
    socket.on('new-shoutout', onNewShoutout);
    socket.on('polls-state', onPollsState);
    socket.on('new-poll', onNewPoll);
    socket.on('poll-updated', onPollUpdated);
    socket.on('poll-closed', onPollClosed);
    socket.on('quiz-state', onQuizState);
    socket.on('quiz-ended', onQuizEnded);
    socket.on('whiteboard-state', onWhiteboardState);
    socket.on('whiteboard-draw', onWhiteboardDraw);
    socket.on('whiteboard-clear', onWhiteboardClear);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnecting', onReconnect);
      socket.off('room-state', onRoomState);
      socket.off('edit-history', onEditHistory);
      socket.off('counter-update', onCounterUpdate);
      socket.off('counter-logs', onCounterLogs);
      socket.off('accent-color', onAccentColor);
      socket.off('emoji-reaction', onEmojiReaction);
      socket.off('presence-update', onPresenceUpdate);
      socket.off('peer-joined', onPeerJoined);
      socket.off('peer-left', onPeerLeft);
      socket.off('typing', onTyping);
      socket.off('shoutouts-history', onShoutoutsHistory);
      socket.off('new-shoutout', onNewShoutout);
      socket.off('polls-state', onPollsState);
      socket.off('new-poll', onNewPoll);
      socket.off('poll-updated', onPollUpdated);
      socket.off('poll-closed', onPollClosed);
      socket.off('quiz-state', onQuizState);
      socket.off('quiz-ended', onQuizEnded);
      socket.off('whiteboard-state', onWhiteboardState);
      socket.off('whiteboard-draw', onWhiteboardDraw);
      socket.off('whiteboard-clear', onWhiteboardClear);
      socket.disconnect();
    };
  }, [userName, roomId, userId, addToast]);

  // Set accent color as CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--room-accent', accentColor);
    // Generate a complementary color for second glow
    const hue = hexToHue(accentColor);
    const comp = `hsl(${(hue + 120) % 360}, 70%, 50%)`;
    document.documentElement.style.setProperty('--room-accent-2', comp);
  }, [accentColor]);

  function hexToHue(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return Math.round(h * 360);
  }

  // Spawn floating emoji
  function spawnFloatingEmoji(emoji, fromName) {
    const el = document.createElement('div');
    el.className = 'floating-reaction';
    el.innerHTML = `${emoji}<span class="name-tag">${fromName}</span>`;
    el.style.left = (Math.random() * 70 + 15) + 'vw';
    el.style.bottom = '80px';
    el.style.setProperty('--drift', (Math.random() - 0.5).toString());
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  // Handle accent color change
  const handleAccentChange = (color) => {
    setAccentColor(color);
    socket.emit('accent-color', { color, userId, userName });
  };

  // Handle emoji reaction
  const handleEmoji = (emoji) => {
    socket.emit('emoji-reaction', { emoji, userId, userName });
    spawnFloatingEmoji(emoji, 'You');
  };

  // Counter actions
  const handleCounterAction = (actionType) => {
    socket.emit('counter-action', { actionType, userId, userName });
  };

  // Shoutout
  const handleShoutout = (message) => {
    socket.emit('shoutout', { message, userId, userName });
  };

  // Copy link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => addToast('📋 Room link copied to clipboard!'));
  };

  // New room
  const handleNewRoom = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    navigate(`/room/${code}`);
    window.location.reload();
  };

  // Name change
  const handleNameChange = (newName) => {
    localStorage.setItem('syncspace-user-name', newName);
    setUserName(newName);
    window.location.reload();
  };

  // Live Cursor tracking and click broadcasting
  useEffect(() => {
    let lastSent = 0;
    const onMouseMove = (e) => {
      if (!connected) return;
      const now = Date.now();
      if (now - lastSent > 25) {
        lastSent = now;
        socket.emit('cursor-move', {
          x: e.clientX / window.innerWidth,
          y: e.clientY / window.innerHeight,
        });
      }
    };

    const onClick = (e) => {
      if (!connected) return;
      socket.emit('cursor-click', {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
    };
  }, [connected]);

  // Accent swatches
  const SWATCH_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f43f5e', '#14b8a6'];

  if (showNameModal) {
    return <NameModal onSubmit={handleNameSubmit} />;
  }

  return (
    <div className="min-h-screen relative">
      {/* Ambient Background */}
      <div className="ambient-glow" />
      <div className="ambient-glow-2" />
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 20%, ${accentColor}20 0%, transparent 40%), radial-gradient(circle at 85% 80%, ${accentColor}15 0%, transparent 45%)`,
        }}
      />

      {/* Live Cursors */}
      <LiveCursors currentUserId={userId} />

      {/* Header */}
      <Header
        roomId={roomId}
        userName={userName}
        myColor={myColor}
        connectionStatus={connectionStatus}
        accentColor={accentColor}
        onCopyLink={handleCopyLink}
        onNewRoom={handleNewRoom}
        onNameChange={handleNameChange}
      />

      {/* Main Layout */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-5 py-6 grid gap-5 grid-cols-1 lg:grid-cols-[2.2fr_1fr]">
        {/* Left Column */}
        <section className="flex flex-col gap-5">
          {/* Notepad */}
          <Notepad
            roomId={roomId}
            userId={userId}
            userName={userName}
            initialContent={notepadContent}
            editHistory={editHistory}
            typingUsers={typingUsers}
          />

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Counter & Accent */}
            <div className="glass-card flex flex-col gap-4">
              <Counter
                value={counterValue}
                logs={counterLogs}
                accentColor={accentColor}
                onAction={handleCounterAction}
              />
              <div>
                <h3 className="text-xs uppercase tracking-wider text-text-muted font-semibold mb-3">Room Ambient Accent</h3>
                <div className="flex gap-2 flex-wrap">
                  {SWATCH_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => handleAccentChange(c)}
                      className={`swatch-btn ${accentColor === c ? 'active' : ''}`}
                      style={{ backgroundColor: c }}
                      title={`Set accent to ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Emoji & Tasks */}
            <div className="glass-card flex flex-col gap-4">
              <EmojiReactions onEmoji={handleEmoji} />
              <TaskList
                roomId={roomId}
                userId={userId}
                userName={userName}
              />
            </div>
          </div>

          {/* Shoutouts */}
          <Shoutouts
            shoutouts={shoutouts}
            onShoutout={handleShoutout}
          />
        </section>

        {/* Right Column */}
        <aside className="flex flex-col gap-5">
          {/* Presence */}
          <Presence
            peers={peers}
            mySocketId={socket.id}
            accentColor={accentColor}
          />

          {/* Interactive Panel (Quiz, Poll, Whiteboard) */}
          <WorkspacePanel
            roomId={roomId}
            userId={userId}
            userName={userName}
            polls={polls}
            quiz={quiz}
            whiteboardStrokes={whiteboardStrokes}
            accentColor={accentColor}
          />
        </aside>
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
