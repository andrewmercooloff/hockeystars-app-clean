// Translations
const translations = {
    ru: {
        'page.title': 'HockeyStars - Приложение для хоккеистов',
        'page.description': 'Социальная сеть для будущих звезд хоккея. Заяви о себе на весь хоккейный мир! Получи предложения от ведущих скаутов мира!',
        'hero.subtitle': 'Весь хоккейный мир в одном приложении',
        'hero.description': 'Заяви о себе, стань хоккейной звездой!',
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
        'download.android.label': 'Скачать для',
        'install.open': 'Открыть / Установить',
        'tester.modal.title': 'Стать тестировщиком',
        'tester.modal.description': 'Введите ваш email Google, чтобы получить доступ к тестовой версии приложения для Android.',
        'tester.form.email': 'Email Google аккаунта:',
        'tester.form.submit': 'Отправить',
        'tester.form.loading': 'Отправка...',
        'tester.form.success': 'Спасибо! Ваш email добавлен в список тестировщиков. Ссылка на скачивание будет отправлена на ваш email.',
        'tester.form.error': 'Произошла ошибка. Пожалуйста, попробуйте еще раз или свяжитесь с нами: support@hockey-stars.com',
        'tester.form.validation': 'Пожалуйста, введите корректный email адрес.',
        'footer.copyright': '© 2025 HockeyStars. Все права защищены.',
        'footer.privacy': 'Политика конфиденциальности',
        'footer.deleteAccount': 'Удаление аккаунта',
        'footer.contact': 'Обратная связь',
        'contact.title': 'Связаться с нами',
        'contact.subtitle': 'Есть вопрос или предложение? Напишите нам – мы отвечаем лично и обычно в течение одного рабочего дня.',
        'contact.form.name': 'Ваше имя',
        'contact.form.email': 'Email',
        'contact.form.message': 'Сообщение',
        'contact.form.submit': 'Отправить сообщение',
        'contact.form.validation': 'Пожалуйста, заполните все поля.',
        'contact.form.sending': 'Отправляем сообщение…',
        'contact.form.success': 'Сообщение отправлено! Мы свяжемся с вами в течение одного рабочего дня.',
        'contact.form.error': 'Не удалось отправить сообщение. Попробуйте еще раз или напишите на support@hockey-stars.com.',
        'contact.back': '← Вернуться на главную',
        'rules.title': 'Политика конфиденциальности',
        'rules.lastUpdated': 'Последнее обновление: 19 ноября 2025 г.',
        'rules.intro': 'Настоящая Политика конфиденциальности описывает, как Andrey Merkulov, владелец приложения HockeyStars («Приложение»), («мы», «нас», «наш») собирает, использует и защищает вашу личную информацию.',
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
        'rules.dataSharing.text': 'Мы не продаем и не передаем ваши персональные данные третьим лицам для маркетинговых целей. Для обеспечения работы Приложения мы используем следующие сторонние сервисы, которые выступают в качестве обработчиков ваших данных:',
        'rules.dataSharing.item1': '<strong>Supabase</strong> - используется для облачной базы данных и аутентификации пользователей. Данные хранятся на защищенных серверах. Ознакомиться с политикой конфиденциальности Supabase можно <a href="https://supabase.com/privacy" target="_blank">здесь</a>.',
        'rules.dataSharing.item2': '<strong>Expo</strong> - используется как платформа для разработки и развертывания Приложения. Expo может собирать анонимные технические данные для анализа стабильности.',
        'rules.dataSharing.item3': '<strong>Apple App Store / Google Play</strong> - эти платформы обрабатывают данные, связанные с покупкой и загрузкой Приложения, в соответствии со своими собственными политиками конфиденциальности.',
        'rules.dataSecurity.title': '4. Безопасность данных',
        'rules.dataSecurity.text': 'Мы принимаем разумные технические и организационные меры для защиты вашей информации. К ним относятся шифрование данных при передаче (протокол SSL/TLS), безопасное хранение данных на защищенных серверах и строгий контроль доступа к персональным данным.',
        'rules.dataSecurity.item1': 'Шифрование данных при передаче (протокол SSL/TLS)',
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
        'rules.children.title': '6. Защита детей (Политика в отношении несовершеннолетних)',
        'rules.children.text': 'Наше Приложение предназначено для пользователей всех возрастов, включая детей. Мы уделяем первостепенное внимание защите их конфиденциальности.',
        'rules.children.item1': 'Родители или законные представители несут ответственность за контроль использования Приложения их детьми',
        'rules.children.item2': 'Мы не собираем намеренно персональные данные от детей без требуемого по закону согласия родителей',
        'rules.children.item3': 'Если мы узнаем, что собрали данные от ребенка без согласия, мы немедленно удалим эту информацию',
        'rules.children.item4': 'Родители имеют право запросить доступ к данным своего ребенка, потребовать их исправления или полного удаления',
        'rules.children.item5': 'Мы не продаем и не передаем данные детей третьим лицам для маркетинговых целей',
        'rules.children.contact': 'Для реализации этих прав родители могут связаться с нашей службой поддержки по email support@hockey-stars.com с адреса электронной почты, который использовался для предоставления согласия.',
        'rules.children.parentalConsent.title': '6.1. Родительское согласие для детей младше 13 лет',
        'rules.children.parentalConsent.text': 'Для регистрации детей младше 13 лет требуется верифицированное согласие родителей:',
        'rules.children.parentalConsent.item1': 'Родительское согласие получается только по электронной почте (не через простую галочку)',
        'rules.children.parentalConsent.item2': 'Мы отправляем подробную информацию о собираемых данных и наших правилах конфиденциальности',
        'rules.children.parentalConsent.item3': 'Родитель должен подтвердить согласие через специальную ссылку в письме',
        'rules.children.parentalConsent.item4': 'Без подтвержденного согласия родителей регистрация ребенка невозможна',
        'rules.children.parentalConsent.item5': 'Родители могут отозвать согласие в любое время',
        'rules.moderation.title': '7. Модерация контента и безопасность пользователей',
        'rules.moderation.text': 'Мы стремимся обеспечить безопасную и комфортную среду для всех пользователей нашего приложения. Для этого мы реализуем систему модерации и предоставляем пользователям инструменты для защиты:',
        'rules.moderation.manualReview.title': '7.1. Модерация контента',
        'rules.moderation.manualReview.text': 'Мы применяем систему модерации контента, которая включает в себя как автоматические фильтры, так и ручную проверку:',
        'rules.moderation.manualReview.item1': 'Публикуемый контент (профили, фото, видео) может проходить проверку на соответствие правилам нашего сообщества',
        'rules.moderation.manualReview.item2': 'Аккаунты, нарушающие правила, в том числе занимающиеся буллингом, распространением запрещенного контента или иными деструктивными действиями, могут быть заблокированы',
        'rules.moderation.manualReview.item3': 'Мы стремимся оперативно реагировать на жалобы пользователей и нарушения',
        'rules.moderation.reporting.title': '7.2. Система жалоб',
        'rules.moderation.reporting.text': 'Пользователи могут сообщать о нарушениях через встроенную систему жалоб:',
        'rules.moderation.reporting.item1': 'Возможность пожаловаться на любого пользователя из его профиля',
        'rules.moderation.reporting.item2': 'Все жалобы отправляются непосредственно администратору приложения',
        'rules.moderation.reporting.item3': 'Жалобы обрабатываются в кратчайшие сроки',
        'rules.moderation.reporting.item4': 'Анонимность жалобщика гарантируется',
        'rules.moderation.reporting.item5': 'О результатах рассмотрения жалобы информируется заявитель',
        'rules.moderation.blocking.title': '7.3. Функции блокировки пользователей',
        'rules.moderation.blocking.text': 'Пользователи имеют возможность самостоятельно блокировать других пользователей:',
        'rules.moderation.blocking.item1': 'Заблокированный пользователь не сможет просматривать ваш профиль',
        'rules.moderation.blocking.item2': 'Заблокированный пользователь не сможет отправлять вам сообщения',
        'rules.moderation.blocking.item3': 'Заблокированный пользователь не получит уведомления о блокировке',
        'rules.moderation.blocking.item4': 'Вы можете разблокировать пользователя в любое время',
        'rules.moderation.blocking.item5': 'Блокировка не влияет на возможность отправки жалоб администратору',
        'rules.changes.title': '8. Изменения в Политике конфиденциальности',
        'rules.changes.text': 'Мы можем периодически обновлять настоящую Политику конфиденциальности. О существенных изменениях мы уведомим вас через приложение или по электронной почте. Продолжение использования приложения после внесения изменений означает ваше согласие с обновленной политикой.',
        'rules.contact.title': '9. Контакты',
        'rules.contact.text': 'Если у вас есть вопросы или предложения относительно настоящей Политики конфиденциальности, пожалуйста, свяжитесь с нами:',
        'rules.contact.email': 'Email: support@hockey-stars.com',
        'rules.contact.app': 'Через приложение: раздел "Настройки" → "Поддержка"',
        'rules.back': '← Вернуться на главную'
    },
    en: {
        'page.title': 'HockeyStars - App for Hockey Players',
        'page.description': 'Social network for future hockey stars. Make yourself known to the entire hockey world! Get offers from leading scouts worldwide!',
        'hero.subtitle': 'The entire hockey world in one app',
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
        'download.android.label': 'Download for',
        'install.open': 'Open / Install',
        'tester.modal.title': 'Become a Tester',
        'tester.modal.description': 'Enter your Google email to get access to the Android test version of the app.',
        'tester.form.email': 'Google Account Email:',
        'tester.form.submit': 'Submit',
        'tester.form.loading': 'Submitting...',
        'tester.form.success': 'Thank you! Your email has been added to the tester list. A download link will be sent to your email.',
        'tester.form.error': 'An error occurred. Please try again or contact us: support@hockey-stars.com',
        'tester.form.validation': 'Please enter a valid email address.',
        'footer.copyright': '© 2025 HockeyStars. All rights reserved.',
        'footer.privacy': 'Privacy Policy',
        'footer.deleteAccount': 'Delete Account',
        'footer.contact': 'Contact Us',
        'contact.title': 'Contact Us',
        'contact.subtitle': 'Have a question or suggestion? Send us a note — we personally reply within one business day.',
        'contact.form.name': 'Your name',
        'contact.form.email': 'Email',
        'contact.form.message': 'Message',
        'contact.form.submit': 'Send message',
        'contact.form.validation': 'Please fill in all fields.',
        'contact.form.sending': 'Sending your message…',
        'contact.form.success': 'Message sent! We will get back to you within one business day.',
        'contact.form.error': 'Message could not be sent. Please try again or email us at support@hockey-stars.com.',
        'contact.back': '← Back to main page',
        'rules.title': 'Privacy Policy',
        'rules.lastUpdated': 'Last updated: November 19, 2025',
        'rules.intro': 'This Privacy Policy describes how Andrey Merkulov, the owner of the HockeyStars mobile application ("App"), ("we", "us", "our") collects, uses, and protects your personal information.',
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
        'rules.dataSharing.title': '3. Data Sharing with Third Parties',
        'rules.dataSharing.text': 'We do not sell or transfer your personal data to third parties for marketing purposes. To ensure the App’s operation, we use the following third-party services that act as processors of your data:',
        'rules.dataSharing.item1': '<strong>Supabase</strong> – used for the cloud database and user authentication. Data is stored on secure servers. You can review Supabase’s privacy policy <a href="https://supabase.com/privacy" target="_blank">here</a>.',
        'rules.dataSharing.item2': '<strong>Expo</strong> – used as a platform for app development and deployment. Expo may collect anonymous technical data for stability analysis.',
        'rules.dataSharing.item3': '<strong>Apple App Store / Google Play</strong> – these platforms process data related to purchasing and downloading the App in accordance with their own privacy policies.',
        'rules.dataSecurity.title': '4. Data Security',
        'rules.dataSecurity.text': 'We take reasonable technical and organizational measures to protect your information. These include data encryption during transmission (SSL/TLS protocol), secure storage on protected servers, and strict access control to personal data.',
        'rules.dataSecurity.item1': 'Data encryption during transmission (SSL/TLS protocol)',
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
        'rules.children.title': '6. Children’s Protection (Policy Regarding Minors)',
        'rules.children.text': 'Our App is intended for users of all ages, including children. We give top priority to protecting their privacy.',
        'rules.children.item1': 'Parents or legal representatives are responsible for controlling their children’s use of the App',
        'rules.children.item2': 'We do not intentionally collect personal data from children without the legally required parental consent',
        'rules.children.item3': 'If we learn that we collected data from a child without consent, we will promptly delete this information',
        'rules.children.item4': 'Parents have the right to request access to their child’s data, demand corrections, or complete deletion',
        'rules.children.item5': 'We do not sell or transfer children’s data to third parties for marketing purposes',
        'rules.children.contact': 'To exercise these rights, parents can contact our support team at support@hockey-stars.com from the email address used to provide consent.',
        'rules.children.parentalConsent.title': '6.1. Parental Consent for Children Under 13',
        'rules.children.parentalConsent.text': 'For users under 13 years of age, we require verifiable parental consent:',
        'rules.children.parentalConsent.item1': 'Parental consent is obtained only via email (not through a simple checkbox)',
        'rules.children.parentalConsent.item2': 'We send detailed information about the collected data and our privacy rules',
        'rules.children.parentalConsent.item3': 'The parent must confirm consent through a special link in the email',
        'rules.children.parentalConsent.item4': 'Without verified parental consent, the child’s registration cannot be completed',
        'rules.children.parentalConsent.item5': 'Parents can revoke consent at any time',
        'rules.moderation.title': '7. Content Moderation and User Safety',
        'rules.moderation.text': 'We strive to ensure a safe and comfortable environment for all users. To achieve this, we implement moderation systems and provide users with protection tools:',
        'rules.moderation.manualReview.title': '7.1. Content Moderation',
        'rules.moderation.manualReview.text': 'We apply a content moderation system that includes both automatic filters and manual review:',
        'rules.moderation.manualReview.item1': 'Published content (profiles, photos, videos) may be checked for compliance with our community rules',
        'rules.moderation.manualReview.item2': 'Accounts that violate rules, including bullying or distributing prohibited content, may be blocked',
        'rules.moderation.manualReview.item3': 'We strive to respond promptly to user complaints and violations',
        'rules.moderation.reporting.title': '7.2. Reporting System',
        'rules.moderation.reporting.text': 'Users can report violations through the built-in reporting system:',
        'rules.moderation.reporting.item1': 'Ability to report any user from their profile',
        'rules.moderation.reporting.item2': 'All reports are sent directly to the app administrator',
        'rules.moderation.reporting.item3': 'Reports are processed as quickly as possible',
        'rules.moderation.reporting.item4': 'The complainant’s anonymity is guaranteed',
        'rules.moderation.reporting.item5': 'The complainant is informed about the review results',
        'rules.moderation.blocking.title': '7.3. User Blocking Features',
        'rules.moderation.blocking.text': 'Users can block other users on their own:',
        'rules.moderation.blocking.item1': 'The blocked user cannot view your profile',
        'rules.moderation.blocking.item2': 'The blocked user cannot send you messages',
        'rules.moderation.blocking.item3': 'The blocked user does not receive a blocking notification',
        'rules.moderation.blocking.item4': 'You can unblock a user at any time',
        'rules.moderation.blocking.item5': 'Blocking does not affect the ability to send complaints to the administrator',
        'rules.changes.title': '8. Changes to the Privacy Policy',
        'rules.changes.text': 'We may periodically update this Privacy Policy. We will notify you of material changes through the App or by email. Continued use of the App after changes means your acceptance of the updated policy.',
        'rules.contact.title': '9. Contacts',
        'rules.contact.text': 'If you have questions or suggestions regarding this Privacy Policy, please contact us:',
        'rules.contact.email': 'Email: support@hockey-stars.com',
        'rules.contact.app': 'Through the app: Settings → Support',
        'rules.back': '← Back to home'
    }
};

