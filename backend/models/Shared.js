const mongoose = require('mongoose');

const SharedSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: String,
  senderEmail: String,
  recipientEmail: String,
  message: String,
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper' },
  paperSnapshot: Object,
}, { timestamps: true });

module.exports = mongoose.model('Shared', SharedSchema);