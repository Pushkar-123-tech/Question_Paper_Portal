const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware: auth } = require('./auth');

// Store uploads in frontend/public/uploads so they are served via /public
const uploadsDir = path.join(__dirname, '..', 'frontend', 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage });

// POST /api/storage/upload - Upload a file to local public uploads
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const filePath = `uploads/${file.filename}`; // relative to /public
    const publicUrl = `${req.protocol}://${req.get('host')}/public/${filePath}`;

    res.json({ 
      url: publicUrl, 
      path: filePath,
      filename: file.filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
