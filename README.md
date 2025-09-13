# Bot de WhatsApp para Eventos Culturales UPC

Este es un bot de WhatsApp que se integra con la API de WhatsApp Business y Contentful para proporcionar información sobre los próximos eventos culturales de la UPC.

## Configuración Inicial

### Requisitos Previos

- Node.js (v14 o superior)
- Cuenta de WhatsApp Business API
- Cuenta en Contentful con un espacio configurado

### Instalación

1. Clona el repositorio:
   ```bash
   git clone <repositorio>
   cd cultural-bot
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   - Copia el archivo `.env.example` a `.env`
   - Completa las variables de entorno con tus credenciales

### Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
# Server Configuration
PORT=3000

# WhatsApp Business API Configuration
WHATSAPP_TOKEN=your_whatsapp_business_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=your_webhook_verify_token

# Contentful Configuration
CONTENTFUL_SPACE_ID=your_space_id
CONTENTFUL_ACCESS_TOKEN=your_access_token
CONTENTFUL_ENVIRONMENT=master
```

## 📚 Funcionalidades

### Módulo de Base de Datos
- **Conexión a MongoDB**: Configuración y manejo de la conexión a la base de datos
- **Modelo de Usuario**: Estructura para almacenar información de los usuarios que interactúan con el bot
  - Número de teléfono
  - Nombre (opcional)
  - Email (opcional)
  - Preferencias de notificación
  - Historial de interacciones
  - Contador de mensajes

### Módulo de WhatsApp
- **Recepción de Mensajes**: Procesamiento de mensajes entrantes de WhatsApp
- **Envío de Mensajes**: Envío de respuestas automáticas
- **Manejo de Medios**: Procesamiento de imágenes y archivos multimedia
- **Deduplicación**: Evita el procesamiento duplicado de mensajes

### Módulo de Eventos
- **Integración con Contentful**: Obtención de eventos culturales
- **Formateo de Eventos**: Presentación consistente de la información de eventos
- **Filtrado**: Búsqueda de eventos por fecha, categoría, etc.

### Módulo de Usuarios
- **Registro Automático**: Creación de perfiles al primer mensaje
- **Seguimiento de Interacciones**: Registro de la actividad del usuario
- **Preferencias**: Almacenamiento de preferencias de notificación
- **Estadísticas**: Métricas de uso del bot

### API Web
- **Webhook**: Endpoint para recibir notificaciones de WhatsApp
- **Rutas de Administración**: Para monitoreo y gestión
- **Manejo de Errores**: Logging y recuperación de fallos

## 🗑️ Deprecated/Historical

### Características eliminadas o reemplazadas
- **Almacenamiento en Memoria**: Reemplazado por MongoDB para persistencia
- **Guardado de Media IDs**: Se eliminó la lógica de guardar IDs de medios en Contentful

## 🛠 Configuración de Contentful

1. Crea un espacio en Contentful si aún no tienes uno.
2. Crea un Content Type llamado "event" con los siguientes campos:
   - `title` (Texto corto, requerido)
   - `description` (Texto largo, opcional)
   - `date` (Fecha y hora, requerido)
   - `time` (Texto corto, opcional)
   - `location` (Texto corto, opcional)
   - `image` (Medios, opcional)
3. Asegúrate de publicar el Content Type.
4. Crea algunas entradas de eventos de ejemplo.

## Configuración del Webhook de WhatsApp

1. Configura un servidor HTTPS (puedes usar ngrok para desarrollo local).
2. Configura el webhook en el panel de desarrolladores de Meta:
   - URL: `https://tudominio.com/webhook`
   - Token de verificación: El mismo que configuraste en `.env` como `VERIFY_TOKEN`

## Uso

### Iniciar el servidor

```bash
# Modo desarrollo (con recarga automática)
npm run dev

# Modo producción
npm start
```

### Comandos del Bot

- **Hola**: Muestra el mensaje de bienvenida
- **Eventos** o **Próximos eventos**: Muestra la lista de próximos eventos culturales
- **Ayuda**: Muestra los comandos disponibles

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
