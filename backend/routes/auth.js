const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: 'teacher' }
      }
    });

    if (error) return res.status(400).json({ message: error.message });

    // Insert into profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{ id: data.user.id, name, email, role: 'teacher' }]);

    if (profileError) console.error('Profile creation error:', profileError);

    res.json({ 
      token: data.session?.access_token, 
      user: { id: data.user.id, name, email: data.user.email } 
    });
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return res.status(400).json({ message: error.message });

    // Get profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user.id)
      .single();

    res.json({ 
      token: data.session.access_token, 
      user: { id: data.user.id, name: profile?.name || data.user.user_metadata?.name, email: data.user.email } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// simple auth middleware for protected routes
async function auth(req, res, next){
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Unauthorized' });
  const token = header.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ message: 'Unauthorized' });
    req.userId = user.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

// GET /api/auth/me - get profile
router.get('/me', auth, async (req, res) => {
  try{
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if(error || !profile) return res.status(404).json({ message: 'Not found' });
    res.json({ user: { id: profile.id, name: profile.name, email: profile.email, role: profile.role } });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me - update profile
router.put('/me', auth, async (req, res) => {
  try{
    const { name, email } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', req.userId)
      .select()
      .single();

    if(error) return res.status(400).json({ message: error.message });

    // If email changed, we should ideally update auth.users too, but that's more complex with Supabase
    // For now, we update the profile.

    res.json({ user: { id: profile.id, name: profile.name, email: profile.email, role: profile.role } });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/auth/me/password - change password
router.put('/me/password', auth, async (req, res) => {
  try{
    const { newPassword } = req.body;
    if(!newPassword) return res.status(400).json({ message: 'Missing fields' });
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: 'Password updated' });
  }catch(err){ console.error(err); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
module.exports.authMiddleware = auth;
