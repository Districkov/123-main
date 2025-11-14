// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Сайт Термоконт загружен!');

    // Header scroll effect - только фон меняется, текст всегда черный
    const header = document.querySelector('.header');
    
    function updateHeader() {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', updateHeader);
    updateHeader();

    // Hero Slider
    const slides = document.querySelectorAll('.slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    let slideInterval;

    function showSlide(n) {
        slides.forEach(slide => {
            slide.classList.remove('active');
            slide.style.opacity = '0';
        });
        indicators.forEach(indicator => indicator.classList.remove('active'));
        
        currentSlide = (n + slides.length) % slides.length;
        
        slides[currentSlide].classList.add('active');
        slides[currentSlide].style.opacity = '1';
        indicators[currentSlide].classList.add('active');
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function startSlider() {
        slides.forEach((slide, index) => {
            if (index === 0) {
                slide.style.opacity = '1';
            } else {
                slide.style.opacity = '0';
            }
        });
        
        slideInterval = setInterval(nextSlide, 4000);
    }

    function stopSlider() {
        clearInterval(slideInterval);
    }

    startSlider();

    const heroSlider = document.querySelector('.hero-slider');
    if (heroSlider) {
        heroSlider.addEventListener('mouseenter', stopSlider);
        heroSlider.addEventListener('mouseleave', startSlider);
    }

    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            stopSlider();
            showSlide(index);
            startSlider();
        });
    });

    // Gallery Auto Slider
    const galleryTrack = document.querySelector('.gallery__track');
    const galleryIndicators = document.querySelectorAll('.gallery__indicator');
    let galleryCurrent = 0;

    function updateGalleryIndicator() {
        galleryIndicators.forEach((indicator, index) => {
            indicator.classList.remove('active');
            if (index === galleryCurrent) {
                indicator.classList.add('active');
            }
        });
    }

    // Auto update gallery indicators
    setInterval(() => {
        galleryCurrent = (galleryCurrent + 1) % galleryIndicators.length;
        updateGalleryIndicator();
    }, 5000);

    // Яндекс Карты
    if (typeof ymaps !== 'undefined') {
        ymaps.ready(initMap);
    } else {
        console.error('Yandex Maps API не загружен');
        // Fallback - показываем статичную карту
        document.getElementById('map').innerHTML = `
            <div style="width:100%;height:100%;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-family:Arial,sans-serif;border-radius:15px;">
                <div style="text-align:center;padding:20px;">
                    <i class="fas fa-map-marker-alt" style="font-size:48px;margin-bottom:15px;"></i>
                    <h3 style="margin-bottom:10px;">Москва, ул.Озёрная, д.42</h3>
                    <p style="margin-bottom:15px;">Офис компании Термоконт</p>
                    <button onclick="openInYandexMaps()" style="background:#e79823;color:white;border:none;padding:10px 20px;border-radius:25px;cursor:pointer;font-size:14px;">
                        Открыть в Яндекс.Картах
                    </button>
                </div>
            </div>
        `;
    }

    function initMap() {
        try {
            const map = new ymaps.Map('map', {
                center: [55.671331, 37.445814], // Координаты ул.Озёрная, 42
                zoom: 16,
                controls: ['zoomControl', 'fullscreenControl']
            });

            // Метка
            const placemark = new ymaps.Placemark([55.671331, 37.445814], {
                balloonContent: `
                    <div style="padding: 10px;">
                        <strong style="font-size: 16px; color: #e79823;">Термоконт</strong><br>
                        <p style="margin: 5px 0;">Москва, ул.Озёрная, д.42</p>
                        <p style="margin: 5px 0;">помещение IV, комната 1 антресоли 2 этажа</p>
                        <p style="margin: 5px 0;">📞 +7 (495) 943-68-18</p>
                    </div>
                `,
                hintContent: 'Термоконт - производитель пирометров и  ов'
            }, {
                preset: 'islands#icon',
                iconColor: '#e79823',
                iconLayout: 'default#image',
                iconImageHref: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="%23e79823" stroke="white" stroke-width="2"/><text x="16" y="22" text-anchor="middle" fill="white" font-family="Arial" font-size="18">T</text></svg>',
                iconImageSize: [32, 32],
                iconImageOffset: [-16, -32]
            });

            map.geoObjects.add(placemark);

            // Открываем баллун при загрузке
            placemark.balloon.open();

            // Добавляем кастомные элементы управления
            map.controls.add('searchControl');
            map.controls.add('typeSelector');
            map.controls.add('geolocationControl');

        } catch (error) {
            console.error('Ошибка инициализации карты:', error);
            // Fallback
            document.getElementById('map').innerHTML = `
                <div style="width:100%;height:100%;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);display:flex;align-items:center;justify-content:center;color:white;font-family:Arial,sans-serif;border-radius:15px;">
                    <div style="text-align:center;padding:20px;">
                        <i class="fas fa-map-marker-alt" style="font-size:48px;margin-bottom:15px;"></i>
                        <h3 style="margin-bottom:10px;">Москва, ул.Озёрная, д.42</h3>
                        <p style="margin-bottom:15px;">Офис компании Термоконт</p>
                        <button onclick="openInYandexMaps()" style="background:#e79823;color:white;border:none;padding:10px 20px;border-radius:25px;cursor:pointer;font-size:14px;">
                            Открыть в Яндекс.Картах
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Функция для открытия в Яндекс Картах
    window.openInYandexMaps = function() {
        const address = encodeURIComponent('Москва, ул.Озёрная, д.42');
        window.open(`https://yandex.ru/maps/?text=${address}`, '_blank');
    };

    // Chat Widget
    const chatButton = document.querySelector('.chat-widget__button');
    const chatPopup = document.querySelector('.chat-widget__popup');
    const chatClose = document.querySelector('.chat-widget__close');
    const chatForm = document.querySelector('.chat-widget__form');

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

        if (chatForm) {
            chatForm.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // Обработка формы заказа с EmailJS
    if (chatForm) {
        chatForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitButton = this.querySelector('button[type="submit"]');
            const messageDiv = document.getElementById('form-message');
            
            // Показываем индикатор загрузки
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Отправка...';
            messageDiv.textContent = '';
            messageDiv.className = 'form-message';
            
            try {
                const formData = {
                    name: this.querySelector('input[name="name"]').value.trim(),
                    email: this.querySelector('input[name="email"]').value.trim(),
                    products: this.querySelector('input[name="products"]').value.trim(),
                    message: this.querySelector('textarea[name="message"]').value.trim() || 'Не указано',
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
                    'service_0su0smw', // Ваш Service ID
                    'template_hqq0w8l', // НУЖНО ЗАМЕНИТЬ на ваш Template ID
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
                    messageDiv.textContent = '✅ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.';
                    messageDiv.className = 'form-message form-message--success';
                    this.reset();
                } else {
                    throw new Error('Ошибка отправки через сервис');
                }
            } catch (error) {
                console.error('EmailJS Error:', error);
                
                let errorMessage = 'Ошибка отправки заявки. ';
                
                if (error.message.includes('Network Error')) {
                    errorMessage += 'Проблемы с интернет-соединением. ';
                } else if (error.message.includes('template_xxxxx')) {
                    errorMessage += 'Шаблон письма не настроен. ';
                }
                
                errorMessage += 'Пожалуйста, позвоните нам: +7 (495) 943-68-18';
                
                messageDiv.textContent = errorMessage;
                messageDiv.className = 'form-message form-message--error';
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerHeight = header.offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                if (chatPopup) chatPopup.classList.remove('active');
            }
        });
    });

    // Mobile menu active state
    const mobileMenuItems = document.querySelectorAll('.mobile-menu__item');
    
    function setActiveMenu() {
        const scrollPosition = window.scrollY + 100;
        const sections = document.querySelectorAll('section[id]');
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                mobileMenuItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('href') === `#${sectionId}` || 
                        (sectionId === 'main' && item.getAttribute('href') === 'index.html')) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }
    
    window.addEventListener('scroll', setActiveMenu);

    // Animation on scroll
    function checkScroll() {
        const elements = document.querySelectorAll('.about__content, .advantages, .gallery, .clients, .contacts__content');
        
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Initialize animations
    document.querySelectorAll('.about__content, .advantages, .gallery, .clients, .contacts__content').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    });
    
    window.addEventListener('scroll', checkScroll);
    checkScroll();

    console.log('Все компоненты инициализированы успешно!');
});

// Utility functions
function smoothScrollTo(target) {
    const element = document.querySelector(target);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function handleFormSubmit(form, successMessage) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        alert(successMessage);
        form.reset();
    });
}