const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Shared = require('../models/Shared');
const User = require('../models/User');
const { authMiddleware: auth } = require('./auth');

// Helper to map DB paper to frontend format (mostly handled by Mongoose now)
const mapFromDb = (p) => {
  if (!p) return null;
  const obj = p.toObject ? p.toObject() : p;
  return {
    ...obj,
    id: obj._id,
  };
};

// POST /api/papers - create
router.post('/', auth, async (req, res) => {
  try {
    const paper = new Paper({
      ...req.body,
      owner: req.userId
    });
    await paper.save();
    res.json({ paper: mapFromDb(paper) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers - list for current user
router.get('/', auth, async (req, res) => {
  try {
    const papers = await Paper.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json({ papers: papers.map(mapFromDb) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/stats - returns counts for dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const total = await Paper.countDocuments({ owner: req.userId });
    
    const all = await Paper.find({ owner: req.userId });
    const isComplete = (p) => {
      const hasTitle = (p.paperTitle && p.paperTitle.trim().length > 0) || (p.courseName && p.courseName.trim().length > 0);
      const hasQuestions = Array.isArray(p.sections) && p.sections.some(s => Array.isArray(s.questions) && s.questions.some(q => (q.text && q.text.trim().length > 0) || (q.marks && q.marks > 0)));
      return hasTitle && (p.totalQuestions && p.totalQuestions > 0) && hasQuestions;
    };
    
    let drafts = 0;
    for (const p of all) if (!isComplete(p)) drafts++;

    const sharedCount = await Shared.countDocuments({ sender_id: req.userId });

    const user = await User.findById(req.userId);
    const receivedCount = await Shared.countDocuments({ recipient_email: user?.email || '' });

    const latestShared = await Shared.findOne({ recipient_email: user?.email || '' }).sort({ created_at: -1 });
    
    res.json({ 
      total, 
      drafts, 
      shared: sharedCount, 
      received: receivedCount, 
      latestReceivedAt: latestShared ? latestShared.created_at : null 
    });
  } catch (err) { 
    console.error(err); 
    res.status(500).json({ message: 'Server error' }); 
  }
});

// GET /api/papers/:id - get single
router.get('/:id', auth, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Not found' });
    if (paper.owner.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    res.json({ paper: mapFromDb(paper) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/papers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Not found' });
    if (paper.owner.toString() !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    await Paper.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
