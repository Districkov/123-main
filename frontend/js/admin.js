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

// Prevent default navigation for any AJAX forms as a safety net
document.addEventListener('submit', (e) => {
  try {
    if (e.target && e.target.classList && e.target.classList.contains('ajax-form')) {
      e.preventDefault();
    }
  } catch (err) {
    // ignore
  }
});

function authHeaders() {
  // Prefer explicit token input, otherwise fallback to saved admin-token or password input.
  const tokenElement = document.getElementById('token');
  let token = '';

  if (tokenElement && tokenElement.value) {
    token = tokenElement.value.trim();
  } else {
    token = (localStorage.getItem('admin-token') || (document.getElementById('password') && document.getElementById('password').value) || '').trim();
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['x-admin-token'] = token;
  return headers;
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
  // Ensure we have a non-empty admin token for protected /auth endpoints.
  // The server middleware accepts any non-empty token string; store one for the session.
  if (!localStorage.getItem('admin-token')) {
    localStorage.setItem('admin-token', 'admintoken:' + authTime);
  }
  
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
  localStorage.removeItem('admin-token');
  
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
      // if server returned a token, save it and set token input
      if (result.token) {
        localStorage.setItem('admin-token', result.token);
        const tokenEl = document.getElementById('token');
        if (tokenEl) tokenEl.value = result.token;
      }
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
if (loginBtn) loginBtn.addEventListener('click', attemptLogin);

// Enter key for login
if (passwordInput) {
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      attemptLogin();
    }
  });
}

// Token visibility toggle
if (toggleTokenBtn) {
  toggleTokenBtn.addEventListener('click', () => {
    if (!tokenInput) return;
    const type = tokenInput.type === 'password' ? 'text' : 'password';
    tokenInput.type = type;
    toggleTokenBtn.textContent = type === 'password' ? '👁' : '👁‍🗨';
  });
}

// Logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    logout();
    showMessage('Вы вышли из системы', 'info');
  });
}

// Products functionality
let productsCache = [];
let currentProductFilter = '';
// Articles functionality cache/filter
let articlesCache = [];
let currentArticleFilter = '';

async function loadProducts() {
  try {
    const data = await handleApiCall(
      () => fetch(API + '/products'),
      'Товары загружены'
    );
    // cache products and render (newest first)
    productsCache = Array.isArray(data) ? data.slice() : [];
    renderProducts(productsCache);
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

  // apply current search filter
  const filter = (currentProductFilter || '').trim().toLowerCase();
  let list = Array.from(products);
  if (filter) {
    list = list.filter(p => {
      const title = (p.title || '').toLowerCase();
      const sku = (Array.isArray(p.sku) ? p.sku.join(' ') : (p.sku || '')).toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return title.includes(filter) || sku.includes(filter) || cat.includes(filter) || desc.includes(filter);
    });
  }

  // sort newest-first by numeric id when possible (ids created by Date.now())
  list.sort((a,b) => {
    const ai = Number(a.id) || 0;
    const bi = Number(b.id) || 0;
    return bi - ai;
  });

  el.innerHTML = list.map(p => {
    // Галерея изображений
    let images = '';
    if (Array.isArray(p.photos) && p.photos.length) {
      images = p.photos.map(url => `<img src="${url}" alt="${p.title}" onerror="this.src='./images/no-image.jpg'" style="max-width:40px;max-height:40px;margin-right:2px;">`).join('');
    } else if (p.photo) {
      images = `<img src="${p.photo}" alt="${p.title}" onerror="this.src='./images/no-image.jpg'" style="max-width:40px;max-height:40px;">`;
    } else {
      images = `<img src="./images/no-image.jpg" alt="${p.title}" style="max-width:40px;max-height:40px;">`;
    }
    // Артикулы
    let sku = Array.isArray(p.sku) ? p.sku.join(', ') : (p.sku || 'Не указан');
    return `
    <div class="item" data-id="${p.id}">
      <div class="item-content">
        <div class="item-image">
          ${images}
        </div>
        <div class="item-info">
          <strong>${p.title || 'Без названия'}</strong>
          <span class="item-sku">Артикул: ${sku}</span>
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
    `;
  }).join('');
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
    await loadProducts();
    try {
      localStorage.setItem('products-updated', Date.now().toString());
    } catch (e) {
      console.warn('Could not write products-updated to localStorage', e);
    }
  } catch (error) {}
}

