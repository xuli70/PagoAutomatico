# Configuración de Autenticación con Supabase (Corregido para UUID)

Este documento explica cómo configurar la autenticación usando la tabla de configuración de Supabase con claves UUID.

## Problema Identificado

La tabla `config` usa UUID como clave primaria, no enteros. El script SQL anterior fallaba con:
```
ERROR: column "id" is of type uuid but expression is of type integer
```

## Solución Corregida

### Paso 1: Configurar la Base de Datos

1. Ve al SQL Editor de Supabase: https://stik.axcsol.com/project/default/editor/53984
2. Ejecuta el script paso a paso:

```sql
-- 1. Agregar el campo app_password
ALTER TABLE config ADD COLUMN IF NOT EXISTS app_password TEXT;

-- 2. Verificar registros existentes
SELECT * FROM config LIMIT 5;
```

3. **Si hay registros existentes** (lo más probable), ejecuta:
```sql
UPDATE config SET app_password = 'tu-contraseña-segura' 
WHERE id = (SELECT id FROM config LIMIT 1);
```

4. **Si NO hay registros**, ejecuta:
```sql
INSERT INTO config (id, app_password) 
VALUES (gen_random_uuid(), 'tu-contraseña-segura');
```

5. **Verificar el resultado**:
```sql
SELECT id, app_password FROM config;
```

### Paso 2: Actualizar el Código JavaScript

Usa el código de `auth_supabase_integration_fixed.js` que:

1. **getPasswordFromConfig()** ahora usa `limit=1` en lugar de filtrar por `id=1`
2. **Maneja UUIDs correctamente** en las consultas
3. **Incluye fallback** a variables de entorno

### Paso 3: Modificar cargarConfiguracion()

En `app.js`, busca la función `cargarConfiguracion()` y asegúrate de que cuando carga la configuración desde Supabase, incluya:

```javascript
if (configData && configData.length > 0) {
    const config = configData[0];
    state.config = {
        ...state.config,
        appTitle: config.app_title || state.config.appTitle,
        adminCode: config.admin_code || state.config.adminCode,
        securityCode: config.security_code || state.config.securityCode,
        appPassword: config.app_password || null  // <-- AGREGAR ESTA LÍNEA
    };
}
```

## Verificación

Después de implementar:

1. La consulta SQL debe mostrar el registro con `app_password` configurado
2. La aplicación debe cargar la contraseña desde Supabase
3. El modal de autenticación debe aceptar la contraseña configurada
4. Ya no debe aparecer el error de "APP_PASSWORD no configurada"

## Cambiar la Contraseña

Para cambiar la contraseña más tarde:

```sql
UPDATE config SET app_password = 'nueva-contraseña' 
WHERE id = (SELECT id FROM config LIMIT 1);
```

## Estructura de la Tabla Config

La tabla `config` debería tener algo así:

| id (UUID) | app_title | admin_code | security_code | app_password |
|-----------|-----------|------------|---------------|-------------|
| uuid-123... | Sistema de Tickets | admin123 | 12 | tu-contraseña-segura |

Esto es consistente con cómo la aplicación maneja toda su configuración.