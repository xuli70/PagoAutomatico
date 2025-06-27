-- Script para agregar autenticación a la tabla de configuración de Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar el campo app_password a la tabla config
-- (Asegúrate de que la tabla config existe primero)
ALTER TABLE config ADD COLUMN IF NOT EXISTS app_password TEXT;

-- 2. Insertar/actualizar la configuración de autenticación
-- Cambia 'tu-contraseña-segura' por la contraseña que desees
INSERT INTO config (id, app_password) 
VALUES (1, 'tu-contraseña-segura')
ON CONFLICT (id) 
DO UPDATE SET app_password = EXCLUDED.app_password;

-- 3. Verificar que se insertó correctamente
SELECT id, app_password FROM config WHERE id = 1;

-- Nota: Si quieres cambiar la contraseña más tarde, simplemente ejecuta:
-- UPDATE config SET app_password = 'nueva-contraseña' WHERE id = 1;