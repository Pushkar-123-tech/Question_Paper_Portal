const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  title: String,
  marks: Number,
  questions: [{
    text: String,
    marks: Number,
    co: String,
    btl: String
  }]
});

const paperSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paperTitle: String,
  examination: String,
  semester: String,
  academicYear: String,
  program: String,
  programName: String,
  courseCode: String,
  courseName: String,
  duration: String,
  maxMarks: Number,
  totalQuestions: Number,
  courseOutcomes: [String],
  instructions: [String],
  sections: [sectionSchema],
  qpCode: String,
  prnNo: String,
  jspmLogo: String,
  rscoeLogo: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Paper', paperSchema);
