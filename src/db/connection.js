const { MongoClient } = require('mongodb');
require('dotenv').config();

// Configuración de la conexión
const URL = process.env.MONGODB_URI || 'mongodb+srv://admin:admin2025@cultural-bot.6nnf4qj.mongodb.net/cultural-bot?retryWrites=true&w=majority';
const DB_NAME = 'cultural-bot';

let client = null;
let db = null;

const connectToDatabase = async () => {
  if (!client) {
    client = new MongoClient(URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Conectado a MongoDB Atlas');
  }
  return db;
};
const getDb = () => {
  if (!db) {
    throw new Error('La base de datos no está conectada');
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