let currentLanguage = 'en';
const CONTACT_FORM_ENDPOINT_DEFAULT = 'contact-send.php';

// Pages with separate RU/EN versions (SEO).
// If current page is in this map, language switch should navigate between files/paths.
const SEO_LANGUAGE_PAIRS = [
    // Home page: Apache rewrites /en -> index-en.html
    { ru: '/', en: '/en' },

    // Privacy policy
    { ru: '/rules.html', en: '/privacy-en.html' },

    // Delete account
    { ru: '/delete-account.html', en: '/delete-account-en.html' }
];

// Russian-speaking countries
const russianSpeakingCountries = [
    'RU', 'BY', 'KZ', 'KG', 'TJ', 'UZ', 'AM', 'AZ', 'MD', 'UA'
];

function normalizePathname(pathname) {
    const raw = pathname || '/';

    // Strip trailing slashes (except root)
    let p = raw === '/' ? '/' : raw.replace(/\/+$/, '');

    // Normalize direct file access to canonical SEO routes
    if (p === '/index.html') p = '/';
    if (p === '/index-en.html') p = '/en';

    return p;
}

function getSeoPairForPath(normalizedPath) {
    for (const pair of SEO_LANGUAGE_PAIRS) {
        if (pair.ru === normalizedPath || pair.en === normalizedPath) return pair;
    }
    return null;
}

