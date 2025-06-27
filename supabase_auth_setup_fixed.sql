-- Script corregido para agregar autenticación a la tabla de configuración de Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar el campo app_password a la tabla config
ALTER TABLE config ADD COLUMN IF NOT EXISTS app_password TEXT;

-- 2. Primero verificar si existe algún registro en la tabla config
SELECT * FROM config LIMIT 5;

-- 3. Si hay registros existentes, actualizar el primero:
-- (Ejecuta este comando después de ver los resultados del SELECT anterior)
-- UPDATE config SET app_password = 'tu-contraseña-segura' WHERE id = (SELECT id FROM config LIMIT 1);

-- 4. Si NO hay registros, insertar uno nuevo:
-- INSERT INTO config (id, app_password) VALUES (gen_random_uuid(), 'tu-contraseña-segura');

-- 5. Verificar el resultado
SELECT id, app_password FROM config;

-- INSTRUCCIONES:
-- 1. Ejecuta primero las líneas 1-8 (ALTER TABLE y SELECT)
-- 2. Si hay registros, ejecuta la línea UPDATE (descomentándola)
-- 3. Si NO hay registros, ejecuta la línea INSERT (descomentándola)
-- 4. Ejecuta la verificación final

-- Para cambiar la contraseña más tarde:
-- UPDATE config SET app_password = 'nueva-contraseña' WHERE id = (SELECT id FROM config LIMIT 1);