-- Шаг 1: Удалить "битые" записи из player_museum, где item_id ссылается на несуществующий item
DELETE FROM player_museum
WHERE item_id NOT IN (SELECT id FROM items);

-- Шаг 2: Проверить текущий foreign key constraint
-- (Этот запрос просто для информации, не выполняется автоматически)
-- SELECT conname, conrelid::regclass, confrelid::regclass, confdeltype
-- FROM pg_constraint
-- WHERE contype = 'f' AND conrelid = 'player_museum'::regclass;

-- Шаг 3: Удалить старый foreign key constraint (если он есть)
ALTER TABLE player_museum
DROP CONSTRAINT IF EXISTS player_museum_item_id_fkey;

-- Шаг 4: Добавить новый foreign key constraint с CASCADE DELETE
ALTER TABLE player_museum
ADD CONSTRAINT player_museum_item_id_fkey
FOREIGN KEY (item_id)
REFERENCES items(id)
ON DELETE CASCADE;

-- Теперь при удалении item из таблицы items, 
-- автоматически удалятся все связанные записи из player_museum

-- Комментарий для информации
COMMENT ON CONSTRAINT player_museum_item_id_fkey ON player_museum IS 
'Foreign key with cascade delete: when an item is deleted, all museum entries referencing it are also deleted';



