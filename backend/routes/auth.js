const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dataPath = path.join(__dirname, '..', 'data');

// Multer for file uploads
const multer = require('multer');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const productsUploadDir = path.join(uploadsDir, 'products');
if (!fs.existsSync(productsUploadDir)) fs.mkdirSync(productsUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productsUploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// Helper functions для работы с JSON файлами
function readJSONFile(filename) {
  try {
    const filePath = path.join(dataPath, filename);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

function writeJSONFile(filename, data) {
  try {
    const filePath = path.join(dataPath, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
}

// Products CRUD (use DB)
const db = require('../db');

// GET all products
router.get('/products', (req, res) => {
  try {
    const q = req.query.q || req.query.search || '';
    const products = db.getProducts(q);
    res.json(products);
  } catch (e) {
    console.error('auth GET products error:', e);
    res.status(500).json({ error: 'Failed to read products' });
  }
});

// GET product by ID
router.get('/products/:id', (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (e) {
    console.error('auth GET product by id error:', e);
    res.status(500).json({ error: 'Failed to read product' });
  }
});

// CREATE new product
router.post('/products', (req, res) => {
  try {
    const newProduct = db.createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (e) {
    console.error('auth POST product error:', e);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// FILE UPLOAD endpoint for product images
// Field name: "files" (multiple)
router.post('/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const files = req.files.map(f => ({
      filename: f.filename,
      originalname: f.originalname,
      url: `/uploads/products/${f.filename}`
    }));
    res.json({ files });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// UPDATE product
router.put('/products/:id', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json(updated);
  } catch (e) {
    console.error('auth PUT product error:', e);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
router.delete('/products/:id', (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted successfully', product: deleted });
  } catch (e) {
    console.error('auth DELETE product error:', e);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Articles CRUD (use DB)
// GET all articles
router.get('/articles', (req, res) => {
  try {
    const q = req.query.q || req.query.search || '';
    const articles = db.getArticles(q);
    res.json(articles);
  } catch (e) {
    console.error('auth GET articles error:', e);
    res.status(500).json({ error: 'Failed to read articles' });
  }
});

// GET article by ID
router.get('/articles/:id', (req, res) => {
  try {
    const article = db.getArticleById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (e) {
    console.error('auth GET article by id error:', e);
    res.status(500).json({ error: 'Failed to read article' });
  }
});

// CREATE new article
router.post('/articles', (req, res) => {
  try {
    const newArticle = db.createArticle(req.body);
    res.status(201).json(newArticle);
  } catch (e) {
    console.error('auth POST article error:', e);
    res.status(500).json({ error: 'Failed to save article' });
  }
});

// UPDATE article
router.put('/articles/:id', (req, res) => {
  try {
    const updated = db.updateArticle(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Article not found' });
    res.json(updated);
  } catch (e) {
    console.error('auth PUT article error:', e);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE article
router.delete('/articles/:id', (req, res) => {
  try {
    const deleted = db.deleteArticle(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Article not found' });
    res.json({ message: 'Article deleted successfully', article: deleted });
  } catch (e) {
    console.error('auth DELETE article error:', e);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;