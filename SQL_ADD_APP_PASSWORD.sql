-- Script SQL para agregar el campo app_password a la tabla config
-- Ejecutar en Supabase SQL Editor: https://stik.axcsol.com/project/default/editor/53984

-- 1. Agregar la columna app_password a la tabla config
ALTER TABLE config 
ADD COLUMN IF NOT EXISTS app_password TEXT;

-- 2. Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'config' 
AND column_name = 'app_password';

-- 3. (Opcional) Ver la estructura actual de la tabla config
SELECT * FROM config LIMIT 1;

-- 4. (Opcional) Insertar un valor por defecto si no existe configuración
-- NOTA: Solo ejecutar si no hay registros en la tabla config
INSERT INTO config (id, app_password) 
SELECT gen_random_uuid(), 'default_password_123'
WHERE NOT EXISTS (SELECT 1 FROM config LIMIT 1);

-- 5. Verificar el contenido final
SELECT id, app_password FROM config LIMIT 5;