const API = '/api';

// Auth state
let isAuthenticated = false;

// DOM Elements
const tokenInput = document.getElementById('token');
const toggleTokenBtn = document.getElementById('toggle-token');
const logoutBtn = document.getElementById('logout');
const statusMessage = document.getElementById('status-message');
const authMessage = document.getElementById('auth-message');

// Auth DOM Elements
const loginForm = document.getElementById('login-form');
const adminPanel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');

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
  if (!isAuthenticated) {
    throw new Error('Не авторизован');
  }
  
  const tokenElement = document.getElementById('token');
  let token = '';
  
  if (tokenElement) {
    token = tokenElement.value.trim();
  }
  
  if (!token) {
    throw new Error('Токен администратора не указан');
  }
  
  return { 
    'Content-Type': 'application/json', 
    'x-admin-token': token
  };
}

async function handleApiCall(apiCall, successMessage) {
  try {
    if (!isAuthenticated) {
      throw new Error('Требуется авторизация');
    }
    
    const response = await apiCall();
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }
    
    showMessage(successMessage, 'success');
    return await response.json();
  } catch (error) {
    console.error('API Call Error:', error);
    
    if (error.message.includes('Не авторизован') || error.message.includes('Требуется авторизация')) {
      logout();
      showMessage('Сессия истекла. Требуется повторный вход.', 'error');
    } else {
      showMessage(`Ошибка: ${error.message}`, 'error');
    }
    
    throw error;
  }
}

// Authentication functions
function checkAuth() {
  const savedAuth = localStorage.getItem('admin-authenticated');
  const authTime = localStorage.getItem('admin-auth-time');
  const now = Date.now();
  
  if (savedAuth === 'true' && authTime && (now - parseInt(authTime)) < 24 * 60 * 60 * 1000) {
    loginSuccess();
  } else {
    logout();
  }
}

function loginSuccess() {
  isAuthenticated = true;
  loginForm.style.display = 'none';
  adminPanel.style.display = 'flex';
  document.body.classList.remove('unauthorized');
  authMessage.style.display = 'none';
  
  const authTime = Date.now();
  localStorage.setItem('admin-authenticated', 'true');
  localStorage.setItem('admin-auth-time', authTime.toString());
  
  loadProducts();
  loadArticles();
}

function logout() {
  isAuthenticated = false;
  loginForm.style.display = 'flex';
  adminPanel.style.display = 'none';
  document.body.classList.add('unauthorized');
  authMessage.style.display = 'block';
  
  localStorage.removeItem('admin-authenticated');
  localStorage.removeItem('admin-auth-time');
  
  passwordInput.value = '';
  document.getElementById('products-list').innerHTML = '';
  document.getElementById('articles-list').innerHTML = '';
  updateStats();
}

async function attemptLogin() {
  const password = passwordInput.value.trim();
  
  if (!password) {
    showMessage('Введите пароль', 'error');
    return;
  }
  
  loginBtn.disabled = true;
  
  try {
    loginBtn.innerHTML = '⏳ Проверка...';
    
    console.log('Sending password verification request...');
    
    const response = await fetch('/admin/verify-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Server response:', result);
    
    if (result.success) {
      loginSuccess();
      showMessage('Успешный вход в систему', 'success');
    } else {
      showMessage(result.error || 'Неверный пароль', 'error');
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Ошибка при входе: ' + error.message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Войти';
  }
}

// Login functionality
loginBtn.addEventListener('click', attemptLogin);

// Enter key for login
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    attemptLogin();
  }
});

// Token visibility toggle
toggleTokenBtn.addEventListener('click', () => {
  const type = tokenInput.type === 'password' ? 'text' : 'password';
  tokenInput.type = type;
  toggleTokenBtn.textContent = type === 'password' ? '👁' : '👁‍🗨';
});

// Logout functionality
logoutBtn.addEventListener('click', () => {
  logout();
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
    const headers = authHeaders();
    await handleApiCall(
      () => fetch('/auth/products/' + id, { 
        method: 'DELETE', 
        headers: headers
      }),
      'Товар удален'
    );
    loadProducts();
  } catch (error) {}
}