function openProductPopup(product = null) {
  const popup = document.getElementById('product-popup');
  const form = document.getElementById('product-form-popup');
  const title = document.getElementById('product-popup-title');
  if (product) {
    title.textContent = 'Редактировать товар';
    form.id.value = product.id;
    // Поддержка массива артикулов
    if (Array.isArray(product.sku)) {
      form.sku.value = product.sku.join(', ');
    } else {
      form.sku.value = product.sku || '';
    }
    form.category.value = product.category || '';
    form.title.value = product.title || '';
    // Поддержка массива изображений
    if (form.photos) {
      let photos = product.photos || product.photo || '';
      if (Array.isArray(photos)) {
        form.photos.value = photos.join(', ');
      } else {
        form.photos.value = photos;
      }
    }
    // Update inline preview for images in the popup
    updatePhotoPreview(form);
    form.price.value = product.price || '';
    form.quantity.value = product.quantity || 1;
    // Характеристики
    form.characteristics_visibility.value = product.characteristics?.['Показатель визирования'] || '';
    form.characteristics_temperature_range.value = product.characteristics?.['Диапазон измерений температуры'] || '';
    // Точность (селект)
    if (form.characteristics_accuracy) form.characteristics_accuracy.value = product.characteristics?.['Точность'] || '';
    // Быстродействие (селект)
    if (form.characteristics_speed) form.characteristics_speed.value = product.characteristics?.['Быстродействие'] || '';
    // Исполнение (множественный выбор)
    if (form.characteristics_design) {
      // now single-select: pick first value if array, otherwise take string
      const raw = product.characteristics?.['Исполнение'];
      if (Array.isArray(raw)) form.characteristics_design.value = raw[0] || '';
      else form.characteristics_design.value = raw || '';
    }
    // Устройство визирования (селект)
    if (form.characteristics_sight) form.characteristics_sight.value = product.characteristics?.['Устройство визирования'] || '';
    // Внесен в Госреестр (селект)
    if (form.characteristics_registry) form.characteristics_registry.value = product.characteristics?.['Госреестр'] || '';
    // Для малоразмерных объектов (селект)
    if (form.characteristics_small_objects) form.characteristics_small_objects.value = product.characteristics?.['Малоразмерные объекты'] || '';
    // Принцип действия (селект)
    if (form.characteristics_principle) form.characteristics_principle.value = product.characteristics?.['Принцип действия'] || '';
    // Материалы (множественный выбор)
    if (form.characteristics_materials) {
      const raw = product.characteristics?.['Измеряемые материалы и среды'];
      if (Array.isArray(raw)) form.characteristics_materials.value = raw[0] || '';
      else form.characteristics_materials.value = raw || '';
    }
    // Особенности применения (множественный выбор)
    if (form.characteristics_features) {
      const raw = product.characteristics?.['Особенности применения'];
      if (Array.isArray(raw)) form.characteristics_features.value = raw[0] || '';
      else form.characteristics_features.value = raw || '';
    }
    form.characteristics_temperature_min.value = product.characteristics?.['Температура мин'] || '';
    form.characteristics_temperature_max.value = product.characteristics?.['Температура макс'] || '';
    // Описание
    if (form.description) form.description.value = product.description || '';
    // SEO
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
  // ensure our compact multi-selects reflect the current select.selected options
  try { refreshCompactMultiSelects(); } catch (e) {}
}

function closeProductPopup() {
  const popup = document.getElementById('product-popup');
  popup.classList.remove('active');
  document.body.style.overflow = '';
  const form = document.getElementById('product-form-popup');
  form.reset();
  // refresh compact multi-select UI to reflect reset state
  try { refreshCompactMultiSelects(); } catch (e) {}
}

// Compact custom multi-select UI -------------------------------------------------
function createCompactMultiSelect(select) {
  if (!select || select.dataset.compactInit === '1') return;
  select.dataset.compactInit = '1';

  // wrap container
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-multiselect';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'multi-toggle';
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.setAttribute('aria-expanded', 'false');

  const panel = document.createElement('div');
  panel.className = 'multi-panel';
  panel.setAttribute('role', 'listbox');

  // Build checkbox list from select options
  Array.from(select.options).forEach((opt, idx) => {
    const row = document.createElement('label');
    row.className = 'multi-option';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.optIndex = idx;
    cb.checked = opt.selected;
    cb.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const i = parseInt(e.target.dataset.optIndex, 10);
      if (!isNaN(i) && select.options[i]) {
        select.options[i].selected = checked;
        // keep underlying select event flow
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      updateToggleLabel(select, wrapper);
    });
    const span = document.createElement('span');
    span.textContent = opt.textContent;
    row.appendChild(cb);
    row.appendChild(span);
    panel.appendChild(row);
  });

  toggle.addEventListener('click', (e) => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      closePanel();
    } else {
      openPanel();
    }
  });

  function openPanel() {
    panel.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', outsideListener);
  }
  function closePanel() {
    panel.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', outsideListener);
  }
  function outsideListener(ev) {
    if (!wrapper.contains(ev.target)) closePanel();
  }

  wrapper.appendChild(toggle);
  wrapper.appendChild(panel);

  // insert after select and hide native select visually but keep it for form
  select.style.display = 'none';
  select.parentNode.insertBefore(wrapper, select.nextSibling);

  // helper to update label
  updateToggleLabel(select, wrapper);
}

