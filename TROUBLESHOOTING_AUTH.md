# Solución de Problemas - Autenticación

## Error: "APP_PASSWORD no configurada en las variables de entorno"

Este error indica que la variable `APP_PASSWORD` no está llegando correctamente a la aplicación.

### Pasos para Diagnosticar

1. **Verificar en Coolify**:
   - Ve a tu aplicación en Coolify
   - Navega a la sección "Environment Variables" o "Variables de Entorno"
   - Verifica que `APP_PASSWORD` esté configurada
   - Asegúrate de que esté **habilitada/activada** (no solo creada)

2. **Usar la página de debug**:
   - Accede a `https://tu-dominio.com/debug_auth.html`
   - Esta página te mostrará exactamente qué variables están llegando

3. **Verificar el entrypoint.sh**:
   - El archivo `entrypoint.sh` debe estar inyectando correctamente las variables
   - Verifica que la línea `APP_PASSWORD: "${APP_PASSWORD}",` esté presente

### Soluciones Comunes

#### Solución 1: Variable no configurada en Coolify
- Ve a Coolify → Tu aplicación → Environment Variables
- Agrega `APP_PASSWORD` con el valor deseado
- **IMPORTANTE**: Asegúrate de hacer clic en "Save" o el botón de guardar
- Redeploya la aplicación

#### Solución 2: Variable configurada pero no activada
- Verifica que la variable tenga un "checkbox" marcado o esté "enabled"
- Algunas versiones de Coolify requieren activar explícitamente las variables

#### Solución 3: Problema con caracteres especiales
- Si tu contraseña tiene caracteres especiales (!, @, #, $, etc.)
- Intenta con una contraseña más simple temporalmente
- O escapa los caracteres especiales correctamente

#### Solución 4: Cache de deployment
- Haz un "force redeploy" o "rebuild" completo
- Algunos cambios en variables de entorno requieren rebuild completo

### Verificación Final

1. Después de configurar `APP_PASSWORD` en Coolify:
   - Redeploya la aplicación
   - Ve a `debug_auth.html` para verificar que la variable se está cargando
   - La aplicación principal debería mostrar el modal de autenticación

2. Si sigue sin funcionar:
   - Verifica los logs del contenedor en Coolify
   - Busca mensajes relacionados con variables de entorno

### Contacto

Si el problema persiste después de seguir estos pasos, proporciona:
- Screenshot de las variables de entorno en Coolify
- Screenshot de la página debug_auth.html
- Logs del contenedor si están disponibles