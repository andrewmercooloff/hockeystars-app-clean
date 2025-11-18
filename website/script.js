// Translations
const translations = {
    ru: {
        'hero.subtitle': 'Мир хоккейных звезд в одном приложении',
        'hero.description': 'Заявите о себе на весь мир, станьте хоккейной звездой!',
        'forWhom.title': 'Для кого?',
        'forWhom.players.title': 'Для хоккеистов:',
        'forWhom.players.text': 'Заявите о себе, станьте заметными для скаутов, просите подарки у звезд, находите друзей во всем хоккейном мире!',
        'forWhom.coaches.title': 'Для тренеров:',
        'forWhom.coaches.text': 'Мотивируйте свою команду, давайте задания и следите за выполнением упражнений и подготовкой к нормативам.',
        'forWhom.scouts.title': 'Для скаутов:',
        'forWhom.scouts.text': 'Отбирайте перспективных игроков со всего мира, смотрите видео-подборки и связывайтесь напрямую.',
        'forWhom.shops.title': 'Для хоккейных мастерских и магазинов:',
        'forWhom.shops.text': 'Заявите о себе, рассказывайте о своих услугах, стимулируйте продажи, предоставляя скидки.',
        'features.title': 'Основные возможности',
        'features.profiles.title': 'Профили игроков',
        'features.profiles.text': 'Создавайте детальные профили с информацией о позиции, статистике, командах и достижениях',
        'features.messages.title': 'Сообщения',
        'features.messages.text': 'Общайтесь с другими игроками, тренерами и скаутами в удобном мессенджере',
        'features.speedRadar.title': 'Радар скорости',
        'features.speedRadar.text': 'Измеряйте скорость шайбы с помощью радара и устанавливайте рекорды',
        'features.friends.title': 'Друзья',
        'features.friends.text': 'Добавляйте друзей, следите за их достижениями и общайтесь',
        'features.exercises.title': 'Упражнения',
        'features.exercises.text': 'Выполняйте упражнения, отслеживайте прогресс и получайте достижения',
        'features.notifications.title': 'Уведомления',
        'features.notifications.text': 'Получайте уведомления о новых сообщениях, друзьях и достижениях',
        'download.title': 'Скачать приложение',
        'download.description': 'Установите HockeyStars на свое устройство и присоединяйтесь к хоккейному сообществу!',
        'download.appstore.label': 'Скачать в',
        'download.playstore.label': 'Скачать в',
        'footer.copyright': '© 2025 HockeyStars. Все права защищены.',
        'footer.privacy': 'Политика конфиденциальности',
        'rules.title': 'Политика конфиденциальности',
        'rules.lastUpdated': 'Последнее обновление: 17 ноября 2025 г.',
        'rules.intro': 'Настоящая Политика конфиденциальности описывает, как HockeyStars ("мы", "наш" или "приложение") собирает, использует и защищает вашу личную информацию при использовании нашего мобильного приложения.',
        'rules.dataCollection.title': '1. Сбор информации',
        'rules.dataCollection.personal.title': '1.1. Персональные данные',
        'rules.dataCollection.personal.text': 'При регистрации и использовании приложения мы собираем следующую информацию:',
        'rules.dataCollection.personal.item1': 'Имя пользователя и адрес электронной почты',
        'rules.dataCollection.personal.item2': 'Профильная информация (имя, дата рождения, страна, позиция, хват)',
        'rules.dataCollection.personal.item3': 'Физические данные (рост, вес)',
        'rules.dataCollection.personal.item4': 'Статистика игрока (голы, передачи, игры)',
        'rules.dataCollection.personal.item5': 'Фотографии и видео, загруженные пользователем',
        'rules.dataCollection.personal.item6': 'Информация о командах и достижениях',
        'rules.dataCollection.technical.title': '1.2. Технические данные',
        'rules.dataCollection.technical.text': 'Мы автоматически собираем техническую информацию о вашем устройстве:',
        'rules.dataCollection.technical.item1': 'Тип устройства и операционная система',
        'rules.dataCollection.technical.item2': 'Уникальный идентификатор устройства',
        'rules.dataCollection.technical.item3': 'Информация о версии приложения',
        'rules.dataCollection.technical.item4': 'Данные об использовании приложения',
        'rules.dataUsage.title': '2. Использование информации',
        'rules.dataUsage.text': 'Мы используем собранную информацию для следующих целей:',
        'rules.dataUsage.item1': 'Предоставление и улучшение функциональности приложения',
        'rules.dataUsage.item2': 'Создание и управление вашим профилем',
        'rules.dataUsage.item3': 'Обеспечение связи между пользователями (сообщения, уведомления)',
        'rules.dataUsage.item4': 'Отправка push-уведомлений о важных событиях',
        'rules.dataUsage.item5': 'Обеспечение безопасности и предотвращение мошенничества',
        'rules.dataUsage.item6': 'Анализ использования приложения для улучшения сервиса',
        'rules.dataSharing.title': '3. Передача данных третьим лицам',
        'rules.dataSharing.text': 'Мы используем следующие сторонние сервисы, которые могут иметь доступ к вашим данным:',
        'rules.dataSharing.item1': '<strong>Supabase</strong> - для хранения данных и аутентификации пользователей. Supabase обрабатывает ваши данные в соответствии со своей политикой конфиденциальности.',
        'rules.dataSharing.item2': '<strong>Expo</strong> - для разработки и распространения приложения. Expo может собирать анонимные данные об использовании.',
        'rules.dataSharing.item3': '<strong>Apple App Store / Google Play</strong> - для распространения приложения. Эти платформы могут собирать данные в соответствии со своими политиками.',
        'rules.dataSharing.noSale': 'Мы не продаем и не передаем ваши персональные данные третьим лицам для маркетинговых целей.',
        'rules.dataSecurity.title': '4. Безопасность данных',
        'rules.dataSecurity.text': 'Мы принимаем разумные меры для защиты вашей информации:',
        'rules.dataSecurity.item1': 'Использование шифрования для передачи данных',
        'rules.dataSecurity.item2': 'Безопасное хранение данных на защищенных серверах',
        'rules.dataSecurity.item3': 'Регулярное обновление систем безопасности',
        'rules.dataSecurity.item4': 'Ограничение доступа к персональным данным только авторизованному персоналу',
        'rules.dataSecurity.warning': 'Однако ни один метод передачи через Интернет или электронного хранения не является на 100% безопасным. Мы не можем гарантировать абсолютную безопасность ваших данных.',
        'rules.userRights.title': '5. Права пользователей',
        'rules.userRights.text': 'Вы имеете следующие права в отношении ваших персональных данных:',
        'rules.userRights.item1': 'Право на доступ к вашим данным',
        'rules.userRights.item2': 'Право на исправление неточных данных',
        'rules.userRights.item3': 'Право на удаление вашего аккаунта и данных',
        'rules.userRights.item4': 'Право на отзыв согласия на обработку данных',
        'rules.userRights.item5': 'Право на ограничение обработки данных',
        'rules.userRights.contact': 'Для осуществления этих прав свяжитесь с нами через приложение или по электронной почте.',
        'rules.children.title': '6. Защита детей',
        'rules.children.text': 'Наше приложение предназначено для пользователей всех возрастов, включая несовершеннолетних. Мы принимаем дополнительные меры для защиты конфиденциальности детей:',
        'rules.children.item1': 'Родители или опекуны могут контролировать использование приложения детьми',
        'rules.children.item2': 'Мы не собираем намеренно персональные данные от детей без согласия родителей',
        'rules.children.item3': 'Если мы узнаем, что собрали данные от ребенка без согласия, мы удалим эту информацию',
        'rules.changes.title': '7. Изменения в Политике конфиденциальности',
        'rules.changes.text': 'Мы можем периодически обновлять настоящую Политику конфиденциальности. О существенных изменениях мы уведомим вас через приложение или по электронной почте. Продолжение использования приложения после внесения изменений означает ваше согласие с обновленной политикой.',
        'rules.contact.title': '8. Контакты',
        'rules.contact.text': 'Если у вас есть вопросы или предложения относительно настоящей Политики конфиденциальности, пожалуйста, свяжитесь с нами:',
        'rules.contact.email': 'Email: support@hockeystars.app',
        'rules.contact.app': 'Через приложение: раздел "Настройки" → "Поддержка"',
        'rules.back': '← Вернуться на главную'
    },
    en: {
        'hero.subtitle': 'The world of hockey stars in one app',
        'hero.description': 'Make yourself known to the world, become a hockey star!',
        'forWhom.title': 'For whom?',
        'forWhom.players.title': 'For players:',
        'forWhom.players.text': 'Make yourself known, become visible to scouts, ask for gifts from stars, find friends throughout the hockey world!',
        'forWhom.coaches.title': 'For coaches:',
        'forWhom.coaches.text': 'Motivate your team, give assignments and monitor the completion of exercises and preparation for standards.',
        'forWhom.scouts.title': 'For scouts:',
        'forWhom.scouts.text': 'Select promising players from around the world, watch video compilations and contact directly.',
        'forWhom.shops.title': 'For hockey workshops and stores:',
        'forWhom.shops.text': 'Make yourself known, talk about your services, stimulate sales by providing discounts.',
        'features.title': 'Key Features',
        'features.profiles.title': 'Player Profiles',
        'features.profiles.text': 'Create detailed profiles with information about position, statistics, teams and achievements',
        'features.messages.title': 'Messages',
        'features.messages.text': 'Communicate with other players, coaches and scouts in a convenient messenger',
        'features.speedRadar.title': 'Speed Radar',
        'features.speedRadar.text': 'Measure puck speed with radar and set records',
        'features.friends.title': 'Friends',
        'features.friends.text': 'Add friends, follow their achievements and communicate',
        'features.exercises.title': 'Exercises',
        'features.exercises.text': 'Complete exercises, track progress and earn achievements',
        'features.notifications.title': 'Notifications',
        'features.notifications.text': 'Receive notifications about new messages, friends and achievements',
        'download.title': 'Download the App',
        'download.description': 'Install HockeyStars on your device and join the hockey community!',
        'download.appstore.label': 'Download on',
        'download.playstore.label': 'Get it on',
        'footer.copyright': '© 2025 HockeyStars. All rights reserved.',
        'footer.privacy': 'Privacy Policy',
        'rules.title': 'Privacy Policy',
        'rules.lastUpdated': 'Last updated: November 17, 2025',
        'rules.intro': 'This Privacy Policy describes how HockeyStars ("we", "our" or "the app") collects, uses and protects your personal information when you use our mobile application.',
        'rules.dataCollection.title': '1. Information Collection',
        'rules.dataCollection.personal.title': '1.1. Personal Data',
        'rules.dataCollection.personal.text': 'When registering and using the app, we collect the following information:',
        'rules.dataCollection.personal.item1': 'Username and email address',
        'rules.dataCollection.personal.item2': 'Profile information (name, date of birth, country, position, grip)',
        'rules.dataCollection.personal.item3': 'Physical data (height, weight)',
        'rules.dataCollection.personal.item4': 'Player statistics (goals, assists, games)',
        'rules.dataCollection.personal.item5': 'Photos and videos uploaded by the user',
        'rules.dataCollection.personal.item6': 'Information about teams and achievements',
        'rules.dataCollection.technical.title': '1.2. Technical Data',
        'rules.dataCollection.technical.text': 'We automatically collect technical information about your device:',
        'rules.dataCollection.technical.item1': 'Device type and operating system',
        'rules.dataCollection.technical.item2': 'Unique device identifier',
        'rules.dataCollection.technical.item3': 'Application version information',
        'rules.dataCollection.technical.item4': 'Application usage data',
        'rules.dataUsage.title': '2. Use of Information',
        'rules.dataUsage.text': 'We use the collected information for the following purposes:',
        'rules.dataUsage.item1': 'Providing and improving app functionality',
        'rules.dataUsage.item2': 'Creating and managing your profile',
        'rules.dataUsage.item3': 'Enabling communication between users (messages, notifications)',
        'rules.dataUsage.item4': 'Sending push notifications about important events',
        'rules.dataUsage.item5': 'Ensuring security and preventing fraud',
        'rules.dataUsage.item6': 'Analyzing app usage to improve service',
        'rules.dataSharing.title': '3. Sharing Data with Third Parties',
        'rules.dataSharing.text': 'We use the following third-party services that may have access to your data:',
        'rules.dataSharing.item1': '<strong>Supabase</strong> - for data storage and user authentication. Supabase processes your data in accordance with its privacy policy.',
        'rules.dataSharing.item2': '<strong>Expo</strong> - for app development and distribution. Expo may collect anonymous usage data.',
        'rules.dataSharing.item3': '<strong>Apple App Store / Google Play</strong> - for app distribution. These platforms may collect data in accordance with their policies.',
        'rules.dataSharing.noSale': 'We do not sell or transfer your personal data to third parties for marketing purposes.',
        'rules.dataSecurity.title': '4. Data Security',
        'rules.dataSecurity.text': 'We take reasonable measures to protect your information:',
        'rules.dataSecurity.item1': 'Using encryption for data transmission',
        'rules.dataSecurity.item2': 'Secure data storage on protected servers',
        'rules.dataSecurity.item3': 'Regular security system updates',
        'rules.dataSecurity.item4': 'Limiting access to personal data to authorized personnel only',
        'rules.dataSecurity.warning': 'However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data.',
        'rules.userRights.title': '5. User Rights',
        'rules.userRights.text': 'You have the following rights regarding your personal data:',
        'rules.userRights.item1': 'Right to access your data',
        'rules.userRights.item2': 'Right to correct inaccurate data',
        'rules.userRights.item3': 'Right to delete your account and data',
        'rules.userRights.item4': 'Right to withdraw consent to data processing',
        'rules.userRights.item5': 'Right to restrict data processing',
        'rules.userRights.contact': 'To exercise these rights, contact us through the app or by email.',
        'rules.children.title': '6. Children Protection',
        'rules.children.text': 'Our app is intended for users of all ages, including minors. We take additional measures to protect children\'s privacy:',
        'rules.children.item1': 'Parents or guardians can control children\'s use of the app',
        'rules.children.item2': 'We do not intentionally collect personal data from children without parental consent',
        'rules.children.item3': 'If we learn that we have collected data from a child without consent, we will delete that information',
        'rules.changes.title': '7. Changes to Privacy Policy',
        'rules.changes.text': 'We may periodically update this Privacy Policy. We will notify you of significant changes through the app or by email. Continued use of the app after changes are made means you agree to the updated policy.',
        'rules.contact.title': '8. Contact',
        'rules.contact.text': 'If you have questions or suggestions regarding this Privacy Policy, please contact us:',
        'rules.contact.email': 'Email: support@hockeystars.app',
        'rules.contact.app': 'Through the app: Settings → Support',
        'rules.back': '← Back to home'
    }
};

