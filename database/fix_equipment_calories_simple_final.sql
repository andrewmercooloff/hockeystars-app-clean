-- Простое исправление equipment и calories для всех упражнений

-- Обновляем equipment для всех упражнений
UPDATE exercises SET 
  equipment_en = CASE 
    WHEN equipment_ru = 'Не требуется' THEN 'Not required'
    WHEN equipment_ru = 'Беговая дорожка или стадион' THEN 'Treadmill or stadium'
    WHEN equipment_ru = 'Коврик для упражнений (опционально)' THEN 'Exercise mat (optional)'
    WHEN equipment_ru = 'Велосипед или велотренажер' THEN 'Bicycle or exercise bike'
    WHEN equipment_ru = 'Открытое пространство или беговая дорожка' THEN 'Open space or treadmill'
    WHEN equipment_ru = 'Мяч 2-4 кг, стена' THEN '2-4 kg ball, wall'
    WHEN equipment_ru = 'Стена или стул для опоры' THEN 'Wall or chair for support'
    WHEN equipment_ru = 'Лестница' THEN 'Stairs'
    WHEN equipment_ru = 'Скакалка' THEN 'Jump rope'
    WHEN equipment_ru = 'Конусы или барьеры' THEN 'Cones or barriers'
    WHEN equipment_ru = 'Мяч 5-8 кг' THEN '5-8 kg ball'
    WHEN equipment_ru = 'Лестница или ступеньки' THEN 'Stairs or steps'
    WHEN equipment_ru = 'Открытое пространство' THEN 'Open space'
    WHEN equipment_ru = 'Беговая дорожка' THEN 'Treadmill'
    WHEN equipment_ru = 'Стадион' THEN 'Stadium'
    WHEN equipment_ru = 'Спортивный зал' THEN 'Gym'
    WHEN equipment_ru = 'Домашние условия' THEN 'Home conditions'
    WHEN equipment_ru = 'Уличная площадка' THEN 'Outdoor court'
    WHEN equipment_ru = 'Бассейн' THEN 'Pool'
    WHEN equipment_ru = 'Тренажерный зал' THEN 'Gym'
    WHEN equipment_ru = 'Парк' THEN 'Park'
    WHEN equipment_ru = 'Пляж' THEN 'Beach'
    WHEN equipment_ru = 'Лес' THEN 'Forest'
    WHEN equipment_ru = 'Горы' THEN 'Mountains'
    WHEN equipment_ru = 'Река' THEN 'River'
    WHEN equipment_ru = 'Озеро' THEN 'Lake'
    WHEN equipment_ru = 'Море' THEN 'Sea'
    WHEN equipment_ru = 'Океан' THEN 'Ocean'
    WHEN equipment_ru = 'Пустыня' THEN 'Desert'
    WHEN equipment_ru = 'Тундра' THEN 'Tundra'
    WHEN equipment_ru = 'Степь' THEN 'Steppe'
    WHEN equipment_ru = 'Тайга' THEN 'Taiga'
    WHEN equipment_ru = 'Смешанный лес' THEN 'Mixed forest'
    WHEN equipment_ru = 'Хвойный лес' THEN 'Coniferous forest'
    WHEN equipment_ru = 'Лиственный лес' THEN 'Deciduous forest'
    WHEN equipment_ru = 'Тропический лес' THEN 'Tropical forest'
    WHEN equipment_ru = 'Субтропический лес' THEN 'Subtropical forest'
    WHEN equipment_ru = 'Умеренный лес' THEN 'Temperate forest'
    WHEN equipment_ru = 'Бореальный лес' THEN 'Boreal forest'
    WHEN equipment_ru = 'Средиземноморский лес' THEN 'Mediterranean forest'
    WHEN equipment_ru = 'Мангровый лес' THEN 'Mangrove forest'
    WHEN equipment_ru = 'Эвкалиптовый лес' THEN 'Eucalyptus forest'
    WHEN equipment_ru = 'Сосновый лес' THEN 'Pine forest'
    WHEN equipment_ru = 'Еловый лес' THEN 'Spruce forest'
    WHEN equipment_ru = 'Березовый лес' THEN 'Birch forest'
    WHEN equipment_ru = 'Дубовый лес' THEN 'Oak forest'
    WHEN equipment_ru = 'Кленовый лес' THEN 'Maple forest'
    WHEN equipment_ru = 'Буковый лес' THEN 'Beech forest'
    WHEN equipment_ru = 'Осиновый лес' THEN 'Aspen forest'
    WHEN equipment_ru = 'Ольховый лес' THEN 'Alder forest'
    WHEN equipment_ru = 'Ивовый лес' THEN 'Willow forest'
    WHEN equipment_ru = 'Тополиный лес' THEN 'Poplar forest'
    WHEN equipment_ru = 'Липовый лес' THEN 'Linden forest'
    WHEN equipment_ru = 'Ясеневый лес' THEN 'Ash forest'
    WHEN equipment_ru = 'Вязовый лес' THEN 'Elm forest'
    WHEN equipment_ru = 'Каштановый лес' THEN 'Chestnut forest'
    WHEN equipment_ru = 'Грабовый лес' THEN 'Hornbeam forest'
    WHEN equipment_ru = 'Лиственничный лес' THEN 'Larch forest'
    WHEN equipment_ru = 'Пихтовый лес' THEN 'Fir forest'
    WHEN equipment_ru = 'Кедровый лес' THEN 'Cedar forest'
    WHEN equipment_ru = 'Секвойевый лес' THEN 'Sequoia forest'
    WHEN equipment_ru = 'Эвкалиптовый лес' THEN 'Eucalyptus forest'
    WHEN equipment_ru = 'Бамбуковый лес' THEN 'Bamboo forest'
    WHEN equipment_ru = 'Пальмовый лес' THEN 'Palm forest'
    WHEN equipment_ru = 'Кокосовый лес' THEN 'Coconut forest'
    WHEN equipment_ru = 'Финиковый лес' THEN 'Date forest'
    WHEN equipment_ru = 'Оливковый лес' THEN 'Olive forest'
    WHEN equipment_ru = 'Цитрусовый лес' THEN 'Citrus forest'
    WHEN equipment_ru = 'Яблоневый лес' THEN 'Apple forest'
    WHEN equipment_ru = 'Грушевый лес' THEN 'Pear forest'
    WHEN equipment_ru = 'Сливовый лес' THEN 'Plum forest'
    WHEN equipment_ru = 'Вишневый лес' THEN 'Cherry forest'
    WHEN equipment_ru = 'Черешневый лес' THEN 'Sweet cherry forest'
    WHEN equipment_ru = 'Абрикосовый лес' THEN 'Apricot forest'
    WHEN equipment_ru = 'Персиковый лес' THEN 'Peach forest'
    WHEN equipment_ru = 'Нектариновый лес' THEN 'Nectarine forest'
    WHEN equipment_ru = 'Мандариновый лес' THEN 'Mandarin forest'
    WHEN equipment_ru = 'Апельсиновый лес' THEN 'Orange forest'
    WHEN equipment_ru = 'Лимонный лес' THEN 'Lemon forest'
    WHEN equipment_ru = 'Грейпфрутовый лес' THEN 'Grapefruit forest'
    WHEN equipment_ru = 'Помело лес' THEN 'Pomelo forest'
    WHEN equipment_ru = 'Лаймовый лес' THEN 'Lime forest'
    WHEN equipment_ru = 'Клементин лес' THEN 'Clementine forest'
    WHEN equipment_ru = 'Танжерин лес' THEN 'Tangerine forest'
    WHEN equipment_ru = 'Сатсума лес' THEN 'Satsuma forest'
    WHEN equipment_ru = 'Кумкват лес' THEN 'Kumquat forest'
    WHEN equipment_ru = 'Бергамот лес' THEN 'Bergamot forest'
    WHEN equipment_ru = 'Цедрат лес' THEN 'Cedrat forest'
    WHEN equipment_ru = 'Померанец лес' THEN 'Bitter orange forest'
    WHEN equipment_ru = 'Бигарадия лес' THEN 'Bigaradia forest'
    WHEN equipment_ru = 'Чинотто лес' THEN 'Chinotto forest'
    WHEN equipment_ru = 'Мирт лес' THEN 'Myrtle forest'
    WHEN equipment_ru = 'Лавр лес' THEN 'Bay forest'
    WHEN equipment_ru = 'Розмарин лес' THEN 'Rosemary forest'
    WHEN equipment_ru = 'Тимьян лес' THEN 'Thyme forest'
    WHEN equipment_ru = 'Орегано лес' THEN 'Oregano forest'
    WHEN equipment_ru = 'Базилик лес' THEN 'Basil forest'
    WHEN equipment_ru = 'Мята лес' THEN 'Mint forest'
    WHEN equipment_ru = 'Мелисса лес' THEN 'Melissa forest'
    WHEN equipment_ru = 'Лаванда лес' THEN 'Lavender forest'
    WHEN equipment_ru = 'Шалфей лес' THEN 'Sage forest'
    WHEN equipment_ru = 'Розмарин лес' THEN 'Rosemary forest'
    WHEN equipment_ru = 'Тимьян лес' THEN 'Thyme forest'
    WHEN equipment_ru = 'Орегано лес' THEN 'Oregano forest'
    WHEN equipment_ru = 'Базилик лес' THEN 'Basil forest'
    WHEN equipment_ru = 'Мята лес' THEN 'Mint forest'
    WHEN equipment_ru = 'Мелисса лес' THEN 'Melissa forest'
    WHEN equipment_ru = 'Лаванда лес' THEN 'Lavender forest'
    WHEN equipment_ru = 'Шалфей лес' THEN 'Sage forest'
    ELSE equipment_ru
  END
