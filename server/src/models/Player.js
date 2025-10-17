const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const playerSchema = new mongoose.Schema({
  // Основная информация
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Неверный формат email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: ['player', 'coach', 'scout', 'star'],
    default: 'player'
  },
  
  // Личная информация
  birthDate: {
    type: Date,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'Беларусь'
  },
  city: String,
  
  // Хоккейная информация
  team: String,
  position: {
    type: String,
    enum: ['Вратарь', 'Защитник', 'Нападающий', 'Центральный нападающий', 'Левый крайний', 'Правый крайний']
  },
  number: {
    type: String,
    maxlength: 2
  },
  grip: {
    type: String,
    enum: ['Левый', 'Правый']
  },
  height: {
    type: Number,
    min: 100,
    max: 250
  },
  weight: {
    type: Number,
    min: 30,
    max: 200
  },
  
  // Статистика
  games: {
    type: Number,
    default: 0,
    min: 0
  },
  goals: {
    type: Number,
    default: 0,
    min: 0
  },
  assists: {
    type: Number,
    default: 0,
    min: 0
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Нормативы
  pullUps: {
    type: Number,
    min: 0
  },
  pushUps: {
    type: Number,
    min: 0
  },
  plankTime: {
    type: Number,
    min: 0
  },
  sprint100m: {
    type: Number,
    min: 0
  },
  longJump: {
    type: Number,
    min: 0
  },
  
  // Дополнительная информация
  hockeyStartDate: Date,
  favoriteGoals: [String],
  avatar: {
    type: String,
    default: null
  },
  photos: [String],
  bio: {
    type: String,
    maxlength: 500
  },
  
  // Социальные связи
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  sentFriendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  receivedFriendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  
  // Настройки
  isPublic: {
    type: Boolean,
    default: true
  },
  allowMessages: {
    type: Boolean,
    default: true
  },
  allowFriendRequests: {
    type: Boolean,
    default: true
  },
  
  // Системные поля
  isVerified: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  
  // Метаданные
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Виртуальные поля
playerSchema.virtual('age').get(function() {
  if (!this.birthDate) return null;
  const today = new Date();
  const birthDate = new Date(this.birthDate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

playerSchema.virtual('hockeyExperience').get(function() {
  if (!this.hockeyStartDate) return null;
  const today = new Date();
  const startDate = new Date(this.hockeyStartDate);
  const years = today.getFullYear() - startDate.getFullYear();
  const months = today.getMonth() - startDate.getMonth();
  
  if (months < 0) {
    return `${years - 1} лет ${12 + months} месяцев`;
  }
  
  return `${years} лет ${months} месяцев`;
});

// Индексы для быстрого поиска
playerSchema.index({ username: 1 });
playerSchema.index({ email: 1 });
playerSchema.index({ status: 1 });
playerSchema.index({ team: 1 });
playerSchema.index({ country: 1 });
playerSchema.index({ isOnline: 1 });
playerSchema.index({ createdAt: -1 });

// Хеширование пароля перед сохранением
playerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для сравнения паролей
playerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Метод для получения публичного профиля
playerSchema.methods.getPublicProfile = function() {
  const player = this.toObject();
  delete player.password;
  delete player.email;
  delete player.sentFriendRequests;
  delete player.receivedFriendRequests;
  return player;
};

// Статические методы
playerSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

playerSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

playerSchema.statics.findStars = function() {
  return this.find({ status: 'star' }).select('name avatar team position');
};

module.exports = mongoose.model('Player', playerSchema); 