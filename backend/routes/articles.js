const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const articlesFile = path.join(__dirname, '..', 'data', 'articles.json');

router.get('/', (req, res) => {
  try {
    const items = JSON.parse(fs.readFileSync(articlesFile, 'utf8') || '[]');
    res.json(items);
  } catch(e) { res.json([]); }
});

router.get('/:id', (req, res) => {
  try {
    const items = JSON.parse(fs.readFileSync(articlesFile, 'utf8') || '[]');
    const item = items.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch(e) { res.status(500).json({ error: 'Read error' }); }
});

module.exports = router;
