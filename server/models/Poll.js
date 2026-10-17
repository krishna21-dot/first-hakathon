import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: [{ userId: String, userName: String }],
});

const pollSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  creatorId: { type: String, required: true },
  creatorName: { type: String, required: true },
  question: { type: String, required: true },
  options: [pollOptionSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

pollSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model('Poll', pollSchema);