function buildRedirectUrl(targetPathname, options) {
    try {
        const url = new URL(window.location.href);
        url.pathname = targetPathname;
        // By default, avoid carrying `lang` query across SEO page redirects.
        // It can cause redirect loops (e.g., /rules.html?lang=ru -> /privacy-en.html?lang=ru -> back).
        const langParam = options && Object.prototype.hasOwnProperty.call(options, 'langParam')
            ? options.langParam
            : null;
        if (langParam === null) {
            url.searchParams.delete('lang');
        } else if (typeof langParam === 'string') {
            url.searchParams.set('lang', langParam);
        }
        return url.toString();
    } catch (e) {
        return targetPathname;
    }
}

// Detect language based on browser locale
function detectLanguage(options) {
    const ignoreUrlParam = !!(options && options.ignoreUrlParam);

    if (!ignoreUrlParam) {
    // First, check URL parameter (highest priority)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && (urlLang === 'ru' || urlLang === 'en')) {
        // Save to localStorage for future visits
        localStorage.setItem('hockeystars-lang', urlLang);
        return urlLang;
        }
    }

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
    currentLanguage = lang;
    
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

    // Update privacy policy links
    const privacyRu = document.querySelector('.footer-privacy-ru');
    const privacyEn = document.querySelector('.footer-privacy-en');
    if (privacyRu && privacyEn) {
        if (lang === 'en') {
            privacyRu.style.display = 'none';
            privacyEn.style.display = 'inline-block';
        } else {
            privacyRu.style.display = 'inline-block';
            privacyEn.style.display = 'none';
        }
    }

    // Update delete account links
    const deleteAccountRu = document.querySelector('.footer-delete-account-ru');
    const deleteAccountEn = document.querySelector('.footer-delete-account-en');
    if (deleteAccountRu && deleteAccountEn) {
        if (lang === 'en') {
            deleteAccountRu.style.display = 'none';
            deleteAccountEn.style.display = 'inline-block';
        } else {
            deleteAccountRu.style.display = 'inline-block';
            deleteAccountEn.style.display = 'none';
        }
    }

    document.querySelectorAll('input[name="lang"]').forEach(input => {
        input.value = lang;
    });

    // Update page title and meta description
    if (translations[lang] && translations[lang]['page.title']) {
        document.title = translations[lang]['page.title'];
    }
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && translations[lang] && translations[lang]['page.description']) {
        metaDescription.setAttribute('content', translations[lang]['page.description']);
    }

    // Update Open Graph tags for SEO
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && translations[lang] && translations[lang]['page.title']) {
        ogTitle.setAttribute('content', translations[lang]['page.title']);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && translations[lang] && translations[lang]['page.description']) {
        ogDescription.setAttribute('content', translations[lang]['page.description']);
    }
    
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) {
        ogLocale.setAttribute('content', lang === 'ru' ? 'ru_RU' : 'en_US');
    }

    // Update Twitter tags for SEO
    const twitterTitle = document.querySelector('meta[property="twitter:title"]');
    if (twitterTitle && translations[lang] && translations[lang]['page.title']) {
        twitterTitle.setAttribute('content', translations[lang]['page.title']);
    }
    
    const twitterDescription = document.querySelector('meta[property="twitter:description"]');
    if (twitterDescription && translations[lang] && translations[lang]['page.description']) {
        twitterDescription.setAttribute('content', translations[lang]['page.description']);
    }
}

