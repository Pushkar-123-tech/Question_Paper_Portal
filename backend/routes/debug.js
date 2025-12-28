const express = require('express');
const router = express.Router();

// Debug routes removed — keep placeholder to avoid 500 if still referenced
router.all('*', (req, res) => res.status(404).json({ message: 'Not found' }));
module.exports = router;