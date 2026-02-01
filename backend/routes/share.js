const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const supabase = require('../supabaseClient');
const { sendPaperSharingEmail } = require('../services/emailService');

function auth(req, res, next) {
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
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (userError || !user) return res.status(401).json({ message: 'Invalid user' });

    const { data: paper, error: paperError } = await supabase
      .from('papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (paperError || !paper) return res.status(404).json({ message: 'Paper not found' });
    if (paper.owner !== req.userId) return res.status(403).json({ message: 'Forbidden' });

    // ensure snapshot includes camelCase title fields so frontend can read `paperTitle` / `courseName`
    const snapshot = Object.assign({}, paper, {
      paperTitle: paper.paper_title || paper.paperTitle || '',
      courseName: paper.course_name || paper.courseName || ''
    });

    const { data: shared, error: shareError } = await supabase
      .from('shared')
      .insert([{
        sender_id: req.userId,
        sender_name: user.name,
        sender_email: user.email,
        recipient_email: recipientEmail,
        message: message || '',
        paper_id: paperId,
        paper_snapshot: snapshot,
      }])
      .select()
      .single();

    if (shareError) throw shareError;

    console.log(`📤 Paper shared by ${user.name} to ${recipientEmail}`);

    // Send email notification asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        await sendPaperSharingEmail({
          senderName: user.name,
          senderEmail: user.email,
          recipientEmail: recipientEmail,
          paperTitle: paper.paperTitle || paper.paper_title || paper.courseName || paper.course_name || 'Untitled',
          message: message || ''
        });
        console.log(`✓ Sharing email sent to ${recipientEmail}`);
      } catch (emailErr) {
        console.error(`❌ Failed to send sharing email to ${recipientEmail}:`, emailErr.message);
      }
    });

    res.json({ message: 'Shared', shared });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/share/received - list shares where recipient is the logged-in user's email
router.get('/received', auth, async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (userError || !user) return res.status(401).json({ message: 'Invalid user' });

    const { data: list, error: listError } = await supabase
      .from('shared')
      .select('*')
      .eq('recipient_email', user.email)
      .order('createdAt', { ascending: false })


    if (listError) throw listError;

    res.json({ list: list || [] });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/share/:id - get shared record if recipient is user or sender is user
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (userError || !user) return res.status(401).json({ message: 'Invalid user' });

    const { data: sh, error: shareError } = await supabase
      .from('shared')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (shareError || !sh) return res.status(404).json({ message: 'Not found' });
    if (sh.recipient_email !== user.email && sh.sender_id !== req.userId) return res.status(403).json({ message: 'Forbidden' });
    res.json({ shared: sh });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;