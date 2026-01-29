const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabaseClient');
const { sendWelcomeEmail, sendLoginEmail } = require('../services/emailService');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    // Check if user already exists
    const { data: exists } = await supabase.from('users').select('*').eq('email', email).single();
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    
    // Insert user into Supabase - use provided role or default to 'external'
    const { data: user, error } = await supabase
      .from('users')
      .insert([{ name, email, password: hashed, role: role || 'external' }])
      .select()
      .single();

    if (error || !user) return res.status(500).json({ message: 'Signup failed' });

    // Send welcome email asynchronously (non-blocking)
    setImmediate(() => {
      sendWelcomeEmail({ name: user.name, email: user.email, role: user.role })
        .catch(err => console.error('Failed to send welcome email:', err));
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    // Send login email asynchronously (non-blocking) for all roles
    setImmediate(() => {
      sendLoginEmail({ name: user.name, email: user.email, role: user.role })
        .catch(err => console.error('Failed to send login email:', err));
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// simple auth middleware for protected routes
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

// GET /api/auth/me - get profile
router.get('/me', auth, async (req, res) => {
  try{
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if(!user || error) return res.status(404).json({ message: 'Not found' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me - update profile
router.put('/me', auth, async (req, res) => {
  try{
    const { name, email } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if(!user || error) return res.status(404).json({ message: 'Not found' });
    
    if(email && email !== user.email){ 
      const { data: exists } = await supabase.from('users').select('*').eq('email', email).single();
      if(exists) return res.status(400).json({ message: 'Email already in use' });
    }
    
    const updates = {};
    if(name) updates.name = name;
    if(email) updates.email = email;
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select()
      .single();
    
    if(updateError) return res.status(500).json({ message: 'Update failed' });
    res.json({ user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role } });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me/password - change password
router.put('/me/password', auth, async (req, res) => {
  try{
    const { currentPassword, newPassword } = req.body;
    if(!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });
    
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if(!user || error) return res.status(404).json({ message: 'Not found' });
    
    const ok = await bcrypt.compare(currentPassword, user.password);
    if(!ok) return res.status(400).json({ message: 'Invalid current password' });
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', req.userId);
    
    if(updateError) return res.status(500).json({ message: 'Password update failed' });
    res.json({ message: 'Password updated' });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
module.exports.authMiddleware = auth;