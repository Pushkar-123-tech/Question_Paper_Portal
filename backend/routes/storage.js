const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../supabase');
const { authMiddleware: auth } = require('./auth');

// Using memory storage for multer to pass buffer to Supabase
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/storage/upload - Upload a file to Supabase Storage
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to 'assets' bucket
    const { data, error } = await supabase.storage
      .from('assets')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
        // If bucket doesn't exist, try to create it or handle error
        if (error.message.includes('bucket not found')) {
            return res.status(500).json({ message: 'Supabase storage bucket "assets" not found. Please create it.' });
        }
        throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    res.json({ 
      url: publicUrl, 
      path: filePath,
      filename: fileName
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
