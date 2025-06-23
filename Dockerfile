# Dockerfile optimizado para Coolify
FROM nginx:alpine

# Instalar dependencias necesarias
RUN apk add --no-cache bash curl

# Crear directorio de trabajo
WORKDIR /usr/share/nginx/html

# Copiar archivos de la aplicación
COPY index.html .
COPY styles.css .
COPY app.js .
COPY config.js .

# Crear el script entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Configuración de nginx para SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Healthcheck para Coolify
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Usar el entrypoint script
ENTRYPOINT ["/entrypoint.sh"]