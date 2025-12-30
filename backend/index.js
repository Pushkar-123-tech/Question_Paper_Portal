// Load .env from backend directory so local backend/.env is picked up even when starting the app from project root
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
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
// Prefer providing a MongoDB Atlas connection string via the MONGO_URI environment variable.
// For local development this falls back to a local MongoDB instance.
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/new-test-creator';


if (!process.env.MONGO_URI) {
  console.warn('⚠️ MONGO_URI not set — using local MongoDB. For production, set `MONGO_URI` to your MongoDB Atlas connection string.');
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ MONGO_URI must be set in production. Exiting.');
    process.exit(1);
  }
}

// Basic validation: common copy/paste issue is accidental spaces in the URI
if (MONGO_URI.includes(' ')) {
  console.error('❌ Invalid MONGO_URI: contains spaces. Remove spaces and URL-encode any special characters in the password.');
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Running in production without a valid MONGO_URI; exiting.');
    process.exit(1);
  }
} 

// Mongoose connection options for better stability with Atlas
const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

if (MONGO_URI.startsWith('mongodb+srv://')) {
  console.log('🔐 Using MongoDB Atlas (SRV) connection string');
}

mongoose.connect(MONGO_URI, mongooseOptions)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    // Exit so the process doesn't keep running without DB connectivity
    process.exit(1);
  });

mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error (event):', err);
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/share', require('./routes/share'));

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

// Auto open login page on root
app.get('/', (req, res) => {
  res.sendFile(path.join(pagesPath, 'login.html'));
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Fallback for client-side routes or unknown GETs (serve login page)
// Use a regex to avoid path-to-regexp parsing issues
app.get(/^\/(?!api).*/, (req, res) => {
  return res.sendFile(path.join(pagesPath, 'login.html'));
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
