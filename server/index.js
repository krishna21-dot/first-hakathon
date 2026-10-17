import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as Y from 'yjs';
import * as storage from './storage.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 5e6,
});

app.use(express.json());

// ─── Initialize Storage ───────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncspace';
await storage.initStorage(MONGO_URI);

// ─── Yjs Document Store (in-memory per room) ──────────────────────
const yjsDocs = new Map();

function getYDoc(roomId) {
  if (!yjsDocs.has(roomId)) {
    const doc = new Y.Doc();
    yjsDocs.set(roomId, doc);
  }
  return yjsDocs.get(roomId);
}

// ─── Room Presence Tracking ────────────────────────────────────────
const roomPeers = new Map(); // roomId -> Map(socketId -> { userId, userName, color })

const PEER_COLORS = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4',
  '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316', '#3b82f6',
  '#a855f7', '#22c55e', '#eab308', '#e11d48', '#0ea5e9',
];

function getPeerColor(index) {
  return PEER_COLORS[index % PEER_COLORS.length];
}

function getRoomPeers(roomId) {
  if (!roomPeers.has(roomId)) {
    roomPeers.set(roomId, new Map());
  }
  return roomPeers.get(roomId);
}

function getPeersList(roomId) {
  const peers = getRoomPeers(roomId);
  return Array.from(peers.entries()).map(([socketId, info]) => ({
    socketId,
    ...info,
  }));
}

// ─── Debounced notepad save ────────────────────────────────────────
const notepadSaveTimers = new Map();

function debouncedSaveNotepad(roomId, text, userId, userName) {
  if (notepadSaveTimers.has(roomId)) {
    clearTimeout(notepadSaveTimers.get(roomId));
  }
  notepadSaveTimers.set(roomId, setTimeout(async () => {
    try {
      await storage.saveRoom(roomId, { notepadContent: text });
      await storage.addEditHistory(roomId, {
        userId,
        userName,
        diff: 'Updated notepad',
        fullText: text,
      });
    } catch (err) {
      console.error('Notepad save error:', err);
    }
    notepadSaveTimers.delete(roomId);
  }, 1500));
}

// ─── Whiteboard state per room ─────────────────────────────────────
const whiteboardStrokes = new Map(); // roomId -> array of strokes

