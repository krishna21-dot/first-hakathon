import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Room from './models/Room.js';
import EditHistory from './models/EditHistory.js';
import CounterLog from './models/CounterLog.js';
import Shoutout from './models/Shoutout.js';
import Poll from './models/Poll.js';
import Quiz from './models/Quiz.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'syncspace_db.json');

let isMongoConnected = false;

// Fallback in-memory + file store
const memoryDb = {
  rooms: {},        // roomId -> { roomId, notepadContent, counterValue, accentColor, updatedAt }
  editHistory: [],  // [{ roomId, userId, userName, diff, fullText, timestamp }]
  counterLogs: [],  // [{ roomId, userId, userName, actionType, newValue, timestamp }]
  shoutouts: [],    // [{ _id, roomId, userId, userName, message, timestamp }]
  polls: [],        // [{ _id, roomId, creatorId, creatorName, question, options: [{ text, votes: [] }], isActive, createdAt }]
  quizzes: [],      // [{ _id, roomId, creatorId, creatorName, title, questions, currentQuestionIndex, scores, isActive, createdAt }]
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      Object.assign(memoryDb, data);
    } catch (e) {
      console.warn('⚠️ Could not parse existing DB file, starting fresh:', e.message);
    }
  }
}

let saveTimer = null;
function persistToFile() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(memoryDb, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write DB file:', e.message);
    }
    saveTimer = null;
  }, 500);
}

// Initialize database
export async function initStorage(mongoUri) {
  ensureDataFile();

  if (mongoUri) {
    try {
      console.log(`🔌 Attempting MongoDB connection to ${mongoUri}...`);
      mongoose.set('bufferCommands', false); // Do not hang operations if disconnected
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      });
      isMongoConnected = true;
      console.log('✅ MongoDB connected successfully! Using MongoDB for persistent storage.');
      return;
    } catch (err) {
      console.log('ℹ️ MongoDB is not running or unreachable (' + err.message + ').');
      console.log('📁 Using local persistent file-backed database storage (server/data/syncspace_db.json).');
      isMongoConnected = false;
    }
  } else {
    console.log('📁 No MongoDB URI configured. Using local persistent file storage.');
  }
}

// ── Room ──
export async function getOrCreateRoom(roomId) {
  if (isMongoConnected) {
    try {
      let room = await Room.findOne({ roomId });
      if (!room) {
        room = await Room.create({ roomId });
      }
      return room.toObject();
    } catch (err) {
      console.error('Mongo getOrCreateRoom error, falling back to memory:', err.message);
    }
  }

  if (!memoryDb.rooms[roomId]) {
    memoryDb.rooms[roomId] = {
      roomId,
      notepadContent: '',
      counterValue: 0,
      accentColor: '#6366f1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persistToFile();
  }
  return memoryDb.rooms[roomId];
}

export async function saveRoom(roomId, fields) {
  if (isMongoConnected) {
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { ...fields, updatedAt: Date.now() },
        { upsert: true, new: true }
      );
      return;
    } catch (err) {
      console.error('Mongo saveRoom error:', err.message);
    }
  }

  if (!memoryDb.rooms[roomId]) {
    memoryDb.rooms[roomId] = { roomId, notepadContent: '', counterValue: 0, accentColor: '#6366f1' };
  }
  Object.assign(memoryDb.rooms[roomId], fields, { updatedAt: new Date().toISOString() });
  persistToFile();
}

// ── Edit History ──
export async function addEditHistory(roomId, entry) {
  const record = {
    roomId,
    userId: entry.userId,
    userName: entry.userName,
    diff: entry.diff || 'Updated notepad',
    fullText: (entry.fullText || '').substring(0, 5000),
    timestamp: new Date().toISOString(),
  };

  if (isMongoConnected) {
    try {
      await EditHistory.create(record);
      return;
    } catch (err) {
      console.error('Mongo addEditHistory error:', err.message);
    }
  }

  memoryDb.editHistory.push(record);
  if (memoryDb.editHistory.length > 200) memoryDb.editHistory.shift();
  persistToFile();
}

export async function getEditHistory(roomId, limit = 50) {
  if (isMongoConnected) {
    try {
      const items = await EditHistory.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return items.reverse();
    } catch (err) {
      console.error('Mongo getEditHistory error:', err.message);
    }
  }

  return memoryDb.editHistory
    .filter(e => e.roomId === roomId)
    .slice(-limit);
}

