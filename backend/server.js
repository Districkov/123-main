const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const backendRoot = __dirname;
const frontendPath = path.join(backendRoot, '..', 'frontend');
app.use(express.static(frontendPath));

// Middleware для проверки админского токена
function requireAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token === 'termokont-admin') {
    next();
  } else {
    res.status(401).json({ error: 'Invalid admin token' });
  }
}

// Serve data JSONs at /data/*.json for backward compatibility
app.get('/data/:name', (req, res) => {
  const name = req.params.name;
  const allowed = ['articles.json', 'products.json', 'project.json'];
  if (!allowed.includes(name)) return res.status(404).end();
  const file = path.join(backendRoot, 'data', name);
  if (!fs.existsSync(file)) return res.status(404).end();
  res.sendFile(file);
});

// Public API endpoints (mounted at /api/*)
app.use('/api/products', require('./routes/products'));
app.use('/api/articles', require('./routes/articles'));

// Keep previous non-/api routes for compatibility
app.use('/products', require('./routes/products'));
app.use('/articles', require('./routes/articles'));

// Admin routes (require auth)
app.use('/admin', requireAdminToken, require('./routes/admin'));

// SPA fallback
app.get('*', (req, res) => {
  const file = path.join(frontendPath, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    return res.sendFile(file);
  }
  return res.sendFile(path.join(frontendPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('Server started on port', port));