
const mongoose = require('mongoose');
const User = require('./User');

const sharedSchema = new mongoose.Schema({
  paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedAt: { type: Date, default: Date.now },
  accessLevel: { type: String, enum: ['view', 'edit'], default: 'view' }
});

module.exports = mongoose.model('Shared', sharedSchema);
