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

// Registrar datos del usuario
async function registerUser(phoneNumber, userData) {
  const db = getDb();
  const now = new Date();
  
  const result = await db.collection('contacts').updateOne(
    { phoneNumber },
    { 
      $set: { 
        phoneNumber,
        name: userData.name,
        dni: userData.dni,
        studentCode: userData.studentCode,
        isRegistered: true,
        registeredAt: now
      }
    },
    { upsert: true }
  );
  
  console.log(`[MONGODB] Usuario ${phoneNumber} registrado: ${userData.name}`);
  return result.upsertedId || phoneNumber;
}

// Verificar si el usuario está registrado
async function isUserRegistered(phoneNumber) {
  const db = getDb();
  const user = await db.collection('contacts').findOne({ 
    phoneNumber,
    isRegistered: true 
  });
  return !!user;
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

// Obtener estado de registro paso a paso
async function getRegistrationState(phoneNumber) {
  const db = getDb();
  const contact = await db.collection('contacts').findOne({ 
    phoneNumber,
    registrationState: { $exists: true }
  });
  
  return contact?.registrationState || null;
}

// Actualizar estado de registro paso a paso
async function updateRegistrationState(phoneNumber, state) {
  const db = getDb();
  const now = new Date();
  
  const result = await db.collection('contacts').updateOne(
    { phoneNumber },
    { 
      $set: { 
        phoneNumber,
        registrationState: {
          ...state,
          updatedAt: now
        }
      }
    },
    { upsert: true }
  );
  
  console.log(`[MONGODB] Estado de registro actualizado para ${phoneNumber}: ${state.step}`);
  return result.upsertedId || phoneNumber;
}

// Completar registro paso a paso
async function completeRegistration(phoneNumber, userData) {
  const db = getDb();
  const now = new Date();
  
  const result = await db.collection('contacts').updateOne(
    { phoneNumber },
    { 
      $set: { 
        phoneNumber,
        name: userData.name,
        dni: userData.dni,
        studentCode: userData.studentCode,
        isRegistered: true,
        registeredAt: now
      },
      $unset: { registrationState: "" } // Limpiar el estado temporal
    },
    { upsert: true }
  );
  
  console.log(`[MONGODB] Registro completado para ${phoneNumber}: ${userData.name}`);
  return result.upsertedId || phoneNumber;
}

module.exports = {
  saveUser,
  registerUser,
  isUserRegistered,
  contactExists,
  getContact,
  getAllContacts,
  getStats,
  saveWhatsAppImage,
  getWhatsAppImage,
  cleanExpiredImages,
  getRegistrationState,
  updateRegistrationState,
  completeRegistration
};
