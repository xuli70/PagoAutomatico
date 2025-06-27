// Modificaciones necesarias para app.js
// Estas funciones deben reemplazar las funciones de autenticación existentes

// === FUNCIONES DE AUTENTICACIÓN CON SUPABASE ===

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

// Validar contraseña usando configuración de Supabase
async function validatePassword() {
    const appPassword = document.getElementById('appPassword');
    const authError = document.getElementById('authError');
    const authModal = document.getElementById('authModal');
    
    const enteredPassword = appPassword.value;
    
    try {
        // Obtener la contraseña desde la configuración de Supabase
        const correctPassword = await getPasswordFromConfig();
        
        if (!correctPassword) {
            console.error('⚠️ APP_PASSWORD no configurada en Supabase');
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
    } catch (error) {
        console.error('Error al validar contraseña:', error);
        authError.textContent = 'Error al verificar la contraseña. Inténtelo de nuevo.';
        authError.style.display = 'block';
    }
}

// Obtener contraseña desde la configuración de Supabase
async function getPasswordFromConfig() {
    try {
        // Primero intentar desde la configuración de Supabase
        if (state.config && state.config.appPassword) {
            return state.config.appPassword;
        }
        
        // Si no está en el estado, cargar desde Supabase
        const response = await fetch(getSupabaseUrl('config?select=app_password&id=eq.1'), {
            headers: getSupabaseHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0 && data[0].app_password) {
                return data[0].app_password;
            }
        }
        
        // Fallback a variable de entorno si no está en Supabase
        return window.ENV?.APP_PASSWORD;
        
    } catch (error) {
        console.error('Error obteniendo contraseña de configuración:', error);
        // Fallback a variable de entorno en caso de error
        return window.ENV?.APP_PASSWORD;
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

// Modificar la función cargarConfiguracion para incluir app_password
// Esta función debe ser actualizada en app.js para incluir app_password en la consulta
/*
Modificar esta línea en cargarConfiguracion():
const response = await fetch(getSupabaseUrl('config?select=*'), {

Para asegurarse de que incluya app_password:
const response = await fetch(getSupabaseUrl('config?select=*'), {
*/