function updateToggleLabel(select, wrapper) {
  const toggle = wrapper.querySelector('.multi-toggle');
  const selected = Array.from(select.selectedOptions).map(o => o.textContent.trim()).filter(Boolean);
  if (!toggle) return;
  if (selected.length === 0) {
    toggle.textContent = '— выбрать —';
    toggle.classList.add('select-empty');
  } else if (selected.length > 2) {
    toggle.textContent = `${selected.length} выбрано`;
    toggle.classList.remove('select-empty');
  } else {
    toggle.textContent = selected.join(', ');
    toggle.classList.remove('select-empty');
  }
}

function refreshCompactMultiSelects() {
  const selects = Array.from(document.querySelectorAll('select[multiple]'));
  selects.forEach(sel => {
    // if widget exists, update checkboxes from select.options
    const wrapper = sel.nextElementSibling && sel.nextElementSibling.classList && sel.nextElementSibling.classList.contains('custom-multiselect') ? sel.nextElementSibling : null;
    if (wrapper) {
      const checks = wrapper.querySelectorAll('input[type="checkbox"]');
      Array.from(checks).forEach(cb => {
        const idx = parseInt(cb.dataset.optIndex, 10);
        cb.checked = !!(sel.options[idx] && sel.options[idx].selected);
      });
      updateToggleLabel(sel, wrapper);
    } else {
      // create new widget
      createCompactMultiSelect(sel);
    }
  });
}