// ── Counter Log ──
export async function addCounterLog(roomId, entry) {
  const record = {
    _id: 'cl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    roomId,
    userId: entry.userId,
    userName: entry.userName,
    actionType: entry.actionType,
    newValue: entry.newValue,
    timestamp: new Date().toISOString(),
  };

  if (isMongoConnected) {
    try {
      const saved = await CounterLog.create(record);
      return saved.toObject();
    } catch (err) {
      console.error('Mongo addCounterLog error:', err.message);
    }
  }

  memoryDb.counterLogs.push(record);
  if (memoryDb.counterLogs.length > 200) memoryDb.counterLogs.shift();
  persistToFile();
  return record;
}

export async function getCounterLogs(roomId, limit = 50) {
  if (isMongoConnected) {
    try {
      const items = await CounterLog.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return items.reverse();
    } catch (err) {
      console.error('Mongo getCounterLogs error:', err.message);
    }
  }

  return memoryDb.counterLogs
    .filter(c => c.roomId === roomId)
    .slice(-limit);
}

// ── Shoutouts ──
export async function addShoutout(roomId, entry) {
  const record = {
    _id: 'sh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    roomId,
    userId: entry.userId,
    userName: entry.userName,
    message: entry.message,
    timestamp: new Date().toISOString(),
  };

  if (isMongoConnected) {
    try {
      const saved = await Shoutout.create(record);
      return saved.toObject();
    } catch (err) {
      console.error('Mongo addShoutout error:', err.message);
    }
  }

  memoryDb.shoutouts.push(record);
  if (memoryDb.shoutouts.length > 200) memoryDb.shoutouts.shift();
  persistToFile();
  return record;
}