function openProductPopup(product = null) {
  const popup = document.getElementById('product-popup');
  const form = document.getElementById('product-form-popup');
  const title = document.getElementById('product-popup-title');
  
  if (product) {
    title.textContent = 'Редактировать товар';
    form.id.value = product.id;
    form.sku.value = product.sku || '';
    form.category.value = product.category || '';
    form.title.value = product.title || '';
    form.photo.value = product.photo || '';
    form.price.value = product.price || '';
    form.quantity.value = product.quantity || 1;
    
    form.characteristics_visibility.value = product.characteristics?.['Показатель визирования'] || '';
    form.characteristics_temperature_range.value = product.characteristics?.['Диапазон измерений температуры'] || '';
    form.characteristics_accuracy.value = product.characteristics?.['Погрешность'] || '';
    form.characteristics_spectral_range.value = product.characteristics?.['Спектральный диапазон'] || '';
    form.characteristics_principle.value = product.characteristics?.['Принцип действия'] || '';
    form.characteristics_materials.value = product.characteristics?.['Измеряемые материалы'] || '';
    form.characteristics_temperature_min.value = product.characteristics?.['Температура мин'] || '';
    form.characteristics_temperature_max.value = product.characteristics?.['Температура макс'] || '';
    
    form.seo_title.value = product.seo?.title || '';
    form.seo_description.value = product.seo?.description || '';
    form.seo_keywords.value = product.seo?.keywords || '';
  } else {
    title.textContent = 'Добавить товар';
    form.reset();
    form.id.value = '';
  }
  
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductPopup() {
  const popup = document.getElementById('product-popup');
  popup.classList.remove('active');
  document.body.style.overflow = '';
  const form = document.getElementById('product-form-popup');
  form.reset();
}

async function editProduct(id) {
  try {
    const product = await handleApiCall(
      () => fetch(API + '/products/' + id),
      'Товар загружен для редактирования'
    );
    openProductPopup(product);
  } catch (error) {}
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
    const headers = authHeaders();
    await handleApiCall(
      () => fetch('/auth/articles/' + id, { 
        method: 'DELETE', 
        headers: headers
      }),
      'Статья удалена'
    );
    loadArticles();
  } catch (error) {}
}

