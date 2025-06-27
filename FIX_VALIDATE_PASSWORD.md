# Fix para validatePassword - Usar Supabase config en lugar de ENV

## Problema identificado
La función `validatePassword` está intentando usar `window.ENV.APP_PASSWORD` que no existe, cuando debería usar `state.config.app_password` que se carga desde Supabase.

## Fragmento a reemplazar en app.js

**Buscar la función `validatePassword` (aproximadamente líneas 40-65):**

```javascript
// Validar contraseña
async function validatePassword() {
    const appPassword = document.getElementById('appPassword');
    const authError = document.getElementById('authError');
    const authModal = document.getElementById('authModal');
    
    const enteredPassword = appPassword.value;
    const correctPassword = window.ENV?.APP_PASSWORD;
    
    if (!correctPassword) {
        console.error('⚠️ APP_PASSWORD no configurada en las variables de entorno');
        authError.textContent = 'Error de configuración. Contacte al administrador.';
        authError.style.display = 'block';
        return;
    }
    
    if (enteredPassword === correctPassword) {
        // Contraseña correcta
        state.authenticated = true;
        sessionStorage.setItem('app_authenticated', 'true');
        authModal.classList.remove('active');
        authError.style.display = 'none';
        appPassword.value = '';
        initializeApp();
    } else {
        // Contraseña incorrecta
        authError.textContent = 'Contraseña incorrecta';
        authError.style.display = 'block';
        appPassword.value = '';
        appPassword.focus();
    }
}
```

**Reemplazar por:**

```javascript
// Validar contraseña
async function validatePassword() {
    const appPassword = document.getElementById('appPassword');
    const authError = document.getElementById('authError');
    const authModal = document.getElementById('authModal');
    
    const enteredPassword = appPassword.value;
    
    // CAMBIO: Usar state.config.app_password en lugar de window.ENV.APP_PASSWORD
    const correctPassword = state.config?.app_password;
    
    if (!correctPassword) {
        console.error('⚠️ APP_PASSWORD no configurada en Supabase config');
        authError.textContent = 'Error de configuración. Contacte al administrador.';
        authError.style.display = 'block';
        return;
    }
    
    if (enteredPassword === correctPassword) {
        // Contraseña correcta
        state.authenticated = true;
        sessionStorage.setItem('app_authenticated', 'true');
        authModal.classList.remove('active');
        authError.style.display = 'none';
        appPassword.value = '';
        initializeApp();
        console.log('✅ Autenticación exitosa');
    } else {
        // Contraseña incorrecta
        authError.textContent = 'Contraseña incorrecta';
        authError.style.display = 'block';
        appPassword.value = '';
        appPassword.focus();
    }
}
```

## Cambios principales:
1. **Línea cambiada**: `const correctPassword = window.ENV?.APP_PASSWORD;` → `const correctPassword = state.config?.app_password;`
2. **Mensaje de error actualizado**: Para reflejar que usa Supabase config
3. **Log de éxito añadido**: Para confirmar autenticación exitosa

## SQL ejecutado en Supabase:
```sql
ALTER TABLE config ADD COLUMN IF NOT EXISTS app_password TEXT;
UPDATE config SET app_password = 'admin123' WHERE id IS NOT NULL;
```

## Prueba después del cambio:
1. Recargar la página
2. Introducir contraseña: `admin123`
3. Verificar que muestra `✅ Autenticación exitosa`
4. Verificar que desaparece el modal y aparece la aplicación