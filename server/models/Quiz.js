import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctIndex: { type: Number, required: true },
});

const scoreSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  score: { type: Number, default: 0 },
  answers: [{ questionIndex: Number, selectedIndex: Number, correct: Boolean }],
});

const quizSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  creatorId: { type: String, required: true },
  creatorName: { type: String, required: true },
  title: { type: String, required: true },
  questions: [questionSchema],
  scores: [scoreSchema],
  isActive: { type: Boolean, default: true },
  currentQuestionIndex: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

quizSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model('Quiz', quizSchema);
