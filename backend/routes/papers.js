const express = require('express');
const router = express.Router();
const Paper = require('../models/Paper');
const Shared = require('../models/Shared');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const { authMiddleware: auth } = require('./auth');
const roleAuth = require('../middleware/roleAuth');
const Notification = require('../models/Notification');

// POST /api/papers - create
router.post('/', auth, async (req, res) => {
  try {
    const data = req.body;
    // Ensure logos are not saved — ignore any provided logo fields
    if (data.jspmLogo) delete data.jspmLogo;
    if (data.rscoeLogo) delete data.rscoeLogo;
    data.owner = req.userId;
    data.status = 'draft';
    const paper = new Paper(data);
    await paper.save();
    res.json({ paper });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers - list based on role
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    let query = {};

    if (user.role === 'teacher' || user.role === 'faculty') {
      query = { owner: req.userId };
    } else if (user.role === 'chairman') {
      query = { status: { $in: ['submitted_to_chairman', 'pending_coordinator', 'finalized'] } };
    } else if (user.role === 'module_coordinator') {
      query = { status: { $in: ['pending_coordinator', 'finalized'] } };
    } else if (user.role === 'admin') {
      query = {};
    }

    const papers = await Paper.find(query).populate('owner', 'name email').sort({ createdAt: -1 });
    res.json({ papers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/submit - Teacher -> Chairman
router.post('/:id/submit', auth, async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    if (String(paper.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });

    paper.status = 'submitted_to_chairman';
    paper.workflowHistory.push({
      action: 'submitted',
      from: req.userId
    });
    await paper.save();

    // Notify Chairmen
    const chairmen = await User.find({ role: 'chairman' });
    for (const chairman of chairmen) {
      await new Notification({
        recipient: chairman._id,
        sender: req.userId,
        paper: paper._id,
        type: 'workflow_update',
        message: `New question paper submitted: ${paper.paperTitle || paper.courseName}`
      }).save();
    }

    res.json({ message: 'Submitted to Chairman', paper });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/forward - Chairman -> Coordinator
router.post('/:id/forward', auth, roleAuth(['chairman']), async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    paper.status = 'pending_coordinator';
    paper.workflowHistory.push({
      action: 'forwarded',
      from: req.userId
    });
    await paper.save();

    // Notify Coordinators
    const coordinators = await User.find({ role: 'module_coordinator' });
    for (const coordinator of coordinators) {
      await new Notification({
        recipient: coordinator._id,
        sender: req.userId,
        paper: paper._id,
        type: 'workflow_update',
        message: `Paper forwarded for coordination: ${paper.paperTitle || paper.courseName}`
      }).save();
    }

    res.json({ message: 'Forwarded to Module Coordinator', paper });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/finalize - Coordinator -> Teacher
router.post('/:id/finalize', auth, roleAuth(['module_coordinator']), async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    paper.status = 'finalized';
    paper.workflowHistory.push({
      action: 'finalized',
      from: req.userId,
      to: paper.owner
    });
    await paper.save();

    // Notify Teacher
    await new Notification({
      recipient: paper.owner,
      sender: req.userId,
      paper: paper._id,
      type: 'finalized',
      message: `Your paper has been finalized: ${paper.paperTitle || paper.courseName}`
    }).save();

    res.json({ message: 'Paper finalized and teacher notified', paper });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/papers/:id/comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Paper not found' });

    const user = await User.findById(req.userId);
    paper.comments.push({
      user: req.userId,
      userName: user.name,
      role: user.role,
      text
    });
    
    paper.workflowHistory.push({
      action: 'commented',
      from: req.userId
    });

    await paper.save();

    // Notify owner if not the owner
    if (String(paper.owner) !== String(req.userId)) {
      await new Notification({
        recipient: paper.owner,
        sender: req.userId,
        paper: paper._id,
        type: 'comment',
        message: `New comment on your paper from ${user.role}: ${text.substring(0, 50)}...`
      }).save();
    }

    res.json({ message: 'Comment added', paper });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/papers/notifications
router.get('/notifications/all', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .populate('sender', 'name role')
      .populate('paper', 'paperTitle courseName')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ notifications });
  } catch (err) {
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
    const shared = await Shared.countDocuments({ sender_id: req.userId });
    const user = await User.findById(req.userId).lean();
    const received = user && user.email ? await Shared.countDocuments({ recipient_email: user.email }) : 0;
    // include latest received timestamp for notification seen logic
    let latestReceivedAt = null;
    if(user && user.email){
      const latest = await Shared.findOne({ recipient_email: user.email }).sort({ created_at: -1 }).lean();
      if(latest && latest.created_at) latestReceivedAt = latest.created_at;
    }
    res.json({ total, drafts, shared, received, latestReceivedAt });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/papers/:id - get single
router.get('/:id', auth, async (req, res) => {
  try {
    const p = await Paper.findById(req.params.id).populate('owner', 'name email');
    if (!p) return res.status(404).json({ message: 'Not found' });
    
    const user = await User.findById(req.userId);
    // Access control: owner OR (Chairman if submitted+) OR (Coordinator if pending+) OR Admin
    const isOwner = String(p.owner._id) === String(req.userId);
    const isChairman = user.role === 'chairman' && ['submitted_to_chairman', 'pending_coordinator', 'finalized'].includes(p.status);
    const isCoordinator = user.role === 'module_coordinator' && ['pending_coordinator', 'finalized'].includes(p.status);
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isChairman && !isCoordinator && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
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