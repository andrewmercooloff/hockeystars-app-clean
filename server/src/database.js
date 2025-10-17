const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем базу данных
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Инициализация таблиц
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Таблица игроков
      db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'player',
        avatar TEXT,
        bio TEXT,
        team TEXT,
        position TEXT,
        number INTEGER,
        grip TEXT,
        height INTEGER,
        weight INTEGER,
        birthDate TEXT,
        hockeyStartDate TEXT,
        favoriteGoals INTEGER DEFAULT 0,
        pullUps INTEGER DEFAULT 0,
        pushUps INTEGER DEFAULT 0,
        plankTime INTEGER DEFAULT 0,
        sprint100m REAL DEFAULT 0,
        longJump REAL DEFAULT 0,
        games INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        points INTEGER DEFAULT 0,
        photos TEXT,
        isOnline BOOLEAN DEFAULT 0,
        lastSeen TEXT,
        loginCount INTEGER DEFAULT 0,
        isPublic BOOLEAN DEFAULT 1,
        allowMessages BOOLEAN DEFAULT 1,
        allowFriendRequests BOOLEAN DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`);

      // Таблица сообщений
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId INTEGER NOT NULL,
        recipientId INTEGER NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        read BOOLEAN DEFAULT 0,
        mediaUrl TEXT,
        mediaType TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES players (id),
        FOREIGN KEY (recipientId) REFERENCES players (id)
      )`);

      // Таблица уведомлений
      db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        senderId INTEGER NOT NULL,
        recipientId INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        read BOOLEAN DEFAULT 0,
        data TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderId) REFERENCES players (id),
        FOREIGN KEY (recipientId) REFERENCES players (id)
      )`);

      // Таблица друзей
      db.run(`CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playerId INTEGER NOT NULL,
        friendId INTEGER NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playerId) REFERENCES players (id),
        FOREIGN KEY (friendId) REFERENCES players (id),
        UNIQUE(playerId, friendId)
      )`);

      console.log('✅ База данных SQLite инициализирована');
      resolve();
    });
  });
};

// Закрытие соединения
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Соединение с базой данных закрыто');
        resolve();
      }
    });
  });
};

module.exports = { db, initDatabase, closeDatabase }; 