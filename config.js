// Configuración de Supabase y Stripe
const SUPABASE_CONFIG = {
    // URL base de Supabase - viene de las variables de entorno
    url: window.ENV?.SUPABASE_URL || 'https://configurar-en-coolify',
    
    // Anon Key - viene de las variables de entorno
    anonKey: window.ENV?.SUPABASE_ANON_KEY || 'configurar-en-coolify',
    
    // Headers para las peticiones
    headers: {
        'apikey': window.ENV?.SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${window.ENV?.SUPABASE_ANON_KEY || ''}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
};

// Configuración de Stripe
const STRIPE_CONFIG = {
    // Public Key de Stripe - viene de las variables de entorno
    publicKey: window.ENV?.STRIPE_PUBLIC_KEY || 'pk_test_configurar-en-coolify',
    
    // Configuración de la sesión de pago
    sessionConfig: {
        mode: 'payment',
        payment_method_types: ['card'],
        locale: 'es',
        submit_type: 'pay'
    }
};

// Configuración de la aplicación
const APP_CONFIG = {
    // Código admin por defecto (cambiar en el panel)
    adminCode: '9999',
    
    // Código de seguridad del personal por defecto
    securityCode: '23',
    
    // Prefijo para los códigos de pedido
    orderPrefix: 'PED',
    
    // Título por defecto
    appTitle: 'Sistema de Tickets',
    
    // Tickets por defecto
    defaultTickets: [
        { id: 1, name: 'Ticket1', price: 2, active: true },
        { id: 2, name: 'Ticket2', price: 3, active: true },
        { id: 3, name: 'Ticket3', price: 4, active: true },
        { id: 4, name: 'Ticket4', price: 5, active: true }
    ],
    
    // Personal por defecto
    defaultStaff: [
        { id: 1, name: 'Luis', color: 'green', active: true },
        { id: 2, name: 'Ana', color: 'blue', active: true },
        { id: 3, name: 'Carlos', color: 'purple', active: true }
    ],
    
    // Colores disponibles para el personal
    staffColors: [
        { value: 'green', label: 'Verde' },
        { value: 'blue', label: 'Azul' },
        { value: 'purple', label: 'Morado' },
        { value: 'orange', label: 'Naranja' },
        { value: 'pink', label: 'Rosa' },
        { value: 'indigo', label: 'Índigo' }
    ]
};

// Validar configuración al cargar
if (!window.ENV?.SUPABASE_URL || !window.ENV?.SUPABASE_ANON_KEY) {
    console.error('⚠️ Supabase no configurado. Configura las variables en Coolify.');
}

if (!window.ENV?.STRIPE_PUBLIC_KEY) {
    console.error('⚠️ Stripe no configurado. Configura la clave pública en Coolify.');
}

// Helper para construir URLs de Supabase
function getSupabaseUrl(endpoint) {
    return `${SUPABASE_CONFIG.url}/rest/v1/${endpoint}`;
}

// Helper para obtener headers de Supabase
function getSupabaseHeaders() {
    return SUPABASE_CONFIG.headers;
}