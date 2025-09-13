require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const webhookRoutes = require('./routes/webhook');
const { connectToDatabase } = require('./db/connection');

const app = express();

// Middleware
app.use(express.json());

// Función para liberar el puerto 3000
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

// Conectar a la base de datos al iniciar
const startServer = async () => {
  try {
    // Liberar puerto 3000 antes de iniciar
    await killPort3000();
    
    await connectToDatabase();
    console.log('✅ Base de datos conectada');
    
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

module.exports = app;
