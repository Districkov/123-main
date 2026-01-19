// catalog.js - Версия без закрепленного фильтра и подсказок
console.log('catalog.js build v5');
class CatalogManager {
    async loadProducts(force = false) {
        // force — для cache-bust при обновлении
        let url = '/api/products';
        if (force) url += '?_=' + Date.now();
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Ошибка загрузки товаров');
            const data = await res.json();
            const raw = Array.isArray(data) ? data : [];
            // keep raw copy for debugging/inspection
            // Нормализуем продукты под формат, ожидаемый рендерером
            this.products = raw.map(r => this.normalizeProduct(r));
            // Reset paging and filtered set
            this.currentPage = 1;
            this.filteredProducts = [...this.products];
            this.renderProducts();
            this.updateResultsCount();
            this.renderPagination();
            this.hideLoading();
            this.rawProducts = raw;
        } catch (e) {
            console.error('Ошибка загрузки товаров:', e);
            this.products = [];
            this.filteredProducts = [];
            this.renderProducts();
            this.updateResultsCount();
            this.hideLoading();
        }
    }

    showDebug() {
        // create or update a small debug panel inside results header
        let debug = document.getElementById('catalogDebug');
        const header = document.querySelector('.results__header');
        if (!header) return;
        if (!debug) {
            debug = document.createElement('div');
            debug.id = 'catalogDebug';
            debug.style.cssText = 'font-size:12px;color:#444;margin-left:16px;background:#fff;padding:8px;border-radius:8px;border:1px solid #eee;max-width:480px;overflow:auto;';
            header.appendChild(debug);
        }
        const totalRaw = Array.isArray(this.rawProducts) ? this.rawProducts.length : 0;
        const firstRaw = (this.rawProducts && this.rawProducts[0]) ? Object.keys(this.rawProducts[0]).slice(0,10) : [];
        const firstNorm = (this.products && this.products[0]) ? Object.keys(this.products[0]).slice(0,10) : [];
        debug.innerHTML = `<strong>Debug:</strong> raw=${totalRaw} products | raw keys: ${firstRaw.join(', ')} | normalized keys: ${firstNorm.join(', ')}`;
    }

    normalizeProduct(rawProduct) {
        const ch = rawProduct.characteristics || {};
        const parsePogreshnost = (v) => {
            const num = parseFloat(String(v).replace(',', '.'));
            if (!Number.isFinite(num)) return null;
            // если значение было в долях (0.005), переведем в проценты
            return num > 0 && num < 0.1 ? +(num * 100).toFixed(3) : num;
        };
        const pogNum = parsePogreshnost(ch['погрешность']);
        const formatPogreshnost = (num) => {
            if (!Number.isFinite(num)) return '';
            return `${num}%`;
        };
        const accuracyLabel = Number.isFinite(pogNum) ? (pogNum <= 0.5 ? 'повышенная' : 'обычная') : '';
        const getArr = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            return String(val).split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
        };
        const photos = rawProduct.photos && rawProduct.photos.length ? rawProduct.photos : (rawProduct.photo ? [rawProduct.photo] : []);
        const sku = rawProduct.sku;
        const tempMin = parseInt(ch['температура_мин']) || 0;
        const tempMax = parseInt(ch['температура_макс']) || 0;
        
        console.log(`normalizeProduct: ${rawProduct.title} - tempMin=${tempMin}, tempMax=${tempMax}`);
        
        return {
            id: rawProduct.id || (rawProduct._id || Date.now().toString()),
            sku: Array.isArray(sku) ? sku : (sku ? String(sku) : ''),
            category: rawProduct.category || '',
            title: rawProduct.title || '',
            description: rawProduct.description || rawProduct.desc || rawProduct.text || rawProduct['Описание'] || '',
            image: photos.length ? photos[0] : (rawProduct.image || ''),
            photos: photos,
            price: rawProduct.price || 0,
            characteristics: {
                диапазон: ch['диапазон'] || '',
                погрешность: formatPogreshnost(pogNum) || ch['погрешность'] || '',
                визирование: ch['визирование'] || '',
                принцип_действия: ch['принцип_действия'] || '',
                спектральный_диапазон: ch['спектральный_диапазон'] || '',
                материалы: getArr(ch['материалы']),
                исполнение: getArr(ch['исполнение']),
                быстродействие: ch['быстродействие'] || '',
                точность: accuracyLabel || ch['точность'] || '',
                устройство_визирования: ch['устройство_визирования'] || '',
                госреестр: ch['госреестр'] || '',
                для_малых_объектов: ch['для_малых_объектов'] || '',
                особенности: getArr(ch['особенности']),
                температура_мин: tempMin,
                температура_макс: tempMax
            }
        };
    }
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentFilters = {
            temperature: [],
            визирование: [],
            принципДействия: [],
            материалы: [],
            особенности: [],
            исполнение: [],
            быстродействие: [],
            точность: [],
            устройствоВизирования: [],
            госреестр: [],
            для_малых_объектов: []
        };
        // Map UI filter keys (data-filter values) to normalized characteristic keys
        this.filterKeyMap = {
            'материалы': 'материалы',
            'визирование': 'визирование',
            'принципДействия': 'принцип_действия',
            'особенности': 'особенности',
            'исполнение': 'исполнение',
            'быстродействие': 'быстродействие',
            'точность': 'точность',
            'устройствоВизирования': 'устройство_визирования',
            'госреестр': 'госреестр',
            'для_малых_объектов': 'для_малых_объектов',
            'temperature': 'temperature'
        };
        this.searchQuery = '';
        this.sortBy = 'popular';
        this.currentProduct = null;
        this.currentPage = 1;
        this.productsPerPage = 6;
        this.currentImages = [];
        this.currentImageIndex = 0;
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

        const initialMax = 3000;
        const extendedMax = 3800;

        const updateSlider = () => {
            const min = parseInt(tempMin.value);
            const max = parseInt(tempMax.value);
            
            minValue.textContent = min + '°C';
            maxValue.textContent = max + '°C';
            
            tempMinInput.value = min;
            tempMaxInput.value = max;
            
            // Update track gradient - полный градиент от синего к красному
            // choose denominator depending on whether we are extended
            const denom = (parseInt(tempMax.max) || initialMax);
            const minPercent = (min / denom) * 100;
            const maxPercent = (max / denom) * 100;
            
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
            
            if (min >= max) {
                tempMin.value = max - 50;
                updateSlider();
            }
        };

        tempMin.addEventListener('input', () => {
            // если пользователь двигает слайдер, сбрасываем пресеты
            document.querySelectorAll('input[name="tempPreset"]').forEach(r => r.checked = false);
            updateSlider();
            this.applyTemperatureFilter();
        });
        tempMax.addEventListener('input', () => {
            // If user moved right handle to current max, enable optional extension
            if (parseInt(tempMax.value) >= parseInt(tempMax.max) && parseInt(tempMax.max) === initialMax) {
                tempMin.max = extendedMax;
                tempMax.max = extendedMax;
                tempMaxInput.max = extendedMax;
                // keep current value (was equal to initialMax)
            }
            // если пользователь двигает слайдер, сбрасываем пресеты
            document.querySelectorAll('input[name="tempPreset"]').forEach(r => r.checked = false);
            updateSlider();
            this.applyTemperatureFilter();
        });

        tempMinInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            if (isNaN(value)) value = 0;
            if (value < 0) value = 0;
            // respect extended max if available
            const maxAllowed = parseInt(tempMin.max) || initialMax;
            if (value > maxAllowed) value = maxAllowed;
            if (value >= parseInt(tempMax.value)) value = parseInt(tempMax.value) - 50;
            tempMin.value = value;
            updateSlider();
            document.querySelectorAll('input[name="tempPreset"]').forEach(r => r.checked = false);
            catalog.applyTemperatureFilter();
        });

        tempMaxInput.addEventListener('input', function() {
            let value = parseInt(this.value);
            if (isNaN(value)) value = 3000;
            if (value < 0) value = 0;
            // respect extended max if available
            const maxAllowed = parseInt(tempMax.max) || initialMax;
            if (value > maxAllowed) value = maxAllowed;
            if (value <= parseInt(tempMin.value)) value = parseInt(tempMin.value) + 50;
            tempMax.value = value;
            updateSlider();
            document.querySelectorAll('input[name="tempPreset"]').forEach(r => r.checked = false);
            catalog.applyTemperatureFilter();
        });

        // Initialize slider with full (base) range
        tempMin.value = 0;
        tempMax.value = initialMax;
        tempMin.max = initialMax;
        tempMax.max = initialMax;
        tempMaxInput.max = initialMax;
        updateSlider();
    }

    applyTemperatureFilter() {
        // If we are programmatically applying a preset, skip the slider handler
        if (this.__presetApplying) return;
        const tempMin = parseInt(document.getElementById('tempMin').value);
        const tempMax = parseInt(document.getElementById('tempMax').value);
        
        this.currentFilters.temperature = [`${tempMin}-${tempMax}`];
        this.currentPage = 1;
        this.applyFilters();
    }

    applyPresetTemperature(presetToken) {
        console.log('applyPresetTemperature called with:', presetToken);
        
        // Handle "preset:none" - clear temperature filter
        if (presetToken === 'preset:none') {
            this.currentFilters.temperature = [];
            this.currentPage = 1;
            this.applyFilters();
            return;
        }
        
        // For other presets like "preset:to3000", apply temperature filter
        this.currentFilters.temperature = [presetToken];
        this.currentPage = 1;
        this.applyFilters();
    }

    setupEventListeners() {
        // Preset temperature radios
        document.querySelectorAll('input[name="tempPreset"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (!e.target.checked) return;
                const val = e.target.value;
                this.applyPresetTemperature(val);
            });
        });

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

        document.getElementById('searchInput').addEventListener('input', debounce((e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.currentPage = 1;
            this.applyFilters();
        }, 300));

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        document.getElementById('toggleFilters').addEventListener('click', () => {
            this.toggleMobileFilters();
        });

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
        document.querySelector('.product-popup__close').addEventListener('click', () => {
            this.closeProductPopup();
        });

        document.querySelector('.product-popup__overlay').addEventListener('click', () => {
            this.closeProductPopup();
        });

        // Fullscreen Image Viewer Controls
        document.querySelector('.image-viewer__close').addEventListener('click', () => {
            this.closeImageViewer();
        });

        document.querySelector('.image-viewer__overlay').addEventListener('click', () => {
            this.closeImageViewer();
        });

        document.getElementById('imageViewerPrev').addEventListener('click', () => {
            this.prevImage();
        });

        document.getElementById('imageViewerNext').addEventListener('click', () => {
            this.nextImage();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const viewer = document.getElementById('imageViewer');
                if (viewer && viewer.classList.contains('active')) {
                    this.closeImageViewer();
                } else {
                    this.closeProductPopup();
                }
            } else if (e.key === 'ArrowLeft') {
                const viewer = document.getElementById('imageViewer');
                if (viewer && viewer.classList.contains('active')) {
                    this.prevImage();
                }
            } else if (e.key === 'ArrowRight') {
                const viewer = document.getElementById('imageViewer');
                if (viewer && viewer.classList.contains('active')) {
                    this.nextImage();
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.pagination__number')) {
                const page = parseInt(e.target.closest('.pagination__number').dataset.page);
                this.goToPage(page);
            } else if (e.target.closest('#prevPage')) {
                this.previousPage();
            } else if (e.target.closest('#nextPage')) {
                this.nextPage();
            }

            // Раскрытие/сворачивание описания товара в карточке
            const toggleBtn = e.target.closest('.product-card__description-toggle');
            if (toggleBtn) {
                this.handleDescriptionToggle(toggleBtn);
            }
        });
    }

    handleDescriptionToggle(toggleBtn) {
        const card = toggleBtn.closest('.product-card');
        if (!card) return;

        const descEl = card.querySelector('.product-card__description');
        if (!descEl) return;

        const productId = descEl.getAttribute('data-id');
        const product = this.getProductById(productId);
        if (!product) return;

        const isExpanded = descEl.getAttribute('data-expanded') === 'true';
        const shortText = descEl.getAttribute('data-short') || '';

        if (!isExpanded) {
            // Разворачиваем - показываем полное описание
            descEl.textContent = product.description || 'Описание отсутствует';
            descEl.setAttribute('data-expanded', 'true');
            toggleBtn.textContent = 'Свернуть описание';
        } else {
            // Сворачиваем - показываем короткое описание
            descEl.textContent = shortText;
            descEl.setAttribute('data-expanded', 'false');
            toggleBtn.textContent = 'Показать полностью';
        }
    }

    applyFilters() {
        try { console.log('applyFilters start', { currentFilters: this.currentFilters, searchQuery: this.searchQuery, sortBy: this.sortBy, currentPage: this.currentPage }); } catch(e){}
        let filtered = this.products.filter(product => {
            if (this.searchQuery) {
                const searchStr = `${product.title} ${product.sku} ${product.description} ${product.category}`.toLowerCase();
                if (!searchStr.includes(this.searchQuery)) {
                    return false;
                }
            }

            for (const [filterType, selectedValues] of Object.entries(this.currentFilters)) {
                if (selectedValues.length > 0) {
                    if (filterType === 'temperature') {
                        if (!this.checkTemperatureFilter(product, selectedValues)) {
                            return false;
                        }
                    } else if (filterType === 'визирование') {
                        // selectedValues may include viz_small, viz_medium, viz_large
                        const pv = product.characteristics.визирование || '';
                        const m = String(pv).match(/(\d+(?:\.\d+)?)/);
                        const num = m ? parseFloat(m[1]) : NaN;
                        const matchesViz = selectedValues.some(sel => {
                            if (sel === 'viz_small') return !isNaN(num) && num >= 5 && num <= 20;
                            if (sel === 'viz_medium') return !isNaN(num) && num > 20 && num <= 100;
                            if (sel === 'viz_large') return !isNaN(num) && num > 100;
                            // fallback: substring match
                            return String(pv).toLowerCase().includes(String(sel).toLowerCase());
                        });
                        if (!matchesViz) return false;
                    } else if (filterType === 'госреестр') {
                        if (product.characteristics.госреестр !== 'внесен' && product.characteristics.госреестр !== 'да') {
                            return false;
                        }
                    } else if (filterType === 'для_малых_объектов') {
                        if (product.characteristics.для_малых_объектов !== 'позволяет' && product.characteristics.для_малых_объектов !== 'да') {
                            return false;
                        }
                    } else {
                            const mappedKey = this.filterKeyMap[filterType] || filterType;
                            const productValue = product.characteristics[mappedKey];
                            // If the product value is an array, check any overlap using substring matching
                            const matchesSelected = (val) => {
                                if (val === null || val === undefined) return false;
                                const valStr = String(val).toLowerCase();
                                return selectedValues.some(sel => valStr.includes(String(sel).toLowerCase()));
                            };

                            if (Array.isArray(productValue)) {
                                const has = productValue.some(pv => matchesSelected(pv));
                                if (!has) return false;
                            } else {
                                if (!matchesSelected(productValue)) {
                            return false;
                                }
                        }
                    }
                }
            }

            return true;
        });

        filtered = this.sortProducts(filtered);
        this.filteredProducts = filtered;
        this.renderProducts();
        this.updateResultsCount();
        this.renderPagination();
        try { console.log('applyFilters end: filteredCount=', this.filteredProducts.length); } catch(e){}
    }

    checkTemperatureFilter(product, selectedRanges) {
        const bounds = this.getTemperatureBounds(product);
        // If we can't determine temperature bounds (NaN), exclude from temperature filters
        if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) {
            return false;
        }
        
        return selectedRanges.some(range => {
            if (String(range).startsWith('preset:')) {
                switch (range) {
                    case 'preset:to3000':
                        // Products with max exactly 3000
                        return bounds.max === 3000;
                    case 'preset:to1800':
                        // Products with max exactly 1800 or 2000
                        return bounds.max === 1800 || bounds.max === 2000;
                    case 'preset:250-2000':
                        // Only products with range exactly 250-2000
                        return bounds.min === 250 && bounds.max === 2000;
                    case 'preset:200-1200':
                        // Only products with range exactly 200-1200
                        return bounds.min === 200 && bounds.max === 1200;
                    case 'preset:from0':
                        // Products starting from 0 (min must be 0)
                        return bounds.min === 0;
                    default:
                        return false;
                }
            } else {
                // For manual slider ranges
                const [min, max] = String(range).split('-').map(Number);
                if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
                return bounds.min <= max && bounds.max >= min;
            }
        });
    }

    // Try to extract numeric temperature bounds even if only a string range is present
    getTemperatureBounds(product) {
        const ch = product.characteristics || {};
        let pMin = Number(ch.температура_мин);
        let pMax = Number(ch.температура_макс);

        // Fallback: parse from text range like "200-1200°С" or "0 ... 3000"
        if (!Number.isFinite(pMin) || !Number.isFinite(pMax)) {
            const rangeStr = ch.диапазон || '';
            const nums = String(rangeStr).match(/-?\d+/g);
            if (nums && nums.length >= 2) {
                pMin = Number(nums[0]);
                pMax = Number(nums[1]);
            }
        }

        // If still invalid, mark as not filterable
        if (!Number.isFinite(pMin) || !Number.isFinite(pMax)) {
            return { min: NaN, max: NaN };
        }
        return { min: pMin, max: pMax };
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
                    return a.characteristics.температура_мин - b.characteristics.температура_мин;
                case 'temp_desc':
                    return b.characteristics.температура_макс - a.characteristics.температура_макс;
                default:
                    return 0;
            }
        });
    }

    resetFilters() {
        try { console.log('resetFilters called — clearing UI and internal state'); } catch (e) {}
        // Сброс чекбоксов
        document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
            checkbox.checked = false;
        });

        document.getElementById('tempMin').value = 0;
        document.getElementById('tempMax').value = 3000;
        this.initTemperatureSlider();
        // Сброс пресетов радио
        try { document.querySelectorAll('input[name="tempPreset"]').forEach(r => r.checked = false); } catch (e) {}

        document.getElementById('searchInput').value = '';
        document.getElementById('sortSelect').value = 'popular';

        this.currentFilters = {
            temperature: [],
            визирование: [],
            принципДействия: [],
            материалы: [],
            особенности: [],
            исполнение: [],
            быстродействие: [],
            точность: [],
            устройствоВизирования: [],
            госреестр: [],
            для_малых_объектов: []
        };
        this.searchQuery = '';
        this.sortBy = 'popular';
        this.currentPage = 1;

        this.filteredProducts = [...this.products];
        this.renderProducts();
        this.updateResultsCount();
        this.renderPagination();
        // remove any stored filter state if present
        try { localStorage.removeItem('catalog-filters'); } catch (e) {}
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
            // Обрезка описания до 15 символов в списке
            let shortDesc = product.description || '';
            if (!shortDesc) shortDesc = 'Описание отсутствует';
            let descLines = shortDesc.split('\n');
            if (descLines.length > 2) descLines = descLines.slice(0, 2);
            shortDesc = descLines.join(' ');
            if (shortDesc.length > 15) shortDesc = shortDesc.slice(0, 15) + '...';
            // Исполнение (множественный выбор)
            let exec = Array.isArray(characteristics.исполнение) ? characteristics.исполнение.join(', ') : (characteristics.исполнение || 'Не указано');
            // Галерея изображений
            // Render main image + thumbnails. Main image uses first photo or image.
            let images = '';
            const mainImg = (Array.isArray(product.photos) && product.photos.length) ? product.photos[0] : (product.image || '');
            if (mainImg) {
                images += `<img class="main-image" src="${mainImg}" alt="${product.title}" onerror="this.style.display='none'; this.parentElement.querySelector('.product-card__no-image').style.display='flex';" />`;
            }
            let sku = Array.isArray(product.sku) ? product.sku.join(', ') : (product.sku || 'Не указан');
            return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-card__image">
                    ${images}
                    <div class="product-card__no-image" style="${images ? 'display: none;' : ''}">
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
                    <p class="product-card__sku">Артикул: ${sku}</p>
                    <p class="product-card__description" data-id="${product.id}">${shortDesc}</p>
                    <div class="product-card__characteristics">
                        <div class="characteristic">
                            <span class="characteristic__label">Диапазон:</span>
                            <span class="characteristic__value">${characteristics.диапазон || 'Не указан'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Погрешность:</span>
                            <span class="characteristic__value">${this.formatPogreshnost(characteristics.погрешность) || 'Не указана'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Точность:</span>
                            <span class="characteristic__value">${characteristics.точность || 'Не указана'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Визирование:</span>
                            <span class="characteristic__value">${characteristics.визирование || 'Не указано'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Принцип действия:</span>
                            <span class="characteristic__value">${characteristics.принципДействия || 'Не указан'}</span>
                        </div>
                        <div class="characteristic">
                            <span class="characteristic__label">Исполнение:</span>
                            <span class="characteristic__value">${exec}</span>
                        </div>
                        ${characteristics['Малоразмерные объекты'] === 'да' ? `
                        <div class="characteristic">
                            <span class="characteristic__label">Малоразмерные объекты:</span>
                            <span class="characteristic__value" style="color: var(--primary-color); font-weight: bold;">Да</span>
                        </div>` : ''}
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
        
        // Add event listeners for description toggle buttons
        document.querySelectorAll('.product-card__description-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const productId = btn.dataset.id;
                const descEl = document.querySelector(`.product-card__description[data-id="${productId}"]`);
                const product = this.getProductById(productId);
                if (!descEl || !product) return;
                
                const isExpanded = descEl.dataset.expanded === 'true';
                if (isExpanded) {
                    // collapse
                    let shortDesc = product.description || '';
                    if (!shortDesc) shortDesc = 'Описание отсутствует';
                    let descLines = shortDesc.split('\n');
                    if (descLines.length > 2) descLines = descLines.slice(0, 2);
                    shortDesc = descLines.join(' ');
                    if (shortDesc.length > 120) shortDesc = shortDesc.slice(0, 120) + '...';
                    descEl.textContent = shortDesc;
                    btn.textContent = 'Показать полностью';
                    descEl.dataset.expanded = 'false';
                } else {
                    // expand
                    descEl.textContent = product.description || 'Описание отсутствует';
                    btn.textContent = 'Свернуть';
                    descEl.dataset.expanded = 'true';
                }
            });
        });
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.productsPerPage);
        const paginationElement = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            paginationElement.style.display = 'none';
            return;
        }
        
        paginationElement.style.display = 'flex';
        
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
        
        const numbersContainer = document.getElementById('paginationNumbers');
        numbersContainer.innerHTML = '';
        
        // Всегда показываем первую страницу
            this.createPageNumber(1, numbersContainer);
        
        // Определяем диапазон для 5 центральных страниц
        let startPage = Math.max(2, this.currentPage - 2);
        let endPage = Math.min(totalPages - 1, this.currentPage + 2);
        
        // Добавляем многоточие после первой страницы, если есть разрыв
        if (startPage > 2) {
            this.createEllipsis(numbersContainer);
        }
        
        // Добавляем центральные страницы (5 штук)
        for (let i = startPage; i <= endPage; i++) {
                this.createPageNumber(i, numbersContainer);
        }
        
        // Добавляем многоточие перед последней страницей, если есть разрыв
        if (endPage < totalPages - 1) {
            this.createEllipsis(numbersContainer);
        }
        
        // Всегда показываем последнюю страницу (если она не первая)
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

        // Setup image behavior: swap thumbnails, upscale small images if needed
        if (this.setupPopupImages) {
            this.setupPopupImages(product);
        }
    }

    createPopupContent(product) {
        // debug: log description length to help diagnose missing description cases
        try { console.log('createPopupContent:', product.id, 'description-length=', (product.description||'').length); } catch(e) {}
        // helper to escape HTML inside descriptions to avoid breaking popup markup
        const escapeHtml = (str) => {
            if (!str && str !== 0) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };
        const characteristics = product.characteristics || {};
        let exec = Array.isArray(characteristics.исполнение) ? characteristics.исполнение.join(', ') : (characteristics.исполнение || 'Не указано');
        let materials = Array.isArray(characteristics.материалы) ? characteristics.материалы.join(', ') : (characteristics.материалы || 'Не указаны');
        let features = Array.isArray(characteristics.особенности) ? characteristics.особенности.join(', ') : (characteristics.особенности || 'Не указаны');
        // Gallery: main image + thumbnails
        let mainImageHtml = '';
        let thumbsHtml = '';
        const escapedTitle = escapeHtml(product.title);
        if (Array.isArray(product.photos) && product.photos.length) {
            const first = product.photos[0];
            mainImageHtml = `<img id="popup-main-img" src="${first}" alt="${escapedTitle}" onerror="this.src='./images/no-image.jpg'">`;
            thumbsHtml = product.photos.map((url, idx) => `
                <div class="popup__thumbnail" data-src="${url}" data-index="${idx}">
                    <img src="${url}" alt="${escapedTitle}" onerror="this.src='./images/no-image.jpg'">
                </div>
            `).join('');
        } else if (product.image) {
            mainImageHtml = `<img id="popup-main-img" src="${product.image}" alt="${escapedTitle}" onerror="this.src='./images/no-image.jpg'">`;
            thumbsHtml = '';
        }
        let sku = Array.isArray(product.sku) ? product.sku.join(', ') : (product.sku || 'Не указан');
        // Описание товара - полное
        const fullDescRaw = product.description && product.description.trim() ? product.description : 'Описание отсутствует';
        const fullDesc = escapeHtml(fullDescRaw);
        return `
            <div class="popup__content">
                <div class="popup__gallery">
                    <div class="popup__main-image">
                        ${mainImageHtml}
                        <div class="product-popup__no-image" style="${mainImageHtml ? 'display: none;' : ''}">
                            <i class="fas fa-camera"></i>
                            <span>Изображение отсутствует</span>
                        </div>
                    </div>
                    <div class="popup__thumbnails-wrapper">
                        <div class="popup__thumbnails">
                            ${thumbsHtml}
                        </div>
                    </div>
                </div>
                <div class="popup__info">
                    <span class="popup__badge">${product.category || 'Категория не указана'}</span>
                    <h1>${product.title || 'Без названия'}</h1>
                    <div class="popup__price">${this.formatPrice(product.price)} ₽</div>
                    
                    <div class="popup__description">
                        <h3 style="color: #000;">Описание товара</h3>
                        <p>${fullDesc}</p>
                    </div>
                    
                    <div class="popup__specs">
                        <div class="popup__spec">
                            <strong>Артикул:</strong>
                            <span>${sku}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Диапазон измерений:</strong>
                            <span>${characteristics.диапазон || 'Не указан'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Погрешность:</strong>
                            <span>${this.formatPogreshnost(characteristics.погрешность) || 'Не указана'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Показатель визирования:</strong>
                            <span>${characteristics.визирование || 'Не указано'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Спектральный диапазон:</strong>
                            <span>${characteristics.спектральный_диапазон || 'Не указан'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Принцип действия:</strong>
                            <span>${characteristics.принцип_действия || 'Не указан'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Измеряемые материалы и среды:</strong>
                            <span>${materials}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Особенности применения:</strong>
                            <span>${features}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Исполнение:</strong>
                            <span>${exec}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Быстродействие:</strong>
                            <span>${characteristics.быстродействие || 'Не указано'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Устройство визирования:</strong>
                            <span>${characteristics.устройство_визирования || 'Не указано'}</span>
                        </div>
                        <div class="popup__spec">
                            <strong>Госреестр:</strong>
                            <span>${characteristics.госреестр === 'внесен' || characteristics.госреестр === 'да' ? 'Внесен' : 'Не внесен'}</span>
                        </div>
                        ${characteristics.для_малых_объектов === 'позволяет' || characteristics.для_малых_объектов === 'да' ? `
                        <div class="popup__spec">
                            <strong>Для малоразмерных объектов:</strong>
                            <span>${characteristics.для_малых_объектов === 'позволяет' ? 'Позволяет' : 'Да'}</span>
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
                        <button class="btn btn--outline" onclick="catalog.printProduct('${product.id}')">
                            <i class="fas fa-print"></i>
                            Печать
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

    formatPogreshnost(val) {
        if (val === null || val === undefined) return '';
        const str = String(val).replace(',', '.').replace('%', '').trim();
        const num = parseFloat(str);
        if (Number.isFinite(num)) {
            const normalized = (num > 0 && num < 0.1) ? +(num * 100).toFixed(3) : num;
            return `${normalized}%`;
        }
        return String(val);
    }

    printProduct(productId) {
        const product = this.getProductById(productId);
        if (!product) return;

        const img = (Array.isArray(product.photos) && product.photos.length) ? product.photos[0] : (product.image || '');
        const sku = Array.isArray(product.sku) ? product.sku.join(', ') : (product.sku || '');

        const specs = product.characteristics || {};

        const html = `
            <html>
            <head>
                <meta charset="utf-8">
                <title>Печать: ${product.title}</title>
                <style>
                    body{font-family: Arial, sans-serif; padding:20px; color:#222}
                    .wrap{max-width:800px;margin:0 auto}
                    img{max-width:100%;height:auto;margin-bottom:20px}
                    h1{font-size:24px;margin-bottom:8px}
                    .price{font-size:20px;color:#d6891f;margin-bottom:16px}
                    .spec{margin-bottom:6px}
                    .label{font-weight:600;margin-right:8px}
                </style>
            </head>
            <body>
                <div class="wrap">
                    ${img ? `<img src="${img}" alt="${product.title}">` : ''}
                    <h1>${product.title || ''}</h1>
                    <div class="price">${this.formatPrice(product.price)} ₽</div>
                    <div class="spec"><span class="label">Артикул:</span>${sku}</div>
                    <div class="spec"><span class="label">Категория:</span>${product.category || ''}</div>
                    <div class="spec"><span class="label">Описание:</span><div>${product.description || ''}</div></div>
                    <h3>Характеристики</h3>
                    ${Object.keys(specs).map(k => `<div class="spec"><span class="label">${k}:</span>${Array.isArray(specs[k]) ? specs[k].join(', ') : specs[k] || ''}</div>`).join('')}
                </div>
                <script>window.onload = function(){ setTimeout(()=>{ window.print(); }, 50); };</script>
            </body>
            </html>
        `;

        const w = window.open('', '_blank');
        if (!w) {
            alert('Откройте всплывающие окна для сайта, чтобы печать работала.');
            return;
        }
        w.document.open();
        w.document.write(html);
        w.document.close();
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

    // After popup markup inserted: wire thumbnails and upscale small images if necessary
    setupPopupImages(product) {
        const mainImg = document.getElementById('popup-main-img');
        const popupMainContainer = document.querySelector('.popup__main-image');
        const thumbnails = Array.from(document.querySelectorAll('.popup__thumbnail'));

        if (!mainImg || !popupMainContainer) return;

        // Ensure main image fills container but preserves aspect ratio
        mainImg.style.width = '100%';
        mainImg.style.height = '100%';
        mainImg.style.objectFit = 'contain';
        mainImg.style.display = 'block';
        mainImg.style.transformOrigin = 'center center';
        mainImg.style.transition = 'transform 0.2s ease';
        mainImg.style.cursor = 'pointer';

        // On load, check if natural size is smaller than container and upscale
        const tryUpscale = () => {
            const naturalW = mainImg.naturalWidth || 0;
            const naturalH = mainImg.naturalHeight || 0;
            const rect = popupMainContainer.getBoundingClientRect();
            const contW = rect.width || 1;
            const contH = rect.height || 1;

            // If image is smaller than container, scale it up proportionally
            const scaleW = contW / Math.max(naturalW, 1);
            const scaleH = contH / Math.max(naturalH, 1);
            const scale = Math.max(1, Math.min(scaleW, scaleH));

            if (scale > 1.01) {
                // Apply CSS transform scale to visually enlarge small images
                mainImg.style.transform = `scale(${scale.toFixed(3)})`;
            } else {
                mainImg.style.transform = '';
            }
        };

        if (mainImg.complete) {
            tryUpscale();
        } else {
            mainImg.addEventListener('load', tryUpscale);
            // In case of error, hide upscale
            mainImg.addEventListener('error', () => { mainImg.style.transform = ''; });
        }

        // Click on main image to open fullscreen viewer
        mainImg.addEventListener('click', () => {
            this.openImageViewer(product.photos && product.photos.length ? product.photos : [product.image], 0);
        });

        // Wire thumbnails to swap main image when clicked
        thumbnails.forEach((thumb, idx) => {
            thumb.addEventListener('click', (e) => {
                const src = thumb.getAttribute('data-src');
                if (!src) return;
                // reset transform before changing src
                mainImg.style.transform = '';
                mainImg.src = src;
                // active state
                document.querySelectorAll('.popup__thumbnail.active').forEach(n => n.classList.remove('active'));
                thumb.classList.add('active');
                
                // Store current index for fullscreen viewer
                this.currentImageIndex = idx;
            });
        });

        // Mark first thumbnail active if present
        if (thumbnails.length) {
            thumbnails.forEach(t => t.classList.remove('active'));
            thumbnails[0].classList.add('active');
            this.currentImageIndex = 0;
        }
    }

    openImageViewer(images, startIndex = 0) {
        const viewer = document.getElementById('imageViewer');
        const viewerImg = document.getElementById('imageViewer-img');
        
        if (!viewer || !viewerImg || !images || images.length === 0) return;

        this.currentImages = images.filter(img => img); // Filter out empty images
        this.currentImageIndex = Math.min(startIndex, this.currentImages.length - 1);

        if (this.currentImages.length === 0) return;

        viewerImg.src = this.currentImages[this.currentImageIndex];
        viewer.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Update buttons visibility
        this.updateImageViewerButtons();
    }

    closeImageViewer() {
        const viewer = document.getElementById('imageViewer');
        viewer.classList.remove('active');
        document.body.style.overflow = '';
    }

    updateImageViewerButtons() {
        const prevBtn = document.getElementById('imageViewerPrev');
        const nextBtn = document.getElementById('imageViewerNext');
        
        if (prevBtn) prevBtn.style.display = this.currentImageIndex > 0 ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = this.currentImageIndex < this.currentImages.length - 1 ? 'flex' : 'none';
    }

    nextImage() {
        if (this.currentImageIndex < this.currentImages.length - 1) {
            this.currentImageIndex++;
            document.getElementById('imageViewer-img').src = this.currentImages[this.currentImageIndex];
            this.updateImageViewerButtons();
        }
    }

    prevImage() {
        if (this.currentImageIndex > 0) {
            this.currentImageIndex--;
            document.getElementById('imageViewer-img').src = this.currentImages[this.currentImageIndex];
            this.updateImageViewerButtons();
        }
    }
}

// Глобальные функции
function openChatWithProduct(productName, productSku) {
    const chatForm = document.querySelector('.chat-widget__form');
    const productInput = chatForm ? chatForm.querySelector('input[name="products"]') : null;
    
    if (productInput) {
        productInput.value = `${productName} (${productSku})`;
    }
    
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
    // Инициализация обработчиков и слайдера
    if (catalog.setupEventListeners) catalog.setupEventListeners();
    if (catalog.initTemperatureSlider) catalog.initTemperatureSlider();
    // Sync initial sort with UI (so displayed sort matches internal state)
    try {
        const sortEl = document.getElementById('sortSelect');
        if (sortEl && sortEl.value) {
            catalog.sortBy = sortEl.value;
        } else {
            // ensure UI shows current catalog.sortBy
            if (sortEl) sortEl.value = catalog.sortBy;
        }
    } catch (e) {}
    // Загружаем товары
    catalog.loadProducts();
    
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

                if (!formData.name || !formData.email || !formData.products) {
                    throw new Error('Пожалуйста, заполните все обязательные поля');
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData.email)) {
                    throw new Error('Пожалуйста, введите корректный email');
                }

                const response = await emailjs.send(
                    'service_0su0smw',
                    'template_hqq0w8l',
                    {
                        to_email: ' pyrometer@inbox.ru',
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

    document.querySelector('.product-popup__content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
});

// Listen for product updates from other tabs (admin actions)
window.addEventListener('storage', (e) => {
    if (!catalog) return;
    if (e.key === 'products-updated') {
        try {
            console.log('Catalog: detected products-updated event');
            let updatedId = null;
            if (e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (parsed && parsed.id) updatedId = parsed.id;
                } catch (err) {
                    // not JSON, could be timestamp string
                }
            }

            // If we have an id, try to fetch only that product and update DOM in-place
            if (updatedId) {
                console.log('Catalog: attempting single-product update for id=', updatedId);
                // debounce repeated events
                if (catalog.__singleReloadTimeout) clearTimeout(catalog.__singleReloadTimeout);
                catalog.__singleReloadTimeout = setTimeout(async () => {
                    try {
                        const res = await fetch(`/api/products/${updatedId}?_=${Date.now()}`);
                        if (!res.ok) throw new Error('Failed to fetch updated product');
                        const raw = await res.json();
                        // some APIs may return the product directly or as an array
                        const rawProduct = Array.isArray(raw) ? raw[0] : raw;
                        if (!rawProduct) throw new Error('No product returned');

                        const norm = catalog.normalizeProduct(rawProduct);
                        // replace in catalog.products if exists, otherwise add
                        const idx = catalog.products.findIndex(p => String(p.id) === String(norm.id));
                        if (idx >= 0) {
                            catalog.products[idx] = norm;
                        } else {
                            catalog.products.push(norm);
                        }

                        // Re-apply filters and rerender
                        catalog.applyFilters();

                        // Try to find and highlight the updated card; if not present, fall back to full reload
                        setTimeout(() => {
                            const el = document.querySelector(`.product-card[data-id="${norm.id}"]`);
                            if (el) {
                                try {
                                    el.classList.add('highlight-updated');
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setTimeout(() => el.classList.remove('highlight-updated'), 3500);
                                } catch (err) { console.error('Error highlighting updated product', err); }
                            } else {
                                console.warn('Updated product not in current filtered view, falling back to full reload');
                                // fallback: reset filters and reload full list
                                try { catalog.resetFilters(); } catch (e) { console.error(e); }
                                if (catalog.__reloadTimeout) clearTimeout(catalog.__reloadTimeout);
                                catalog.__reloadTimeout = setTimeout(() => catalog.loadProducts(true).then(()=>catalog.applyFilters()).catch(()=>{}), 150);
                            }
                        }, 250);
                    } catch (err) {
                        console.error('Single product update failed, falling back to full reload:', err);
                        try { catalog.resetFilters(); } catch (e) { console.error(e); }
                        if (catalog.__reloadTimeout) clearTimeout(catalog.__reloadTimeout);
                        catalog.__reloadTimeout = setTimeout(() => catalog.loadProducts(true).then(()=>catalog.applyFilters()).catch(()=>{}), 150);
                    }
                }, 120);
                return;
            }

            // No id provided: fallback to clearing filters + full reload
            console.log('Catalog: no id provided in update payload — resetting filters and reloading');
            try { catalog.resetFilters(); } catch (err) { console.error('Error resetting filters before products reload:', err); }
            if (catalog.__reloadTimeout) clearTimeout(catalog.__reloadTimeout);
            catalog.__reloadTimeout = setTimeout(() => {
                catalog.loadProducts(true).then(() => {
                    console.log('Catalog: products reloaded after update');
                    try { catalog.applyFilters(); } catch (err) { console.error(err); }
                }).catch(err => console.error('Error reloading products after update:', err));
            }, 150);
        } catch (err) {
            console.error('Error handling products-updated event', err);
        }
    }
});

// Экспорт для глобального использования
window.CatalogManager = CatalogManager;
window.openChatWithProduct = openChatWithProduct;
window.openChat = openChat;