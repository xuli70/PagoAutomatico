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
    const correctPassword = state.config?.app_password;
    
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
// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    // Configurar autenticación
    setupAuthentication();
});

// === FUNCIONES DE SUPABASE ===

// Verificar conexión con Supabase
async function verificarConexionSupabase() {
    try {
        const response = await fetch(getSupabaseUrl('config?select=id&limit=1'), {
            headers: getSupabaseHeaders()
        });
        return response.ok;
    } catch (error) {
        console.error('Error verificando conexión:', error);
        return false;
    }
}

// Función de diagnóstico para verificar la conexión
async function diagnosticarConexionSupabase() {
    console.log('🔍 Diagnosticando conexión con Supabase...');
    
    try {
        // 1. Verificar URL y headers
        console.log('URL base:', SUPABASE_CONFIG.url);
        console.log('Headers:', getSupabaseHeaders());
        
        // 2. Intentar leer la tabla staff
        const response = await fetch(getSupabaseUrl('staff'), {
            headers: getSupabaseHeaders()
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Conexión exitosa. Datos actuales:', data);
        } else {
            const error = await response.text();
            console.error('❌ Error en la respuesta:', error);
        }
        
        // 3. Intentar insertar un registro de prueba
        const testStaff = {
            id: 999,
            name: 'Test',
            color: 'blue',
            active: false
        };
        
        const insertResponse = await fetch(getSupabaseUrl('staff'), {
            method: 'POST',
            headers: getSupabaseHeaders(),
            body: JSON.stringify(testStaff)
        });
        
        if (insertResponse.ok) {
            console.log('✅ Inserción de prueba exitosa');
            
            // Eliminar el registro de prueba
            await fetch(getSupabaseUrl('staff?id=eq.999'), {
                method: 'DELETE',
                headers: getSupabaseHeaders()
            });
            console.log('✅ Eliminación de prueba exitosa');
        } else {
            const error = await insertResponse.text();
            console.error('❌ Error en inserción de prueba:', error);
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:', error);
    }
}

// Sincronización principal
async function sincronizarConSupabase() {
    const hayConexion = await verificarConexionSupabase();
    
    if (hayConexion) {
        console.log('🔄 Sincronizando con Supabase...');
        await cargarDesdeSupabase();
        state.lastSync = Date.now();
    } else {
        console.log('📴 Sin conexión a Supabase, usando localStorage');
    }
}

// Cargar configuración
async function cargarConfiguracion() {
    try {
        // Intentar cargar desde Supabase primero
        const hayConexion = await verificarConexionSupabase();
        
        if (hayConexion) {
            await cargarDesdeSupabase();
        } else {
            // Cargar desde localStorage como fallback
            cargarDesdeLocalStorage();
        }
        
        // Aplicar configuración
        document.getElementById('appTitle').textContent = state.config.appTitle;
        
    } catch (error) {
        console.error('Error cargando configuración:', error);
        cargarDesdeLocalStorage();
    }
}

// Cargar desde Supabase
async function cargarDesdeSupabase() {
    try {
        // Cargar configuración
        const configResponse = await fetch(getSupabaseUrl('config'), {
            headers: getSupabaseHeaders()
        });
        
        if (configResponse.ok) {
            const configData = await configResponse.json();
            const configObj = {};
            configData.forEach(item => {
                configObj[item.key] = item.value;
            });
            
            if (Object.keys(configObj).length > 0) {
                state.config = { ...state.config, ...configObj };
                localStorage.setItem('app_config', JSON.stringify(state.config));
            }
        }
        
        // Cargar tickets
        const ticketsResponse = await fetch(getSupabaseUrl('tickets?order=id'), {
            headers: getSupabaseHeaders()
        });
        
        if (ticketsResponse.ok) {
            const ticketsData = await ticketsResponse.json();
            if (ticketsData.length > 0) {
                state.tickets = ticketsData.map(t => ({
                    ...t,
                    price: parseFloat(t.price)
                }));
                localStorage.setItem('app_tickets', JSON.stringify(state.tickets));
            }
        }
        
        // Cargar personal
        const staffResponse = await fetch(getSupabaseUrl('staff?order=id'), {
            headers: getSupabaseHeaders()
        });
        
        if (staffResponse.ok) {
            const staffData = await staffResponse.json();
            if (staffData.length > 0) {
                state.staff = staffData;
                localStorage.setItem('app_staff', JSON.stringify(state.staff));
            }
        }
        
        console.log('✅ Datos cargados desde Supabase');
        
    } catch (error) {
        console.error('Error cargando desde Supabase:', error);
        cargarDesdeLocalStorage();
    }
}

// Cargar desde localStorage
function cargarDesdeLocalStorage() {
    const localConfig = localStorage.getItem('app_config');
    if (localConfig) {
        const saved = JSON.parse(localConfig);
        state.config = { ...state.config, ...saved };
    }
    
    const localTickets = localStorage.getItem('app_tickets');
    state.tickets = localTickets ? JSON.parse(localTickets) : state.config.defaultTickets;
    
    const localStaff = localStorage.getItem('app_staff');
    state.staff = localStaff ? JSON.parse(localStaff) : state.config.defaultStaff;
    
    console.log('📁 Datos cargados desde localStorage');
}

// Guardar configuración en Supabase
async function guardarConfigEnSupabase(key, value) {
    try {
        const response = await fetch(getSupabaseUrl('config'), {
            method: 'POST',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({
                key: key,
                value: value
            })
        });
        
        if (!response.ok) {
            // Si existe, actualizar
            const updateResponse = await fetch(getSupabaseUrl(`config?key=eq.${key}`), {
                method: 'PATCH',
                headers: getSupabaseHeaders(),
                body: JSON.stringify({
                    value: value
                })
            });
            
            if (!updateResponse.ok) throw new Error('Error actualizando config');
        }
        
        return true;
    } catch (error) {
        console.error('Error guardando config en Supabase:', error);
        return false;
    }
}

// Guardar tickets en Supabase
async function guardarTicketsEnSupabase() {
    try {
        console.log('🔄 Intentando guardar tickets en Supabase...');
        
        // Obtener tickets existentes
        const existingResponse = await fetch(getSupabaseUrl('tickets?select=id'), {
            headers: getSupabaseHeaders()
        });
        
        if (existingResponse.ok) {
            const existingTickets = await existingResponse.json();
            const existingIds = existingTickets.map(t => t.id);
            
            // Eliminar los que ya no están
            const idsToDelete = existingIds.filter(id => !state.tickets.find(t => t.id === id));
            
            if (idsToDelete.length > 0) {
                for (const id of idsToDelete) {
                    await fetch(getSupabaseUrl(`tickets?id=eq.${id}`), {
                        method: 'DELETE',
                        headers: getSupabaseHeaders()
                    });
                }
            }
        }
        
        // Usar UPSERT para cada ticket
        for (const ticket of state.tickets) {
            const response = await fetch(getSupabaseUrl('tickets'), {
                method: 'POST',
                headers: {
                    ...getSupabaseHeaders(),
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(ticket)
            });
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error guardando ticket:', ticket.name, error);
            }
        }
        
        console.log('✅ Tickets guardados en Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error guardando tickets en Supabase:', error);
        return false;
    }
}

// Guardar personal en Supabase
async function guardarPersonalEnSupabase() {
    try {
        console.log('🔄 Intentando guardar personal en Supabase...');
        
        // Primero, obtener todos los IDs existentes
        const existingResponse = await fetch(getSupabaseUrl('staff?select=id'), {
            headers: getSupabaseHeaders()
        });
        
        if (existingResponse.ok) {
            const existingStaff = await existingResponse.json();
            const existingIds = existingStaff.map(s => s.id);
            
            // Eliminar solo los que ya no están en state.staff
            const idsToDelete = existingIds.filter(id => !state.staff.find(s => s.id === id));
            
            if (idsToDelete.length > 0) {
                for (const id of idsToDelete) {
                    await fetch(getSupabaseUrl(`staff?id=eq.${id}`), {
                        method: 'DELETE',
                        headers: getSupabaseHeaders()
                    });
                }
            }
        }
        
        // Usar UPSERT para insertar o actualizar
        for (const staff of state.staff) {
            const response = await fetch(getSupabaseUrl('staff'), {
                method: 'POST',
                headers: {
                    ...getSupabaseHeaders(),
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(staff)
            });
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error guardando staff:', staff.name, error);
            }
        }
        
        console.log('✅ Personal guardado en Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error guardando personal en Supabase:', error);
        return false;
    }
}
// Crear pedido en Supabase
async function crearPedidoSupabase(orderData) {
    try {
        const response = await fetch(getSupabaseUrl('orders'), {
            method: 'POST',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({
                code: orderData.code,
                items: orderData.items,
                total: orderData.total,
                status: 'pending',
                created_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) throw new Error('Error creando pedido');
        
        const data = await response.json();
        return data[0];
    } catch (error) {
        console.error('Error con Supabase:', error);
        // Continuar aunque falle Supabase
        return orderData;
    }
}

// Validar pedido en Supabase
async function validarPedidoSupabase(orderId, staffName) {
    try {
        const response = await fetch(getSupabaseUrl(`orders?id=eq.${orderId}`), {
            method: 'PATCH',
            headers: getSupabaseHeaders(),
            body: JSON.stringify({
                status: 'validated',
                validated_at: new Date().toISOString(),
                validated_by: staffName
            })
        });
        
        if (!response.ok) throw new Error('Error validando pedido');
        
    } catch (error) {
        console.error('Error actualizando pedido:', error);
    }
}

// === FUNCIONES DE STRIPE ===

async function procesarPagoStripe() {
    if (!state.stripe) {
        alert('Stripe no está configurado');
        return;
    }
    
    mostrarLoading(true);
    
    try {
        // Preparar items para Stripe
        const lineItems = Object.entries(state.cart).map(([ticketId, quantity]) => {
            const ticket = state.tickets.find(t => t.id == ticketId);
            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: ticket.name,
                        description: `Ticket ${ticket.name}`
                    },
                    unit_amount: Math.round(ticket.price * 100) // Stripe usa centavos
                },
                quantity: quantity
            };
        });
        
        // Generar código de pedido
        const orderCode = generarCodigoPedido();
        const total = calcularTotal();
        
        // Crear pedido temporal
        const orderData = {
            code: orderCode,
            items: state.cart,
            total: total,
            timestamp: Date.now()
        };
        
        // Crear pedido en Supabase
        const pedidoCreado = await crearPedidoSupabase(orderData);
        orderData.id = pedidoCreado.id;
        
        // En un entorno real, deberías crear la sesión de Stripe en el backend
        // Por ahora, simularemos el proceso con Stripe Checkout embebido
        
        // Crear sesión de checkout (esto normalmente se haría en el backend)
        const session = await crearSesionCheckout(lineItems, orderData);
        
        if (session && session.url) {
            // Guardar pedido antes de redirigir
            localStorage.setItem('pending_order', JSON.stringify(orderData));
            
            // Redirigir a Stripe Checkout
            window.location.href = session.url;
        } else {
            // Si no hay backend, mostrar el formulario de pago embebido
            mostrarFormularioPagoEmbebido(orderData);
        }
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        mostrarLoading(false);
        alert('Error procesando el pago. Intenta nuevamente.');
    }
}

// Simulación de creación de sesión (en producción esto debe estar en el backend)
async function crearSesionCheckout(lineItems, orderData) {
    // En un entorno real, harías una llamada a tu backend:
    // const response = await fetch('/api/create-checkout-session', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ lineItems, orderData })
    // });
    // return await response.json();
    
    // Por ahora, retornamos null para usar el formulario embebido
    return null;
}

// Mostrar formulario de pago embebido (para modo desarrollo)
function mostrarFormularioPagoEmbebido(orderData) {
    mostrarLoading(false);
    
    // Crear modal para el formulario de pago
    const modal = document.createElement('div');
    modal.className = 'stripe-modal';
    modal.innerHTML = `
        <div class="stripe-modal-content">
            <h2>Completar Pago</h2>
            <div class="order-summary">
                <h3>Resumen del pedido: ${orderData.code}</h3>
                <p>Total: ${orderData.total}€</p>
            </div>
            <form id="payment-form">
                <div id="payment-element">
                    <!-- Stripe Elements se insertará aquí -->
                </div>
                <div id="payment-message" class="hidden"></div>
                <button id="submit-payment" type="submit" class="btn btn-primary">
                    <span id="button-text">Pagar ${orderData.total}€</span>
                    <div class="spinner hidden" id="spinner"></div>
                </button>
                <button type="button" class="btn btn-secondary" onclick="cerrarModalStripe()">
                    Cancelar
                </button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Inicializar Stripe Elements
    inicializarStripeElements(orderData);
}

async function inicializarStripeElements(orderData) {
    // En modo desarrollo, crear un PaymentIntent simulado
    // En producción, esto debe venir del backend
    const clientSecret = await obtenerClientSecret(orderData);
    
    if (!clientSecret) {
        // Si no hay backend, simular el pago para desarrollo
        simulaPagoDesarrollo(orderData);
        return;
    }
    
    // Opciones para Stripe Elements
    const appearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#00897b',
            fontFamily: 'system-ui, sans-serif',
        }
    };
    
    const elements = state.stripe.elements({ appearance, clientSecret });
    
    // Crear y montar el Payment Element
    const paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');
    
    // Manejar el envío del formulario
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        if (!state.stripe || !elements) return;
        
        setLoadingStripe(true);
        
        const { error } = await state.stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '?payment=success&order=' + orderData.code,
            },
        });
        
        if (error) {
            showMessage(error.message);
            setLoadingStripe(false);
        }
    });
}

// Simulación para desarrollo
function simulaPagoDesarrollo(orderData) {
    const paymentElement = document.getElementById('payment-element');
    paymentElement.innerHTML = `
        <div class="dev-payment-form">
            <h4>Modo Desarrollo - Tarjeta de Prueba</h4>
            <p>Usa los siguientes datos de prueba:</p>
            <ul>
                <li><strong>Número:</strong> 4242 4242 4242 4242</li>
                <li><strong>Fecha:</strong> Cualquier fecha futura</li>
                <li><strong>CVC:</strong> Cualquier 3 dígitos</li>
                <li><strong>ZIP:</strong> Cualquier código postal</li>
            </ul>
            <div class="form-group">
                <label>Número de tarjeta</label>
                <input type="text" id="card-number" placeholder="4242 4242 4242 4242" class="form-control">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>MM/AA</label>
                    <input type="text" id="card-expiry" placeholder="12/25" class="form-control">
                </div>
                <div class="form-group">
                    <label>CVC</label>
                    <input type="text" id="card-cvc" placeholder="123" class="form-control">
                </div>
            </div>
        </div>
    `;
    
    // Manejar el envío en modo desarrollo
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        setLoadingStripe(true);
        
        // Simular procesamiento
        setTimeout(() => {
            // Guardar pedido como activo
            localStorage.setItem('active_order', JSON.stringify(orderData));
            state.activeOrder = orderData;
            
            // Cerrar modal y mostrar pedido
            cerrarModalStripe();
            mostrarPedidoActivo();
            limpiarCarrito();
            
            setLoadingStripe(false);
        }, 2000);
    });
}

async function obtenerClientSecret(orderData) {
    // En producción, esto debe venir del backend
    // const response = await fetch('/api/create-payment-intent', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ amount: orderData.total * 100 })
    // });
    // const { clientSecret } = await response.json();
    // return clientSecret;
    
    // En desarrollo, retornar null para usar simulación
    return null;
}

function cerrarModalStripe() {
    const modal = document.querySelector('.stripe-modal');
    if (modal) {
        modal.remove();
    }
}

// Función específica para el loading del modal de Stripe
function setLoadingStripe(isLoading) {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');
    
    // Verificar que los elementos existan antes de modificarlos
    if (!submitButton || !buttonText || !spinner) return;
    
    if (isLoading) {
        submitButton.disabled = true;
        spinner.classList.remove('hidden');
        buttonText.classList.add('hidden');
    } else {
        submitButton.disabled = false;
        spinner.classList.add('hidden');
        buttonText.classList.remove('hidden');
    }
}

function showMessage(messageText) {
    const messageContainer = document.getElementById('payment-message');
    if (!messageContainer) return;
    
    messageContainer.classList.remove('hidden');
    messageContainer.textContent = messageText;
    
    setTimeout(() => {
        messageContainer.classList.add('hidden');
        messageContainer.textContent = '';
    }, 4000);
}

// Verificar resultado del pago al volver
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const orderCode = urlParams.get('order');
    
    if (paymentStatus === 'success') {
        // Recuperar pedido pendiente
        const pendingOrder = localStorage.getItem('pending_order');
        if (pendingOrder) {
            state.activeOrder = JSON.parse(pendingOrder);
            localStorage.setItem('active_order', pendingOrder);
            localStorage.removeItem('pending_order');
            
            mostrarPedidoActivo();
            limpiarCarrito();
            
            // Limpiar URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
});

// === FUNCIONES DE UI ===

function renderizarTickets() {
    const container = document.getElementById('ticketsSection');
    container.innerHTML = '';
    
    state.tickets.filter(t => t.active).forEach(ticket => {
        const quantity = state.cart[ticket.id] || 0;
        const ticketEl = document.createElement('div');
        ticketEl.className = `ticket-card ${quantity > 0 ? 'selected' : ''}`;
        
        ticketEl.innerHTML = `
            <div class="ticket-name">${ticket.name}</div>
            <div class="ticket-price">${ticket.price}€</div>
            <div class="ticket-quantity">
                <button class="quantity-btn" onclick="cambiarCantidad(${ticket.id}, -1)">-</button>
                <span class="quantity-display">${quantity}</span>
                <button class="quantity-btn" onclick="cambiarCantidad(${ticket.id}, 1)">+</button>
            </div>
        `;
        
        container.appendChild(ticketEl);
    });
}

function cambiarCantidad(ticketId, delta) {
    const current = state.cart[ticketId] || 0;
    const newQuantity = Math.max(0, current + delta);
    
    if (newQuantity === 0) {
        delete state.cart[ticketId];
    } else {
        state.cart[ticketId] = newQuantity;
    }
    
    renderizarTickets();
    actualizarCarrito();
}

function actualizarCarrito() {
    // Mostrar/ocultar zonas según si hay pedido activo
    const cartZone = document.getElementById('cartZone');
    const orderZone = document.getElementById('orderZone');
    
    if (state.activeOrder) {
        cartZone.classList.add('hidden');
        orderZone.classList.remove('hidden');
        mostrarPedidoActivo();
    } else {
        cartZone.classList.remove('hidden');
        orderZone.classList.add('hidden');
        
        // Actualizar el carrito normal
        const itemsContainer = document.getElementById('cartItems');
        const totalElement = document.getElementById('cartTotal');
        const checkoutBtn = document.getElementById('checkoutBtn');
        
        itemsContainer.innerHTML = '';
        let total = 0;
        
        Object.entries(state.cart).forEach(([ticketId, quantity]) => {
            const ticket = state.tickets.find(t => t.id == ticketId);
            const subtotal = ticket.price * quantity;
            total += subtotal;
            
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <span>${quantity}x ${ticket.name}</span>
                <span>${subtotal}€</span>
            `;
            itemsContainer.appendChild(itemEl);
        });
        
        totalElement.textContent = `${total}€`;
        checkoutBtn.disabled = total === 0;
        
        if (total === 0) {
            itemsContainer.innerHTML = '<p style="text-align: center; color: #999;">Carrito vacío</p>';
        }
    }
}

