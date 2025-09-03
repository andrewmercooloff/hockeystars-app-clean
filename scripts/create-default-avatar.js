const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Создаем холст
const width = 120;
const height = 120;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Прозрачный фон
ctx.clearRect(0, 0, width, height);

// Рисуем круг
ctx.beginPath();
ctx.arc(width/2, height/2, 50, 0, Math.PI * 2, true);
ctx.closePath();
ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
ctx.fill();

// Рисуем силуэт игрока
ctx.beginPath();
ctx.moveTo(width/2, height/2 + 20);
ctx.lineTo(width/2 - 20, height/2 + 50);
ctx.lineTo(width/2 + 20, height/2 + 50);
ctx.closePath();
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
ctx.fill();

// Рисуем голову
ctx.beginPath();
ctx.arc(width/2, height/2 - 10, 25, 0, Math.PI * 2, true);
ctx.closePath();
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
ctx.fill();

// Сохраняем изображение
const buffer = canvas.toBuffer('image/png');
const outputPath = path.join(__dirname, '..', 'assets', 'images', 'default-avatar.png');
fs.writeFileSync(outputPath, buffer);
