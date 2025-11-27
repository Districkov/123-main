const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const productsFile = path.join(__dirname, '..', 'data', 'products.json');

router.get('/', (req, res) => {
  try {
    let items = JSON.parse(fs.readFileSync(productsFile, 'utf8') || '[]');
    const q = req.query.q || req.query.search || '';
    if (q && String(q).trim()) {
      const ql = String(q).toLowerCase();
      items = items.filter(p => {
        const title = (p.title || '').toString().toLowerCase();
        const sku = Array.isArray(p.sku) ? p.sku.join(' ').toLowerCase() : (String(p.sku || '')).toLowerCase();
        const cat = (p.category || '').toString().toLowerCase();
        const desc = (p.description || '').toString().toLowerCase();
        return title.includes(ql) || sku.includes(ql) || cat.includes(ql) || desc.includes(ql);
      });
    }
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
