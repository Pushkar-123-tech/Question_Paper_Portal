const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../supabaseClient');
const { sendWelcomeEmail, sendLoginEmail, sendPasswordResetEmail } = require('../services/emailService');

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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      // Don't reveal if user exists
      return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: token,
        reset_token_expiry: expiry.toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to save reset token:', updateError);
      return res.status(500).json({ message: 'Failed to process request' });
    }

    // Send email
    await sendPasswordResetEmail(email, token);

    res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Missing fields' });

    // Find user with this token and not expired
    // Note: Supabase query for expiry check might be tricky with simple filter if not using raw SQL
    // So we fetch by token and check expiry in code
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('reset_token', token)
      .single();

    if (error || !user) return res.status(400).json({ message: 'Invalid or expired token' });

    const now = new Date();
    const expiry = new Date(user.reset_token_expiry);

    if (now > expiry) {
      return res.status(400).json({ message: 'Token has expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedPassword,
        reset_token: null,
        reset_token_expiry: null
      })
      .eq('id', user.id);

    if (updateError) return res.status(500).json({ message: 'Failed to reset password' });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// simple auth middleware for protected routes
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

// GET /api/auth/me - get profile
router.get('/me', auth, async (req, res) => {
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if (!user || error) return res.status(404).json({ message: 'Not found' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me - update profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if (!user || error) return res.status(404).json({ message: 'Not found' });

    if (email && email !== user.email) {
      const { data: exists } = await supabase.from('users').select('*').eq('email', email).single();
      if (exists) return res.status(400).json({ message: 'Email already in use' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select()
      .single();

    if (updateError) return res.status(500).json({ message: 'Update failed' });
    res.json({ user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role } });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me/password - change password
router.put('/me/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });

    const { data: user, error } = await supabase.from('users').select('*').eq('id', req.userId).single();
    if (!user || error) return res.status(404).json({ message: 'Not found' });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid current password' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', req.userId);

    if (updateError) return res.status(500).json({ message: 'Password update failed' });
    res.json({ message: 'Password updated' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// GET /api/auth/users - list users (optionally by role)
router.get('/users', auth, async (req, res) => {
  try {
    const { role } = req.query;
    let query = supabase.from('users').select('id, name, email, role');
    if (role) query = query.eq('role', role);

    const { data: users, error } = await query;
    if (error) throw error;
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
module.exports.authMiddleware = auth;