const mongoose = require('mongoose');

const sharedSchema = new mongoose.Schema({
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender_name: String,
  sender_email: String,
  recipient_email: { type: String, required: true },
  message: String,
  paper_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  paper_snapshot: Object, // Stores a copy of the paper at the time of sharing
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shared', sharedSchema);