function openArticlePopup(article = null) {
  const popup = document.getElementById('article-popup');
  const form = document.getElementById('article-form-popup');
  const title = document.getElementById('article-popup-title');
  
  if (article) {
    title.textContent = 'Редактировать статью';
    form.id.value = article.id;
    form.category.value = article.category || '';
    form.title.value = article.title || '';
    form.excerpt.value = article.excerpt || '';
    form.image.value = article.image || '';
    form.date.value = article.date || '';
    form.readTime.value = article.readTime || '';
    form.views.value = article.views || '';
    
    if (article.content && article.content.length > 0) {
      const firstParagraph = article.content.find(item => item.type === 'paragraph');
      form.content.value = firstParagraph ? firstParagraph.text : '';
    } else {
      form.content.value = '';
    }
  } else {
    title.textContent = 'Добавить статью';
    form.reset();
    form.id.value = '';
  }
  
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeArticlePopup() {
  const popup = document.getElementById('article-popup');
  popup.classList.remove('active');
  document.body.style.overflow = '';
  const form = document.getElementById('article-form-popup');
  form.reset();
}

async function editArticle(id) {
  try {
    const article = await handleApiCall(
      () => fetch(API + '/articles/' + id),
      'Статья загружена для редактирования'
    );
    openArticlePopup(article);
  } catch (error) {}
}

// Popup event handlers
function initPopupHandlers() {
  const addProductBtn = document.getElementById('add-product');
  const addArticleBtn = document.getElementById('add-article');
  const closeProductPopupBtn = document.getElementById('close-product-popup');
  const closeArticlePopupBtn = document.getElementById('close-article-popup');
  const cancelProductPopupBtn = document.getElementById('cancel-edit-product-popup');
  const cancelArticlePopupBtn = document.getElementById('cancel-edit-article-popup');
  const productPopupOverlay = document.querySelector('#product-popup .admin-popup__overlay');
  const articlePopupOverlay = document.querySelector('#article-popup .admin-popup__overlay');
  const productFormPopup = document.getElementById('product-form-popup');
  const articleFormPopup = document.getElementById('article-form-popup');

  if (addProductBtn) {
    addProductBtn.addEventListener('click', () => {
      if (!isAuthenticated) {
        showMessage('Требуется авторизация', 'error');
        return;
      }
      openProductPopup();
    });
  }

  if (addArticleBtn) {
    addArticleBtn.addEventListener('click', () => {
      if (!isAuthenticated) {
        showMessage('Требуется авторизация', 'error');
        return;
      }
      openArticlePopup();
    });
  }

  if (closeProductPopupBtn) {
    closeProductPopupBtn.addEventListener('click', closeProductPopup);
  }

  if (closeArticlePopupBtn) {
    closeArticlePopupBtn.addEventListener('click', closeArticlePopup);
  }

  if (productPopupOverlay) {
    productPopupOverlay.addEventListener('click', closeProductPopup);
  }

  if (articlePopupOverlay) {
    articlePopupOverlay.addEventListener('click', closeArticlePopup);
  }

  if (cancelProductPopupBtn) {
    cancelProductPopupBtn.addEventListener('click', closeProductPopup);
  }

  if (cancelArticlePopupBtn) {
    cancelArticlePopupBtn.addEventListener('click', closeArticlePopup);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const productPopup = document.getElementById('product-popup');
      const articlePopup = document.getElementById('article-popup');
      if (productPopup && productPopup.classList.contains('active')) {
        closeProductPopup();
      }
      if (articlePopup && articlePopup.classList.contains('active')) {
        closeArticlePopup();
      }
    }
  });

  if (productFormPopup) {
    productFormPopup.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!isAuthenticated) {
        showMessage('Требуется авторизация', 'error');
        return;
      }
      
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
          'Принцип действия': form.characteristics_principle.value,
          'Измеряемые материалы': form.characteristics_materials.value,
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
        const headers = authHeaders();
        
        if (form.id.value) {
          await handleApiCall(
            () => fetch('/auth/products/' + form.id.value, { 
              method: 'PUT', 
              headers: headers,
              body: JSON.stringify(body) 
            }),
            'Товар обновлен'
          );
        } else {
          body.id = Date.now().toString();
          await handleApiCall(
            () => fetch('/auth/products', { 
              method: 'POST', 
              headers: headers,
              body: JSON.stringify(body) 
            }),
            'Товар создан'
          );
        }
        closeProductPopup();
        loadProducts();
      } catch (error) {}
    });
  }

  if (articleFormPopup) {
    articleFormPopup.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!isAuthenticated) {
        showMessage('Требуется авторизация', 'error');
        return;
      }
      
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
        const headers = authHeaders();
        
        if (form.id.value) {
          await handleApiCall(
            () => fetch('/auth/articles/' + form.id.value, { 
              method: 'PUT', 
              headers: headers,
              body: JSON.stringify(body) 
            }),
            'Статья обновлена'
          );
        } else {
          body.id = Date.now();
          await handleApiCall(
            () => fetch('/auth/articles', { 
              method: 'POST', 
              headers: headers,
              body: JSON.stringify(body) 
            }),
            'Статья создана'
          );
        }
        closeArticlePopup();
        loadArticles();
      } catch (error) {}
    });
  }
}

// Refresh buttons
function initRefreshButtons() {
  const refreshProductsBtn = document.getElementById('refresh-products');
  const refreshArticlesBtn = document.getElementById('refresh-articles');
  
  if (refreshProductsBtn) {
    refreshProductsBtn.addEventListener('click', () => {
      if (!isAuthenticated) {
        showMessage('Требуется авторизация', 'error');
        return;
      }
      loadProducts();
    });
  }
  
  if (refreshArticlesBtn) {
    refreshArticlesBtn.addEventListener('click', () => {
      if (!isAuthenticated) {
        showMessage('Требуется авторизация', 'error');
        return;
      }
      loadArticles();
    });
  }
}

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

// Load saved token and initialize
window.addEventListener('load', async () => {
  const savedToken = localStorage.getItem('admin-token');
  if (savedToken) {
    tokenInput.value = savedToken;
  }
  
  initPopupHandlers();
  initRefreshButtons();
  checkAuth();
});