function calcularTotal() {
    return Object.entries(state.cart).reduce((total, [ticketId, quantity]) => {
        const ticket = state.tickets.find(t => t.id == ticketId);
        return total + (ticket.price * quantity);
    }, 0);
}

function generarCodigoPedido() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `#${state.config.orderPrefix}-${year}-${random}`;
}

function limpiarCarrito() {
    state.cart = {};
    renderizarTickets();
    actualizarCarrito();
}

// === VISTA DE PEDIDO ===

function mostrarPedidoActivo() {
    if (!state.activeOrder) return;
    
    // Mostrar código
    document.getElementById('orderCode').textContent = state.activeOrder.code;
    
    // Mostrar detalles
    const detailsEl = document.getElementById('orderDetails');
    detailsEl.innerHTML = '<h3>Resumen del pedido:</h3>';
    
    Object.entries(state.activeOrder.items).forEach(([ticketId, quantity]) => {
        const ticket = state.tickets.find(t => t.id == ticketId);
        detailsEl.innerHTML += `
            <div class="cart-item">
                <span>${quantity}x ${ticket.name}</span>
                <span>${ticket.price * quantity}€</span>
            </div>
        `;
    });
    
    detailsEl.innerHTML += `
        <div class="cart-total" style="margin-top: 15px;">
            <span>Total pagado:</span>
            <span>${state.activeOrder.total}€</span>
        </div>
    `;
    
    // Generar botones de personal
    renderizarBotonesPersonal();
}

