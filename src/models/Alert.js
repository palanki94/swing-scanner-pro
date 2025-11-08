import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  pattern: { type: String, required: true },
  entry: { type: Number, required: true },
  stop: { type: Number, required: true },
  target: { type: Number, required: true },
  rr: { type: String, required: true },
  rsi: { type: Number },
  chartPath: { type: String },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' }
});

export default mongoose.model('Alert', alertSchema);
