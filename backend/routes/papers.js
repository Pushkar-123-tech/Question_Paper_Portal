const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Shared = require('../models/Shared');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// simple auth middleware
function auth(req, res, next){
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Unauthorized' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// POST /api/papers - create
router.post('/', auth, async (req, res) => {
  try {
    const data = req.body;
    // Ensure logos are not saved — ignore any provided logo fields
    if (data.jspmLogo) delete data.jspmLogo;
    if (data.rscoeLogo) delete data.rscoeLogo;
    data.owner = req.userId;
    const paper = new Paper(data);
    await paper.save();
    res.json({ paper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers - list for current user
router.get('/', auth, async (req, res) => {
  try {
    const papers = await Paper.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json({ papers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/stats - returns counts for dashboard
router.get('/stats', auth, async (req, res) => {
  try{
    const total = await Paper.countDocuments({ owner: req.userId });
    const all = await Paper.find({ owner: req.userId }).lean();
    const isComplete = (p) => {
      const hasTitle = (p.paperTitle && p.paperTitle.trim().length>0) || (p.courseName && p.courseName.trim().length>0);
      const hasQuestions = Array.isArray(p.sections) && p.sections.some(s => Array.isArray(s.questions) && s.questions.some(q => (q.text && q.text.trim().length>0) || (q.marks && q.marks>0)));
      return hasTitle && (p.totalQuestions && p.totalQuestions>0) && hasQuestions;
    };
    let drafts = 0;
    for(const p of all) if(!isComplete(p)) drafts++;
    const shared = await Shared.countDocuments({ senderId: req.userId });
    const user = await User.findById(req.userId).lean();
    const received = user && user.email ? await Shared.countDocuments({ recipientEmail: user.email }) : 0;
    // include latest received timestamp for notification seen logic
    let latestReceivedAt = null;
    if(user && user.email){
      const latest = await Shared.findOne({ recipientEmail: user.email }).sort({ createdAt: -1 }).lean();
      if(latest && latest.createdAt) latestReceivedAt = latest.createdAt;
    }
    res.json({ total, drafts, shared, received, latestReceivedAt });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/papers/:id - get single
router.get('/:id', auth, async (req, res) => {
  try {
    const p = await Paper.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (String(p.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });
    res.json({ paper: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/papers/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const p = await Paper.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Not found' });
    if (String(p.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });
    await p.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;