function renderizarBotonesPersonal() {
    const container = document.getElementById('staffButtons');
    container.innerHTML = '';
    
    state.staff.filter(s => s.active).forEach(staff => {
        const btn = document.createElement('button');
        btn.className = `staff-btn staff-color-${staff.color}`;
        btn.textContent = staff.name;
        btn.onclick = () => validarPedido(staff.name);
        container.appendChild(btn);
    });
}

function validarPedido(staffName) {
    const securityCode = document.getElementById('securityCode').value;
    
    // Verificar código de seguridad
    if (securityCode !== state.config.securityCode) {
        alert('Código de seguridad incorrecto');
        return;
    }
    
    // Validar pedido
    mostrarLoading(true);
    
    // Actualizar en Supabase
    if (state.activeOrder.id) {
        validarPedidoSupabase(state.activeOrder.id, staffName);
    }
    
    // Mostrar confirmación
    setTimeout(() => {
        mostrarLoading(false);
        alert(`✅ Pedido ${state.activeOrder.code} validado por ${staffName}`);
        
        // Limpiar pedido activo
        localStorage.removeItem('active_order');
        state.activeOrder = null;
        
        // Actualizar vista
        actualizarCarrito();
    }, 1000);
}

function cancelarPedido() {
    if (confirm('¿Estás seguro de que quieres cancelar este pedido?')) {
        localStorage.removeItem('active_order');
        state.activeOrder = null;
        actualizarCarrito();
    }
}

