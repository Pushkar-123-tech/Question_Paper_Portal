const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Paper = require('../models/Paper');
const Shared = require('../models/Shared');
const nodemailer = require('nodemailer');

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

// POST /api/share/send
router.post('/send', auth, async (req, res) => {
  const { paperId, recipientEmail, message } = req.body;
  if (!paperId || !recipientEmail) return res.status(400).json({ message: 'paperId and recipientEmail required' });
  try{
    const user = await User.findById(req.userId).lean();
    if(!user) return res.status(401).json({ message: 'Invalid user' });
    const paper = await Paper.findById(paperId).lean();
    if(!paper) return res.status(404).json({ message: 'Paper not found' });
    if(String(paper.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });

    const shared = new Shared({
      senderId: req.userId,
      senderName: user.name,
      senderEmail: user.email,
      recipientEmail,
      message: message || '',
      paperId,
      paperSnapshot: paper,
    });
    await shared.save();

    // Try to send email if SMTP configured
    if(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS){
      try{
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: (process.env.SMTP_SECURE === 'true'),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        const html = `<h3>Question Paper shared by ${user.name} &lt;${user.email}&gt;</h3>
        <p>${message || ''}</p>
        <h4>Paper: ${paper.paperTitle || paper.courseName || 'Untitled'}</h4>
        <pre style="white-space:pre-wrap;">${JSON.stringify(paper, null, 2)}</pre>`;
        await transporter.sendMail({
          from: `${user.name} <${user.email}>`,
          to: recipientEmail,
          subject: `Shared Question Paper: ${paper.paperTitle||paper.courseName||'Paper'}`,
          html,
        });
      }catch(e){
        console.error('Email send failed:', e);
        // don't fail the API if email can't be sent; still return success with warn
        return res.json({ message: 'Shared (email send failed)', warn: true, shared });
      }
    }

    res.json({ message: 'Shared', shared });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/share/received - list shares where recipient is the logged-in user's email
router.get('/received', auth, async (req, res) => {
  try{
    const user = await User.findById(req.userId).lean();
    if(!user) return res.status(401).json({ message: 'Invalid user' });
    const list = await Shared.find({ recipientEmail: user.email }).sort({ createdAt: -1 });
    res.json({ list });
  }catch(e){ console.error(e); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/share/:id - get shared record if recipient is user or sender is user
router.get('/:id', auth, async (req, res) => {
  try{
    const user = await User.findById(req.userId).lean();
    if(!user) return res.status(401).json({ message: 'Invalid user' });
    const sh = await Shared.findById(req.params.id).lean();
    if(!sh) return res.status(404).json({ message: 'Not found' });
    if(sh.recipientEmail !== user.email && String(sh.senderId) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });
    res.json({ shared: sh });
  }catch(e){ console.error(e); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;