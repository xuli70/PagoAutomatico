# Implementación de Autenticación en JavaScript

Este documento describe los cambios necesarios en `app.js` para completar la implementación de autenticación.

## Resumen de Cambios

1. **Agregar estado de autenticación** al objeto `state`
2. **Crear funciones de autenticación**:
   - `setupAuthentication()`
   - `validatePassword()`
   - `initializeApp()`
3. **Modificar la inicialización** en `DOMContentLoaded`
4. **Proteger el panel de administración** con verificación de autenticación

## Cambios Detallados

### 1. Modificar el objeto state (líneas 1-12)

Reemplazar el objeto `state` actual con:

```javascript
// Estado de la aplicación
let state = {
    tickets: [],
    staff: [],
    cart: {},
    activeOrder: null,
    config: { ...APP_CONFIG },
    stripe: null,
    checkoutSession: null,
    lastSync: null, // Para controlar sincronización
    authenticated: false // Estado de autenticación
};
```

### 2. Agregar funciones de autenticación (después del objeto state)

Insertar estas funciones después de la definición del objeto `state` (después de la línea 12):

```javascript
// === FUNCIONES DE AUTENTICACIÓN ===

// Configurar autenticación
function setupAuthentication() {
    const authModal = document.getElementById('authModal');
    const authSubmit = document.getElementById('authSubmit');
    const appPassword = document.getElementById('appPassword');
    const authError = document.getElementById('authError');
    
    // Verificar si ya está autenticado (sesión guardada)
    const sessionAuth = sessionStorage.getItem('app_authenticated');
    if (sessionAuth === 'true') {
        state.authenticated = true;
        authModal.classList.remove('active');
        initializeApp();
        return;
    }
    
    // Manejar submit con Enter
    appPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            validatePassword();
        }
    });
    
    // Manejar click en botón
    authSubmit.addEventListener('click', validatePassword);
}

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

// Inicializar aplicación después de autenticación
async function initializeApp() {
    // Mostrar la vista principal
    document.getElementById('mainView').classList.add('active');
    
    // Inicializar Stripe
    if (window.ENV?.STRIPE_PUBLIC_KEY) {
        state.stripe = Stripe(window.ENV.STRIPE_PUBLIC_KEY);
        console.log('✅ Stripe inicializado');
    } else {
        console.error('⚠️ STRIPE_PUBLIC_KEY no configurada');
    }
    
    // Cargar configuración desde localStorage o Supabase
    await cargarConfiguracion();
    
    // Renderizar interfaz
    renderizarTickets();
    actualizarCarrito();
    
    // Verificar si hay pedido activo
    verificarPedidoActivo();
    
    // Configurar sincronización automática cada 30 segundos
    setInterval(sincronizarConSupabase, 30000);
}
```

### 3. Modificar la inicialización (líneas 14-37)

Reemplazar el event listener `DOMContentLoaded` actual con:

```javascript
// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    // Configurar autenticación
    setupAuthentication();
});
```

### 4. Proteger el panel de administración

Buscar la función `mostrarPanelAdmin()` (aproximadamente línea 958) y reemplazarla con:

```javascript
function mostrarPanelAdmin() {
    // Verificar autenticación antes de mostrar panel admin
    if (!state.authenticated) {
        console.error("Acceso denegado: No autenticado");
        return;
    }
    document.getElementById('mainView').classList.remove('active');
    document.getElementById('adminView').classList.add('active');
    
    // Cargar configuración actual
    cargarConfigAdmin();
    cargarEstadisticas();
}
```

## Verificación de la Implementación

1. Al cargar la aplicación, debe aparecer el modal de autenticación
2. Solo se puede acceder a la aplicación con la contraseña correcta (APP_PASSWORD)
3. La sesión se mantiene mientras el navegador esté abierto (sessionStorage)
4. El panel de administración está protegido y requiere autenticación

## Notas Importantes

- La contraseña se configura en Coolify mediante la variable de entorno `APP_PASSWORD`
- Si no se configura `APP_PASSWORD`, se mostrará un error de configuración
- La autenticación usa `sessionStorage`, por lo que la sesión se pierde al cerrar el navegador
- No se almacena ninguna credencial en el código fuente