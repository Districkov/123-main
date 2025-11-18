// catalog.js - Полная версия с исправлением попапа
class CatalogManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            temperature: [],
            визирование: [],
            погрешность: [],
            спектральныйДиапазон: [],
            принципДействия: [],
            материалы: [],
            исполнение: [],
            быстродействие: [],
            точность: [],
            устройствоВизирования: [],
            госреестр: []
        };
        this.searchQuery = '';
        this.sortBy = 'name_asc';
        this.currentProduct = null;
        this.currentPage = 1;
        this.productsPerPage = 6;
        
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.initTemperatureSlider();
        this.renderProducts();
        this.setupEventListeners();
        this.hideLoading();
        this.updateResultsCount();
        this.renderPagination();
    }

    async loadProducts() {
        try {
            // Используем рабочий путь
            const response = await fetch('./data/products.json');
            
            if (!response.ok) {
                throw new Error('Failed to load products');
            }
            
            const rawProducts = await response.json();
            
            // Преобразуем данные в нужный формат
            this.products = rawProducts.map(product => this.transformProductData(product));
            this.filteredProducts = [...this.products];
            
            console.log(`Загружено ${this.products.length} продуктов`);
            
        } catch (error) {
            console.error('Error loading products:', error);
            // Fallback к пустому массиву
            this.products = [];
            this.filteredProducts = [];
        }
    }

    transformProductData(rawProduct) {
        // Преобразуем вашу структуру данных в формат, ожидаемый каталогом
        return {
            id: rawProduct.id || '',
            sku: rawProduct.sku || '',
            category: rawProduct.category || '',
            title: rawProduct.title || '',
            description: rawProduct.description || '',
            image: rawProduct.photo || '', // photo -> image
            price: rawProduct.price || 0,
            characteristics: {
                визирование: rawProduct.characteristics?.["Показатель визирования"] || '',
                диапазон: rawProduct.characteristics?.["Диапазон измерений температуры"] || '',
                погрешность: rawProduct.characteristics?.["Погрешность"] || '',
                спектральныйДиапазон: rawProduct.characteristics?.["Спектральный диапазон"] || '',
                принципДействия: rawProduct.characteristics?.["Принцип действия"] || '',
                материалы: rawProduct.characteristics?.["Измеряемые материалы"] || '',
                исполнение: rawProduct.characteristics?.["Исполнение"] || '',
                быстродействие: rawProduct.characteristics?.["Быстродействие"] || '',
                точность: rawProduct.characteristics?.["Точность"] || '',
                устройствоВизирования: rawProduct.characteristics?.["Устройство визирования"] || '',
                госреестр: rawProduct.characteristics?.["Госреестр"] || '',
                дляМалыхОбъектов: rawProduct.characteristics?.["Для малых объектов"] || '',
                температураМин: parseInt(rawProduct.characteristics?.["Температура мин"]) || 0,
                температураМакс: parseInt(rawProduct.characteristics?.["Температура макс"]) || 0
            }
        };
    }

    initTemperatureSlider() {
        const tempMin = document.getElementById('tempMin');
        const tempMax = document.getElementById('tempMax');
        const tempMinInput = document.getElementById('tempMinInput');
        const tempMaxInput = document.getElementById('tempMaxInput');
        const minValue = document.getElementById('minValue');
        const maxValue = document.getElementById('maxValue');
        const rangeTrack = document.getElementById('rangeTrack');

        if (!tempMin || !tempMax) return;

        const updateSlider = () => {
            const min = parseInt(tempMin.value);
            const max = parseInt(tempMax.value);
            
            // Update display values
            minValue.textContent = min + '°C';
            maxValue.textContent = max + '°C';
            
            // Update input fields
            tempMinInput.value = min;
            tempMaxInput.value = max;
            
            // Update track gradient - полный градиент от синего к красному
            const minPercent = (min / 3000) * 100;
            const maxPercent = (max / 3000) * 100;
            
            rangeTrack.style.background = `linear-gradient(90deg, 
                #ddd 0%, 
                #ddd ${minPercent}%, 
                #3498db ${minPercent}%, 
                #2ecc71 ${minPercent + (maxPercent - minPercent) * 0.25}%, 
                #f1c40f ${minPercent + (maxPercent - minPercent) * 0.5}%, 
                #e67e22 ${minPercent + (maxPercent - minPercent) * 0.75}%, 
                #e74c3c ${maxPercent}%, 
                #ddd ${maxPercent}%, 
                #ddd 100%)`;
            
            // Ensure min doesn't exceed max
            if (min >= max) {
                tempMin.value = max - 50;
                updateSlider();
            }
        };

        // Event listeners for sliders
        tempMin.addEventListener('input', () => {
            updateSlider();
            this.applyTemperatureFilter();
        });
        tempMax.addEventListener('input', () => {
            updateSlider();
            this.applyTemperatureFilter();
        });

        // Event listeners for input fields
        tempMinInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            if (value > 3000) value = 3000;
            if (value >= parseInt(tempMax.value)) value = parseInt(tempMax.value) - 50;
            tempMin.value = value;
            updateSlider();
            catalog.applyTemperatureFilter();
        });

        tempMaxInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            if (isNaN(value)) value = 3000;
            if (value < 0) value = 0;
            if (value > 3000) value = 3000;
            if (value <= parseInt(tempMin.value)) value = parseInt(tempMin.value) + 50;
            tempMax.value = value;
            updateSlider();
            catalog.applyTemperatureFilter();
        });

        // Initialize slider with full range
        tempMin.value = 0;
        tempMax.value = 3000;
        updateSlider();
    }

    applyTemperatureFilter() {
        const tempMin = parseInt(document.getElementById('tempMin').value);
        const tempMax = parseInt(document.getElementById('tempMax').value);
        
        this.currentFilters.temperature = [`${tempMin}-${tempMax}`];
        this.currentPage = 1;
        this.applyFilters();
    }

    setupEventListeners() {
        // Чекбоксы фильтров
        document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const filterType = e.target.getAttribute('data-filter');
                const value = e.target.value;
                
                if (e.target.checked) {
                    this.currentFilters[filterType].push(value);
                } else {
                    this.currentFilters[filterType] = this.currentFilters[filterType].filter(v => v !== value);
                }
                
                this.currentPage = 1;
                this.applyFilters();
            });
        });

        // Поиск
        document.getElementById('searchInput').addEventListener('input', debounce((e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.currentPage = 1;
            this.applyFilters();
        }, 300));

        // Сортировка
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
        });

        // Сброс фильтров
        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Мобильные фильтры
        document.getElementById('toggleFilters').addEventListener('click', () => {
            this.toggleMobileFilters();
        });

        // Закрытие мобильных фильтров
        document.addEventListener('click', (e) => {
            const filtersMain = document.querySelector('.filters__main');
            const toggleBtn = document.getElementById('toggleFilters');
            
            if (window.innerWidth <= 1024 && 
                !filtersMain.contains(e.target) && 
                !toggleBtn.contains(e.target) &&
                filtersMain.classList.contains('active')) {
                this.toggleMobileFilters();
            }
        });

        // Закрытие попапа продукта
        document.querySelector('.product-popup__close').addEventListener('click', () => {
            this.closeProductPopup();
        });

        document.querySelector('.product-popup__overlay').addEventListener('click', () => {
            this.closeProductPopup();
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeProductPopup();
            }
        });

        // Пагинация
        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination__number')) {
                const page = parseInt(e.target.closest('.pagination__number').dataset.page);
                this.goToPage(page);
            } else if (e.target.closest('#prevPage')) {
                this.previousPage();
            } else if (e.target.closest('#nextPage')) {
                this.nextPage();
            }
        });
    }

    applyFilters() {
        let filtered = this.products.filter(product => {
            // Поиск
            if (this.searchQuery) {
                const searchStr = `${product.title} ${product.sku} ${product.description} ${product.category}`.toLowerCase();
                if (!searchStr.includes(this.searchQuery)) {
                    return false;
                }
            }

            // Фильтры по характеристикам
            for (const [filterType, selectedValues] of Object.entries(this.currentFilters)) {
                if (selectedValues.length > 0) {
                    if (filterType === 'temperature') {
                        if (!this.checkTemperatureFilter(product, selectedValues)) {
                            return false;
                        }
                    } else if (filterType === 'госреестр') {
                        if (product.characteristics[filterType] !== 'да') {
                            return false;
                        }
                    } else {
                        const productValue = product.characteristics[filterType];
                        if (!selectedValues.includes(productValue)) {
                            return false;
                        }
                    }
                }
            }

            return true;
        });

        // Сортировка
        filtered = this.sortProducts(filtered);

        this.filteredProducts = filtered;
        this.renderProducts();
        this.updateResultsCount();
        this.renderPagination();
    }

    checkTemperatureFilter(product, selectedRanges) {
        return selectedRanges.some(range => {
            const [min, max] = range.split('-').map(Number);
            const productMin = product.characteristics.температураМин;
            const productMax = product.characteristics.температураМакс;
            
            // Проверяем пересечение диапазонов
            return productMin <= max && productMax >= min;
        });
    }

    sortProducts(products) {
        return products.sort((a, b) => {
            switch (this.sortBy) {
                case 'name_asc':
                    return a.title.localeCompare(b.title);
                case 'name_desc':
                    return b.title.localeCompare(a.title);
                case 'price_asc':
                    return a.price - b.price;
                case 'price_desc':
                    return b.price - a.price;
                case 'temp_asc':
                    return a.characteristics.температураМин - b.characteristics.температураМин;
                case 'temp_desc':
                    return b.characteristics.температураМакс - a.characteristics.температураМакс;
                default:
                    return 0;
            }
        });
    }

    resetFilters() {
        // Сброс чекбоксов
        document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Сброс ползунка температуры
        document.getElementById('tempMin').value = 0;
        document.getElementById('tempMax').value = 3000;
        this.initTemperatureSlider();

        // Сброс поиска и сортировки
        document.getElementById('searchInput').value = '';
        document.getElementById('sortSelect').value = 'name_asc';

        // Сброс состояния
        this.currentFilters = {
            temperature: [],
            визирование: [],
            погрешность: [],
            спектральныйДиапазон: [],
            принципДействия: [],
            материалы: [],
            исполнение: [],
            быстродействие: [],
            точность: [],
            устройствоВизирования: [],
            госреестр: []
        };
        this.searchQuery = '';
        this.sortBy = 'name_asc';
        this.currentPage = 1;

        this.filteredProducts = [...this.products];
        this.renderProducts();
        this.updateResultsCount();
        this.renderPagination();
    }

    toggleMobileFilters() {
        const filtersMain = document.querySelector('.filters__main');
        const overlay = document.querySelector('.filters__overlay') || this.createOverlay();
        
        filtersMain.classList.toggle('active');
        overlay.classList.toggle('active');
        
        if (filtersMain.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'filters__overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 999;
            display: none;
        `;
        overlay.addEventListener('click', () => this.toggleMobileFilters());
        document.body.appendChild(overlay);
        return overlay;
    }

    getPaginatedProducts() {
        const startIndex = (this.currentPage - 1) * this.productsPerPage;
        const endIndex = startIndex + this.productsPerPage;
        return this.filteredProducts.slice(startIndex, endIndex);
    }

    renderProducts() {
        const grid = document.getElementById('catalogGrid');
        const paginatedProducts = this.getPaginatedProducts();
        
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = `
                <div class="catalog__empty">
                    <i class="fas fa-search"></i>
                    <h3>Товары не найдены</h3>
                    <p>Попробуйте изменить параметры фильтрации</p>
                    <button class="btn btn--primary" onclick="catalog.resetFilters()">Сбросить фильтры</button>
                </div>
            `;
            return;
        }

        grid.innerHTML = paginatedProducts.map(product => {
            const characteristics = product.characteristics || {};
            
            return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-card__image">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="product-card__no-image" style="${product.image ? 'display: none;' : ''}">
                        <i class="fas fa-camera"></i>
                        <span>Изображение отсутствует</span>
                    </div>
                    <div class="product-card__overlay">
                        <button class="btn btn--primary product-card__detail-btn" onclick="catalog.openProductPopup('${product.id}')">
                            <i class="fas fa-eye"></i>
                            Подробнее
                        </button>
                    </div>
                </div>
                <div class="product-card__content">
                    <h3 class="product-card__title">${product.title || 'Без названия'}</h3>
                    <p class="product-card__sku">Артикул: ${product.sku || 'Не указан'}</p>
                    <p class="product-card__description">${product.description || 'Описание отсутствует'}</p>
                    
                    <div class="product-card__characteristics">
                        <div class="characteristic">
                            <span class="characteristic__label">Диапазон:</span>
                            <span class="characteristic__value">${characteristics.диапазон || 'Не указан'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Погрешность:</span>
                            <span class="characteristic__value">${characteristics.погрешность || 'Не указана'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Визирование:</span>
                            <span class="characteristic__value">${characteristics.визирование || 'Не указано'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Исполнение:</span>
                            <span class="characteristic__value">${characteristics.исполнение || 'Не указано'}</span>
                        </div>
                    </div>
                    
                    <div class="product-card__footer">
                        <div class="product-card__price">
                            ${this.formatPrice(product.price)} ₽
                        </div>
                        <div class="product-card__actions">
                            <button class="btn btn--outline product-card__detail" onclick="catalog.openProductPopup('${product.id}')">
                                <i class="fas fa-info-circle"></i>
                                Подробнее
                            </button>
                            <button class="btn btn--primary product-card__order" 
                                    onclick="openChatWithProduct('${product.title}', '${product.sku}')">
                                <i class="fas fa-shopping-cart"></i>
                                Заказать
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
        const paginationElement = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            paginationElement.style.display = 'none';
            return;
        }
        
        paginationElement.style.display = 'flex';
        
        // Кнопки назад/вперед
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
        
        // Номера страниц
        const numbersContainer = document.getElementById('paginationNumbers');
        numbersContainer.innerHTML = '';
        
        // Всегда показываем первую страницу
        if (totalPages > 0) {
            this.createPageNumber(1, numbersContainer);
        }
        
        // Показываем многоточие если нужно
        if (this.currentPage > 3) {
            this.createEllipsis(numbersContainer);
        }
        
        // Показываем текущую страницу и соседние
        const startPage = Math.max(2, this.currentPage - 1);
        const endPage = Math.min(totalPages - 1, this.currentPage + 1);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i > 1 && i < totalPages) {
                this.createPageNumber(i, numbersContainer);
            }
        }
        
        // Показываем многоточие если нужно
        if (this.currentPage < totalPages - 2) {
            this.createEllipsis(numbersContainer);
        }
        
        // Всегда показываем последнюю страницу если есть больше 1 страницы
        if (totalPages > 1) {
            this.createPageNumber(totalPages, numbersContainer);
        }
    }

    createPageNumber(page, container) {
        const numberElement = document.createElement('div');
        numberElement.className = `pagination__number ${page === this.currentPage ? 'active' : ''}`;
        numberElement.textContent = page;
        numberElement.dataset.page = page;
        container.appendChild(numberElement);
    }

    createEllipsis(container) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'pagination__ellipsis';
        ellipsis.textContent = '...';
        container.appendChild(ellipsis);
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderProducts();
        this.renderPagination();
        this.updateResultsCount();
        // Прокрутка к верху каталога
        document.getElementById('catalogGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    openProductPopup(productId) {
        const product = this.getProductById(productId);
        if (!product) return;

        this.currentProduct = product;
        const popupBody = document.getElementById('productPopupBody');
        
        popupBody.innerHTML = this.createPopupContent(product);
        document.getElementById('productPopup').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    createPopupContent(product) {
        const characteristics = product.characteristics || {};
        
        return `
            <div class="popup__content">
                <div class="popup__gallery">
                    <div class="popup__main-image">
                        ${product.image ? 
                            `<img src="${product.image}" alt="${product.title}" id="popupMainImage" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                            ''
                        }
                        <div class="product-popup__no-image" style="${product.image ? 'display: none;' : ''}">
                            <i class="fas fa-camera"></i>
                            <span>Изображение отсутствует</span>
                        </div>
                    </div>
                </div>
                <div class="popup__info" style="padding-right: 50px;">
                    <span class="popup__badge">${product.category || 'Категория не указана'}</span>
                    <h1>${product.title || 'Без названия'}</h1>
                    <div class="popup__price">${this.formatPrice(product.price)} ₽</div>
                    <p class="popup__description">${product.description || 'Описание отсутствует'}</p>
                    
                    <div class="popup__specs">
                        <div class="popup__spec">
                            <strong>Артикул:</strong>
                            <span>${product.sku || 'Не указан'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Диапазон измерений:</strong>
                            <span>${characteristics.диапазон || 'Не указан'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Погрешность:</strong>
                            <span>${characteristics.погрешность || 'Не указана'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Показатель визирования:</strong>
                            <span>${characteristics.визирование || 'Не указано'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Спектральный диапазон:</strong>
                            <span>${characteristics.спектральныйДиапазон || 'Не указан'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Принцип действия:</strong>
                            <span>${characteristics.принципДействия || 'Не указан'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Измеряемые материалы:</strong>
                            <span>${characteristics.материалы || 'Не указаны'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Исполнение:</strong>
                            <span>${characteristics.исполнение || 'Не указано'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Быстродействие:</strong>
                            <span>${characteristics.быстродействие || 'Не указано'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Точность:</strong>
                            <span>${characteristics.точность || 'Не указана'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Устройство визирования:</strong>
                            <span>${characteristics.устройствоВизирования || 'Не указано'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Госреестр:</strong>
                            <span>${characteristics.госреестр === 'да' ? 'Внесен' : 'Не внесен'}</span>
                        </div>
                        ${characteristics.дляМалыхОбъектов ? `
                        <div class="popup__spec">
                            <strong>Для малых объектов:</strong>
                            <span>${characteristics.дляМалыхОбъектов === 'да' ? 'Да' : 'Нет'}</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="popup__actions">
                        <button class="btn btn--primary" onclick="openChatWithProduct('${product.title}', '${product.sku}')">
                            <i class="fas fa-shopping-cart"></i>
                            Заказать
                        </button>
                        <button class="btn btn--outline" onclick="catalog.closeProductPopup()">
                            <i class="fas fa-times"></i>
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    closeProductPopup() {
        document.getElementById('productPopup').classList.remove('active');
        document.body.style.overflow = '';
        this.currentProduct = null;
    }

    updateResultsCount() {
        const countElement = document.getElementById('resultsCount');
        const total = this.filteredProducts.length;
        const start = (this.currentPage - 1) * this.productsPerPage + 1;
        const end = Math.min(start + this.productsPerPage - 1, total);
        
        countElement.textContent = `Показано ${start}-${end} из ${total} товаров`;
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU').format(price);
    }

    hideLoading() {
        const loadingElement = document.getElementById('catalogLoading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    getProductById(id) {
        return this.products.find(product => product.id === id);
    }

    getProductsByCategory(category) {
        return this.products.filter(product => product.category.includes(category));
    }
}

// Глобальные функции
function openChatWithProduct(productName, productSku) {
    const chatForm = document.querySelector('.chat-widget__form');
    const productInput = chatForm ? chatForm.querySelector('input[name="products"]') : null;
    
    if (productInput) {
        productInput.value = `${productName} (${productSku})`;
    }
    
    // Закрываем попап продукта если открыт
    if (catalog && catalog.currentProduct) {
        catalog.closeProductPopup();
    }
    
    openChat();
}

function openChat() {
    const chatWidget = document.querySelector('.chat-widget');
    if (!chatWidget) return;
    
    const popup = chatWidget.querySelector('.chat-widget__popup');
    if (!popup) return;
    
    popup.classList.add('active');
    
    // Добавляем обработчик для закрытия при клике вне попапа
    setTimeout(() => {
        const closeHandler = function(e) {
            if (!popup.contains(e.target) && !e.target.closest('.chat-widget__button')) {
                popup.classList.remove('active');
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}

// Утилиты
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Инициализация каталога
let catalog;

document.addEventListener('DOMContentLoaded', function() {
    catalog = new CatalogManager();
    
    // Chat widget functionality
    const chatButton = document.querySelector('.chat-widget__button');
    const chatPopup = document.querySelector('.chat-widget__popup');
    const chatClose = document.querySelector('.chat-widget__close');

    if (chatButton && chatPopup) {
        chatButton.addEventListener('click', (e) => {
            e.stopPropagation();
            chatPopup.classList.toggle('active');
        });

        if (chatClose) {
            chatClose.addEventListener('click', () => {
                chatPopup.classList.remove('active');
            });
        }

        document.addEventListener('click', (e) => {
            if (chatPopup.classList.contains('active') && 
                !chatPopup.contains(e.target) && 
                !chatButton.contains(e.target)) {
                chatPopup.classList.remove('active');
            }
        });
    }
    
    // Отправка формы чата через EmailJS
    const chatForm = document.querySelector('.chat-widget__form');
    if (chatForm) {
        chatForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = this.querySelector('button[type="submit"]');
            const messageDiv = document.getElementById('form-message');
            const chatPopup = document.querySelector('.chat-widget__popup');
            
            // Показываем индикатор загрузки
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';
            if (messageDiv) {
                messageDiv.textContent = '';
                messageDiv.className = 'form-message';
            }
            
            try {
                const formData = {
                    name: this.querySelector('input[name="name"]').value.trim(),
                    email: this.querySelector('input[name="email"]').value.trim(),
                    products: this.querySelector('input[name="products"]').value.trim(),
                    message: this.querySelector('textarea[name="message"]')?.value.trim() || 'Не указано',
                    date: new Date().toLocaleString('ru-RU')
                };

                // Валидация
                if (!formData.name || !formData.email || !formData.products) {
                    throw new Error('Пожалуйста, заполните все обязательные поля');
                }

                // Проверка email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData.email)) {
                    throw new Error('Пожалуйста, введите корректный email');
                }

                // EmailJS отправка
                const response = await emailjs.send(
                    'service_0su0smw',
                    'template_hqq0w8l',
                    {
                        to_email: 'perometer@inbox.ru',
                        from_name: formData.name,
                        from_email: formData.email,
                        products: formData.products,
                        message: formData.message,
                        date: formData.date
                    }
                );

                if (response.status === 200) {
                    if (messageDiv) {
                        messageDiv.textContent = '✅ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.';
                        messageDiv.className = 'form-message success';
                    }
                    this.reset();
                    
                    // Автоматически закрываем попап через 3 секунды
                    setTimeout(() => {
                        if (chatPopup) chatPopup.classList.remove('active');
                    }, 3000);
                } else {
                    throw new Error('Ошибка отправки через сервис');
                }
            } catch (error) {
                console.error('EmailJS Error:', error);
                
                let errorMessage = 'Ошибка отправки заявки. ';
                
                if (error.message.includes('Network Error')) {
                    errorMessage += 'Проблемы с интернет-соединением. ';
                } else if (error.message) {
                    errorMessage += error.message + '. ';
                }
                
                errorMessage += 'Пожалуйста, позвоните нам: +7 (495) 943-68-18';
                
                if (messageDiv) {
                    messageDiv.textContent = errorMessage;
                    messageDiv.className = 'form-message error';
                }
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // Предотвращаем закрытие попапа при клике на контент
    document.querySelector('.product-popup__content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

// Экспорт для глобального использования
window.CatalogManager = CatalogManager;
window.openChatWithProduct = openChatWithProduct;
window.openChat = openChat;