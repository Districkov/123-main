const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const q = req.query.q || req.query.search || '';
    const items = db.getProducts(q);
    res.json(items);
  } catch (e) {
    console.error('products GET error:', e);
    res.json([]);
  }
});

router.get('/:id', (req, res) => {
  try {
    const id = String(req.params.id);
    const item = db.getProductById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    console.error('products/:id error:', e);
    res.status(500).json({ error: 'Read error' });
  }
});

module.exports = router;
