-- Создание таблицы для кодов подтверждения email
CREATE TABLE IF NOT EXISTS email_verification_codes (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5
);

-- Индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_email_verification_email ON email_verification_codes(email);

-- Индекс для быстрого поиска активных кодов
CREATE INDEX IF NOT EXISTS idx_email_verification_active ON email_verification_codes(email, used, expires_at);

-- Автоматическая очистка старых кодов (если поддерживается)
-- DELETE FROM email_verification_codes WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '1 DAY';
