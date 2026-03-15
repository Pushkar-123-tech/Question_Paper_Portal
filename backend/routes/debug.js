const express = require('express');
const router = express.Router();
const { sendNotificationEmail } = require('../services/emailService');

// Test email sending
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    console.log(`🧪 Testing email to ${email}...`);
    
    const success = await sendNotificationEmail({
      to: email,
      subject: 'Test Email from Test Creator',
      message: '<h2>Email Test</h2><p>If you received this, emails are working! ✓</p>'
    });

    if (success) {
      res.json({ message: 'Test email sent successfully!', email });
    } else {
      res.status(500).json({ message: 'Failed to send test email' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Debug routes removed — keep placeholder to avoid 500 if still referenced
router.all('*', (req, res) => res.status(404).json({ message: 'Not found' }));
module.exports = router;