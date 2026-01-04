const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const user = new User({ 
      name, 
      email, 
      password, 
      role: req.body.role || 'teacher' 
    });
    await user.save();

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user._id.toString(), name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Signup Exception:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user._id.toString(), name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Login Exception:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
});

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

// GET /api/auth/me - get profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('name email role').lean();
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ user: { id: String(user._id), name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
module.exports.authMiddleware = auth;
