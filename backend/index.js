require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// Prevent caching issues
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// DB Connect
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/new-test-creator';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/share', require('./routes/share'));
app.use('/api/admin', require('./routes/admin'));

// Serve ALL frontend HTML + public assets
const pagesPath = path.join(__dirname, '..', 'frontend', 'pages');
const publicPath = path.join(__dirname, '..', 'frontend', 'public');

// Debug route to inspect paths
app.get('/_debug_paths', (req, res) => res.json({ pagesPath, publicPath, cwd: process.cwd() }));

app.use('/', express.static(pagesPath));
app.use('/public', express.static(publicPath));
app.use('/assets', express.static(publicPath));
// Maintain legacy frontend paths used in HTML (so absolute paths like /frontend/public/image1.png work)
app.use('/frontend/public', express.static(publicPath));
app.use('/frontend/pages', express.static(pagesPath));

// Auto open landing page on root
app.get('/', (req, res) => {
  res.sendFile(path.join(pagesPath, 'index.html'));
});

// Fallback for client-side routes or unknown GETs (serve landing page)
app.get(/^\/(?!api).*/, (req, res) => {
  return res.sendFile(path.join(pagesPath, 'index.html'));
});

// Start Server (default port set to 3000)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server Running!`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🔐 http://localhost:${PORT}/login.html`);
  console.log(`📝 http://localhost:${PORT}/dashboard.html`);
  console.log(`📄 http://localhost:${PORT}/questionpaperform.html`);
  console.log(`📑 http://localhost:${PORT}/template.html\n`);
});