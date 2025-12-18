@echo off
echo === ПРОВЕРКА ВИДЕО IMG_5198.MOV ===
echo.

if not exist "IMG_5198.MOV" (
    echo ОШИБКА: Файл IMG_5198.MOV не найден!
    pause
    exit /b 1
)

echo Файл найден!
echo.

where ffprobe >nul 2>&1
if %errorlevel% neq 0 (
    echo FFmpeg не установлен!
    echo.
    echo Установите FFmpeg для детального анализа:
    echo   winget install ffmpeg
    echo.
    echo Базовые требования App Store:
    echo   - Формат: .mov, .m4v, .mp4 ^(поддерживается^)
    echo   - Кодек: H.264 или ProRes 422 ^(требуется FFmpeg для проверки^)
    echo   - FPS: максимум 30 ^(требуется FFmpeg для проверки^)
    echo   - Длительность: 15-30 сек ^(требуется FFmpeg для проверки^)
    echo   - Размер: максимум 500 MB ^(требуется FFmpeg для проверки^)
    echo   - Аудио: AAC, 256 kbps, 44.1/48 kHz, стерео
    pause
    exit /b 0
)

echo Анализ видео с помощью FFprobe...
echo.

ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,duration -show_entries format=duration -of json "IMG_5198.MOV" > video_info.json 2>&1

if %errorlevel% neq 0 (
    echo Ошибка при анализе видео!
    pause
    exit /b 1
)

echo Результаты анализа сохранены в video_info.json
echo.
echo Для просмотра результатов запустите:
echo   type video_info.json
echo.
echo Или используйте PowerShell скрипт check_video_simple.ps1
pause






