// ─── Socket.io Connection Handler ──────────────────────────────────
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  // ── Join Room ──
  socket.on('join-room', async ({ roomId, userId, userName }) => {
    currentRoom = roomId;
    currentUser = { userId, userName };

    socket.join(roomId);

    // Ensure room in storage
    const room = await storage.getOrCreateRoom(roomId);

    // Track peer presence
    const peers = getRoomPeers(roomId);
    const peerIndex = peers.size;
    const color = getPeerColor(peerIndex);
    peers.set(socket.id, { userId, userName, color });

    // Send room state to joining user
    socket.emit('room-state', {
      notepadContent: room.notepadContent || '',
      counterValue: room.counterValue || 0,
      accentColor: room.accentColor || '#6366f1',
      color,
    });

    // Send Yjs doc state
    const ydoc = getYDoc(roomId);
    // If ydoc is empty but room has saved text, initialize ydoc with saved text
    const ytext = ydoc.getText('notepad');
    if (ytext.toString() === '' && room.notepadContent) {
      ydoc.transact(() => {
        ytext.insert(0, room.notepadContent);
      });
    }
    const state = Y.encodeStateAsUpdate(ydoc);
    socket.emit('yjs-sync', { update: Buffer.from(state).toString('base64') });

    // Send edit history
    const editHistory = await storage.getEditHistory(roomId, 50);
    socket.emit('edit-history', editHistory);

    // Send counter logs
    const counterLogs = await storage.getCounterLogs(roomId, 50);
    socket.emit('counter-logs', counterLogs);

    // Send shoutouts
    const shoutouts = await storage.getShoutouts(roomId, 50);
    socket.emit('shoutouts-history', shoutouts);

    // Send active polls
    const polls = await storage.getPolls(roomId);
    socket.emit('polls-state', polls);

    // Send active quiz
    const quiz = await storage.getQuiz(roomId);
    if (quiz) socket.emit('quiz-state', quiz);

    // Send whiteboard strokes
    if (whiteboardStrokes.has(roomId)) {
      socket.emit('whiteboard-state', whiteboardStrokes.get(roomId));
    }

    // Broadcast presence update
    io.to(roomId).emit('presence-update', getPeersList(roomId));
    socket.to(roomId).emit('peer-joined', { userId, userName, color, socketId: socket.id });
  });

  // ── Yjs Updates (CRDT sync) ──
  socket.on('yjs-update', ({ update, userId, userName }) => {
    if (!currentRoom) return;
    const ydoc = getYDoc(currentRoom);
    const binaryUpdate = Uint8Array.from(Buffer.from(update, 'base64'));
    Y.applyUpdate(ydoc, binaryUpdate);
    socket.to(currentRoom).emit('yjs-update', { update, userId, userName });

    // Save notepad content from Yjs doc
    const ytext = ydoc.getText('notepad');
    const text = ytext.toString();
    debouncedSaveNotepad(currentRoom, text, userId, userName);
  });

  // ── Yjs Awareness (cursors) ──
  socket.on('yjs-awareness', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('yjs-awareness', { ...data, socketId: socket.id });
  });

  // ── Notepad plain-text fallback ──
  socket.on('notepad-update', async ({ text, userId, userName }) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('notepad-update', { text, userId, userName });
    debouncedSaveNotepad(currentRoom, text, userId, userName);
  });

  // ── Counter Actions ──
  socket.on('counter-action', async ({ actionType, userId, userName }) => {
    if (!currentRoom) return;
    try {
      const room = await storage.getOrCreateRoom(currentRoom);
      let newValue = room.counterValue || 0;
      if (actionType === '+1') newValue += 1;
      else if (actionType === '-1') newValue -= 1;
      else if (actionType === 'reset') newValue = 0;

      await storage.saveRoom(currentRoom, { counterValue: newValue });

      const log = await storage.addCounterLog(currentRoom, {
        userId,
        userName,
        actionType,
        newValue,
      });

      io.to(currentRoom).emit('counter-update', {
        value: newValue,
        log,
      });
    } catch (err) {
      console.error('Counter error:', err);
    }
  });

  // ── Accent Color ──
  socket.on('accent-color', async ({ color, userId, userName }) => {
    if (!currentRoom) return;
    await storage.saveRoom(currentRoom, { accentColor: color });
    io.to(currentRoom).emit('accent-color', { color, userId, userName });
  });

  // ── Emoji Reactions ──
  socket.on('emoji-reaction', ({ emoji, userId, userName }) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('emoji-reaction', { emoji, userId, userName });
  });

  // ── Live Cursors ──
  socket.on('cursor-move', ({ x, y }) => {
    if (!currentRoom) return;
    const peers = getRoomPeers(currentRoom);
    const peer = peers.get(socket.id);
    if (!peer) return;
    socket.to(currentRoom).emit('cursor-move', {
      socketId: socket.id,
      userId: peer.userId,
      userName: peer.userName,
      color: peer.color,
      x,
      y,
    });
  });

  socket.on('cursor-click', ({ x, y }) => {
    if (!currentRoom) return;
    const peers = getRoomPeers(currentRoom);
    const peer = peers.get(socket.id);
    if (!peer) return;
    socket.to(currentRoom).emit('cursor-click', {
      socketId: socket.id,
      userId: peer.userId,
      userName: peer.userName,
      color: peer.color,
      x,
      y,
    });
  });

  // ── Typing indicator ──
  socket.on('typing', ({ isTyping }) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('typing', {
      userId: currentUser.userId,
      userName: currentUser.userName,
      isTyping,
    });
  });

  // ── Shoutouts ──
  socket.on('shoutout', async ({ message, userId, userName }) => {
    if (!currentRoom) return;
    try {
      const shoutout = await storage.addShoutout(currentRoom, {
        userId,
        userName,
        message,
      });
      io.to(currentRoom).emit('new-shoutout', shoutout);
    } catch (err) {
      console.error('Shoutout error:', err);
    }
  });

  // ── Polls ──
  socket.on('create-poll', async ({ question, options, userId, userName }) => {
    if (!currentRoom) return;
    try {
      const poll = await storage.createPoll(currentRoom, { question, options, userId, userName });
      io.to(currentRoom).emit('new-poll', poll);
    } catch (err) {
      console.error('Poll create error:', err);
    }
  });

  socket.on('vote-poll', async ({ pollId, optionIndex, userId, userName }) => {
    if (!currentRoom) return;
    try {
      const poll = await storage.votePoll(pollId, optionIndex, userId, userName);
      if (poll) {
        io.to(currentRoom).emit('poll-updated', poll);
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  });

  socket.on('close-poll', async ({ pollId }) => {
    if (!currentRoom) return;
    try {
      await storage.closePoll(pollId);
      io.to(currentRoom).emit('poll-closed', { pollId });
    } catch (err) {
      console.error('Close poll error:', err);
    }
  });

  // ── Quiz ──
  socket.on('create-quiz', async ({ title, questions, userId, userName }) => {
    if (!currentRoom) return;
    try {
      const quiz = await storage.createQuiz(currentRoom, { title, questions, userId, userName });
      io.to(currentRoom).emit('quiz-state', quiz);
    } catch (err) {
      console.error('Quiz create error:', err);
    }
  });

  socket.on('quiz-answer', async ({ quizId, questionIndex, selectedIndex, userId, userName }) => {
    if (!currentRoom) return;
    try {
      const quiz = await storage.answerQuiz(quizId, questionIndex, selectedIndex, userId, userName);
      if (quiz) {
        io.to(currentRoom).emit('quiz-state', quiz);
      }
    } catch (err) {
      console.error('Quiz answer error:', err);
    }
  });

  socket.on('next-question', async ({ quizId }) => {
    if (!currentRoom) return;
    try {
      const quiz = await storage.nextQuestion(quizId);
      if (quiz) {
        io.to(currentRoom).emit('quiz-state', quiz);
      }
    } catch (err) {
      console.error('Next question error:', err);
    }
  });

  socket.on('end-quiz', async ({ quizId }) => {
    if (!currentRoom) return;
    try {
      await storage.endQuiz(quizId);
      io.to(currentRoom).emit('quiz-ended', { quizId });
    } catch (err) {
      console.error('End quiz error:', err);
    }
  });

  // ── Whiteboard ──
  socket.on('whiteboard-draw', ({ stroke }) => {
    if (!currentRoom) return;
    if (!whiteboardStrokes.has(currentRoom)) {
      whiteboardStrokes.set(currentRoom, []);
    }
    whiteboardStrokes.get(currentRoom).push(stroke);
    socket.to(currentRoom).emit('whiteboard-draw', { stroke });
  });

  socket.on('whiteboard-clear', () => {
    if (!currentRoom) return;
    whiteboardStrokes.set(currentRoom, []);
    io.to(currentRoom).emit('whiteboard-clear');
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const peers = getRoomPeers(currentRoom);
    const departedPeer = peers.get(socket.id);
    peers.delete(socket.id);

    if (departedPeer) {
      io.to(currentRoom).emit('peer-left', {
        socketId: socket.id,
        ...departedPeer,
      });
    }

    io.to(currentRoom).emit('presence-update', getPeersList(currentRoom));
    io.to(currentRoom).emit('cursor-remove', { socketId: socket.id });

    if (peers.size === 0) {
      setTimeout(() => {
        const currentPeers = getRoomPeers(currentRoom);
        if (currentPeers.size === 0) {
          yjsDocs.delete(currentRoom);
        }
      }, 5 * 60 * 1000);
    }
  });
});

// ─── REST API Endpoints ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/room/:roomId', async (req, res) => {
  try {
    const room = await storage.getOrCreateRoom(req.params.roomId);
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Production Frontend Static Serving (Unified Deployment) ───────
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '../client/dist');

app.use(express.static(CLIENT_DIST));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) next();
  });
});

// ─── Start Server ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 SyncSpace server running on port ${PORT}`);
});
