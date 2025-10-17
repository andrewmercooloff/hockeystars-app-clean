-- Создание нового bucket 'items' для хранения предметов звезд
-- Этот скрипт нужно выполнить в Supabase Dashboard -> Storage -> Buckets

-- 1. Создаем новый bucket 'items' (выполнить вручную в Dashboard)
-- Name: items
-- Public bucket: true
-- File size limit: 50MB
-- Allowed MIME types: image/*

-- 2. После создания bucket'а, применяем RLS политики
-- В Dashboard -> Storage -> Buckets -> items -> Policies

-- Policy 1: Allow public read access
-- Name: "Public read access"
-- Target roles: public
-- Using expression: true
-- Operation: SELECT

-- Policy 2: Allow authenticated users to insert
-- Name: "Authenticated users can insert"
-- Target roles: authenticated
-- Using expression: true
-- Operation: INSERT

-- Policy 3: Allow authenticated users to update their own files
-- Name: "Users can update their own files"
-- Target roles: authenticated
-- Using expression: bucket_id = 'items'
-- Operation: UPDATE

-- Policy 4: Allow authenticated users to delete their own files
-- Name: "Users can delete their own files"
-- Target roles: authenticated
-- Using expression: bucket_id = 'items'
-- Operation: DELETE

-- 3. Альтернативно, можно отключить RLS для bucket 'items' если используется custom auth
-- В Dashboard -> Storage -> Buckets -> items -> Settings -> Disable RLS

-- 4. Проверяем, что bucket создан и доступен
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE name = 'items';
