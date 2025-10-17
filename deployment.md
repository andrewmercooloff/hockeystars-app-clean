# 🚀 Руководство по развертыванию HockeyStars

## 📋 Обзор архитектуры

HockeyStars - это полноценная социальная сеть для хоккеистов с автоматической синхронизацией данных.

### **Компоненты системы:**
- **Frontend**: React Native + Expo (мобильное приложение)
- **Backend**: Node.js + Express + Socket.IO (API сервер)
- **Database**: MongoDB (хранение данных)
- **File Storage**: Cloudinary (изображения и файлы)
- **Real-time**: Socket.IO (чат и уведомления)

## 🛠 Локальная разработка

### **1. Настройка базы данных**
```bash
# Установка MongoDB
# Windows: https://docs.mongodb.com/manual/installation/
# macOS: brew install mongodb-community
# Linux: sudo apt install mongodb

# Запуск MongoDB
mongod
```

### **2. Настройка сервера**
```bash
cd server
npm install
cp .env.example .env
# Отредактируйте .env файл
npm run dev
```

### **3. Настройка клиента**
```bash
cd instead
npm install
# Создайте .env файл с переменными окружения
npm start
```

## 🌐 Развертывание в продакшене

### **Вариант 1: VPS (DigitalOcean, AWS, Vultr)**

#### **Серверная часть:**
```bash
# Подключение к серверу
ssh root@your-server-ip

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Установка PM2
npm install -g pm2

# Клонирование проекта
git clone https://github.com/your-username/hockeystars-app.git
cd hockeystars-app/server

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env
nano .env
```

#### **Файл .env для сервера:**
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hockeystars
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=https://your-domain.com
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

#### **Запуск с PM2:**
```bash
# Создание PM2 конфигурации
pm2 ecosystem

# Запуск приложения
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### **Вариант 2: Облачные платформы**

#### **Heroku:**
```bash
# Установка Heroku CLI
# Создание приложения
heroku create hockeystars-app
heroku addons:create mongolab:sandbox
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key
git push heroku main
```

#### **Railway:**
```bash
# Подключение к Railway
railway login
railway init
railway up
```

#### **Render:**
```bash
# Подключение к Render
# Создание нового Web Service
# Подключение GitHub репозитория
# Настройка переменных окружения
```

### **Вариант 3: Docker**

#### **Dockerfile для сервера:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

#### **docker-compose.yml:**
```yaml
version: '3.8'

services:
  server:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/hockeystars
      - JWT_SECRET=your-secret-key
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

## 📱 Настройка клиентского приложения

### **Переменные окружения для клиента:**
```env
EXPO_PUBLIC_API_URL=https://your-api-domain.com/api
EXPO_PUBLIC_SOCKET_URL=https://your-api-domain.com
```

### **Сборка для продакшена:**
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

## 🔒 Безопасность

### **SSL/HTTPS:**
```bash
# Установка Certbot
sudo apt-get install certbot

# Получение SSL сертификата
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавить: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Firewall:**
```bash
# Настройка UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📊 Мониторинг

### **Логи:**
```bash
# Просмотр логов PM2
pm2 logs

# Просмотр логов MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Просмотр системных логов
sudo journalctl -u mongod -f
```

### **Метрики:**
```bash
# Установка мониторинга
npm install -g clinic

# Анализ производительности
clinic doctor -- node src/index.js
```

## 🔄 CI/CD Pipeline

### **GitHub Actions:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd server
          npm ci
          
      - name: Run tests
        run: |
          cd server
          npm test
          
      - name: Deploy to server
        run: |
          # SSH команды для деплоя
          ssh user@server "cd /app && git pull && npm install && pm2 restart all"
```

## 📈 Масштабирование

### **Горизонтальное масштабирование:**
```bash
# Клонирование приложения
pm2 scale hockeystars 4

# Настройка балансировщика нагрузки (nginx)
```

### **Вертикальное масштабирование:**
```bash
# Увеличение ресурсов сервера
# Настройка MongoDB репликации
```

## 🆘 Поддержка

### **Полезные команды:**
```bash
# Перезапуск сервера
pm2 restart all

# Просмотр статуса
pm2 status

# Очистка логов
pm2 flush

# Обновление приложения
git pull && npm install && pm2 restart all
```

### **Логи и отладка:**
```bash
# Просмотр ошибок
pm2 logs --err

# Мониторинг ресурсов
pm2 monit

# Проверка подключения к БД
mongo --eval "db.runCommand('ping')"
```

---

## 🎯 Следующие шаги

1. **Настройте домен** и SSL сертификат
2. **Настройте мониторинг** и алерты
3. **Настройте резервное копирование** базы данных
4. **Протестируйте** все функции в продакшене
5. **Настройте аналитику** и метрики
6. **Подготовьте документацию** для пользователей

**Удачи с запуском HockeyStars! 🏒🚀** 