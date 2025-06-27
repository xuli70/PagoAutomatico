# Configuración de Autenticación con Supabase

Este documento explica cómo configurar la autenticación usando la tabla de configuración de Supabase en lugar de solo variables de entorno.

## Problema Identificado

La aplicación usa Supabase para gestionar la configuración (tabla `config`), pero el sistema de autenticación estaba intentando usar solo variables de entorno. Esto causa el error:

```
⚠️ APP_PASSWORD no configurada en las variables de entorno
```

## Solución

### Paso 1: Configurar la Base de Datos

1. Ve al SQL Editor de Supabase: https://stik.axcsol.com/project/default/editor/53984
2. Ejecuta el script `supabase_auth_setup.sql`:

```sql
-- Agregar el campo app_password a la tabla config
ALTER TABLE config ADD COLUMN IF NOT EXISTS app_password TEXT;

-- Insertar la contraseña (cambia 'tu-contraseña-segura' por la que desees)
INSERT INTO config (id, app_password) 
VALUES (1, 'tu-contraseña-segura')
ON CONFLICT (id) 
DO UPDATE SET app_password = EXCLUDED.app_password;

-- Verificar
SELECT id, app_password FROM config WHERE id = 1;
```

### Paso 2: Actualizar el Código JavaScript

Reemplazar las funciones de autenticación en `app.js` con el código de `auth_supabase_integration.js`.

Los cambios principales son:

1. **validatePassword()** ahora llama a `getPasswordFromConfig()`
2. **getPasswordFromConfig()** busca la contraseña en:
   - Primero: `state.config.appPassword` (configuración cargada)
   - Segundo: Consulta directa a Supabase `config` table
   - Tercero: Fallback a `window.ENV.APP_PASSWORD`

3. **cargarConfiguracion()** debe incluir `app_password` en la consulta SELECT

### Paso 3: Modificaciones Específicas

#### En la función cargarConfiguracion()
Asegúrate de que la consulta incluya el campo `app_password`:

```javascript
// Buscar esta línea:
const response = await fetch(getSupabaseUrl('config?select=*'), {

// Y asegurarse de que incluya app_password en los campos seleccionados
```

#### En el objeto state
Agregar el campo `appPassword` al estado de configuración cuando se carga desde Supabase.

## Ventajas de este Enfoque

1. **Consistencia**: Usa el mismo sistema de configuración que el resto de la aplicación
2. **Flexibilidad**: Permite cambiar la contraseña desde el panel de admin
3. **Fallback**: Si falla Supabase, usa la variable de entorno como respaldo
4. **Seguridad**: La contraseña está en la base de datos, no en el código

## Cambiar la Contraseña

Para cambiar la contraseña más tarde:

```sql
UPDATE config SET app_password = 'nueva-contraseña' WHERE id = 1;
```

O implementar un campo en el panel de administración para cambiarla desde la interfaz.

## Verificación

Después de implementar:

1. La aplicación debe mostrar el modal de autenticación
2. Debe aceptar la contraseña configurada en Supabase
3. Los logs deben mostrar que la configuración se carga correctamente
4. Ya no debe aparecer el error de "APP_PASSWORD no configurada"