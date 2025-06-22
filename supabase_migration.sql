-- Script de migración para Supabase
-- Sistema de Tickets para Bar/Restaurante

-- Eliminar tablas si existen (solo para desarrollo)
-- DROP TABLE IF EXISTS orders CASCADE;

-- ============================================
-- TABLA DE PEDIDOS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'cancelled')),
    payment_method VARCHAR(50) DEFAULT 'stripe',
    stripe_session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by VARCHAR(100),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_validated_by ON orders(validated_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_date ON orders(DATE(created_at));

-- Comentarios en las columnas
COMMENT ON TABLE orders IS 'Tabla principal de pedidos del sistema de tickets';
COMMENT ON COLUMN orders.code IS 'Código único del pedido mostrado al cliente';
COMMENT ON COLUMN orders.items IS 'JSON con los items del pedido: {ticketId: quantity}';
COMMENT ON COLUMN orders.total IS 'Total del pedido en euros';
COMMENT ON COLUMN orders.status IS 'Estado del pedido: pending, validated, cancelled';
COMMENT ON COLUMN orders.validated_by IS 'Nombre del personal que validó el pedido';
COMMENT ON COLUMN orders.metadata IS 'Datos adicionales del pedido en formato JSON';

-- ============================================
-- CONFIGURACIÓN DE RLS (Row Level Security)
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Política: Permitir inserción de pedidos (cualquiera puede crear)
CREATE POLICY "Permitir crear pedidos" ON orders
    FOR INSERT 
    WITH CHECK (true);

-- Política: Permitir lectura de pedidos
CREATE POLICY "Permitir leer pedidos" ON orders
    FOR SELECT
    USING (true);

-- Política: Permitir actualización solo de pedidos pendientes
CREATE POLICY "Permitir validar pedidos" ON orders
    FOR UPDATE
    USING (status = 'pending')
    WITH CHECK (status IN ('validated', 'cancelled'));

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función para obtener estadísticas del día
CREATE OR REPLACE FUNCTION get_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    total_orders BIGINT,
    validated_orders BIGINT,
    cancelled_orders BIGINT,
    total_revenue DECIMAL(10,2),
    avg_order_value DECIMAL(10,2),
    top_staff VARCHAR(100),
    staff_validations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_orders AS (
        SELECT * FROM orders 
        WHERE DATE(created_at) = target_date
    ),
    staff_stats AS (
        SELECT 
            validated_by,
            COUNT(*) as validations
        FROM daily_orders
        WHERE status = 'validated' AND validated_by IS NOT NULL
        GROUP BY validated_by
        ORDER BY validations DESC
        LIMIT 1
    )
    SELECT 
        COUNT(*)::BIGINT as total_orders,
        COUNT(*) FILTER (WHERE status = 'validated')::BIGINT as validated_orders,
        COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_orders,
        COALESCE(SUM(total), 0)::DECIMAL(10,2) as total_revenue,
        COALESCE(AVG(total), 0)::DECIMAL(10,2) as avg_order_value,
        COALESCE(staff_stats.validated_by, 'N/A')::VARCHAR(100) as top_staff,
        COALESCE(staff_stats.validations, 0)::BIGINT as staff_validations
    FROM daily_orders
    LEFT JOIN staff_stats ON true;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas por rango de fechas
CREATE OR REPLACE FUNCTION get_stats_by_range(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    date DATE,
    total_orders BIGINT,
    validated_orders BIGINT,
    total_revenue DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as date,
        COUNT(*)::BIGINT as total_orders,
        COUNT(*) FILTER (WHERE status = 'validated')::BIGINT as validated_orders,
        COALESCE(SUM(total), 0)::DECIMAL(10,2) as total_revenue
    FROM orders
    WHERE DATE(created_at) BETWEEN start_date AND end_date
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener items más vendidos
CREATE OR REPLACE FUNCTION get_top_items(
    limit_count INT DEFAULT 10,
    days_back INT DEFAULT 30
)
RETURNS TABLE (
    ticket_id TEXT,
    total_quantity BIGINT,
    total_revenue DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        item.key as ticket_id,
        SUM((item.value)::BIGINT) as total_quantity,
        SUM((item.value)::NUMERIC * o.total / 
            (SELECT SUM((i.value)::NUMERIC) 
             FROM jsonb_each_text(o.items) i)
        )::DECIMAL(10,2) as total_revenue
    FROM orders o,
         jsonb_each_text(o.items) as item
    WHERE o.status = 'validated'
        AND o.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
    GROUP BY item.key
    ORDER BY total_quantity DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista de pedidos del día actual
CREATE OR REPLACE VIEW today_orders AS
SELECT 
    id,
    code,
    items,
    total,
    status,
    created_at,
    validated_at,
    validated_by
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Vista de estadísticas por personal
CREATE OR REPLACE VIEW staff_performance AS
SELECT 
    validated_by as staff_name,
    COUNT(*) as total_validations,
    SUM(total) as total_revenue,
    AVG(total) as avg_order_value,
    MAX(validated_at) as last_validation
FROM orders
WHERE status = 'validated' 
    AND validated_by IS NOT NULL
    AND DATE(created_at) >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY validated_by
ORDER BY total_validations DESC;

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================
-- Descomenta las siguientes líneas para insertar datos de prueba

/*
INSERT INTO orders (code, items, total, status, validated_at, validated_by) VALUES
('#PED-2024-001', '{"1": 2, "3": 1}'::jsonb, 8.00, 'validated', NOW() - INTERVAL '2 hours', 'Luis'),
('#PED-2024-002', '{"2": 3, "4": 2}'::jsonb, 19.00, 'validated', NOW() - INTERVAL '1 hour', 'Ana'),
('#PED-2024-003', '{"1": 1, "2": 1}'::jsonb, 5.00, 'pending', NULL, NULL),
('#PED-2024-004', '{"3": 2, "4": 1}'::jsonb, 13.00, 'validated', NOW() - INTERVAL '30 minutes', 'Luis');
*/

-- ============================================
-- GRANTS (si usas diferentes roles)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE ON orders TO anon;
-- GRANT SELECT ON today_orders TO anon;
-- GRANT SELECT ON staff_performance TO anon;
-- GRANT EXECUTE ON FUNCTION get_daily_stats TO anon;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================
/*
1. Este script crea toda la estructura necesaria para el sistema de tickets
2. Las políticas RLS permiten operaciones básicas con la anon key
3. Las funciones proporcionan estadísticas útiles para el panel admin
4. Las vistas simplifican consultas comunes
5. Ajusta los permisos según tus necesidades de seguridad

Para ejecutar:
1. Copia este script en el SQL Editor de Supabase
2. Ejecuta todo el script
3. Verifica que las tablas y funciones se crearon correctamente
4. Configura las variables de entorno en tu aplicación
*/