function verificarPedidoActivo() {
    const savedOrder = localStorage.getItem('active_order');
    if (savedOrder) {
        state.activeOrder = JSON.parse(savedOrder);
        actualizarCarrito();
    }
}

// === PANEL ADMIN ===

// Detectar código admin en el campo de seguridad
document.getElementById('securityCode')?.addEventListener('input', function(e) {
    if (e.target.value === state.config.adminCode && state.authenticated) {
        e.target.value = '';
        mostrarPanelAdmin();
    }
});

// PARTE 2: Cambios en la función mostrarPanelAdmin
// Buscar la función mostrarPanelAdmin (alrededor de la línea 958) y reemplazar con:

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

function salirDeAdmin() {
    document.getElementById('adminView').classList.remove('active');
    document.getElementById('mainView').classList.add('active');
}

function cargarConfigAdmin() {
    // Configuración general
    document.getElementById('configAppTitle').value = state.config.appTitle;
    document.getElementById('configAdminCode').value = '';
    document.getElementById('configSecurityCode').value = state.config.securityCode;
    
    // Tickets
    renderizarConfigTickets();
    
    // Personal
    renderizarConfigPersonal();
}

function renderizarConfigTickets() {
    const container = document.getElementById('ticketConfig');
    container.innerHTML = '';
    
    state.tickets.forEach((ticket, index) => {
        const div = document.createElement('div');
        div.className = 'ticket-config-item';
        div.innerHTML = `
            <input type="text" value="${ticket.name}" 
                   onchange="actualizarTicket(${index}, 'name', this.value)">
            <input type="number" value="${ticket.price}" step="0.5"
                   onchange="actualizarTicket(${index}, 'price', parseFloat(this.value))">
            <label>
                <input type="checkbox" ${ticket.active ? 'checked' : ''}
                       onchange="actualizarTicket(${index}, 'active', this.checked)">
                Activo
            </label>
        `;
        container.appendChild(div);
    });
}

