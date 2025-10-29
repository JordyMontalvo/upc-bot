require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const webhookRoutes = require('./routes/webhook');
const { connectToDatabase } = require('./db/connection');

const app = express();

// Middleware
app.use(express.json());

// Middleware para asegurar conexión a la base de datos en Vercel
app.use(async (req, res, next) => {
  // Solo aplicar en rutas que requieren BD (excepto verificación de webhook)
  if (req.path === '/webhook' && req.method === 'GET') {
    return next(); // La verificación del webhook no necesita BD
  }
  
  try {
    // Asegurar que la BD esté conectada antes de continuar
    const { connectToDatabase } = require('./db/connection');
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('❌ Error al conectar a la BD en middleware:', error);
    // Continuar de todas formas (para que el webhook pueda responder)
    next();
  }
});

// Configurar rutas
// Ruta para verificar el servidor
app.get('/', (req, res) => {
  res.status(200).send('¡El bot de WhatsApp está funcionando correctamente!');
});

// Rutas de webhook de WhatsApp
app.use('/webhook', webhookRoutes);

// Ruta para verificar contactos (solo para desarrollo)
app.get('/contacts', async (req, res) => {
  try {
    const { getAllContacts, getStats } = require('./db/contacts');
    const contacts = await getAllContacts();
    const stats = await getStats();
    res.json({ contacts, stats });
  } catch (error) {
    console.error('Error al obtener contactos:', error);
    res.status(500).json({ error: 'Error al obtener contactos' });
  }
});

// Detectar si estamos en Vercel
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// Función para liberar el puerto 3000 (solo en desarrollo local)
const killPort3000 = () => {
  return new Promise((resolve) => {
    console.log('🧹 Liberando puerto 3000...');
    exec('lsof -ti:3000 | xargs kill -9', (error) => {
      if (error) {
        console.log('✅ Puerto 3000 ya está libre');
      } else {
        console.log('✅ Puerto 3000 liberado exitosamente');
      }
      // Esperar un momento para que se libere completamente
      setTimeout(resolve, 1000);
    });
  });
};

// Iniciar servidor solo en desarrollo local (no en Vercel)
if (!isVercel) {
  const startServer = async () => {
    try {
      // Liberar puerto 3000 antes de iniciar
      await killPort3000();
      
      await connectToDatabase();
      console.log('✅ Base de datos conectada');
      
      // Iniciar el servidor en puerto 3000
      const PORT = process.env.PORT || 3000;
      
      app.listen(PORT, () => {
        console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
        console.log(`📱 Webhook de WhatsApp: http://localhost:${PORT}/webhook`);
      });
      
    } catch (error) {
      console.error('❌ No se pudo conectar a la base de datos:', error);
      process.exit(1);
    }
  };

  startServer();
} else {
  // En Vercel, conectar a la BD cuando se carga el módulo (puede cachearse)
  connectToDatabase().catch(error => {
    console.error('❌ Error al conectar a la base de datos:', error);
  });
}

// Exportar la app para Vercel (serverless function)
module.exports = app;
