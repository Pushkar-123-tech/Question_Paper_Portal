const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware: auth } = require('./auth');

// Configure disk storage for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage });

// POST /api/storage/upload - Upload a file locally
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    // Construct the public URL
    // In production, this should be the full domain. For local dev, relative path works.
    const publicUrl = `/public/uploads/${file.filename}`;

    res.json({ 
      url: publicUrl, 
      path: file.path,
      filename: file.filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
