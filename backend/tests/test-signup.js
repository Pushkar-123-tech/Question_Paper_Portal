const http = require('http');

const adminToken = process.argv[2];
if (!adminToken) {
  console.error('Usage: node test-signup.js <admin_token>');
  process.exit(1);
}

const data = JSON.stringify({
  name: 'Test Teacher',
  email: 'teacher@test.com',
  password: 'test123',
  role: 'teacher'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Authorization': `Bearer ${adminToken}`
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();
