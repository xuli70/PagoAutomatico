// Estado de la aplicación
let state = {
    tickets: [],
    staff: [],
    cart: {},
    activeOrder: null,
    config: { ...APP_CONFIG },
    stripe: null,
    checkoutSession: null
};

// Inicialización
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
});

// === FUNCIONES DE SUPABASE ===

// Cargar configuración
async function cargarConfiguracion() {
    try {
        // Intentar cargar desde localStorage primero
        const localConfig = localStorage.getItem('app_config');
        if (localConfig) {
            const saved = JSON.parse(localConfig);
            state.config = { ...state.config, ...saved };
        }
        
        // Cargar tickets
        const localTickets = localStorage.getItem('app_tickets');
        state.tickets = localTickets ? JSON.parse(localTickets) : state.config.defaultTickets;
        
        // Cargar personal
        const localStaff = localStorage.getItem('app_staff');
        state.staff = localStaff ? JSON.parse(localStaff) : state.config.defaultStaff;
        
        // Aplicar configuración
        document.getElementById('appTitle').textContent = state.config.appTitle;
        
    } catch (error) {
        console.error('Error cargando configuración:', error);
        // Usar valores por defecto
        state.tickets = state.config.defaultTickets;
        state.staff = state.config.defaultStaff;
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
        
        setLoading(true);
        
        const { error } = await state.stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '?payment=success&order=' + orderData.code,
            },
        });
        
        if (error) {
            showMessage(error.message);
            setLoading(false);
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
        
        setLoading(true);
        
        // Simular procesamiento
        setTimeout(() => {
            // Guardar pedido como activo
            localStorage.setItem('active_order', JSON.stringify(orderData));
            state.activeOrder = orderData;
            
            // Cerrar modal y mostrar pedido
            cerrarModalStripe();
            mostrarPedidoActivo();
            limpiarCarrito();
            
            setLoading(false);
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

function setLoading(isLoading) {
    const submitButton = document.getElementById('submit-payment');
    const buttonText = document.getElementById('button-text');
    const spinner = document.getElementById('spinner');
    
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
    
    // Cambiar vista
    document.getElementById('mainView').classList.remove('active');
    document.getElementById('orderView').classList.add('active');
    document.getElementById('activeOrderBadge').classList.remove('hidden');
    
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
        
        // Volver a inicio
        volverAInicio();
    }, 1000);
}

function verificarPedidoActivo() {
    const savedOrder = localStorage.getItem('active_order');
    if (savedOrder) {
        state.activeOrder = JSON.parse(savedOrder);
        mostrarPedidoActivo();
    }
}

function volverAInicio() {
    document.getElementById('orderView').classList.remove('active');
    document.getElementById('mainView').classList.add('active');
    
    if (!state.activeOrder) {
        document.getElementById('activeOrderBadge').classList.add('hidden');
    }
}

// === PANEL ADMIN ===

// Detectar código admin en el campo de seguridad
document.getElementById('securityCode')?.addEventListener('input', function(e) {
    if (e.target.value === state.config.adminCode) {
        e.target.value = '';
        mostrarPanelAdmin();
    }
});

function mostrarPanelAdmin() {
    document.getElementById('orderView').classList.remove('active');
    document.getElementById('mainView').classList.remove('active');
    document.getElementById('adminView').classList.add('active');
    
    // Cargar configuración actual
    cargarConfigAdmin();
    cargarEstadisticas();
}

function salirDeAdmin() {
    document.getElementById('adminView').classList.remove('active');
    
    if (state.activeOrder) {
        document.getElementById('orderView').classList.add('active');
    } else {
        document.getElementById('mainView').classList.add('active');
    }
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

function guardarTickets() {
    localStorage.setItem('app_tickets', JSON.stringify(state.tickets));
    alert('✅ Tickets guardados');
    renderizarTickets();
}

function guardarPersonal() {
    localStorage.setItem('app_staff', JSON.stringify(state.staff));
    alert('✅ Personal guardado');
    renderizarBotonesPersonal();
}

function guardarConfigGeneral() {
    const appTitle = document.getElementById('configAppTitle').value;
    const adminCode = document.getElementById('configAdminCode').value;
    const securityCode = document.getElementById('configSecurityCode').value;
    
    if (appTitle) state.config.appTitle = appTitle;
    if (adminCode) state.config.adminCode = adminCode;
    if (securityCode) state.config.securityCode = securityCode;
    
    localStorage.setItem('app_config', JSON.stringify(state.config));
    
    // Aplicar cambios
    document.getElementById('appTitle').textContent = state.config.appTitle;
    
    alert('✅ Configuración guardada');
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