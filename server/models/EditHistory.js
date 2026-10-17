import mongoose from 'mongoose';

const editHistorySchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  diff: { type: String, default: '' },
  fullText: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
});

editHistorySchema.index({ roomId: 1, timestamp: -1 });

export default mongoose.model('EditHistory', editHistorySchema);
