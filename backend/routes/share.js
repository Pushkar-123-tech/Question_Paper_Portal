const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { authMiddleware: auth } = require('./auth');
const supabase = require('../supabaseClient');

// POST /api/share/send
router.post('/send', auth, async (req, res) => {
  const { paperId, recipientEmail, message } = req.body || {};
  if (!paperId || !recipientEmail) {
    console.warn('Share failed: Missing paperId or recipientEmail', { paperId, recipientEmail });
    return res.status(400).json({ message: 'paperId and recipientEmail required' });
  }
  
  try {
    // Validate UUID format for paperId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(paperId)) {
      console.warn('Share failed: Invalid paperId format', paperId);
      return res.status(400).json({ message: 'Invalid paperId format' });
    }
    const { data: sender } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();
    
    if (!sender) return res.status(401).json({ message: 'Invalid user' });

    const { data: paper } = await supabase
      .from('papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (!paper) return res.status(404).json({ message: 'Paper not found' });
    if (paper.owner && String(paper.owner) !== String(req.userId)) return res.status(403).json({ message: 'Forbidden' });

    const { data: shared, error: insertError } = await supabase
      .from('shared')
      .insert([{
        sender_id: req.userId,
        sender_name: sender.name,
        sender_email: sender.email,
        recipient_email: recipientEmail,
        message: message || '',
        paper_id: paperId,
        paper_snapshot: paper,
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Try to send email if SMTP configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: (process.env.SMTP_SECURE === 'true'),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        const html = `<h3>Question Paper shared by ${sender.name} &lt;${sender.email}&gt;</h3>
        <p>${message || ''}</p>
        <h4>Paper: ${paper.paperTitle || paper.courseName || 'Untitled'}</h4>
        <pre style="white-space:pre-wrap;">${JSON.stringify(paper, null, 2)}</pre>`;
        await transporter.sendMail({
          from: `${sender.name} <${sender.email}>`,
          to: recipientEmail,
          subject: `Shared Question Paper: ${paper.paperTitle || paper.courseName || 'Paper'}`,
          html,
        });
      } catch (e) {
        console.error('Email send failed:', e);
        return res.json({ message: 'Shared (email send failed)', warn: true, shared });
      }
    }

    res.json({ message: 'Shared', shared });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/share/received - list shares where recipient is the logged-in user's email
router.get('/received', auth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.userId)
      .single();

    if (!user) return res.status(401).json({ message: 'Invalid user' });

    const { data: shares, error } = await supabase
      .from('shared')
      .select('*')
      .eq('recipient_email', user.email)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ list: shares });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ message: 'Server error' }); 
  }
});

// GET /api/share/:id - get shared record if recipient is user or sender is user
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.userId)
      .single();

    if (!user) return res.status(401).json({ message: 'Invalid user' });

    const { data: shared, error } = await supabase
      .from('shared')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!shared || error) return res.status(404).json({ message: 'Not found' });
    
    if (shared.recipient_email !== user.email && String(shared.sender_id) !== String(req.userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json({ shared });
  } catch (e) { 
    console.error(e); 
    res.status(500).json({ message: 'Server error' }); 
  }
});

module.exports = router;