function getTranslationValue(key, fallback) {
    if (translations[currentLanguage] && translations[currentLanguage][key]) {
        return translations[currentLanguage][key];
    }
    return fallback;
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

function initContactForm() {
    const form = document.querySelector('.contact-form');
    if (!form) {
        return;
    }

    const nameInput = form.querySelector('input[name="name"]');
    const emailInput = form.querySelector('input[name="email"]');
    const messageInput = form.querySelector('textarea[name="message"]');
    const statusEl = form.querySelector('.contact-status');
    const endpoint = form.dataset.endpoint || CONTACT_FORM_ENDPOINT_DEFAULT;

    const setStatus = (message, isError = false) => {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = message;
        statusEl.classList.remove('success', 'error');
        statusEl.classList.add(isError ? 'error' : 'success');
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();
        const message = messageInput?.value.trim();

        if (!name || !email || !message) {
            setStatus(getTranslationValue('contact.form.validation', 'Please fill in all fields.'), true);
            return;
        }

        try {
            setStatus(getTranslationValue('contact.form.sending', 'Sending your message…'), false);

            const formData = new FormData();
            formData.append('name', name);
            formData.append('email', email);
            formData.append('message', message);
            formData.append('lang', currentLanguage);

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Request failed');
            }

            setStatus(
                getTranslationValue(
                    'contact.form.success',
                    'Message sent! We will get back to you within one business day.'
                ),
                false
            );
            form.reset();
        } catch (error) {
            console.error('Failed to submit contact form', error);
            setStatus(
                getTranslationValue(
                    'contact.form.error',
                    'Message could not be sent. Please try again or email us at support@hockey-stars.com.'
                ),
                true
            );
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
    const normalizedPath = normalizePathname(window.location.pathname);
    const seoPair = getSeoPairForPath(normalizedPath);

    // Desired language:
    // - stored choice (localStorage) OR ?lang= OR auto-detect by region.
    // On SEO-paired pages we ignore `?lang=` to avoid redirect loops.
    const desiredLang = seoPair ? detectLanguage({ ignoreUrlParam: true }) : detectLanguage();

    // If this page has separate RU/EN versions, keep user on the correct file/path.
    if (seoPair) {
        const currentSeoLang = normalizedPath === seoPair.en ? 'en' : 'ru';

        if (desiredLang !== currentSeoLang) {
            const targetPath = desiredLang === 'en' ? seoPair.en : seoPair.ru;
            window.location.replace(buildRedirectUrl(targetPath, { langParam: null }));
            return;
        }

        // Match language to the file/path (SEO version)
        setLanguage(currentSeoLang);
    } else {
        // Single-page (no separate SEO file): just translate in-place.
        setLanguage(desiredLang);
    }
    
    // Add click handlers to language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const newLang = btn.getAttribute('data-lang');
            if (!newLang || (newLang !== 'ru' && newLang !== 'en')) return;

            const currentPath = normalizePathname(window.location.pathname);
            const pair = getSeoPairForPath(currentPath);

            // If there is a separate RU/EN SEO page for this route, navigate to it.
            if (pair) {
                // Store preference so the target page doesn't auto-redirect back.
                localStorage.setItem('hockeystars-lang', newLang);
                const targetPath = newLang === 'en' ? pair.en : pair.ru;
                if (targetPath !== currentPath) {
                    window.location.href = buildRedirectUrl(targetPath, { langParam: null });
                }
                return;
            }

            // Single-page (no separate SEO file): translate in-place.
                setLanguage(newLang);

            // Otherwise stay on the same page and reflect language in URL for sharing.
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('lang', newLang);
                window.history.replaceState({}, '', url.toString());
            } catch (_) {
                // ignore
            }
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

    initContactForm();
    initAndroidTesterForm();
});

