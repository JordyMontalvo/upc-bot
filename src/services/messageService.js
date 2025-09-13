const { sendTextMessage, uploadMedia, sendImageMessage } = require('./whatsappService');
const { getUpcomingEvents } = require('./contentfulService');

// Formatear el mensaje del evento para WhatsApp
const formatEventMessage = (event) => {
  let message = `🎭 *${event.title}*\n\n`;
  
  // Fecha y hora
  if (event.date) {
    message += `📅 *Fecha:* ${event.date}\n`;
  }
  if (event.time && event.time !== 'Horario por confirmar') {
    message += `🕐 *Hora:* ${event.time}\n`;
  }
  
  // Ubicación
  if (event.location) {
    message += `📍 *Lugar:* ${event.location}\n`;
  }
  
  // Precio
  if (event.price) {
    message += `💰 *Precio:* ${event.price}\n`;
  }
  
  // Separador
  message += `\n${'─'.repeat(25)}\n`;
  
  // URL del evento
  if (event.link) {
    message += `🔗 *Más información:*\n${event.link}`;
  }
  
  return message;
};

// Procesar el mensaje recibido
const processMessage = async (phoneNumberId, from, message) => {
  try {
    const lowerCaseMessage = message.toLowerCase().trim();
    
    // Solo responder a "eventos"
    if (lowerCaseMessage === 'eventos') {
      await sendUpcomingEvents(phoneNumberId, from);
    }
    // No responder a otros mensajes
    
  } catch (error) {
    console.error('Error en processMessage:', error);
  }
};

// Enviar lista de próximos eventos (máximo 3)
const sendUpcomingEvents = async (phoneNumberId, to) => {
  try {
    const events = await getUpcomingEvents();
    const maxEvents = Math.min(events.length, 3); // Tomar máximo 3 eventos
    
    if (maxEvents === 0) {
      await sendTextMessage(
        phoneNumberId,
        to,
        '📅 No hay eventos programados actualmente.'
      );
      return;
    }
    
    // Enviar cada evento como mensaje separado
    for (let i = 0; i < maxEvents; i++) {
      const event = events[i];
      
      // Formatear el mensaje del evento
      const eventMessage = formatEventMessage(event);
      
      if (event.imageUrl) {
        try {
          console.log(`[EVENTOS] Enviando evento ${i + 1}/${maxEvents}: ${event.title}`);
          const imageId = await uploadMedia(event.imageUrl);
          await sendImageMessage(phoneNumberId, to, imageId, eventMessage);
        } catch (imageError) {
          console.error('Error al enviar imagen del evento:', imageError);
          // Si falla la imagen, enviar como texto
          await sendTextMessage(phoneNumberId, to, eventMessage);
        }
      } else {
        // Si no hay imagen, enviar como texto
        await sendTextMessage(phoneNumberId, to, eventMessage);
      }
    }
    
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    await sendTextMessage(
      phoneNumberId,
      to,
      '❌ No se pudieron cargar los eventos en este momento.'
    );
  }
};

module.exports = {
  processMessage
};
