# 🎫 Sistema de Tickets - Bar/Restaurante

Sistema minimalista de venta de tickets con Stripe y Supabase, diseñado para desplegarse con Coolify en VPS.

## 🚀 Características

- **Venta de tickets** con diferentes precios configurables
- **Pago seguro** con Stripe
- **Validación por personal** con código de seguridad
- **Panel de administración** oculto para configurar todo
- **Base de datos** en Supabase para métricas
- **Diseño minimalista** y responsive
- **Compatible con Coolify** y VPS Hostinger

## 📋 Requisitos

- VPS con Coolify instalado
- Supabase (puede estar en el mismo VPS)
- Cuenta de Stripe
- Dominio configurado

## 🛠️ Instalación Rápida

### 1. Clonar el repositorio

```bash
git clone https://github.com/xuli70/PagoAutomatico
cd PagoAutomatico
```

### 2. Configurar Supabase

Crear las siguientes tablas en Supabase:

```sql
-- Tabla de pedidos
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by VARCHAR(100)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_orders_code ON orders(code);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserción con anon key
CREATE POLICY "Permitir crear pedidos" ON orders
    FOR INSERT 
    WITH CHECK (true);

-- Política para permitir lectura de pedidos
CREATE POLICY "Permitir leer pedidos" ON orders
    FOR SELECT
    USING (true);

-- Política para permitir actualización (validación)
CREATE POLICY "Permitir validar pedidos" ON orders
    FOR UPDATE
    USING (status = 'pending')
    WITH CHECK (status = 'validated');
```

### 3. Configurar en Coolify

1. **Crear nueva aplicación** en Coolify:
   - Source: GitHub
   - Repository: `xuli70/PagoAutomatico`
   - Branch: `main`
   - Build Pack: `Dockerfile`

2. **Configurar variables de entorno**:
   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   STRIPE_PUBLIC_KEY=pk_test_51...
   ```

3. **Configurar dominio**:
   - Domain: `tickets.tudominio.com`
   - Generate SSL: ✓

4. **Deploy**

## 🎯 Uso de la Aplicación

### Cliente comprando tickets:

1. Selecciona los tickets deseados
2. Paga con tarjeta mediante Stripe
3. Recibe código único del pedido
4. Muestra el código al personal

### Personal validando pedidos:

1. Cliente muestra su código en pantalla
2. Personal introduce código de seguridad (por defecto: 23)
3. Personal pulsa su botón identificativo
4. Pedido validado y registrado

### Acceso al panel admin:

1. En la pantalla de validación, introduce el código admin (por defecto: 9999)
2. Configura tickets, personal y opciones generales
3. Visualiza estadísticas del día

## ⚙️ Configuración

### Variables de entorno necesarias:

```bash
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key

# Stripe
STRIPE_PUBLIC_KEY=pk_test_tu-clave-publica
```

### Códigos por defecto:

- **Código Admin**: 9999
- **Código Seguridad Personal**: 23

## 🔧 Personalización

### Modificar tickets:
1. Accede al panel admin
2. Edita nombres y precios
3. Activa/desactiva tickets

### Configurar personal:
1. Añade nuevos miembros
2. Asigna colores distintivos
3. Activa/desactiva personal

### Cambiar apariencia:
- Edita `styles.css` para colores y estilos
- Modifica `config.js` para opciones por defecto

## 📊 Estructura del Proyecto

```
PagoAutomatico/
├── index.html          # Interfaz principal
├── styles.css          # Estilos minimalistas
├── config.js           # Configuración
├── app.js              # Lógica de la aplicación
├── entrypoint.sh       # Script para Docker
├── Dockerfile          # Configuración Docker
├── .env.example        # Ejemplo de variables
├── .dockerignore       # Archivos ignorados
└── README.md           # Este archivo
```

## 🚨 Solución de Problemas

### Error 502 en Coolify:
- Verifica que el puerto sea 8080
- Revisa logs en Coolify
- Confirma que las variables estén configuradas

### CORS errors con Supabase:
- Verifica la URL de Supabase (sin / al final)
- Confirma que la anon key sea correcta
- Revisa la configuración de CORS en Supabase

### Stripe no funciona:
- Verifica que uses la clave pública (pk_)
- Confirma que el dominio esté en HTTPS
- Revisa la consola del navegador

## 🔒 Seguridad

- Las claves de API son públicas (anon key, pk de Stripe)
- Usa RLS en Supabase para proteger datos
- Cambia los códigos por defecto en producción
- Configura HTTPS en Coolify (automático)

## 📈 Métricas y Reportes

El sistema registra automáticamente:
- Fecha y hora de cada venta
- Items vendidos y totales
- Personal que validó cada pedido
- Estado de los pedidos

Accede a las estadísticas desde el panel admin.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/nueva-funcion`)
3. Commit cambios (`git commit -m 'Añade nueva función'`)
4. Push a la rama (`git push origin feature/nueva-funcion`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo licencia MIT.

## 👨‍💻 Autor

Creado para simplificar la gestión de pedidos en bares y restaurantes.

---

**Nota**: Recuerda cambiar los códigos por defecto y configurar correctamente las variables de entorno antes de usar en producción.