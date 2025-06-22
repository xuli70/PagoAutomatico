// Estado de la aplicación
let state = {
    tickets: [],
    staff: [],
    cart: {},
    activeOrder: null,
    config: { ...APP_CONFIG },
    stripe: null
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando aplicación...');
    
    // Inicializar Stripe
    if (window.ENV?.STRIPE_PUBLIC_KEY) {
        state.stripe = Stripe(window.ENV.STRIPE_PUBLIC_KEY);
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

// Crear tablas si no existen
async function inicializarTablas() {
    // Esta función sería ejecutada manualmente en Supabase
    // Las tablas necesarias son:
    // - orders (id, code, items, total, status, created_at, validated_at, validated_by)
    // - config (key, value)
    // - staff (id, name, color, active)
    // - tickets (id, name, price, active)
}

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
        const items = Object.entries(state.cart).map(([ticketId, quantity]) => {
            const ticket = state.tickets.find(t => t.id == ticketId);
            return {
                name: ticket.name,
                amount: ticket.price * 100, // Stripe usa centavos
                currency: 'eur',
                quantity: quantity
            };
        });
        
        // Crear sesión de pago (esto normalmente se haría en el backend)
        // Para esta demo, simularemos el proceso
        const orderCode = generarCodigoPedido();
        const total = calcularTotal();
        
        // Guardar pedido temporalmente
        const orderData = {
            code: orderCode,
            items: state.cart,
            total: total,
            timestamp: Date.now()
        };
        
        // Crear pedido en Supabase
        const pedidoCreado = await crearPedidoSupabase(orderData);
        orderData.id = pedidoCreado.id;
        
        // Guardar en localStorage
        localStorage.setItem('active_order', JSON.stringify(orderData));
        state.activeOrder = orderData;
        
        // Simular pago exitoso (en producción esto vendría de Stripe)
        setTimeout(() => {
            mostrarLoading(false);
            mostrarPedidoActivo();
            limpiarCarrito();
        }, 2000);
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        mostrarLoading(false);
        alert('Error procesando el pago. Intenta nuevamente.');
    }
}

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