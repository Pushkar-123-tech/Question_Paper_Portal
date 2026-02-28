const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { authMiddleware: auth } = require('./auth');
const roleAuth = require('../middleware/roleAuth');
const { sendRoleChangeEmail } = require('../services/emailService');

// All routes here require Admin role
router.use(auth, roleAuth(['admin']));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: externals } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'external');
    const { count: faculty } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'faculty');
    const { count: dgca } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'dgca');
    const { count: admins } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin');

    res.json({
      totalUsers,
      externals,
      faculty,
      dgca,
      admins
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, createdAt')
      .order('createdAt', { ascending: false });
    
    if (error) throw error;
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    // Role changes are disabled - roles are fixed after registration
    return res.status(403).json({ message: 'User roles cannot be changed after registration. Role is fixed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('users').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
