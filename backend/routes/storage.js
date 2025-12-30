const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../supabase');
const { authMiddleware: auth } = require('./auth');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/storage/upload - Upload a file to a bucket
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const bucket = req.body.bucket || 'assets';
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${req.userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) return res.status(400).json({ message: error.message });

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    res.json({ url: publicUrl, path: filePath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
