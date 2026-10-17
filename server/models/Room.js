import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  notepadContent: { type: String, default: '' },
  counterValue: { type: Number, default: 0 },
  accentColor: { type: String, default: '#6366f1' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

roomSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Room', roomSchema);
