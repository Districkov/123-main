const API = '/api';
let currentEditing = null;

// DOM Elements
const tokenInput = document.getElementById('token');
const toggleTokenBtn = document.getElementById('toggle-token');
const logoutBtn = document.getElementById('logout');
const statusMessage = document.getElementById('status-message');

// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
  });
});

// Utility functions
function showMessage(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 3000);
}

function authHeaders() {
  return { 
    'Content-Type': 'application/json', 
    'x-admin-token': tokenInput.value 
  };
}

async function handleApiCall(apiCall, successMessage) {
  try {
    const response = await apiCall();
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    showMessage(successMessage, 'success');
    return await response.json();
  } catch (error) {
    showMessage(`Ошибка: ${error.message}`, 'error');
    throw error;
  }
}

// Token visibility toggle
toggleTokenBtn.addEventListener('click', () => {
  const type = tokenInput.type === 'password' ? 'text' : 'password';
  tokenInput.type = type;
  toggleTokenBtn.textContent = type === 'password' ? '👁' : '👁‍🗨';
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
  tokenInput.value = '';
  showMessage('Вы вышли из системы', 'info');
});

// Products functionality
async function loadProducts() {
  try {
    const data = await handleApiCall(
      () => fetch(API + '/products'),
      'Товары загружены'
    );
    renderProducts(data);
    updateStats();
  } catch (error) {
    document.getElementById('products-list').innerHTML = 
      '<div class="error">Ошибка загрузки товаров</div>';
  }
}

