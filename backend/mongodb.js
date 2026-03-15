const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let uri = process.env.MONGODB_URI;

if (!uri) {
  // Provide a helpful fallback for local development
  uri = 'mongodb://127.0.0.1:27017/new-test-creator';
  console.warn('MONGODB_URI not set — falling back to local MongoDB:', uri);
}

console.log('Attempting MongoDB connection...');
// Show only hostname portion to avoid leaking credentials
try {
  const host = new URL((uri.includes('mongodb+srv') ? uri.replace('mongodb+srv', 'https') : uri.split('?')[0].replace('mongodb', 'https'))).host;
  console.log('MongoDB host:', host);
} catch (e) {
  // ignore parsing errors
}

// Cache connection for serverless functions
let cachedConnection = null;

mongoose.connect(uri, {
  // Mongoose 7+ doesn't require these, but they're useful for explicit timeouts
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  w: 'majority'
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

mongoose.connection.on('error', err => {
  console.error('Mongoose connection error event:', err);
});

// Export both mongoose and a getConnection function for serverless
module.exports = mongoose;
module.exports.getConnection = async () => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }
  
  console.log('Creating new MongoDB connection');
  cachedConnection = mongoose;
  return cachedConnection;
};