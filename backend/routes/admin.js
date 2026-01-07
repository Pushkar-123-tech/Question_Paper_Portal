const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware: auth } = require('./auth');
const roleAuth = require('../middleware/roleAuth');

// All routes here require Admin role
router.use(auth, roleAuth(['admin']));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const teachers = await User.countDocuments({ role: 'teacher' });
    const faculty = await User.countDocuments({ role: 'faculty' });
    const chairmen = await User.countDocuments({ role: 'chairman' });
    const coordinators = await User.countDocuments({ role: 'module_coordinator' });
    const admins = await User.countDocuments({ role: 'admin' });

    res.json({
      totalUsers,
      teachers,
      faculty,
      chairmen,
      coordinators,
      admins
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.role = role;
    await user.save();
    res.json({ message: 'User role updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