function renderizarConfigPersonal() {
    const container = document.getElementById('staffConfig');
    container.innerHTML = '';
    
    state.staff.forEach((staff, index) => {
        const div = document.createElement('div');
        div.className = 'staff-config-item';
        div.innerHTML = `
            <input type="text" value="${staff.name}" 
                   onchange="actualizarPersonal(${index}, 'name', this.value)">
            <select onchange="actualizarPersonal(${index}, 'color', this.value)">
                ${APP_CONFIG.staffColors.map(color => `
                    <option value="${color.value}" ${staff.color === color.value ? 'selected' : ''}>
                        ${color.label}
                    </option>
                `).join('')}
            </select>
            <label>
                <input type="checkbox" ${staff.active ? 'checked' : ''}
                       onchange="actualizarPersonal(${index}, 'active', this.checked)">
                Activo
            </label>
            <button class="btn btn-danger" onclick="eliminarPersonal(${index})">×</button>
        `;
        container.appendChild(div);
    });
}

function actualizarTicket(index, field, value) {
    state.tickets[index][field] = value;
}

function actualizarPersonal(index, field, value) {
    state.staff[index][field] = value;
}

function agregarPersonal() {
    const newId = Math.max(...state.staff.map(s => s.id)) + 1;
    state.staff.push({
        id: newId,
        name: `Nuevo ${newId}`,
        color: 'blue',
        active: true
    });
    renderizarConfigPersonal();
}

