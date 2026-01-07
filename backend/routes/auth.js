const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../supabaseClient');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

// Auth middleware
async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Unauthorized' });
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// POST /api/auth/signup - Only admin can register new users
router.post('/signup', auth, async (req, res) => {
  try {
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Only Admin can register new users' });
    }

    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ 
        name, 
        email, 
        password: hashedPassword, 
        role: role || 'teacher' 
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ 
      message: 'User registered successfully',
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } 
    });
  } catch (err) {
    console.error('Signup Exception:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      console.warn('Login failed: User not found for email', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.password || typeof user.password !== 'string') {
      console.error('Password hash missing or invalid for user:', user.email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(String(password), String(user.password));
    if (!isMatch) {
      console.warn('Login failed: Password mismatch for email', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (err) {
    console.error('Login Exception:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me - get profile
router.get('/me', auth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', req.userId)
      .single();

    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
module.exports.authMiddleware = auth;
