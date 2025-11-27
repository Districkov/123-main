const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const articlesFile = path.join(__dirname, '..', 'data', 'articles.json');

router.get('/', (req, res) => {
  try {
    let items = JSON.parse(fs.readFileSync(articlesFile, 'utf8') || '[]');
    const q = req.query.q || req.query.search || '';
    if (q && String(q).trim()) {
      const ql = String(q).toLowerCase();
      items = items.filter(a => {
        const title = (a.title || '').toString().toLowerCase();
        const cat = (a.category || '').toString().toLowerCase();
        const excerpt = (a.excerpt || '').toString().toLowerCase();
        return title.includes(ql) || cat.includes(ql) || excerpt.includes(ql);
      });
    }
    res.json(items);
  } catch(e) { res.json([]); }
});

router.get('/:id', (req, res) => {
  try {
    const items = JSON.parse(fs.readFileSync(articlesFile, 'utf8') || '[]');
    const id = String(req.params.id);
    const item = items.find(i => String(i.id) === id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch(e) { res.status(500).json({ error: 'Read error' }); }
});

module.exports = router;
