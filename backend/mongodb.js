const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Missing MONGODB_URI in backend/.env');
} else {
  console.log('Attempting MongoDB connection...');
  // Show only hostname portion to avoid leaking credentials
  try {
    const host = new URL(uri.split('?')[0].replace('mongodb+srv', 'https')).host;
    console.log('MongoDB host:', host);
  } catch (e) {
    // ignore parsing errors
  }

  mongoose.connect(uri, {
    // Mongoose 7+ doesn't require these, but they're harmless
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

  mongoose.connection.on('error', err => {
    console.error('Mongoose connection error event:', err);
  });
}

module.exports = mongoose;