// Russian-speaking countries
const russianSpeakingCountries = [
    'RU', 'BY', 'KZ', 'KG', 'TJ', 'UZ', 'AM', 'AZ', 'MD', 'UA'
];

// Detect language based on browser locale
function detectLanguage() {
    // Check if language is stored in localStorage
    const storedLang = localStorage.getItem('hockeystars-lang');
    if (storedLang && (storedLang === 'ru' || storedLang === 'en')) {
        return storedLang;
    }

    // Try to detect from browser
    const browserLang = navigator.language || navigator.userLanguage;
    const countryCode = browserLang.split('-')[1]?.toUpperCase();
    
    // Check if country is Russian-speaking
    if (countryCode && russianSpeakingCountries.includes(countryCode)) {
        return 'ru';
    }
    
    // Check if language is Russian
    if (browserLang.toLowerCase().startsWith('ru')) {
        return 'ru';
    }
    
    // Default to English
    return 'en';
}

// Set language
function setLanguage(lang) {
    if (lang !== 'ru' && lang !== 'en') {
        lang = 'en';
    }
    
    localStorage.setItem('hockeystars-lang', lang);
    document.documentElement.lang = lang;
    
    // Update all translatable elements
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            const translation = translations[lang][key];
            // Check if translation contains HTML tags
            if (translation.includes('<') && translation.includes('>')) {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
    
    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Load avatars for pucks
async function loadPuckAvatars() {
    // Supabase storage base URL
    const supabaseUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co/storage/v1/object/public/avatars/';
    
    // List of avatar filenames (you can update these with real avatar filenames from your database)
    // For now, we'll try to load some common avatar filenames or use placeholder
    const avatarFiles = [
        null, // Will be loaded dynamically
        null,
        null,
        null,
        null,
        null,
        null,
        null
    ];
    
    // Try to fetch avatars from Supabase Storage
    // Since we don't have direct access to the database, we'll use a fallback approach
    // You can update this with actual avatar URLs from your database
    
    // For demonstration, we'll create a function that tries to load avatars
    // In production, you might want to create an API endpoint that returns avatar URLs
    
    const puckAvatars = document.querySelectorAll('.puck-avatar');
    
    // Try to load avatars from localStorage (if previously cached)
    const cachedAvatars = JSON.parse(localStorage.getItem('hockeystars-puck-avatars') || '[]');
    
    if (cachedAvatars.length >= puckAvatars.length) {
        // Use cached avatars
        puckAvatars.forEach((avatar, index) => {
            if (cachedAvatars[index]) {
                avatar.style.backgroundImage = `url(${cachedAvatars[index]})`;
                avatar.style.opacity = '1';
            }
        });
        return;
    }
    
    // Use real avatars from the app
    const realAvatars = [
        'puck-avatar-1.jpg',
        'puck-avatar-2.jpg',
        'puck-avatar-3.jpg',
        'puck-avatar-4.jpg',
        'puck-avatar-5.jpg',
        'puck-avatar-6.jpg',
        'puck-avatar-7.jpg',
        'puck-avatar-8.jpg'
    ];
    
    // Load avatars with error handling
    puckAvatars.forEach((avatar, index) => {
        if (realAvatars[index]) {
            const img = new Image();
            img.onload = () => {
                avatar.style.backgroundImage = `url(${realAvatars[index]})`;
                avatar.style.opacity = '1';
                // Cache the avatar
                if (!cachedAvatars[index]) {
                    cachedAvatars[index] = realAvatars[index];
                }
            };
            img.onerror = () => {
                // If image fails to load, keep the placeholder icon
                avatar.style.opacity = '0.6';
            };
            img.src = realAvatars[index];
        }
    });
    
    // Save to cache
    localStorage.setItem('hockeystars-puck-avatars', JSON.stringify(cachedAvatars));
}

// Function to update avatars with real user avatars from Supabase
// 
// Usage example:
//   const realAvatars = [
//     'https://jvsypfwiajuwsyuzkyda.supabase.co/storage/v1/object/public/avatars/avatar1.jpg',
//     'https://jvsypfwiajuwsyuzkyda.supabase.co/storage/v1/object/public/avatars/avatar2.jpg',
//     // ... add up to 8 avatar URLs
//   ];
//   updatePuckAvatars(realAvatars);
//
// Or fetch from your API:
//   fetch('/api/avatars')
//     .then(response => response.json())
//     .then(data => updatePuckAvatars(data.avatarUrls));
function updatePuckAvatars(avatarUrls) {
    const puckAvatars = document.querySelectorAll('.puck-avatar');
    const urls = avatarUrls || [];
    
    puckAvatars.forEach((avatar, index) => {
        if (urls[index]) {
            const img = new Image();
            img.onload = () => {
                avatar.style.backgroundImage = `url(${urls[index]})`;
                avatar.style.opacity = '1';
            };
            img.onerror = () => {
                // Keep placeholder if real avatar fails
                avatar.style.opacity = '0.6';
            };
            img.src = urls[index];
            
            // Update cache
            const cachedAvatars = JSON.parse(localStorage.getItem('hockeystars-puck-avatars') || '[]');
            cachedAvatars[index] = urls[index];
            localStorage.setItem('hockeystars-puck-avatars', JSON.stringify(cachedAvatars));
        }
    });
}

// Puck physics and collision system
class PuckPhysics {
    constructor() {
        this.pucks = [];
        this.animationId = null;
        this.isRunning = false;
        this.repulsionForce = 0.5; // Force of repulsion when pucks collide (increased)
        this.minDistance = 120; // Minimum distance between pucks (diameter = 120px, so they touch side by side)
    }

    init() {
        const puckElements = document.querySelectorAll('.puck');
        const container = document.querySelector('.pucks-container');
        
        if (!container || puckElements.length === 0) return;

        const containerRect = container.getBoundingClientRect();
        
        // Initialize each puck with position and velocity
        puckElements.forEach((puck, index) => {
            const rect = puck.getBoundingClientRect();
            const radius = 60; // Half of puck width (120px / 2)
            
            // Random starting side: 0 = left, 1 = right, 2 = top, 3 = bottom
            const side = Math.floor(Math.random() * 4);
            let x, y;
            let angle;
            
            // Random position along the chosen side (accounting for extended container)
            switch (side) {
                case 0: // Left side
                    x = -radius - 200; // Start from extended left area
                    y = radius + Math.random() * (window.innerHeight - 2 * radius);
                    // Moving right with some vertical variation
                    angle = Math.random() * Math.PI / 2 - Math.PI / 4; // -45 to 45 degrees
                    break;
                case 1: // Right side
                    x = window.innerWidth + radius + 200; // Extended right area
                    y = radius + Math.random() * (window.innerHeight - 2 * radius);
                    // Moving left with some vertical variation
                    angle = Math.PI + Math.random() * Math.PI / 2 - Math.PI / 4; // 135 to 225 degrees
                    break;
                case 2: // Top side
                    x = radius + Math.random() * (window.innerWidth - 2 * radius);
                    y = -radius;
                    // Moving down with some horizontal variation
                    angle = Math.PI / 2 + Math.random() * Math.PI / 2 - Math.PI / 4; // 45 to 135 degrees
                    break;
                case 3: // Bottom side
                    x = radius + Math.random() * (window.innerWidth - 2 * radius);
                    y = window.innerHeight + radius;
                    // Moving up with some horizontal variation
                    angle = -Math.PI / 2 + Math.random() * Math.PI / 2 - Math.PI / 4; // -135 to -45 degrees
                    break;
            }
            
            // Random initial velocity
            const speed = 0.5 + Math.random() * 0.5; // 0.5 to 1.0
            
            this.pucks.push({
                element: puck,
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: radius,
                originalSpeed: speed
            });
        });

        this.start();
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    checkCollisions() {
        for (let i = 0; i < this.pucks.length; i++) {
            for (let j = i + 1; j < this.pucks.length; j++) {
                const puck1 = this.pucks[i];
                const puck2 = this.pucks[j];
                
                const dx = puck2.x - puck1.x;
                const dy = puck2.y - puck1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.minDistance && distance > 0) {
                    // Normalize direction vector
                    const nx = dx / distance;
                    const ny = dy / distance;
                    
                    // Calculate overlap
                    const overlap = this.minDistance - distance;
                    
                    // Always apply repulsion when too close, regardless of velocity direction
                    // Calculate repulsion force based on overlap
                    const force = (overlap / this.minDistance) * this.repulsionForce;
                    
                    // Apply repulsion force along collision normal
                    const impulseX = nx * force;
                    const impulseY = ny * force;
                    
                    // Update velocities (apply repulsion)
                    puck1.vx -= impulseX;
                    puck1.vy -= impulseY;
                    puck2.vx += impulseX;
                    puck2.vy += impulseY;
                    
                    // Separate pucks to prevent overlap (more aggressive separation)
                    const separationX = nx * overlap * 0.6;
                    const separationY = ny * overlap * 0.6;
                    puck1.x -= separationX;
                    puck1.y -= separationY;
                    puck2.x += separationX;
                    puck2.y += separationY;
                    
                    // Normalize velocities to maintain original speed
                    const speed1 = Math.sqrt(puck1.vx * puck1.vx + puck1.vy * puck1.vy);
                    const speed2 = Math.sqrt(puck2.vx * puck2.vx + puck2.vy * puck2.vy);
                    
                    if (speed1 > 0) {
                        puck1.vx = (puck1.vx / speed1) * puck1.originalSpeed;
                        puck1.vy = (puck1.vy / speed1) * puck1.originalSpeed;
                    }
                    if (speed2 > 0) {
                        puck2.vx = (puck2.vx / speed2) * puck2.originalSpeed;
                        puck2.vy = (puck2.vy / speed2) * puck2.originalSpeed;
                    }
                }
            }
        }
    }

    updatePuck(puck) {
        // Update position
        puck.x += puck.vx;
        puck.y += puck.vy;
        
        // Boundary collision - wrap around from opposite side (accounting for extended container)
        const radius = puck.radius;
        const leftBound = -200 - radius;
        const rightBound = window.innerWidth + 200 + radius;
        
        if (puck.x < leftBound) {
            puck.x = rightBound;
        } else if (puck.x > rightBound) {
            puck.x = leftBound;
        }
        
        if (puck.y < -radius) {
            puck.y = window.innerHeight + radius;
        } else if (puck.y > window.innerHeight + radius) {
            puck.y = -radius;
        }
        
        // Update DOM position
        puck.element.style.transform = `translate(${puck.x}px, ${puck.y}px)`;
    }

    animate() {
        if (!this.isRunning) return;
        
        // Check collisions
        this.checkCollisions();
        
        // Update all pucks
        this.pucks.forEach(puck => {
            this.updatePuck(puck);
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    handleResize() {
        // Adjust puck positions if window is resized
        this.pucks.forEach(puck => {
            if (puck.x > window.innerWidth + puck.radius) {
                puck.x = window.innerWidth + puck.radius;
            }
            if (puck.y > window.innerHeight + puck.radius) {
                puck.y = window.innerHeight + puck.radius;
            }
        });
    }
}

// Initialize puck physics
let puckPhysics = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const lang = detectLanguage();
    setLanguage(lang);
    
    // Add click handlers to language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newLang = btn.getAttribute('data-lang');
            setLanguage(newLang);
        });
    });
    
    // Load avatars for pucks (uses placeholder avatars by default)
    loadPuckAvatars();
    
    // Initialize puck physics system
    puckPhysics = new PuckPhysics();
    puckPhysics.init();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (puckPhysics) {
            puckPhysics.handleResize();
        }
    });
    
    // To use real avatars from your database, uncomment and modify the code below:
    // 
    // Option 1: Direct URLs from Supabase Storage
    // const realAvatars = [
    //     'https://jvsypfwiajuwsyuzkyda.supabase.co/storage/v1/object/public/avatars/filename1.jpg',
    //     'https://jvsypfwiajuwsyuzkyda.supabase.co/storage/v1/object/public/avatars/filename2.jpg',
    //     // Add more avatar URLs here (up to 8)
    // ];
    // updatePuckAvatars(realAvatars);
    //
    // Option 2: Fetch from API endpoint
    // fetch('/api/avatars')
    //     .then(response => response.json())
    //     .then(data => updatePuckAvatars(data.avatarUrls))
    //     .catch(error => console.error('Error loading avatars:', error));
});

