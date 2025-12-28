const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
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

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
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
    const user = await User.findById(req.userId).lean();
    if(!user) return res.status(404).json({ message: 'Not found' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me - update profile
router.put('/me', auth, async (req, res) => {
  try{
    const { name, email } = req.body;
    const user = await User.findById(req.userId);
    if(!user) return res.status(404).json({ message: 'Not found' });
    if(email && email !== user.email){ const exists = await User.findOne({ email }); if(exists) return res.status(400).json({ message: 'Email already in use' }); user.email = email; }
    if(name) user.name = name;
    await user.save();
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me/password - change password
router.put('/me/password', auth, async (req, res) => {
  try{
    const { currentPassword, newPassword } = req.body;
    if(!currentPassword || !newPassword) return res.status(400).json({ message: 'Missing fields' });
    const user = await User.findById(req.userId);
    if(!user) return res.status(404).json({ message: 'Not found' });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if(!ok) return res.status(400).json({ message: 'Invalid current password' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated' });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;