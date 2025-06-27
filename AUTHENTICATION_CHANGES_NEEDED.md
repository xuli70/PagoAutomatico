# Cambios necesarios en app.js para completar la autenticación

## Problema identificado
El PR #2 se mergeó pero solo incluyó `.env.example`. Los cambios en `app.js` no se aplicaron.

## Cambios específicos requeridos en app.js:

### 1. Modificar el estado inicial (línea ~10)
```javascript
// CAMBIAR ESTO:
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

// POR ESTO:
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

### 2. Reemplazar la inicialización (líneas ~13-36)
```javascript
// ELIMINAR TODO ESTE BLOQUE:
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

// Y AÑADIR ESTAS FUNCIONES:
```

### 3. Añadir las funciones de autenticación DESPUÉS del estado:
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

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    // Configurar autenticación
    setupAuthentication();
});
```

### 4. Modificar el acceso al panel admin (línea ~898)
```javascript
// CAMBIAR ESTO:
if (e.target.value === state.config.adminCode) {

// POR ESTO:
if (e.target.value === state.config.adminCode && state.authenticated) {
```

### 5. Proteger la función mostrarPanelAdmin()
```javascript
// CAMBIAR ESTO:
function mostrarPanelAdmin() {
    document.getElementById('mainView').classList.remove('active');
    document.getElementById('adminView').classList.add('active');
    
    // Cargar configuración actual
    cargarConfigAdmin();
    cargarEstadisticas();
}

// POR ESTO:
function mostrarPanelAdmin() {
    // Verificar autenticación antes de mostrar panel admin
    if (!state.authenticated) {
        console.error('Acceso denegado: No autenticado');
        return;
    }
    
    document.getElementById('mainView').classList.remove('active');
    document.getElementById('adminView').classList.add('active');
    
    // Cargar configuración actual
    cargarConfigAdmin();
    cargarEstadisticas();
}
```

## Resultado esperado
Una vez aplicados estos cambios, la aplicación:
1. ✅ Mostrará el modal de autenticación al cargar
2. ✅ Validará la contraseña contra `APP_PASSWORD`
3. ✅ Solo permitirá acceso después de autenticación correcta
4. ✅ Protegerá el panel de administración
5. ✅ Mantendrá la sesión durante la navegación