function renderProducts(products) {
  const el = document.getElementById('products-list');
  if (!products || products.length === 0) {
    el.innerHTML = '<div class="empty-state">Товары не найдены</div>';
    return;
  }

  el.innerHTML = products.map(p => `
    <div class="item" data-id="${p.id}">
      <div class="item-content">
        <div class="item-image">
          <img src="${p.photo || './images/no-image.jpg'}" alt="${p.title}" 
               onerror="this.src='./images/no-image.jpg'">
        </div>
        <div class="item-info">
          <strong>${p.title || 'Без названия'}</strong>
          <span class="item-sku">Артикул: ${p.sku || 'Не указан'}</span>
          <span class="item-category">Категория: ${p.category || 'Не указана'}</span>
          <span class="item-price">${p.price ? `${parseFloat(p.price).toLocaleString('ru-RU')} ₽` : 'Цена не указана'}</span>
          <p class="item-description">${p.characteristics ? Object.entries(p.characteristics).slice(0, 2).map(([key, value]) => `${key}: ${value}`).join(', ') : 'Характеристики отсутствуют'}</p>
        </div>
        <div class="item-actions">
          <button onclick="editProduct('${p.id}')" class="btn-warning">✏️ Редактировать</button>
          <button onclick="deleteProduct('${p.id}')" class="btn-danger">🗑 Удалить</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function deleteProduct(id) {
  if (!confirm('Вы уверены, что хотите удалить этот товар?')) return;
  
  try {
    await handleApiCall(
      () => fetch(API + '/admin/products/' + id, { 
        method: 'DELETE', 
        headers: authHeaders() 
      }),
      'Товар удален'
    );
    loadProducts();
  } catch (error) {
    // Error handled in handleApiCall
  }
}

async function editProduct(id) {
  try {
    const product = await handleApiCall(
      () => fetch(API + '/products/' + id),
      'Товар загружен для редактирования'
    );
    
    const form = document.getElementById('product-form');
    form.id.value = product.id;
    form.sku.value = product.sku || '';
    form.category.value = product.category || '';
    form.title.value = product.title || '';
    form.photo.value = product.photo || '';
    form.price.value = product.price || '';
    form.quantity.value = product.quantity || 1;
    
    // Characteristics
    form.characteristics_visibility.value = product.characteristics?.['Показатель визирования'] || '';
    form.characteristics_temperature_range.value = product.characteristics?.['Диапазон измерений температуры'] || '';
    form.characteristics_accuracy.value = product.characteristics?.['Погрешность'] || '';
    form.characteristics_spectral_range.value = product.characteristics?.['Спектральный диапазон'] || '';
    form.characteristics_application.value = product.characteristics?.['Особенности применения'] || '';
    form.characteristics_principle.value = product.characteristics?.['Принцип действия'] || '';
    form.characteristics_materials.value = product.characteristics?.['Измеряемые материалы'] || '';
    form.characteristics_execution.value = product.characteristics?.['Исполнение'] || '';
    form.characteristics_speed.value = product.characteristics?.['Быстродействие'] || '';
    form.characteristics_precision.value = product.characteristics?.['Точность'] || '';
    form.characteristics_temperature_min.value = product.characteristics?.['Температура мин'] || '';
    form.characteristics_temperature_max.value = product.characteristics?.['Температура макс'] || '';
    
    // SEO
    form.seo_title.value = product.seo?.title || '';
    form.seo_description.value = product.seo?.description || '';
    form.seo_keywords.value = product.seo?.keywords || '';
    
    currentEditing = 'product';
    form.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    // Error handled in handleApiCall
  }
}

// Articles functionality
async function loadArticles() {
  try {
    const data = await handleApiCall(
      () => fetch(API + '/articles'),
      'Статьи загружены'
    );
    renderArticles(data);
    updateStats();
  } catch (error) {
    document.getElementById('articles-list').innerHTML = 
      '<div class="error">Ошибка загрузки статей</div>';
  }
}

function renderArticles(articles) {
  const el = document.getElementById('articles-list');
  if (!articles || articles.length === 0) {
    el.innerHTML = '<div class="empty-state">Статьи не найдены</div>';
    return;
  }

  el.innerHTML = articles.map(a => `
    <div class="item" data-id="${a.id}">
      <div class="item-content">
        <div class="item-image">
          <img src="${a.image || './images/no-image.jpg'}" alt="${a.title}" 
               onerror="this.src='./images/no-image.jpg'">
        </div>
        <div class="item-info">
          <strong>${a.title || 'Без названия'}</strong>
          <span class="item-category">Категория: ${a.category || 'Не указана'}</span>
          <span class="item-date">${a.date || 'Дата не указана'}</span>
          <span class="item-meta">${a.readTime || ''} • ${a.views || ''}</span>
          <p class="item-excerpt">${a.excerpt || 'Описание отсутствует'}</p>
        </div>
        <div class="item-actions">
          <button onclick="editArticle('${a.id}')" class="btn-warning">✏️ Редактировать</button>
          <button onclick="deleteArticle('${a.id}')" class="btn-danger">🗑 Удалить</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function deleteArticle(id) {
  if (!confirm('Вы уверены, что хотите удалить эту статью?')) return;
  
  try {
    await handleApiCall(
      () => fetch(API + '/admin/articles/' + id, { 
        method: 'DELETE', 
        headers: authHeaders() 
      }),
      'Статья удалена'
    );
    loadArticles();
  } catch (error) {
    // Error handled in handleApiCall
  }
}

async function editArticle(id) {
  try {
    const article = await handleApiCall(
      () => fetch(API + '/articles/' + id),
      'Статья загружена для редактирования'
    );
    
    const form = document.getElementById('article-form');
    form.id.value = article.id;
    form.category.value = article.category || '';
    form.title.value = article.title || '';
    form.excerpt.value = article.excerpt || '';
    form.image.value = article.image || '';
    form.date.value = article.date || '';
    form.readTime.value = article.readTime || '';
    form.views.value = article.views || '';
    
    // Content - simplified for form
    if (article.content && article.content.length > 0) {
      const firstParagraph = article.content.find(item => item.type === 'paragraph');
      form.content.value = firstParagraph ? firstParagraph.text : '';
    } else {
      form.content.value = '';
    }
    
    currentEditing = 'article';
    form.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    // Error handled in handleApiCall
  }
}

// Form handlers
document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  
  const body = { 
    sku: form.sku.value,
    category: form.category.value,
    title: form.title.value,
    photo: form.photo.value,
    price: parseFloat(form.price.value) || 0,
    quantity: parseInt(form.quantity.value) || 1,
    characteristics: {
      'Показатель визирования': form.characteristics_visibility.value,
      'Диапазон измерений температуры': form.characteristics_temperature_range.value,
      'Погрешность': form.characteristics_accuracy.value,
      'Спектральный диапазон': form.characteristics_spectral_range.value,
      'Особенности применения': form.characteristics_application.value,
      'Принцип действия': form.characteristics_principle.value,
      'Измеряемые материалы': form.characteristics_materials.value,
      'Исполнение': form.characteristics_execution.value,
      'Быстродействие': form.characteristics_speed.value,
      'Точность': form.characteristics_precision.value,
      'Температура мин': form.characteristics_temperature_min.value,
      'Температура макс': form.characteristics_temperature_max.value
    },
    seo: {
      title: form.seo_title.value,
      description: form.seo_description.value,
      keywords: form.seo_keywords.value
    }
  };

  try {
    if (form.id.value) {
      await handleApiCall(
        () => fetch(API + '/admin/products/' + form.id.value, { 
          method: 'PUT', 
          headers: authHeaders(), 
          body: JSON.stringify(body) 
        }),
        'Товар обновлен'
      );
    } else {
      // Generate ID for new product
      body.id = Date.now().toString();
      await handleApiCall(
        () => fetch(API + '/admin/products', { 
          method: 'POST', 
          headers: authHeaders(), 
          body: JSON.stringify(body) 
        }),
        'Товар создан'
      );
    }
    form.reset();
    currentEditing = null;
    loadProducts();
  } catch (error) {
    // Error handled in handleApiCall
  }
});

