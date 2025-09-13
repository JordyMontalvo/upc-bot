const { getDb } = require('./connection');

// Guardar o actualizar usuario (consolidado)
async function saveUser(phoneNumber, message = null) {
  const db = getDb();
  const now = new Date();
  
  // Construir el objeto de actualización
  const updateData = {
    $set: { 
      phoneNumber
    },
    $inc: { messageCount: 1 }
  };
  
  // Si hay mensaje, agregarlo al historial
  if (message) {
    updateData.$push = {
      messages: {
        message,
        createdAt: now
      }
    };
  }
  
  const result = await db.collection('contacts').updateOne(
    { phoneNumber },
    updateData,
    { upsert: true }
  );
  
  console.log(`[MONGODB] Contacto ${phoneNumber} guardado. Mensaje: ${message ? 'Sí' : 'No'}`);
  return result.upsertedId || phoneNumber;
}

// Verificar si contacto existe
async function contactExists(phoneNumber) {
  const db = getDb();
  const contact = await db.collection('contacts').findOne({ phoneNumber });
  return !!contact;
}

// Obtener contacto completo
async function getContact(phoneNumber) {
  const db = getDb();
  return await db.collection('contacts').findOne({ phoneNumber });
}

// Obtener todos los contactos
async function getAllContacts() {
  const db = getDb();
  return await db.collection('contacts')
    .find({})
    .sort({ lastSeen: -1 })
    .toArray();
}

// Obtener estadísticas
async function getStats() {
  const db = getDb();
  const totalContacts = await db.collection('contacts').countDocuments();
  const totalMessages = await db.collection('contacts').aggregate([
    { $group: { _id: null, total: { $sum: '$messageCount' } } }
  ]).toArray();
  
  return {
    totalContacts,
    totalMessages: totalMessages[0]?.total || 0
  };
}

// Guardar imagen de WhatsApp en cache
async function saveWhatsAppImage(originalUrl, whatsappImageId) {
  const db = getDb();
  const now = new Date();
  
  const result = await db.collection('whatsapp_images').updateOne(
    { originalUrl },
    { 
      $set: { 
        originalUrl,
        whatsappImageId,
        uploadedAt: now,
        expiresAt: new Date(now.getTime() + (25 * 24 * 60 * 60 * 1000)) // 25 días
      }
    },
    { upsert: true }
  );
  
  console.log(`[MONGODB] Imagen cacheada: ${originalUrl} → ${whatsappImageId}`);
  return result.upsertedId || originalUrl;
}

// Obtener imagen de WhatsApp desde cache
async function getWhatsAppImage(originalUrl) {
  const db = getDb();
  const now = new Date();
  
  const image = await db.collection('whatsapp_images').findOne({
    originalUrl,
    expiresAt: { $gt: now } // Solo si no ha expirado
  });
  
  if (image) {
    console.log(`[MONGODB] Imagen encontrada en cache: ${originalUrl}`);
    return image.whatsappImageId;
  }
  
  return null;
}

// Limpiar imágenes expiradas
async function cleanExpiredImages() {
  const db = getDb();
  const now = new Date();
  
  const result = await db.collection('whatsapp_images').deleteMany({
    expiresAt: { $lt: now }
  });
  
  if (result.deletedCount > 0) {
    console.log(`[MONGODB] ${result.deletedCount} imágenes expiradas eliminadas`);
  }
  
  return result.deletedCount;
}

module.exports = {
  saveUser,
  contactExists,
  getContact,
  getAllContacts,
  getStats,
  saveWhatsAppImage,
  getWhatsAppImage,
  cleanExpiredImages
};
