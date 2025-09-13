const { saveUser } = require('../db/contacts');
const { processMessage } = require('../services/messageService');

// Almacenar IDs de mensajes ya procesados
const processedMessages = new Set();

// Verificar el token del webhook
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }
  
  res.sendStatus(403);
};

// Manejar los mensajes entrantes
const handleWebhook = async (req, res) => {
  try {
    // Verificar si es una verificación del webhook
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
      return verifyWebhook(req, res);
    }

    // Verificar que es un mensaje de WhatsApp válido
    const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      console.log('No hay mensaje válido en el webhook');
      return res.sendStatus(200);
    }
    
    // Solo procesar mensajes de texto entrantes
    if (message.type !== 'text') {
      console.log('Mensaje no es de texto, ignorando...');
      return res.sendStatus(200);
    }

    const { id: messageId, from: phoneNumber, text } = message;
    const messageText = text?.body || '';

    // Evitar procesamiento duplicado
    if (processedMessages.has(messageId)) {
      console.log(`[DUPLICADO] Mensaje ${messageId} ya procesado`);
      return res.sendStatus(200);
    }
    processedMessages.add(messageId);

    // Limitar el tamaño del conjunto de mensajes procesados
    if (processedMessages.size > 1000) {
      const first = processedMessages.values().next().value;
      processedMessages.delete(first);
    }

    console.log(`📱 Mensaje recibido de ${phoneNumber}: ${messageText}`);
    
    try {
      // Guardar contacto y mensaje en una sola operación
      await saveUser(phoneNumber, messageText);
      
      // Solo responder a la palabra 'eventos'
      if (messageText.toLowerCase() === 'eventos') {
        // Usar el phoneNumberId del webhook y el número del usuario
        await processMessage(process.env.WHATSAPP_PHONE_NUMBER_ID, phoneNumber, messageText);
      }
      
      console.log(`✅ Mensaje ${messageId} procesado`);
    } catch (error) {
      console.error(`❌ Error al procesar mensaje ${messageId}:`, error);
    }

    // Responder con éxito
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error en el webhook:', error);
    res.sendStatus(500);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook
};
