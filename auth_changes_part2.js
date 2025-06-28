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