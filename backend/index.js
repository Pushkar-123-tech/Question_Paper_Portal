const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');
const bcrypt = require('bcryptjs');

const app = express();

// Prevent caching issues
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  next();
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Supabase Init & Seed Admin
(async () => {
  console.log('✅ Supabase integrated');
  await seedAdmin();
})();

async function seedAdmin() {
  try {
    const { data: adminExists, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@rscoe.in')
      .single();

    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (!adminExists) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          name: 'Super Admin',
          email: 'admin@rscoe.in',
          password: hashedPassword,
          role: 'admin'
        }]);
      
      if (insertError) throw insertError;
      console.log('👤 Predefined Admin created: admin@rscoe.in / admin123');
    } else {
      // Ensure the admin password is correct and hashed
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword, role: 'admin' })
        .eq('email', 'admin@rscoe.in');
      
      if (updateError) throw updateError;
      console.log('👤 Predefined Admin password reset to default: admin123');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
}

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

function startServer() {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server Running!`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔐 http://localhost:${PORT}/login.html`);
    console.log(`📝 http://localhost:${PORT}/dashboard.html`);
    console.log(`📄 http://localhost:${PORT}/questionpaperform.html`);
    console.log(`📑 http://localhost:${PORT}/template.html\n`);
  });
}

// Start server immediately (no MongoDB dependency)
startServer();