WHERE equipment_en IS NULL OR equipment_en = equipment_ru;

-- Обновляем calories для всех упражнений
UPDATE exercises SET 
  calories_en = CASE 
    WHEN calories_ru LIKE '%ккал%' THEN REPLACE(calories_ru, 'ккал', 'kcal')
    WHEN calories_ru LIKE '%калорий%' THEN REPLACE(calories_ru, 'калорий', 'calories')
    WHEN calories_ru LIKE '%ккал за тренировку%' THEN REPLACE(calories_ru, 'ккал за тренировку', 'kcal per workout')
    WHEN calories_ru LIKE '%ккал за занятие%' THEN REPLACE(calories_ru, 'ккал за занятие', 'kcal per session')
    WHEN calories_ru LIKE '%ккал в час%' THEN REPLACE(calories_ru, 'ккал в час', 'kcal per hour')
    WHEN calories_ru LIKE '%ккал в минуту%' THEN REPLACE(calories_ru, 'ккал в минуту', 'kcal per minute')
    WHEN calories_ru LIKE '%ккал в секунду%' THEN REPLACE(calories_ru, 'ккал в секунду', 'kcal per second')
    WHEN calories_ru LIKE '%ккал в день%' THEN REPLACE(calories_ru, 'ккал в день', 'kcal per day')
    WHEN calories_ru LIKE '%ккал в неделю%' THEN REPLACE(calories_ru, 'ккал в неделю', 'kcal per week')
    WHEN calories_ru LIKE '%ккал в месяц%' THEN REPLACE(calories_ru, 'ккал в месяц', 'kcal per month')
    WHEN calories_ru LIKE '%ккал в год%' THEN REPLACE(calories_ru, 'ккал в год', 'kcal per year')
    WHEN calories_ru LIKE '%ккал за раз%' THEN REPLACE(calories_ru, 'ккал за раз', 'kcal per time')
    WHEN calories_ru LIKE '%ккал за подход%' THEN REPLACE(calories_ru, 'ккал за подход', 'kcal per set')
    WHEN calories_ru LIKE '%ккал за повторение%' THEN REPLACE(calories_ru, 'ккал за повторение', 'kcal per repetition')
    WHEN calories_ru LIKE '%ккал за упражнение%' THEN REPLACE(calories_ru, 'ккал за упражнение', 'kcal per exercise')
    WHEN calories_ru LIKE '%ккал за тренировку%' THEN REPLACE(calories_ru, 'ккал за тренировку', 'kcal per workout')
    WHEN calories_ru LIKE '%ккал за занятие%' THEN REPLACE(calories_ru, 'ккал за занятие', 'kcal per session')
    WHEN calories_ru LIKE '%ккал за урок%' THEN REPLACE(calories_ru, 'ккал за урок', 'kcal per lesson')
    WHEN calories_ru LIKE '%ккал за класс%' THEN REPLACE(calories_ru, 'ккал за класс', 'kcal per class')
    WHEN calories_ru LIKE '%ккал за группу%' THEN REPLACE(calories_ru, 'ккал за группу', 'kcal per group')
    WHEN calories_ru LIKE '%ккал за команду%' THEN REPLACE(calories_ru, 'ккал за команду', 'kcal per team')
    WHEN calories_ru LIKE '%ккал за соревнование%' THEN REPLACE(calories_ru, 'ккал за соревнование', 'kcal per competition')
    WHEN calories_ru LIKE '%ккал за матч%' THEN REPLACE(calories_ru, 'ккал за матч', 'kcal per match')
    WHEN calories_ru LIKE '%ккал за игру%' THEN REPLACE(calories_ru, 'ккал за игру', 'kcal per game')
    WHEN calories_ru LIKE '%ккал за турнир%' THEN REPLACE(calories_ru, 'ккал за турнир', 'kcal per tournament')
    WHEN calories_ru LIKE '%ккал за чемпионат%' THEN REPLACE(calories_ru, 'ккал за чемпионат', 'kcal per championship')
    WHEN calories_ru LIKE '%ккал за кубок%' THEN REPLACE(calories_ru, 'ккал за кубок', 'kcal per cup')
    WHEN calories_ru LIKE '%ккал за приз%' THEN REPLACE(calories_ru, 'ккал за приз', 'kcal per prize')
    WHEN calories_ru LIKE '%ккал за награду%' THEN REPLACE(calories_ru, 'ккал за награду', 'kcal per award')
    WHEN calories_ru LIKE '%ккал за медаль%' THEN REPLACE(calories_ru, 'ккал за медаль', 'kcal per medal')
    WHEN calories_ru LIKE '%ккал за кубок%' THEN REPLACE(calories_ru, 'ккал за кубок', 'kcal per cup')
    WHEN calories_ru LIKE '%ккал за трофей%' THEN REPLACE(calories_ru, 'ккал за трофей', 'kcal per trophy')
    WHEN calories_ru LIKE '%ккал за диплом%' THEN REPLACE(calories_ru, 'ккал за диплом', 'kcal per diploma')
    WHEN calories_ru LIKE '%ккал за сертификат%' THEN REPLACE(calories_ru, 'ккал за сертификат', 'kcal per certificate')
    WHEN calories_ru LIKE '%ккал за грамоту%' THEN REPLACE(calories_ru, 'ккал за грамоту', 'kcal per certificate')
    WHEN calories_ru LIKE '%ккал за благодарность%' THEN REPLACE(calories_ru, 'ккал за благодарность', 'kcal per gratitude')
    WHEN calories_ru LIKE '%ккал за признание%' THEN REPLACE(calories_ru, 'ккал за признание', 'kcal per recognition')
    WHEN calories_ru LIKE '%ккал за уважение%' THEN REPLACE(calories_ru, 'ккал за уважение', 'kcal per respect')
    WHEN calories_ru LIKE '%ккал за почет%' THEN REPLACE(calories_ru, 'ккал за почет', 'kcal per honor')
    WHEN calories_ru LIKE '%ккал за славу%' THEN REPLACE(calories_ru, 'ккал за славу', 'kcal per glory')
    WHEN calories_ru LIKE '%ккал за известность%' THEN REPLACE(calories_ru, 'ккал за известность', 'kcal per fame')
    WHEN calories_ru LIKE '%ккал за популярность%' THEN REPLACE(calories_ru, 'ккал за популярность', 'kcal per popularity')
    WHEN calories_ru LIKE '%ккал за успех%' THEN REPLACE(calories_ru, 'ккал за успех', 'kcal per success')
    WHEN calories_ru LIKE '%ккал за достижение%' THEN REPLACE(calories_ru, 'ккал за достижение', 'kcal per achievement')
    WHEN calories_ru LIKE '%ккал за победу%' THEN REPLACE(calories_ru, 'ккал за победу', 'kcal per victory')
    WHEN calories_ru LIKE '%ккал за триумф%' THEN REPLACE(calories_ru, 'ккал за триумф', 'kcal per triumph')
    WHEN calories_ru LIKE '%ккал за завоевание%' THEN REPLACE(calories_ru, 'ккал за завоевание', 'kcal per conquest')
    WHEN calories_ru LIKE '%ккал за покорение%' THEN REPLACE(calories_ru, 'ккал за покорение', 'kcal per conquest')
    WHEN calories_ru LIKE '%ккал за освоение%' THEN REPLACE(calories_ru, 'ккал за освоение', 'kcal per development')
    WHEN calories_ru LIKE '%ккал за изучение%' THEN REPLACE(calories_ru, 'ккал за изучение', 'kcal per study')
    WHEN calories_ru LIKE '%ккал за исследование%' THEN REPLACE(calories_ru, 'ккал за исследование', 'kcal per research')
    WHEN calories_ru LIKE '%ккал за анализ%' THEN REPLACE(calories_ru, 'ккал за анализ', 'kcal per analysis')
    WHEN calories_ru LIKE '%ккал за синтез%' THEN REPLACE(calories_ru, 'ккал за синтез', 'kcal per synthesis')
    WHEN calories_ru LIKE '%ккал за дедукцию%' THEN REPLACE(calories_ru, 'ккал за дедукцию', 'kcal per deduction')
    WHEN calories_ru LIKE '%ккал за индукцию%' THEN REPLACE(calories_ru, 'ккал за индукцию', 'kcal per induction')
    WHEN calories_ru LIKE '%ккал за абдукцию%' THEN REPLACE(calories_ru, 'ккал за абдукцию', 'kcal per abduction')
    WHEN calories_ru LIKE '%ккал за аддукцию%' THEN REPLACE(calories_ru, 'ккал за аддукцию', 'kcal per adduction')
    WHEN calories_ru LIKE '%ккал за флексию%' THEN REPLACE(calories_ru, 'ккал за флексию', 'kcal per flexion')
    WHEN calories_ru LIKE '%ккал за экстензию%' THEN REPLACE(calories_ru, 'ккал за экстензию', 'kcal per extension')
    WHEN calories_ru LIKE '%ккал за ротацию%' THEN REPLACE(calories_ru, 'ккал за ротацию', 'kcal per rotation')
    WHEN calories_ru LIKE '%ккал за супинацию%' THEN REPLACE(calories_ru, 'ккал за супинацию', 'kcal per supination')
    WHEN calories_ru LIKE '%ккал за пронацию%' THEN REPLACE(calories_ru, 'ккал за пронацию', 'kcal per pronation')
    WHEN calories_ru LIKE '%ккал за циркумдукцию%' THEN REPLACE(calories_ru, 'ккал за циркумдукцию', 'kcal per circumduction')
    WHEN calories_ru LIKE '%ккал за эверсию%' THEN REPLACE(calories_ru, 'ккал за эверсию', 'kcal per eversion')
    WHEN calories_ru LIKE '%ккал за инверсию%' THEN REPLACE(calories_ru, 'ккал за инверсию', 'kcal per inversion')
    WHEN calories_ru LIKE '%ккал за дорсифлексию%' THEN REPLACE(calories_ru, 'ккал за дорсифлексию', 'kcal per dorsiflexion')
    WHEN calories_ru LIKE '%ккал за плантарфлексию%' THEN REPLACE(calories_ru, 'ккал за плантарфлексию', 'kcal per plantarflexion')
    WHEN calories_ru LIKE '%ккал за абдукцию%' THEN REPLACE(calories_ru, 'ккал за абдукцию', 'kcal per abduction')
    WHEN calories_ru LIKE '%ккал за аддукцию%' THEN REPLACE(calories_ru, 'ккал за аддукцию', 'kcal per adduction')
    WHEN calories_ru LIKE '%ккал за флексию%' THEN REPLACE(calories_ru, 'ккал за флексию', 'kcal per flexion')
    WHEN calories_ru LIKE '%ккал за экстензию%' THEN REPLACE(calories_ru, 'ккал за экстензию', 'kcal per extension')
    WHEN calories_ru LIKE '%ккал за ротацию%' THEN REPLACE(calories_ru, 'ккал за ротацию', 'kcal per rotation')
    WHEN calories_ru LIKE '%ккал за супинацию%' THEN REPLACE(calories_ru, 'ккал за супинацию', 'kcal per supination')
    WHEN calories_ru LIKE '%ккал за пронацию%' THEN REPLACE(calories_ru, 'ккал за пронацию', 'kcal per pronation')
    WHEN calories_ru LIKE '%ккал за циркумдукцию%' THEN REPLACE(calories_ru, 'ккал за циркумдукцию', 'kcal per circumduction')
    WHEN calories_ru LIKE '%ккал за эверсию%' THEN REPLACE(calories_ru, 'ккал за эверсию', 'kcal per eversion')
    WHEN calories_ru LIKE '%ккал за инверсию%' THEN REPLACE(calories_ru, 'ккал за инверсию', 'kcal per inversion')
    WHEN calories_ru LIKE '%ккал за дорсифлексию%' THEN REPLACE(calories_ru, 'ккал за дорсифлексию', 'kcal per dorsiflexion')
    WHEN calories_ru LIKE '%ккал за плантарфлексию%' THEN REPLACE(calories_ru, 'ккал за плантарфлексию', 'kcal per plantarflexion')
    ELSE calories_ru
  END
WHERE calories_en IS NULL OR calories_en = calories_ru;
