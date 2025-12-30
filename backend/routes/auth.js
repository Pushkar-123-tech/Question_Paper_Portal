const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const supabase = require('../supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create profile
    const { data: user, error: insertError } = await supabase
      .from('profiles')
      .insert([{ name, email, password: hashedPassword, role: 'teacher' }])
      .select()
      .single();

    if (insertError) {
      console.error('Signup Insert Error:', insertError);
      throw insertError;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Signup Exception:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const { data: user, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Handle legacy plain text or null passwords if any, but prefer bcrypt
    let isMatch = false;
    if (user.password) {
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = (user.password === password);
      }
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (err) {
    console.error('Login Exception:', err);
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
    const { data: user, error } = await supabase
      .from('profiles')
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
