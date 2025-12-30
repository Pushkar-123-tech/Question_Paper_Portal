const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('Missing MONGODB_URI in backend/.env');
} else {
  mongoose.connect(uri, {
    // Mongoose 7+ doesn't require these, but they're harmless
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));
}

module.exports = mongoose;
