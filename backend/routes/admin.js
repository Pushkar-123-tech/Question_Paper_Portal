const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { authMiddleware: auth } = require('./auth');
const roleAuth = require('../middleware/roleAuth');

// All routes here require Admin role
router.use(auth, roleAuth(['admin']));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: teachers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
    const { count: faculty } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'faculty');
    const { count: chairmen } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'chairman');
    const { count: coordinators } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'module_coordinator');
    const { count: admins } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin');

    res.json({
      totalUsers,
      teachers,
      faculty,
      chairmen,
      coordinators,
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
    const { role } = req.body;
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', req.params.id)
      .select()
      .single();

    if (!user || updateError) return res.status(404).json({ message: 'User not found' });
    
    res.json({ message: 'User role updated', user });
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