document.getElementById('article-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  
  const body = { 
    category: form.category.value,
    title: form.title.value,
    excerpt: form.excerpt.value,
    image: form.image.value,
    date: form.date.value,
    readTime: form.readTime.value,
    views: form.views.value,
    content: [
      {
        type: "paragraph",
        text: form.content.value
      }
    ]
  };

  try {
    if (form.id.value) {
      await handleApiCall(
        () => fetch(API + '/admin/articles/' + form.id.value, { 
          method: 'PUT', 
          headers: authHeaders(), 
          body: JSON.stringify(body) 
        }),
        'Статья обновлена'
      );
    } else {
      // Generate ID for new article
      body.id = Date.now();
      await handleApiCall(
        () => fetch(API + '/admin/articles', { 
          method: 'POST', 
          headers: authHeaders(), 
          body: JSON.stringify(body) 
        }),
        'Статья создана'
      );
    }
    form.reset();
    currentEditing = null;
    loadArticles();
  } catch (error) {
    // Error handled in handleApiCall
  }
});

// Cancel buttons
document.getElementById('cancel-edit').addEventListener('click', () => {
  document.getElementById('product-form').reset();
  currentEditing = null;
});

document.getElementById('cancel-edit-article').addEventListener('click', () => {
  document.getElementById('article-form').reset();
  currentEditing = null;
});

// Refresh buttons
document.getElementById('refresh-products').addEventListener('click', loadProducts);
document.getElementById('refresh-articles').addEventListener('click', loadArticles);

// Statistics
function updateStats() {
  const productsCount = document.querySelectorAll('#products-list .item').length;
  const articlesCount = document.querySelectorAll('#articles-list .item').length;
  
  document.getElementById('products-count').textContent = productsCount;
  document.getElementById('articles-count').textContent = articlesCount;
}

// Auto-save token in localStorage
tokenInput.addEventListener('change', () => {
  localStorage.setItem('admin-token', tokenInput.value);
});

// Load saved token
window.addEventListener('load', () => {
  const savedToken = localStorage.getItem('admin-token');
  if (savedToken) {
    tokenInput.value = savedToken;
  }
  
  loadProducts();
  loadArticles();
});