function eliminarPersonal(index) {
    if (confirm('¿Eliminar este miembro del personal?')) {
        state.staff.splice(index, 1);
        renderizarConfigPersonal();
    }
}

// FUNCIONES ACTUALIZADAS PARA GUARDAR EN SUPABASE

async function guardarTickets() {
    // Guardar en localStorage primero
    localStorage.setItem('app_tickets', JSON.stringify(state.tickets));
    
    // Intentar guardar en Supabase
    const guardadoEnSupabase = await guardarTicketsEnSupabase();
    
    if (guardadoEnSupabase) {
        alert('✅ Tickets guardados en todos los dispositivos');
    } else {
        alert('✅ Tickets guardados localmente (se sincronizarán cuando haya conexión)');
    }
    
    renderizarTickets();
}

async function guardarPersonal() {
    // Guardar en localStorage primero
    localStorage.setItem('app_staff', JSON.stringify(state.staff));
    
    // Intentar guardar en Supabase
    const guardadoEnSupabase = await guardarPersonalEnSupabase();
    
    if (guardadoEnSupabase) {
        alert('✅ Personal guardado en todos los dispositivos');
    } else {
        alert('✅ Personal guardado localmente (se sincronizará cuando haya conexión)');
    }
    
    renderizarBotonesPersonal();
}

