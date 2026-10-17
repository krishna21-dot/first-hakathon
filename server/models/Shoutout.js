import mongoose from 'mongoose';

const shoutoutSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  message: { type: String, required: true, maxlength: 280 },
  timestamp: { type: Date, default: Date.now },
});

shoutoutSchema.index({ roomId: 1, timestamp: -1 });

export default mongoose.model('Shoutout', shoutoutSchema);
