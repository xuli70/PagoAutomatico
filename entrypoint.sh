#!/bin/sh
# Script para inyectar variables de entorno en la aplicación

echo "🚀 Iniciando Sistema de Tickets..."

# Crear archivo env.js con las variables de entorno
cat > /app/env.js << EOF
// Variables de configuración inyectadas por Coolify
window.ENV = {
    // Supabase
    SUPABASE_URL: "${SUPABASE_URL}",
    SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}",
    
    // Stripe
    STRIPE_PUBLIC_KEY: "${STRIPE_PUBLIC_KEY}",
    
    // Opcional: URL del webhook de Stripe (para futuras implementaciones)
    STRIPE_WEBHOOK_URL: "${STRIPE_WEBHOOK_URL}",
    
    // Opcional: Service Role Key de Supabase (solo si es necesaria)
    SUPABASE_SERVICE_KEY: "${SUPABASE_SERVICE_KEY}"
};

// Validación de configuración
if (!window.ENV.SUPABASE_URL || window.ENV.SUPABASE_URL === '') {
    console.error('⚠️ SUPABASE_URL no configurada');
}

if (!window.ENV.SUPABASE_ANON_KEY || window.ENV.SUPABASE_ANON_KEY === '') {
    console.error('⚠️ SUPABASE_ANON_KEY no configurada');
}

if (!window.ENV.STRIPE_PUBLIC_KEY || window.ENV.STRIPE_PUBLIC_KEY === '') {
    console.error('⚠️ STRIPE_PUBLIC_KEY no configurada');
}

console.log('✅ Variables de entorno cargadas');
EOF

echo "✅ Archivo env.js creado con las variables de entorno"

# Mostrar información de configuración (sin mostrar las claves)
echo "📋 Configuración:"
echo "   - Supabase URL: ${SUPABASE_URL:-'No configurada'}"
echo "   - Stripe configurado: ${STRIPE_PUBLIC_KEY:+'Sí'}"
echo "   - Puerto: ${PORT:-8080}"

# Iniciar Caddy
echo "🌐 Iniciando servidor Caddy en puerto ${PORT:-8080}..."
exec caddy run --config /app/Caddyfile --adapter caddyfile