async function guardarConfigGeneral() {
    const appTitle = document.getElementById('configAppTitle').value;
    const adminCode = document.getElementById('configAdminCode').value;
    const securityCode = document.getElementById('configSecurityCode').value;
    
    if (appTitle) state.config.appTitle = appTitle;
    if (adminCode) state.config.adminCode = adminCode;
    if (securityCode) state.config.securityCode = securityCode;
    
    // Guardar en localStorage
    localStorage.setItem('app_config', JSON.stringify(state.config));
    
    // Intentar guardar en Supabase
    let todoGuardado = true;
    
    if (appTitle) {
        const guardado = await guardarConfigEnSupabase('appTitle', appTitle);
        todoGuardado = todoGuardado && guardado;
    }
    
    if (adminCode) {
        const guardado = await guardarConfigEnSupabase('adminCode', adminCode);
        todoGuardado = todoGuardado && guardado;
    }
    
    if (securityCode) {
        const guardado = await guardarConfigEnSupabase('securityCode', securityCode);
        todoGuardado = todoGuardado && guardado;
    }
    
    // Aplicar cambios
    document.getElementById('appTitle').textContent = state.config.appTitle;
    
    if (todoGuardado) {
        alert('✅ Configuración guardada en todos los dispositivos');
    } else {
        alert('✅ Configuración guardada localmente (se sincronizará cuando haya conexión)');
    }
}

async function cargarEstadisticas() {
    const statsEl = document.getElementById('dailyStats');
    
    try {
        // Obtener pedidos del día
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(
            getSupabaseUrl(`orders?created_at=gte.${today}T00:00:00&created_at=lt.${today}T23:59:59`),
            { headers: getSupabaseHeaders() }
        );
        
        if (response.ok) {
            const orders = await response.json();
            
            const totalVentas = orders.reduce((sum, order) => sum + order.total, 0);
            const pedidosValidados = orders.filter(o => o.status === 'validated').length;
            
            statsEl.innerHTML = `
                <div class="stat-card">
                    <div class="stat-value">${orders.length}</div>
                    <div class="stat-label">Pedidos hoy</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalVentas}€</div>
                    <div class="stat-label">Ventas totales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${pedidosValidados}</div>
                    <div class="stat-label">Pedidos validados</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
        statsEl.innerHTML = '<p>Error cargando estadísticas</p>';
    }
}

// === UTILIDADES ===

function mostrarLoading(show) {
    const modal = document.getElementById('loadingModal');
    if (show) {
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
    }
}

// Event listener para el botón de checkout
document.getElementById('checkoutBtn')?.addEventListener('click', procesarPagoStripe);

// Agregar esta función al final del archivo para poder ejecutarla desde la consola
window.diagnosticarSupabase = diagnosticarConexionSupabase;
