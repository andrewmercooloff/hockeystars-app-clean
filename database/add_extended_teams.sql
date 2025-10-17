-- Добавление расширенной базы команд
-- Выполните этот скрипт в SQL Editor в Supabase Dashboard

-- Белорусские команды
INSERT INTO public.teams (id, name, type, country, city) VALUES
-- Клубы
(gen_random_uuid(), 'Пираньи', 'club', 'Беларусь', 'Минск'),
(gen_random_uuid(), 'Юность', 'club', 'Беларусь', 'Минск'),
(gen_random_uuid(), 'Динамо', 'club', 'Беларусь', 'Минск'),
(gen_random_uuid(), 'ШРС', 'club', 'Беларусь', 'Минск'),
(gen_random_uuid(), 'Динамо-Молодечно', 'club', 'Беларусь', 'Молодечно'),
(gen_random_uuid(), 'Неман', 'club', 'Беларусь', 'Гродно'),
(gen_random_uuid(), 'Гомель', 'club', 'Беларусь', 'Гомель'),
(gen_random_uuid(), 'Брест', 'club', 'Беларусь', 'Брест'),
(gen_random_uuid(), 'Витебск', 'club', 'Беларусь', 'Витебск'),
(gen_random_uuid(), 'Могилев', 'club', 'Беларусь', 'Могилев'),

-- Сборные
(gen_random_uuid(), 'Сборная Беларуси', 'national', 'Беларусь', NULL),
(gen_random_uuid(), 'Сборная Беларуси U20', 'national', 'Беларусь', NULL),
(gen_random_uuid(), 'Сборная Беларуси U18', 'national', 'Беларусь', NULL),

-- Российские команды (КХЛ)
(gen_random_uuid(), 'ЦСКА', 'club', 'Россия', 'Москва'),
(gen_random_uuid(), 'Динамо Москва', 'club', 'Россия', 'Москва'),
(gen_random_uuid(), 'Спартак', 'club', 'Россия', 'Москва'),
(gen_random_uuid(), 'Локомотив', 'club', 'Россия', 'Ярославль'),
(gen_random_uuid(), 'Ак Барс', 'club', 'Россия', 'Казань'),
(gen_random_uuid(), 'Салават Юлаев', 'club', 'Россия', 'Уфа'),
(gen_random_uuid(), 'Трактор', 'club', 'Россия', 'Челябинск'),
(gen_random_uuid(), 'Металлург Мг', 'club', 'Россия', 'Магнитогорск'),
(gen_random_uuid(), 'Северсталь', 'club', 'Россия', 'Череповец'),
(gen_random_uuid(), 'Торпедо', 'club', 'Россия', 'Нижний Новгород'),
(gen_random_uuid(), 'Витязь', 'club', 'Россия', 'Подольск'),
(gen_random_uuid(), 'Динамо Р', 'club', 'Россия', 'Рига'),
(gen_random_uuid(), 'Слован', 'club', 'Словакия', 'Братислава'),
(gen_random_uuid(), 'Сборная России', 'national', 'Россия', NULL),

-- Канадские команды (НХЛ)
(gen_random_uuid(), 'Toronto Maple Leafs', 'club', 'Канада', 'Торонто'),
(gen_random_uuid(), 'Montreal Canadiens', 'club', 'Канада', 'Монреаль'),
(gen_random_uuid(), 'Vancouver Canucks', 'club', 'Канада', 'Ванкувер'),
(gen_random_uuid(), 'Edmonton Oilers', 'club', 'Канада', 'Эдмонтон'),
(gen_random_uuid(), 'Calgary Flames', 'club', 'Канада', 'Калгари'),
(gen_random_uuid(), 'Winnipeg Jets', 'club', 'Канада', 'Виннипег'),
(gen_random_uuid(), 'Ottawa Senators', 'club', 'Канада', 'Оттава'),
(gen_random_uuid(), 'Сборная Канады', 'national', 'Канада', NULL),

-- Американские команды (НХЛ)
(gen_random_uuid(), 'New York Rangers', 'club', 'США', 'Нью-Йорк'),
(gen_random_uuid(), 'Boston Bruins', 'club', 'США', 'Бостон'),
(gen_random_uuid(), 'Chicago Blackhawks', 'club', 'США', 'Чикаго'),
(gen_random_uuid(), 'Detroit Red Wings', 'club', 'США', 'Детройт'),
(gen_random_uuid(), 'Pittsburgh Penguins', 'club', 'США', 'Питтсбург'),
(gen_random_uuid(), 'Washington Capitals', 'club', 'США', 'Вашингтон'),
(gen_random_uuid(), 'Tampa Bay Lightning', 'club', 'США', 'Тампа'),
(gen_random_uuid(), 'Colorado Avalanche', 'club', 'США', 'Денвер'),
(gen_random_uuid(), 'Сборная США', 'national', 'США', NULL),

-- Финские команды
(gen_random_uuid(), 'HIFK', 'club', 'Финляндия', 'Хельсинки'),
(gen_random_uuid(), 'Tappara', 'club', 'Финляндия', 'Тампере'),
(gen_random_uuid(), 'Kärpät', 'club', 'Финляндия', 'Оулу'),
(gen_random_uuid(), 'TPS', 'club', 'Финляндия', 'Турку'),
(gen_random_uuid(), 'Сборная Финляндии', 'national', 'Финляндия', NULL),

-- Шведские команды
(gen_random_uuid(), 'Färjestad BK', 'club', 'Швеция', 'Карлстад'),
(gen_random_uuid(), 'HV71', 'club', 'Швеция', 'Йёнчёпинг'),
(gen_random_uuid(), 'Frölunda HC', 'club', 'Швеция', 'Гётеборг'),
(gen_random_uuid(), 'Djurgårdens IF', 'club', 'Швеция', 'Стокгольм'),
(gen_random_uuid(), 'Сборная Швеции', 'national', 'Швеция', NULL),

-- Другие европейские команды
(gen_random_uuid(), 'Kaunas', 'club', 'Литва', 'Каунас'),
(gen_random_uuid(), 'Vilnius', 'club', 'Литва', 'Вильнюс'),
(gen_random_uuid(), 'Klaipeda', 'club', 'Литва', 'Клайпеда'),

(gen_random_uuid(), 'Riga', 'club', 'Латвия', 'Рига'),
(gen_random_uuid(), 'Daugavpils', 'club', 'Латвия', 'Даугавпилс'),
(gen_random_uuid(), 'Liepaja', 'club', 'Латвия', 'Лиепая'),

(gen_random_uuid(), 'Cracovia', 'club', 'Польша', 'Краков'),
(gen_random_uuid(), 'GKS Tychy', 'club', 'Польша', 'Тыхы'),
(gen_random_uuid(), 'Podhale', 'club', 'Польша', 'Новый Тарг')

ON CONFLICT (name) DO NOTHING;

-- Проверяем добавленные команды
SELECT name, type, country, city FROM public.teams ORDER BY country, name; 