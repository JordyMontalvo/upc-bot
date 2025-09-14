# Bot de WhatsApp para Eventos Culturales UPC

Este es un bot de WhatsApp que se integra con la API de WhatsApp Business y Contentful para proporcionar información sobre los próximos eventos culturales de la UPC.

## 📚 Funcionalidades

### 🤖 Bot de WhatsApp
- **Recepción de mensajes**: Procesa mensajes de texto entrantes
- **Respuesta automática**: Responde solo a la palabra "eventos"
- **Deduplicación**: Evita procesar mensajes duplicados
- **Envío de mensajes de texto**: Mensajes formateados con información de eventos
- **Envío de imágenes**: Imágenes de eventos con captions informativos
- **Mensajes interactivos**: Botones para facilitar la navegación
- **Sistema de registro obligatorio**: Los usuarios deben registrarse antes de ver eventos

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
  - Datos de registro de usuario (nombre, DNI, código de estudiante)
  - Estado de registro paso a paso (temporal)
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

### 👤 Sistema de Registro de Usuarios
- **Registro obligatorio**: Los usuarios deben registrarse antes de consultar eventos
- **Dos modos de registro** (configurable en `messageService.js`):
  - **Modo 1**: Registro completo en un mensaje (formato estructurado)
  - **Modo 2**: Registro paso a paso (pregunta → respuesta) - **Por defecto**
- **Datos requeridos**:
  - Nombre completo
  - DNI (8 dígitos)
  - Código de estudiante
- **Validaciones**:
  - Nombre: mínimo 2 caracteres
  - DNI: exactamente 8 dígitos numéricos
  - Código: mínimo 3 caracteres
- **Experiencia de usuario**:
  - Mensajes claros con indicador de progreso (Paso X/3)
  - Confirmación de cada dato ingresado
  - Mensaje de bienvenida al completar el registro
  - Botón interactivo para consultar eventos después del registro

#### Modo 1 - Registro Completo
```
Usuario envía:
Nombre: Juan Pérez García
DNI: 12345678
Código: 20240001

Bot responde:
¡Perfecto! ✅
Te has registrado exitosamente...
```

#### Modo 2 - Registro Paso a Paso
```
Usuario: "Hola"
Bot: "¿Cuál es tu nombre completo?"

Usuario: "Juan Pérez García"
Bot: "✅ Nombre guardado: Juan Pérez García
     ¿Cuál es tu DNI?"

Usuario: "12345678"
Bot: "✅ DNI guardado: 12345678
     ¿Cuál es tu código de estudiante?"

Usuario: "20240001"
Bot: "¡Perfecto! ✅ Te has registrado exitosamente..."
```

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
- **Mensajes interactivos**: Botones de WhatsApp para mejor UX
- **Configuración flexible**: Variable `REGISTRATION_MODE` para cambiar entre modos
- **Estado de registro**: Persistencia temporal del progreso de registro
- **Script de utilidad**: Intercambio automático de tokens de WhatsApp

### Comandos del Bot

- **"eventos"**: Muestra la lista de próximos eventos culturales con imágenes y detalles completos
- **Botón "Ver Eventos"**: Botón interactivo que envía automáticamente el comando "eventos"
- **Cualquier otro mensaje**: Si el usuario no está registrado, inicia el proceso de registro

### Flujo de Interacción

#### Para Usuarios No Registrados:
1. **Primer mensaje** (ej: "Hola"): Inicia el proceso de registro
2. **Registro paso a paso** (Modo 2 por defecto):
   - Paso 1/3: Pide nombre completo
   - Paso 2/3: Pide DNI (8 dígitos)
   - Paso 3/3: Pide código de estudiante
3. **Después del registro**: Muestra botón "Ver Eventos"

#### Para Usuarios Registrados:
1. **"eventos"** o **botón "Ver Eventos"**: Muestra próximos eventos
2. **Cualquier otro mensaje**: Muestra botón "Ver Eventos"

## Estructura del Proyecto

```
cultural-bot/
├── src/
│   ├── controllers/     # Controladores para manejar las solicitudes
│   ├── routes/         # Definición de rutas de la API
│   ├── services/       # Lógica de negocio y servicios externos
│   └── app.js          # Punto de entrada de la aplicación
├── scripts/
│   ├── exchange-token.js  # Script para intercambiar tokens de WhatsApp
│   └── README.md          # Documentación de scripts
├── .env                # Variables de entorno (no incluido en el control de versiones)
├── .gitignore          # Archivos y carpetas a ignorar por Git
└── package.json        # Dependencias y scripts
```

## 🔧 Scripts de Utilidad

### Intercambio de Tokens de WhatsApp

Script simple para intercambiar tokens de corta duración por tokens de larga duración (60 días):

1. Edita `scripts/exchange-token.js`
2. Reemplaza los valores de `shortLivedToken`, `appId` y `appSecret`
3. Ejecuta: `node scripts/exchange-token.js`

El script mostrará el nuevo token de larga duración.

## Despliegue

### Vercel (Recomendado)

#### Opción 1: Con Vercel CLI (Sin Git)

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Desplegar directamente:**
   ```bash
   # Desde la carpeta del proyecto
   vercel
   
   # Configurar variables de entorno
   vercel env add WHATSAPP_TOKEN
   vercel env add WHATSAPP_PHONE_NUMBER_ID
   # ... (ver DEPLOY_VERCEL_CLI.md para lista completa)
   
   # Desplegar a producción
   vercel --prod
   ```

#### Opción 2: Con GitHub

1. **Subir a GitHub:**
   ```bash
   git add .
   git commit -m "Preparado para Vercel"
   git push origin main
   ```

2. **Conectar con Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Conecta tu repositorio de GitHub
   - Vercel detectará automáticamente la configuración

3. **Configurar variables de entorno:**
   - Ve a Settings > Environment Variables
   - Agrega todas las variables del archivo `VERCEL_ENV.md`

#### Configurar webhook de WhatsApp:
- Usa la URL de Vercel: `https://tu-proyecto.vercel.app/webhook`
- Configura el token de verificación en ambas plataformas

### Otros servicios de alojamiento:
- Heroku
- AWS Elastic Beanstalk
- Google Cloud Run

## Licencia

Este proyecto está bajo la Licencia ISC.