// Android Tester Modal Functions
function openAndroidTesterModal() {
    const modal = document.getElementById('androidTesterModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // Focus on email input
        setTimeout(() => {
            const emailInput = document.getElementById('testerEmail');
            if (emailInput) {
                emailInput.focus();
            }
        }, 100);
    }
}

function closeAndroidTesterModal() {
    const modal = document.getElementById('androidTesterModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        // Reset form
        const form = document.getElementById('androidTesterForm');
        if (form) {
            form.reset();
        }
        const status = document.getElementById('testerStatus');
        if (status) {
            status.style.display = 'none';
            status.className = 'tester-status';
        }
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('androidTesterModal');
    if (event.target === modal) {
        closeAndroidTesterModal();
    }
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('androidTesterModal');
        if (modal && modal.style.display === 'block') {
            closeAndroidTesterModal();
        }
    }
});

function initAndroidTesterForm() {
    const form = document.getElementById('androidTesterForm');
    if (!form) {
        return;
    }

    const emailInput = document.getElementById('testerEmail');
    const statusEl = document.getElementById('testerStatus');
    const submitBtn = form.querySelector('.btn-submit');

    const setStatus = (message, type = '') => {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = message;
        statusEl.className = `tester-status ${type}`;
        statusEl.style.display = type ? 'block' : 'none';
    };

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = emailInput?.value.trim();

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            setStatus(
                getTranslationValue('tester.form.validation', 'Please enter a valid email address.'),
                'error'
            );
            return;
        }

        try {
            setStatus(
                getTranslationValue('tester.form.loading', 'Submitting...'),
                'loading'
            );
            submitBtn.disabled = true;

            const response = await fetch('/add-tester.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    lang: currentLanguage
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            setStatus(
                getTranslationValue(
                    'tester.form.success',
                    'Thank you! Your email has been added to the tester list. A download link will be sent to your email.'
                ),
                'success'
            );

            // Reset form after success
            form.reset();

            // Close modal after 3 seconds
            setTimeout(() => {
                closeAndroidTesterModal();
                // Start download
                window.location.href = 'https://hockey-stars.com/hockeystars.apk';
            }, 3000);

        } catch (error) {
            console.error('Failed to submit tester form', error);
            setStatus(
                getTranslationValue(
                    'tester.form.error',
                    'An error occurred. Please try again or contact us: support@hockey-stars.com'
                ),
                'error'
            );
        } finally {
            submitBtn.disabled = false;
        }
    });
}

