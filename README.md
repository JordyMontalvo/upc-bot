# Bot de WhatsApp para Eventos Culturales UPC

Este es un bot de WhatsApp que se integra con la API de WhatsApp Business y Contentful para proporcionar información sobre los próximos eventos culturales de la UPC.

## 📚 Funcionalidades

### 🤖 Bot de WhatsApp
- **Recepción de mensajes**: Procesa mensajes de texto entrantes
- **Respuesta automática**: Responde solo a la palabra "eventos"
- **Deduplicación**: Evita procesar mensajes duplicados
- **Envío de mensajes de texto**: Mensajes formateados con información de eventos
- **Envío de imágenes**: Imágenes de eventos con captions informativos

### 📅 Gestión de Eventos
- **Integración con Contentful**: Obtiene eventos culturales desde CMS
- **Eventos futuros**: Prioriza eventos próximos (máximo 3)
- **Eventos pasados**: Si no hay futuros, muestra los 2 más recientes
- **Formato de eventos**: Cards optimizados para móvil con:
  - Título del evento
  - Fecha y hora formateadas
  - Ubicación
  - Precio
  - URL del evento
  - Imagen del evento

### 🗄️ Base de Datos
- **MongoDB Atlas**: Almacenamiento en la nube
- **Colección contacts**: Almacena contactos y mensajes
  - Número de teléfono
  - Contador de mensajes
  - Historial de mensajes con timestamps
- **Colección whatsapp_images**: Cache de imágenes
  - URL original de Contentful
  - ID de imagen de WhatsApp
  - Fecha de subida y expiración (25 días)

### 🖼️ Sistema de Cache de Imágenes
- **Cache de WhatsApp**: Almacena IDs de imágenes de WhatsApp para reutilizar
- **URLs de Contentful**: Cachea la relación entre URL original e ID de WhatsApp
- **Manejo de expiración**: Limpia imágenes vencidas automáticamente (25 días)
- **Optimización de ancho de banda**: Solo sube cada imagen una vez
- **Mejor rendimiento**: Respuesta más rápida al reutilizar imágenes

### 🌐 API Web
- **Webhook de WhatsApp**: Endpoint para recibir notificaciones
- **Verificación de webhook**: Validación con token personalizado
- **Ruta de monitoreo**: `/contacts` para ver contactos y estadísticas
- **Auto-liberación de puerto**: Libera puerto 3000 automáticamente al iniciar

### 🔧 Características Técnicas
- **Manejo de errores**: Logs detallados para debugging
- **Validación de mensajes**: Solo procesa mensajes de texto válidos
- **Límite de eventos**: Máximo 3 eventos por respuesta
- **Formato de fecha**: Localizado para Perú (es-PE)
- **URLs clickeables**: Enlaces directos a eventos culturales

### Comandos del Bot

- **Eventos**: Muestra la lista de próximos eventos culturales con imágenes y detalles completos

## Estructura del Proyecto

```
cultural-bot/
├── src/
│   ├── controllers/     # Controladores para manejar las solicitudes
│   ├── routes/         # Definición de rutas de la API
│   ├── services/       # Lógica de negocio y servicios externos
│   └── app.js          # Punto de entrada de la aplicación
├── .env                # Variables de entorno (no incluido en el control de versiones)
├── .gitignore          # Archivos y carpetas a ignorar por Git
└── package.json        # Dependencias y scripts
```

## Despliegue

Puedes desplegar este bot en cualquier servicio de alojamiento que soporte Node.js, como:
- Heroku
- Vercel
- AWS Elastic Beanstalk
- Google Cloud Run

## Licencia

Este proyecto está bajo la Licencia ISC.
