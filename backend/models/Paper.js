const mongoose = require('mongoose');

const subQuestionSchema = new mongoose.Schema({
  label: String,
  text: String,
  marks: Number,
  bl: String,
  co: String
}, { _id:false });

const questionSchema = new mongoose.Schema({
  qno: Number,
  text: String,
  marks: Number,
  bl: String,
  co: String,
  subQuestions: [subQuestionSchema]
}, { _id:false });

const sectionSchema = new mongoose.Schema({
  title: String,
  questions: [questionSchema]
}, { _id:false });

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
  status: { 
    type: String, 
    enum: ['draft', 'submitted_to_chairman', 'pending_coordinator', 'finalized'], 
    default: 'draft' 
  },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: String,
    role: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  workflowHistory: [{
    action: String, // 'submitted', 'forwarded', 'commented', 'finalized'
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Paper', paperSchema);