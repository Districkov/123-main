// Documents page functionality
document.addEventListener('DOMContentLoaded', function() {
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
                        messageDiv.className = 'form-message form-message--success';
                    }
                    this.reset();
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
                    messageDiv.className = 'form-message form-message--error';
                }
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // Document preview modal
    const documentModal = document.getElementById('documentModal');
    const closeModal = document.getElementById('closeModal');
    const modalImage = document.getElementById('modalImage');
    const documentPreviewButtons = document.querySelectorAll('.document-preview');

    if (documentPreviewButtons.length > 0) {
        documentPreviewButtons.forEach(button => {
            button.addEventListener('click', function() {
                const documentPath = this.getAttribute('data-document');
                if (documentPath && modalImage) {
                    modalImage.src = documentPath;
                    if (documentModal) {
                        documentModal.style.display = 'flex';
                        document.body.style.overflow = 'hidden';
                    }
                }
            });
        });
    }

    if (closeModal && documentModal) {
        closeModal.addEventListener('click', () => {
            documentModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }

    if (documentModal) {
        documentModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    }

    // Smooth scrolling for document navigation
    const documentNavLinks = document.querySelectorAll('.documents-nav__link');
    documentNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update active link
                documentNavLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
});

