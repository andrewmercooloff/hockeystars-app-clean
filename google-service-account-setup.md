# Настройка Google Service Account для автоматической публикации

## Шаги для создания Service Account:

1. **Перейдите в Google Cloud Console**:
   - Откройте [Google Cloud Console](https://console.cloud.google.com/)
   - Создайте новый проект или выберите существующий

2. **Включите Google Play Android Developer API**:
   - В меню слева выберите "APIs & Services" > "Library"
   - Найдите "Google Play Android Developer API"
   - Нажмите "Enable"

3. **Создайте Service Account**:
   - Перейдите в "APIs & Services" > "Credentials"
   - Нажмите "Create Credentials" > "Service Account"
   - Заполните информацию:
     - Name: HockeyStars Service Account
     - Description: Service account for HockeyStars app publishing
   - Нажмите "Create and Continue"

4. **Назначьте роли**:
   - Выберите роль "Editor"
   - Нажмите "Continue"
   - Нажмите "Done"

5. **Создайте ключ**:
   - Нажмите на созданный Service Account
   - Перейдите на вкладку "Keys"
   - Нажмите "Add Key" > "Create new key"
   - Выберите "JSON"
   - Нажмите "Create"
   - Скачайте файл и переименуйте в `google-service-account.json`
   - Поместите файл в корень проекта

6. **Настройте доступ в Google Play Console**:
   - Откройте [Google Play Console](https://play.google.com/console)
   - Перейдите в "Setup" > "API access"
   - Нажмите "Create new project"
   - Добавьте Service Account email из скачанного JSON файла
   - Назначьте роль "Release Manager"

## Важно:
- Храните `google-service-account.json` в безопасном месте
- Не коммитьте этот файл в Git
- Добавьте `google-service-account.json` в `.gitignore`
