// PARTE 1: Cambios al inicio del archivo app.js
// Reemplazar las líneas 1-13 con:

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