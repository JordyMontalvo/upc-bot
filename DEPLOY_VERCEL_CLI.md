# Despliegue con Vercel CLI (Sin Git)

## Instalación del Vercel CLI

```bash
# Instalar globalmente
npm install -g vercel

# O usar npx (sin instalación global)
npx vercel
```

## Despliegue Directo

### 1. Desde la carpeta del proyecto:

```bash
# Inicializar proyecto en Vercel
vercel

# O si ya tienes una cuenta
vercel login
vercel
```

### 2. Seguir las instrucciones:

- **Set up and deploy?** → `Y`
- **Which scope?** → Selecciona tu cuenta
- **Link to existing project?** → `N` (para proyecto nuevo)
- **What's your project's name?** → `cultural-bot` (o el nombre que prefieras)
- **In which directory is your code located?** → `./` (directorio actual)

### 3. Configurar variables de entorno:

```bash
# Agregar variables una por una
vercel env add WHATSAPP_TOKEN
vercel env add WHATSAPP_PHONE_NUMBER_ID
vercel env add FACEBOOK_APP_ID
vercel env add FACEBOOK_APP_SECRET
vercel env add MONGODB_URI
vercel env add CONTENTFUL_SPACE_ID
vercel env add CONTENTFUL_ACCESS_TOKEN
vercel env add VERIFY_TOKEN

# O agregar todas de una vez
vercel env add WHATSAPP_TOKEN production
vercel env add WHATSAPP_PHONE_NUMBER_ID production
vercel env add FACEBOOK_APP_ID production
vercel env add FACEBOOK_APP_SECRET production
vercel env add MONGODB_URI production
vercel env add CONTENTFUL_SPACE_ID production
vercel env add CONTENTFUL_ACCESS_TOKEN production
vercel env add VERIFY_TOKEN production
```

### 4. Desplegar:

```bash
# Desplegar a producción
vercel --prod

# O solo desplegar (preview)
vercel
```

## Comandos Útiles

```bash
# Ver el estado del proyecto
vercel ls

# Ver logs en tiempo real
vercel logs

# Abrir el proyecto en el navegador
vercel open

# Ver información del proyecto
vercel inspect

# Eliminar deployment
vercel remove [deployment-url]
```

## Ventajas del CLI

- ✅ No necesitas Git
- ✅ Despliegue instantáneo
- ✅ Configuración local
- ✅ Variables de entorno desde terminal
- ✅ Logs en tiempo real
- ✅ Múltiples ambientes (preview/production)

## Notas Importantes

- El CLI detectará automáticamente `vercel.json`
- Las variables de entorno se configuran por ambiente
- Puedes tener múltiples deployments (preview y production)
- El webhook será: `https://tu-proyecto.vercel.app/webhook`
