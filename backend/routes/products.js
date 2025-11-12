const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const productsFile = path.join(__dirname, '..', 'data', 'products.json');

router.get('/', (req, res) => {
  try {
    const items = JSON.parse(fs.readFileSync(productsFile, 'utf8') || '[]');
    res.json(items);
  } catch(e) { res.json([]); }
});

router.get('/:id', (req, res) => {
  try {
    const items = JSON.parse(fs.readFileSync(productsFile, 'utf8') || '[]');
    const id = String(req.params.id);
    const item = items.find(i => String(i.id) === id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch(e) { res.status(500).json({ error: 'Read error' }); }
});

module.exports = router;
