// Скрипт для массовой генерации миниатюр
// Запустите этот скрипт в консоли браузера для обработки всех существующих аватаров

import { startBulkThumbnailGeneration } from './BulkThumbnailGenerator';

console.log(`
🚀 СКРИПТ МАССОВОЙ ГЕНЕРАЦИИ МИНИАТЮР
=====================================

Этот скрипт обработает все существующие аватары и создаст для них миниатюры.

Что будет происходить:
1. Загрузка всех игроков из базы данных
2. Фильтрация игроков с аватарами
3. Генерация миниатюр для каждого аватара
4. Загрузка миниатюр в Supabase Storage

Размеры миниатюр:
- SMALL: 30px
- MEDIUM: 50px  
- LARGE: 60px
- XLARGE: 80px
- XXLARGE: 100px

Для запуска выполните:
startBulkThumbnailGeneration()

Или импортируйте и запустите:
import { startBulkThumbnailGeneration } from './utils/BulkThumbnailGenerator';
await startBulkThumbnailGeneration();
`);

// Автоматически делаем функцию доступной
if (typeof window !== 'undefined') {
  (window as any).startBulkThumbnailGeneration = startBulkThumbnailGeneration;
}

export { startBulkThumbnailGeneration };
