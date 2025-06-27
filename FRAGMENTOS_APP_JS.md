# Fragmentos de Código para app.js - Implementación de Autenticación

## Instrucciones
Los siguientes fragmentos deben reemplazar las secciones correspondientes en app.js. Cada fragmento indica dónde debe ubicarse.

## 1. Reemplazar el objeto `state` (líneas 1-12 aproximadamente)

**Buscar:**
```javascript
let state = {
    tickets: [],
    staff: [],
    cart: {},
    activeOrder: null,
    config: { ...APP_CONFIG },
    stripe: null,
    checkoutSession: null,
    lastSync: null // Para controlar sincronización
};
```

**Reemplazar por:**
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

## 2. Agregar funciones de autenticación (después del objeto state, línea 13 aproximadamente)

**Insertar después del objeto `state`:**
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

## 3. Reemplazar la inicialización DOMContentLoaded (líneas 14-37 aproximadamente)

**Buscar el bloque completo que comienza con:**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
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
});
```

**Reemplazar por:**
```javascript
// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    // Configurar autenticación
    setupAuthentication();
});
```

## 4. Modificar función mostrarPanelAdmin (buscar función que comience con "function mostrarPanelAdmin()")

**Buscar:**
```javascript
function mostrarPanelAdmin() {
    document.getElementById('mainView').classList.remove('active');
    document.getElementById('adminView').classList.add('active');
    
    // Cargar configuración actual
    cargarConfigAdmin();
    cargarEstadisticas();
}
```

**Reemplazar por:**
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

## 5. Modificar la validación del código admin (buscar la línea que contiene "state.config.adminCode")

**Buscar algo similar a:**
```javascript
if (e.target.value === state.config.adminCode) {
```

**Reemplazar por:**
```javascript
if (e.target.value === state.config.adminCode && state.authenticated) {
```

## Notas Importantes

1. **Orden de cambios**: Aplicar en el orden indicado (1, 2, 3, 4, 5)
2. **Verificación**: Después de aplicar todos los cambios, verificar que no hay errores de sintaxis
3. **Prueba**: Cargar la aplicación y verificar que aparece el modal de autenticación
4. **Sesión**: La autenticación se mantendrá durante la sesión del navegador

## Próximo paso
Después de aplicar estos cambios, necesitaremos:
1. Ejecutar el SQL para agregar app_password a la base de datos Supabase
2. Configurar la variable APP_PASSWORD en Coolify
3. Probar el flujo completo de autenticación