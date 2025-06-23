# Dockerfile optimizado para Coolify
FROM node:18-alpine

WORKDIR /app

# Instalar Caddy (servidor web ligero) y wget para healthcheck
RUN apk add --no-cache caddy wget

# Copiar archivos de la aplicación
COPY index.html ./
COPY styles.css ./
COPY config.js ./
COPY app.js ./
COPY entrypoint.sh ./

# Hacer ejecutable el script
RUN chmod +x /app/entrypoint.sh

# Crear Caddyfile para servir la app en puerto 8080
RUN echo -e ":${PORT:-8080} {\n\
    root * /app\n\
    file_server\n\
    encode gzip\n\
    try_files {path} /index.html\n\
    \n\
    # Headers de seguridad\n\
    header {\n\
        X-Content-Type-Options nosniff\n\
        X-Frame-Options DENY\n\
        X-XSS-Protection \"1; mode=block\"\n\
        Referrer-Policy no-referrer-when-downgrade\n\
        # CORS para Supabase y Stripe\n\
        Access-Control-Allow-Origin *\n\
        Access-Control-Allow-Methods \"GET, POST, PUT, DELETE, OPTIONS\"\n\
        Access-Control-Allow-Headers \"Content-Type, Authorization, apikey\"\n\
    }\n\
    \n\
    # Cache para assets estáticos\n\
    @static {\n\
        path *.css *.js *.jpg *.jpeg *.png *.gif *.ico *.svg\n\
    }\n\
    header @static Cache-Control \"public, max-age=3600\"\n\
}" > /app/Caddyfile

# Puerto 8080 es el estándar para Coolify
EXPOSE 8080

# Healthcheck simple para Coolify
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/ || exit 1

# Ejecutar el script de entrada
CMD ["/app/entrypoint.sh"]