export async function getShoutouts(roomId, limit = 50) {
  if (isMongoConnected) {
    try {
      const items = await Shoutout.find({ roomId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return items.reverse();
    } catch (err) {
      console.error('Mongo getShoutouts error:', err.message);
    }
  }

  return memoryDb.shoutouts
    .filter(s => s.roomId === roomId)
    .slice(-limit);
}

// ── Polls ──
export async function createPoll(roomId, { question, options, userId, userName }) {
  const pollData = {
    _id: 'poll_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    roomId,
    creatorId: userId,
    creatorName: userName,
    question,
    options: options.map(text => ({ text, votes: [] })),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (isMongoConnected) {
    try {
      const saved = await Poll.create(pollData);
      return saved.toObject();
    } catch (err) {
      console.error('Mongo createPoll error:', err.message);
    }
  }

  memoryDb.polls.push(pollData);
  persistToFile();
  return pollData;
}

export async function getPolls(roomId) {
  if (isMongoConnected) {
    try {
      return await Poll.find({ roomId, isActive: true }).lean();
    } catch (err) {
      console.error('Mongo getPolls error:', err.message);
    }
  }

  return memoryDb.polls.filter(p => p.roomId === roomId && p.isActive);
}

export async function votePoll(pollId, optionIndex, userId, userName) {
  if (isMongoConnected) {
    try {
      const poll = await Poll.findById(pollId);
      if (!poll || !poll.isActive) return null;

      poll.options.forEach(opt => {
        opt.votes = opt.votes.filter(v => v.userId !== userId);
      });
      if (optionIndex >= 0 && optionIndex < poll.options.length) {
        poll.options[optionIndex].votes.push({ userId, userName });
      }
      await poll.save();
      return poll.toObject();
    } catch (err) {
      console.error('Mongo votePoll error:', err.message);
    }
  }

  const poll = memoryDb.polls.find(p => p._id === pollId && p.isActive);
  if (!poll) return null;

  poll.options.forEach(opt => {
    opt.votes = opt.votes.filter(v => v.userId !== userId);
  });
  if (optionIndex >= 0 && optionIndex < poll.options.length) {
    poll.options[optionIndex].votes.push({ userId, userName });
  }
  persistToFile();
  return poll;
}

export async function closePoll(pollId) {
  if (isMongoConnected) {
    try {
      await Poll.findByIdAndUpdate(pollId, { isActive: false });
      return;
    } catch (err) {
      console.error('Mongo closePoll error:', err.message);
    }
  }

  const poll = memoryDb.polls.find(p => p._id === pollId);
  if (poll) {
    poll.isActive = false;
    persistToFile();
  }
}

// ── Quiz ──
export async function createQuiz(roomId, { title, questions, userId, userName }) {
  const quizData = {
    _id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    roomId,
    creatorId: userId,
    creatorName: userName,
    title,
    questions,
    currentQuestionIndex: 0,
    scores: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  if (isMongoConnected) {
    try {
      await Quiz.updateMany({ roomId, isActive: true }, { isActive: false });
      const saved = await Quiz.create(quizData);
      return saved.toObject();
    } catch (err) {
      console.error('Mongo createQuiz error:', err.message);
    }
  }

  memoryDb.quizzes.forEach(q => {
    if (q.roomId === roomId) q.isActive = false;
  });
  memoryDb.quizzes.push(quizData);
  persistToFile();
  return quizData;
}

export async function getQuiz(roomId) {
  if (isMongoConnected) {
    try {
      return await Quiz.findOne({ roomId, isActive: true }).lean();
    } catch (err) {
      console.error('Mongo getQuiz error:', err.message);
    }
  }

  return memoryDb.quizzes.find(q => q.roomId === roomId && q.isActive) || null;
}

export async function answerQuiz(quizId, questionIndex, selectedIndex, userId, userName) {
  if (isMongoConnected) {
    try {
      const quiz = await Quiz.findById(quizId);
      if (!quiz || !quiz.isActive) return null;
      const question = quiz.questions[questionIndex];
      if (!question) return null;

      const correct = selectedIndex === question.correctIndex;
      let scoreRecord = quiz.scores.find(s => s.userId === userId);
      if (!scoreRecord) {
        quiz.scores.push({ userId, userName, score: 0, answers: [] });
        scoreRecord = quiz.scores[quiz.scores.length - 1];
      }
      if (scoreRecord.answers.some(a => a.questionIndex === questionIndex)) {
        return null; // Already answered
      }
      scoreRecord.answers.push({ questionIndex, selectedIndex, correct });
      if (correct) scoreRecord.score += 1;

      await quiz.save();
      return quiz.toObject();
    } catch (err) {
      console.error('Mongo answerQuiz error:', err.message);
    }
  }

  const quiz = memoryDb.quizzes.find(q => q._id === quizId && q.isActive);
  if (!quiz) return null;
  const question = quiz.questions[questionIndex];
  if (!question) return null;

  const correct = selectedIndex === question.correctIndex;
  let scoreRecord = quiz.scores.find(s => s.userId === userId);
  if (!scoreRecord) {
    scoreRecord = { userId, userName, score: 0, answers: [] };
    quiz.scores.push(scoreRecord);
  }
  if (scoreRecord.answers.some(a => a.questionIndex === questionIndex)) {
    return null;
  }
  scoreRecord.answers.push({ questionIndex, selectedIndex, correct });
  if (correct) scoreRecord.score += 1;
  persistToFile();
  return quiz;
}

export async function nextQuestion(quizId) {
  if (isMongoConnected) {
    try {
      const quiz = await Quiz.findById(quizId);
      if (!quiz || !quiz.isActive) return null;
      if (quiz.currentQuestionIndex < quiz.questions.length - 1) {
        quiz.currentQuestionIndex += 1;
        await quiz.save();
      }
      return quiz.toObject();
    } catch (err) {
      console.error('Mongo nextQuestion error:', err.message);
    }
  }

  const quiz = memoryDb.quizzes.find(q => q._id === quizId && q.isActive);
  if (!quiz) return null;
  if (quiz.currentQuestionIndex < quiz.questions.length - 1) {
    quiz.currentQuestionIndex += 1;
    persistToFile();
  }
  return quiz;
}

export async function endQuiz(quizId) {
  if (isMongoConnected) {
    try {
      await Quiz.findByIdAndUpdate(quizId, { isActive: false });
      return;
    } catch (err) {
      console.error('Mongo endQuiz error:', err.message);
    }
  }

  const quiz = memoryDb.quizzes.find(q => q._id === quizId);
  if (quiz) {
    quiz.isActive = false;
    persistToFile();
  }
}
