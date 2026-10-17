import mongoose from 'mongoose';

const counterLogSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  actionType: { type: String, enum: ['+1', '-1', 'reset'], required: true },
  newValue: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

counterLogSchema.index({ roomId: 1, timestamp: -1 });

export default mongoose.model('CounterLog', counterLogSchema);
