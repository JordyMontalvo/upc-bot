const { MongoClient } = require('mongodb');
require('dotenv').config();

// Configuración de la conexión
const URL = process.env.MONGODB_URI || 'mongodb+srv://admin:admin2025@cultural-bot.6nnf4qj.mongodb.net/cultural-bot?retryWrites=true&w=majority';
const DB_NAME = 'cultural-bot';

let client = null;
let db = null;
let connectingPromise = null; // Promesa de conexión en progreso

const connectToDatabase = async () => {
  // Si ya está conectado, retornar la BD
  if (db) {
    return db;
  }
  
  // Si hay una conexión en progreso, esperar a que termine
  if (connectingPromise) {
    return connectingPromise;
  }
  
  // Iniciar nueva conexión
  connectingPromise = (async () => {
    try {
      if (!client) {
        client = new MongoClient(URL);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('✅ Conectado a MongoDB Atlas');
      }
      connectingPromise = null; // Limpiar la promesa
      return db;
    } catch (error) {
      connectingPromise = null; // Limpiar la promesa en caso de error
      throw error;
    }
  })();
  
  return connectingPromise;
};

// Modificar getDb para que intente conectar si no está conectado
const getDb = async () => {
  if (!db) {
    // Intentar conectar si no está conectado
    await connectToDatabase();
  }
  return db;
};

const closeConnection = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('🔌 Conexión a MongoDB cerrada');
  }
};

// Manejar cierre limpio
process.on('SIGINT', closeConnection);

module.exports = {
  connectToDatabase,
  getDb,
  closeConnection
};
