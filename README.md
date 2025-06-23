# PagoAutomatico - Sistema de Tickets Unificado

Sistema de pago con tickets integrado con Stripe para gestión de pedidos. Ahora con **interfaz unificada** que muestra todo en una sola ventana.

## 📱 Características

### Interfaz Unificada (🆕)
- **Una sola ventana** que muestra:
  - Selección de tickets y carrito cuando no hay pedido activo
  - Código del pedido y validación cuando hay un pedido activo
  - Transición fluida entre estados sin cambiar de pantalla

### Sistema de Tickets
- Selección interactiva de productos/tickets
- Carrito de compra en tiempo real
- Cálculo automático de totales

### Pagos con Stripe
- Integración completa con Stripe Checkout
- Modo desarrollo con formulario de prueba
- Soporte para pagos reales en producción

### Validación de Pedidos
- Código único por pedido
- Sistema de validación para el personal
- Múltiples usuarios con códigos de color

### Panel de Administración
- Gestión de tickets (precio, nombre, activación)
- Gestión de personal
- Estadísticas diarias
- Configuración general de la aplicación

## 🚀 Instalación

### Con Docker (Recomendado)

```bash
docker build -t pagoautomatico .
docker run -p 80:80 \
  -e SUPABASE_URL=tu_url \
  -e SUPABASE_ANON_KEY=tu_key \
  -e STRIPE_PUBLIC_KEY=tu_stripe_key \
  pagoautomatico
```

### Manual

1. Clona el repositorio
2. Configura las variables de entorno
3. Sirve los archivos con cualquier servidor web

## 🔧 Configuración

### Variables de Entorno

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anon-de-supabase
STRIPE_PUBLIC_KEY=pk_test_tu-clave-publica-de-stripe
```

### Códigos de Acceso por Defecto

- **Código Admin**: `9999` (para acceder al panel de administración)
- **Código de Seguridad**: `23` (para validar pedidos)

## 💳 Modo Desarrollo

Cuando uses una clave de Stripe de prueba (`pk_test_`), la aplicación mostrará un formulario de prueba.

### Tarjetas de Prueba de Stripe

- **Exitosa**: 4242 4242 4242 4242
- **Declinada**: 4000 0000 0000 0002
- **Fondos insuficientes**: 4000 0000 0000 9995

Usa cualquier fecha futura y CVC de 3 dígitos.

## 🔄 Flujo de Uso

1. **Cliente selecciona tickets** → Se actualiza el carrito
2. **Cliente paga** → Se genera código de pedido
3. **Se muestra el código** → En la misma ventana
4. **Personal valida** → Introduce código de seguridad y confirma

## 🎨 Personalización

Desde el panel de administración puedes:
- Cambiar el nombre de la aplicación
- Modificar tickets disponibles
- Agregar o quitar personal
- Cambiar códigos de acceso

## 📊 Base de Datos (Supabase)

Estructura de la tabla `orders`:

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  validated_at TIMESTAMP,
  validated_by VARCHAR(100)
);
```

## 🔒 Seguridad

- Claves API seguras en variables de entorno
- Validación de pedidos con código de seguridad
- Sin almacenamiento de datos sensibles en el frontend

## 🚧 Próximas Mejoras

- [ ] Backend para crear sesiones de Stripe
- [ ] Webhooks de Stripe para confirmación de pagos
- [ ] Sistema de notificaciones
- [ ] Exportación de estadísticas
- [ ] Multi-idioma

## 📝 Licencia

MIT License - Usa este código como quieras

---

**Desarrollado con ❤️ para simplificar los pagos**