// Load .env
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Prevent caching issues
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/share', require('./routes/share'));
app.use('/api/storage', require('./routes/storage'));

// Serve ALL frontend HTML + public assets
const pagesPath = path.join(__dirname, '..', 'frontend', 'pages');
const publicPath = path.join(__dirname, '..', 'frontend', 'public');

app.use('/', express.static(pagesPath));
app.use('/public', express.static(publicPath));
app.use('/assets', express.static(publicPath));
// Maintain legacy frontend paths used in HTML
app.use('/frontend/public', express.static(publicPath));
app.use('/frontend/pages', express.static(pagesPath));

// Auto open login page on root
app.get('/', (req, res) => {
  res.sendFile(path.join(pagesPath, 'login.html'));
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true, database: 'mongodb' }));

// Fallback for client-side routes or unknown GETs (serve login page)
app.get(/^\/(?!api).*/, (req, res) => {
  return res.sendFile(path.join(pagesPath, 'login.html'));
});

// Export for Vercel
module.exports = app;

// Start Server (only if not in Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Server Running with MongoDB Atlas!`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔐 http://localhost:${PORT}/login.html`);
    console.log(`📝 http://localhost:${PORT}/dashboard.html`);
    console.log(`📄 http://localhost:${PORT}/questionpaperform.html`);
    console.log(`📑 http://localhost:${PORT}/template.html\n`);
  });
}
