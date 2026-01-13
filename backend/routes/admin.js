const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dataDir = path.join(__dirname, '..', 'data');
const productsFile = path.join(dataDir, 'products.json');
const articlesFile = path.join(dataDir, 'articles.json');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); }
  catch(e) { return []; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Тестовый эндпоинт для проверки заголовков
router.get('/test', (req, res) => {
  res.json({
    message: 'Admin test endpoint - Token is valid!',
    receivedToken: req.headers['x-admin-token'],
    method: req.method,
    path: req.path,
    allHeaders: req.headers
  });
});

// Products CRUD
router.post('/products', (req, res) => {
  const items = readJson(productsFile);
  const id = Date.now().toString();
  // Преобразуем некоторые поля к массиву, если они не пустые строки
  const body = { ...req.body };
  if (body.characteristics) {
    if (Array.isArray(body.characteristics['Исполнение'])) {
      // ok
    } else if (typeof body.characteristics['Исполнение'] === 'string' && body.characteristics['Исполнение']) {
      body.characteristics['Исполнение'] = [body.characteristics['Исполнение']];
    }
    if (Array.isArray(body.characteristics['Измеряемые материалы и среды'])) {
      // ok
    } else if (typeof body.characteristics['Измеряемые материалы и среды'] === 'string' && body.characteristics['Измеряемые материалы и среды']) {
      body.characteristics['Измеряемые материалы и среды'] = [body.characteristics['Измеряемые материалы и среды']];
    }
    if (Array.isArray(body.characteristics['Особенности применения'])) {
      // ok
    } else if (typeof body.characteristics['Особенности применения'] === 'string' && body.characteristics['Особенности применения']) {
      body.characteristics['Особенности применения'] = [body.characteristics['Особенности применения']];
    }
  }
  const item = Object.assign({}, body, { id });
  items.push(item);
  writeJson(productsFile, items);
  res.status(201).json(item);
});

router.put('/products/:id', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (e) {
    console.error('admin PUT product error:', e);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully', product: deleted });
  } catch (e) {
    console.error('admin DELETE product error:', e);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Articles CRUD (similar)
router.post('/articles', (req, res) => {
  const items = readJson(articlesFile);
  const id = Date.now().toString();
  const item = Object.assign({}, req.body, { id });
  items.push(item);
  writeJson(articlesFile, items);
  res.status(201).json(item);
});

router.put('/articles/:id', (req, res) => {
  const items = readJson(articlesFile);
  const id = String(req.params.id);
  console.log('[ADMIN] PUT /articles/:id', { requestedId: id, availableIds: items.map(i => i.id) });
  const idx = items.findIndex(i => String(i.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = Object.assign({}, items[idx], req.body, { id: items[idx].id });
  writeJson(articlesFile, items);
  res.json(items[idx]);
});

router.delete('/articles/:id', (req, res) => {
  let items = readJson(articlesFile);
  const id = String(req.params.id);
  const idx = items.findIndex(i => String(i.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = items.splice(idx,1)[0];
  writeJson(articlesFile, items);
  res.json({ deleted: removed });
});

module.exports = router;
