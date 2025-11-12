const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const auth = require('../middleware/auth');

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

// Products CRUD
router.post('/products', auth, (req, res) => {
  const items = readJson(productsFile);
  const id = Date.now().toString();
  const item = Object.assign({}, req.body, { id });
  items.push(item);
  writeJson(productsFile, items);
  res.status(201).json(item);
});

router.put('/products/:id', auth, (req, res) => {
  const items = readJson(productsFile);
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = Object.assign({}, items[idx], req.body);
  writeJson(productsFile, items);
  res.json(items[idx]);
});

router.delete('/products/:id', auth, (req, res) => {
  let items = readJson(productsFile);
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = items.splice(idx,1)[0];
  writeJson(productsFile, items);
  res.json({ deleted: removed });
});

// Articles CRUD (similar)
router.post('/articles', auth, (req, res) => {
  const items = readJson(articlesFile);
  const id = Date.now().toString();
  const item = Object.assign({}, req.body, { id });
  items.push(item);
  writeJson(articlesFile, items);
  res.status(201).json(item);
});

router.put('/articles/:id', auth, (req, res) => {
  const items = readJson(articlesFile);
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = Object.assign({}, items[idx], req.body);
  writeJson(articlesFile, items);
  res.json(items[idx]);
});

router.delete('/articles/:id', auth, (req, res) => {
  let items = readJson(articlesFile);
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = items.splice(idx,1)[0];
  writeJson(articlesFile, items);
  res.json({ deleted: removed });
});

module.exports = router;
