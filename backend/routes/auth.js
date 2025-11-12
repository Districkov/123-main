const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const dataPath = path.join(__dirname, '..', 'data');

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

// Products CRUD
// GET all products
router.get('/products', (req, res) => {
  const products = readJSONFile('products.json');
  res.json(products);
});

// GET product by ID
router.get('/products/:id', (req, res) => {
  const products = readJSONFile('products.json');
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// CREATE new product
router.post('/products', (req, res) => {
  const products = readJSONFile('products.json');
  const newProduct = {
    id: req.body.id || Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  products.push(newProduct);
  
  if (writeJSONFile('products.json', products)) {
    res.status(201).json(newProduct);
  } else {
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// UPDATE product
router.put('/products/:id', (req, res) => {
  let products = readJSONFile('products.json');
  const productIndex = products.findIndex(p => p.id === req.params.id);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  products[productIndex] = {
    ...products[productIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  if (writeJSONFile('products.json', products)) {
    res.json(products[productIndex]);
  } else {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
router.delete('/products/:id', (req, res) => {
  let products = readJSONFile('products.json');
  const productIndex = products.findIndex(p => p.id === req.params.id);
  
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const deletedProduct = products.splice(productIndex, 1)[0];
  
  if (writeJSONFile('products.json', products)) {
    res.json({ message: 'Product deleted successfully', product: deletedProduct });
  } else {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Articles CRUD
// GET all articles
router.get('/articles', (req, res) => {
  const articles = readJSONFile('articles.json');
  res.json(articles);
});

// GET article by ID
router.get('/articles/:id', (req, res) => {
  const articles = readJSONFile('articles.json');
  const article = articles.find(a => a.id == req.params.id); // == потому что id может быть числом
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article);
});

// CREATE new article
router.post('/articles', (req, res) => {
  const articles = readJSONFile('articles.json');
  const newArticle = {
    id: req.body.id || Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  
  articles.push(newArticle);
  
  if (writeJSONFile('articles.json', articles)) {
    res.status(201).json(newArticle);
  } else {
    res.status(500).json({ error: 'Failed to save article' });
  }
});

// UPDATE article
router.put('/articles/:id', (req, res) => {
  let articles = readJSONFile('articles.json');
  const articleIndex = articles.findIndex(a => a.id == req.params.id); // == потому что id может быть числом
  
  if (articleIndex === -1) {
    return res.status(404).json({ error: 'Article not found' });
  }
  
  articles[articleIndex] = {
    ...articles[articleIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  if (writeJSONFile('articles.json', articles)) {
    res.json(articles[articleIndex]);
  } else {
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// DELETE article
router.delete('/articles/:id', (req, res) => {
  let articles = readJSONFile('articles.json');
  const articleIndex = articles.findIndex(a => a.id == req.params.id); // == потому что id может быть числом
  
  if (articleIndex === -1) {
    return res.status(404).json({ error: 'Article not found' });
  }
  
  const deletedArticle = articles.splice(articleIndex, 1)[0];
  
  if (writeJSONFile('articles.json', articles)) {
    res.json({ message: 'Article deleted successfully', article: deletedArticle });
  } else {
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

module.exports = router;