function initCompactMultiSelects() {
  try { refreshCompactMultiSelects(); } catch (e) { console.warn('compact multi-select init error', e); }
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
    articlesCache = Array.isArray(data) ? data.slice() : [];
    renderArticles(articlesCache);
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

  // apply current search filter
  const filter = (currentArticleFilter || '').trim().toLowerCase();
  let list = Array.from(articles);
  if (filter) {
    list = list.filter(a => {
      const title = (a.title || '').toLowerCase();
      const cat = (a.category || '').toLowerCase();
      const excerpt = (a.excerpt || '').toLowerCase();
      return title.includes(filter) || cat.includes(filter) || excerpt.includes(filter);
    });
  }

  // sort newest-first by numeric id
  list.sort((a,b) => {
    const ai = Number(a.id) || 0;
    const bi = Number(b.id) || 0;
    return bi - ai;
  });

  el.innerHTML = list.map(a => `
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

  // products search input
  const productsSearch = document.getElementById('products-search');
  if (productsSearch) {
    productsSearch.addEventListener('input', (e) => {
      currentProductFilter = e.target.value || '';
      renderProducts(productsCache);
    });
  }

  // articles search input
  const articlesSearch = document.getElementById('articles-search');
  if (articlesSearch) {
    articlesSearch.addEventListener('input', (e) => {
      currentArticleFilter = e.target.value || '';
      renderArticles(articlesCache);
    });
  }

  // scroll to top button
  const scrollTopBtn = document.getElementById('scroll-top-btn');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
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
      // Множественный выбор для материалов и особенностей применения
      function getMultiSelectValues(sel) {
        return sel ? Array.from(sel.selectedOptions).map(opt => opt.value) : [];
      }
      // Массив изображений
      let photos = form.photos && form.photos.value ? form.photos.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
      // Массив артикулов
      let sku = form.sku && form.sku.value ? form.sku.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
      if (sku.length === 1) sku = sku[0];
      const body = {
        sku: sku,
        category: form.category.value,
        title: form.title.value,
        photos: photos,
        price: parseFloat(form.price.value) || 0,
        quantity: parseInt(form.quantity.value) || 1,
        description: form.description ? form.description.value : '',
        characteristics: {
          'Показатель визирования': form.characteristics_visibility.value,
          'Диапазон измерений температуры': form.characteristics_temperature_range.value,
          'Точность': form.characteristics_accuracy ? form.characteristics_accuracy.value : '',
          'Быстродействие': form.characteristics_speed ? form.characteristics_speed.value : '',
          'Исполнение': form.characteristics_design ? form.characteristics_design.value : '',
          'Устройство визирования': form.characteristics_sight ? form.characteristics_sight.value : '',
          'Госреестр': form.characteristics_registry ? form.characteristics_registry.value : '',
          'Малоразмерные объекты': form.characteristics_small_objects ? form.characteristics_small_objects.value : '',
          'Принцип действия': form.characteristics_principle ? form.characteristics_principle.value : '',
          'Измеряемые материалы и среды': form.characteristics_materials ? form.characteristics_materials.value : '',
          'Особенности применения': form.characteristics_features ? form.characteristics_features.value : '',
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
        try {
          // notify other tabs (catalog) that products changed
          // include id so catalog can scroll/highlight the updated item
          const updatedId = form.id.value || body.id || null;
          const payload = { ts: Date.now(), id: updatedId };
          localStorage.setItem('products-updated', JSON.stringify(payload));
          console.log('admin: products-updated written', payload);
        } catch (e) {
          console.warn('Could not write products-updated to localStorage', e);
        }
      } catch (error) {
        console.error('Error saving product:', error);
        showMessage('Ошибка при сохранении товара: ' + (error.message || error), 'error');
      }
    });
    // Live preview when photos textarea changes
    if (productFormPopup.photos) {
      productFormPopup.photos.addEventListener('input', () => updatePhotoPreview(productFormPopup));
    }

    // File upload input (local images)
    const photosFileInput = productFormPopup.querySelector('#photos-files');
    if (photosFileInput) {
      photosFileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const container = photosFileInput.closest('.photos-upload');
        const filenamesEl = container ? container.querySelector('.upload-filenames') : null;
        if (filenamesEl) filenamesEl.textContent = files.map(f => f.name).join(', ');
        if (container) container.classList.add('photos-uploading');

        try {
          showMessage('Загрузка изображений...', 'info');
          const fd = new FormData();
          files.forEach(f => fd.append('files', f));

          // build headers but do not set Content-Type for multipart/form-data
          let headers = {};
          try {
            headers = authHeaders();
          } catch (err) {
            // If authHeaders throws (not considered authenticated) or returns no token,
            // try fallback: use stored admin-token or current password input as token.
            headers = {};
            const fallbackToken = (localStorage.getItem('admin-token') || (document.getElementById('password') && document.getElementById('password').value) || '').trim();
            if (fallbackToken) headers['x-admin-token'] = fallbackToken;
          }
          if (headers['Content-Type']) delete headers['Content-Type'];

          // Ensure we have an admin token before attempting upload to avoid 401 from remote hosts
          if (!headers['x-admin-token'] || headers['x-admin-token'].trim() === '') {
            showMessage('Требуется токен администратора. Введите пароль и нажмите «Войти», либо вставьте токен в поле `token`.', 'error');
            throw new Error('Missing admin token');
          }

          const resp = await fetch('/auth/upload', {
            method: 'POST',
            headers: headers,
            body: fd
          });
          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(txt || 'Upload failed');
          }
          const result = await resp.json();
          const urls = (result.files || []).map(f => {
            const u = f.url || '';
            // make absolute when server returns root-relative path
            if (u.startsWith('/')) return window.location.origin + u;
            return u;
          });
          if (urls.length) {
            const current = productFormPopup.photos && productFormPopup.photos.value ? productFormPopup.photos.value.trim() + '\n' : '';
            if (productFormPopup.photos) productFormPopup.photos.value = current + urls.join(', ');
            updatePhotoPreview(productFormPopup);
            showMessage('Изображения загружены', 'success');
            if (filenamesEl) filenamesEl.textContent = 'Загружено: ' + urls.map(u => u.split('/').pop()).join(', ');
          } else {
            throw new Error('No URLs returned from upload');
          }
        } catch (err) {
          console.error('File upload error:', err);
          showMessage('Ошибка при загрузке изображений: ' + (err.message || err), 'error');
          if (filenamesEl) filenamesEl.textContent = '';
        } finally {
          // clear input so same files can be selected again if needed
          photosFileInput.value = '';
          if (container) container.classList.remove('photos-uploading');
        }
      });
    }
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
        try {
          localStorage.setItem('articles-updated', Date.now().toString());
          console.log('admin: articles-updated written');
        } catch (e) {
          console.warn('Could not write articles-updated to localStorage', e);
        }
      } catch (error) {
        console.error('Error saving article:', error);
        showMessage('Ошибка при сохранении статьи: ' + (error.message || error), 'error');
      }
    });

    // File upload input for article image (uploads and inserts URL into image field)
    const articleImageInput = articleFormPopup.querySelector('#article-image-file');
    if (articleImageInput) {
      articleImageInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const container = articleImageInput.closest('.photos-upload');
        const filenamesEl = container ? container.querySelector('.upload-filenames') : null;
        if (filenamesEl) filenamesEl.textContent = files.map(f => f.name).join(', ');
        if (container) container.classList.add('photos-uploading');

        try {
          showMessage('Загрузка изображения...', 'info');
          const fd = new FormData();
          files.forEach(f => fd.append('files', f));

          // build headers but do not set Content-Type for multipart/form-data
          let headers = {};
          try {
            headers = authHeaders();
          } catch (err) {
            headers = {};
            const fallbackToken = (localStorage.getItem('admin-token') || (document.getElementById('password') && document.getElementById('password').value) || '').trim();
            if (fallbackToken) headers['x-admin-token'] = fallbackToken;
          }
          if (headers['Content-Type']) delete headers['Content-Type'];

          if (!headers['x-admin-token'] || headers['x-admin-token'].trim() === '') {
            showMessage('Требуется токен администратора. Введите пароль и нажмите «Войти», либо вставьте токен в поле `token`.', 'error');
            throw new Error('Missing admin token');
          }

          const resp = await fetch('/auth/upload', {
            method: 'POST',
            headers: headers,
            body: fd
          });
          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(txt || 'Upload failed');
          }
          const result = await resp.json();
          const urls = (result.files || []).map(f => {
            const u = f.url || '';
            if (u.startsWith('/')) return window.location.origin + u;
            return u;
          });
          if (urls.length) {
            if (articleFormPopup.image) articleFormPopup.image.value = urls[0];
            showMessage('Изображение загружено', 'success');
            if (filenamesEl) filenamesEl.textContent = 'Загружено: ' + urls.map(u => u.split('/').pop()).join(', ');
          } else {
            throw new Error('No URLs returned from upload');
          }
        } catch (err) {
          console.error('Article image upload error:', err);
          showMessage('Ошибка при загрузке изображения: ' + (err.message || err), 'error');
          if (filenamesEl) filenamesEl.textContent = '';
        } finally {
          articleImageInput.value = '';
          if (container) container.classList.remove('photos-uploading');
        }
      });
    }
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

// Photo preview helper for admin product popup
function updatePhotoPreview(form) {
  if (!form) return;
  let photosValue = form.photos ? form.photos.value : '';
  const containerClass = 'photos-preview';
  let preview = form.querySelector('.' + containerClass);
  if (!preview) {
    preview = document.createElement('div');
    preview.className = containerClass;
    // insert after photos textarea
    if (form.photos && form.photos.parentNode) {
      form.photos.parentNode.insertBefore(preview, form.photos.nextSibling);
    } else {
      form.appendChild(preview);
    }
  }

  const urls = photosValue ? photosValue.split(/[,\n]+/).map(s => s.trim()).filter(Boolean) : [];
  if (urls.length === 0) {
    preview.innerHTML = '<div class="photos-preview__empty">Нет указанных изображений</div>';
    return;
  }

  preview.innerHTML = urls.map((url, idx) => {
    const safe = url.replace(/"/g, '&quot;');
    return `
      <div class="photos-preview__item" data-idx="${idx}">
        <a href="${safe}" target="_blank" rel="noopener noreferrer">
          <img src="${safe}" alt="preview-${idx}" onerror="this.src='./images/no-image.jpg'">
        </a>
      </div>
    `;
  }).join('');

  // upscale small previews visually if needed
  preview.querySelectorAll('img').forEach(img => {
    img.style.objectFit = 'contain';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.display = 'block';
    img.addEventListener('load', () => {
      try {
        const naturalW = img.naturalWidth || 0;
        const naturalH = img.naturalHeight || 0;
        const parent = img.parentElement || img;
        const rect = parent.getBoundingClientRect();
        const contW = rect.width || 1;
        const contH = rect.height || 1;
        const scaleW = contW / Math.max(naturalW, 1);
        const scaleH = contH / Math.max(naturalH, 1);
        const scale = Math.max(1, Math.min(scaleW, scaleH));
        if (scale > 1.01) img.style.transform = `scale(${scale.toFixed(3)})`;
        else img.style.transform = '';
      } catch (e) {}
    });
  });
}

// Auto-save token in localStorage
if (tokenInput) {
  tokenInput.addEventListener('change', () => {
    localStorage.setItem('admin-token', tokenInput.value);
  });
}

// Lightweight: populate visibility and temperature-range selects from products.json
async function populateCharacteristicSelects() {
  try {
    const resp = await fetch('/data/products.json');
    if (!resp.ok) return;
    const products = await resp.json();

    const visSet = new Set();
    const tempSet = new Set();

    products.forEach(p => {
      const c = p.characteristics || {};
      const v = c['Показатель визирования'] || c['Показатель визирования (второе)'];
      const t = c['Диапазон измерений температуры'] || c['Диапазон температур'] || c['Диапазон измерений'];
      if (v) {
        if (Array.isArray(v)) v.forEach(x => x && visSet.add(String(x).trim()));
        else visSet.add(String(v).trim());
      }
      if (t) {
        if (Array.isArray(t)) t.forEach(x => x && tempSet.add(String(x).trim()));
        else tempSet.add(String(t).trim());
      }
    });

    function appendOptions(selectId, set) {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      const existing = new Set(Array.from(sel.options).map(o => o.value));
      Array.from(set).forEach(v => {
        if (v && !existing.has(v)) {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          sel.appendChild(opt);
        }
      });
    }

    appendOptions('characteristics_visibility', visSet);
    appendOptions('characteristics_temperature_range', tempSet);
  } catch (err) {
    console.warn('populateCharacteristicSelects error', err);
  }
}

// Load saved token and initialize
window.addEventListener('load', async () => {
  const savedToken = localStorage.getItem('admin-token');
  if (savedToken) {
    if (tokenInput) tokenInput.value = savedToken;
  }
  
  initPopupHandlers();
  initRefreshButtons();
  // populate visibility/temperature selects from products.json (best-effort)
  try { await populateCharacteristicSelects(); } catch (e) {}
  try { initCompactMultiSelects(); } catch (e) {}
  checkAuth();
});