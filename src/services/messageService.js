const { sendTextMessage, uploadMedia, sendImageMessage, sendButtonMessage } = require('./whatsappService');
const { getUpcomingEvents } = require('./contentfulService');
const { isUserRegistered, registerUser, getRegistrationState, updateRegistrationState, completeRegistration, isOptedOut, optOut } = require('../db/contacts');

// Configuración de modos de registro
const REGISTRATION_MODE = 2; // 1 = mensaje completo, 2 = paso a paso

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
    console.log(`[PROCESS] Procesando mensaje: "${message}" -> "${lowerCaseMessage}"`);
    
    // Comandos de opt-out (funcionan siempre, incluso si no está registrado)
    if (isOptOutCommand(lowerCaseMessage)) {
      await handleOptOut(phoneNumberId, from);
      return;
    }
    
    // Manejar botón de configuración
    if (lowerCaseMessage === 'configuración' || lowerCaseMessage === 'configuracion') {
      await handleConfiguration(phoneNumberId, from);
      return;
    }
    
    // Verificar si el usuario está registrado
    const isRegistered = await isUserRegistered(from);
    console.log(`[PROCESS] Usuario ${from} registrado: ${isRegistered}`);
    
    if (!isRegistered) {
      // Si no está registrado, pedir datos
      await sendRegistrationRequest(phoneNumberId, from, message);
    } else {
      // Verificar si el usuario se ha dado de baja
      const optedOut = await isOptedOut(from);
      if (optedOut) {
        // Si está dado de baja, solo responder mensajes directos, no enviar automáticamente
        if (lowerCaseMessage === 'eventos') {
          await sendTextMessage(
            phoneNumberId,
            from,
            '📵 Has solicitado dejar de recibir mensajes automáticos.\n\nYa no recibirás más mensajes de campañas.'
          );
        } else {
          await sendTextMessage(
            phoneNumberId,
            from,
            '📵 Has solicitado dejar de recibir mensajes automáticos.\n\nEscribe *eventos* para ver eventos.'
          );
        }
        return;
      }
      
      // Si está registrado y no se ha dado de baja, procesar mensaje normal
      if (lowerCaseMessage === 'eventos') {
        console.log('[PROCESS] Enviando eventos...');
        await sendUpcomingEvents(phoneNumberId, from);
      } else {
        console.log('[PROCESS] Enviando botón de eventos...');
        await sendEventButton(phoneNumberId, from);
      }
    }
    
  } catch (error) {
    console.error('Error en processMessage:', error);
  }
};

// Verificar si el mensaje es un comando de opt-out
const isOptOutCommand = (message) => {
  const optOutKeywords = [
    'darse de baja',
    'darme de baja',
    'baja',
    'cancelar suscripción',
    'cancelar suscripcion',
    'no recibir mensajes',
    'no quiero recibir',
    'opt out',
    'unsubscribe',
    'desactivar',
    'desactivar mensajes'
  ];
  
  return optOutKeywords.some(keyword => message.includes(keyword));
};

// Manejar botón de configuración
const handleConfiguration = async (phoneNumberId, to) => {
  try {
    console.log(`[CONFIG] Mostrando configuración para ${to}`);
    const message = `📢 *Confirmación de suscripción*\n\nHola! 👋\n\nQueremos confirmar si deseas seguir recibiendo información sobre eventos culturales y campañas de la UPC.\n\nSi *no deseas* seguir recibiendo mensajes, escribe:\n❌ *darse de baja* o *baja*\n\nTu respuesta es importante para nosotros. 😊`;
    
    await sendTextMessage(phoneNumberId, to, message);
    console.log(`[CONFIG] ✅ Mensaje de configuración enviado a ${to}`);
    
  } catch (error) {
    console.error('Error al enviar menú de configuración:', error);
    // Fallback: enviar mensaje de texto simple
    await sendTextMessage(
      phoneNumberId, 
      to, 
      '📢 *Confirmación de suscripción*\n\nHola! 👋\n\nQueremos confirmar si deseas seguir recibiendo información sobre eventos culturales y campañas de la UPC.\n\nSi *no deseas* seguir recibiendo mensajes, escribe:\n❌ *darse de baja* o *baja*\n\nTu respuesta es importante para nosotros. 😊'
    );
  }
};

// Manejar opt-out (darse de baja)
const handleOptOut = async (phoneNumberId, to) => {
  try {
    const alreadyOptedOut = await isOptedOut(to);
    
    if (alreadyOptedOut) {
      await sendTextMessage(
        phoneNumberId,
        to,
        '📵 Ya estás dado de baja. No recibirás más mensajes automáticos ni campañas.'
      );
    } else {
      await optOut(to);
      await sendTextMessage(
        phoneNumberId,
        to,
        '👋 *¡Nos vemos luego!*\n\nGracias por haber sido parte de nuestra comunidad de eventos culturales UPC.\n\nEsperamos verte nuevamente pronto.\n\n*UPC* 🎓'
      );
    }
  } catch (error) {
    console.error('Error al procesar opt-out:', error);
    await sendTextMessage(
      phoneNumberId,
      to,
      '❌ Hubo un error al procesar tu solicitud. Intenta nuevamente.'
    );
  }
};


// Manejar solicitud de registro
const sendRegistrationRequest = async (phoneNumberId, to, message) => {
  try {
    console.log(`[REGISTER] Procesando registro para ${to}: "${message}"`);
    
    if (REGISTRATION_MODE === 1) {
      // Modo 1: Registro completo en un mensaje
      const registrationData = parseRegistrationData(message);
      
      if (registrationData) {
        // Registrar usuario
        await registerUser(to, registrationData);
        await sendTextMessage(
          phoneNumberId, 
          to, 
          `¡Perfecto! ✅\n\nTe has registrado exitosamente:\n\n👤 *Nombre:* ${registrationData.name}\n🆔 *DNI:* ${registrationData.dni}\n🎓 *Código:* ${registrationData.studentCode}\n\n¡Ahora ya puedes consultar los eventos culturales!`
        );
        
        // Enviar botón de eventos después del registro
        await sendEventButton(phoneNumberId, to);
      } else {
        // Pedir datos de registro
        await sendTextMessage(
          phoneNumberId, 
          to, 
          `¡Hola! 👋\n\nSoy el bot de eventos culturales de la UPC.\n\nPara acceder a los eventos, necesito que te registres primero.\n\n📝 *Envía tus datos en este formato:*\n\nNombre: [Tu nombre completo]\nDNI: [Tu DNI]\nCódigo: [Tu código de estudiante]\n\n*Ejemplo:*\nNombre: Juan Pérez García\nDNI: 12345678\nCódigo: 20240001`
        );
      }
    } else {
      // Modo 2: Registro paso a paso
      await handleStepByStepRegistration(phoneNumberId, to, message);
    }
    
  } catch (error) {
    console.error('Error en registro:', error);
    await sendTextMessage(
      phoneNumberId, 
      to, 
      '❌ Hubo un error en el registro. Intenta nuevamente.'
    );
  }
};

// Parsear datos de registro del mensaje
const parseRegistrationData = (message) => {
  const lines = message.split('\n').map(line => line.trim());
  
  let name = '';
  let dni = '';
  let studentCode = '';
  
  for (const line of lines) {
    if (line.toLowerCase().startsWith('nombre:')) {
      name = line.substring(7).trim();
    } else if (line.toLowerCase().startsWith('dni:')) {
      dni = line.substring(4).trim();
    } else if (line.toLowerCase().startsWith('código:') || line.toLowerCase().startsWith('codigo:')) {
      studentCode = line.substring(7).trim();
    }
  }
  
  // Validar que todos los campos estén presentes
  if (name && dni && studentCode) {
    return { name, dni, studentCode };
  }
  
  return null;
};

// Manejar registro paso a paso (Modo 2)
const handleStepByStepRegistration = async (phoneNumberId, to, message) => {
  try {
    console.log(`[REGISTER-STEP] Procesando paso de registro para ${to}: "${message}"`);
    
    // Obtener estado actual del registro
    const currentState = await getRegistrationState(to);
    console.log(`[REGISTER-STEP] Estado actual: ${JSON.stringify(currentState)}`);
    
    if (!currentState) {
      // Primer paso: pedir nombre
      await updateRegistrationState(to, { step: 'name', data: {} });
      await sendTextMessage(
        phoneNumberId,
        to,
        `¡Hola! 👋\n\nSoy el bot de eventos culturales de la UPC.\n\nPara acceder a los eventos, necesito que te registres primero.\n\n📝 *Paso 1/3:*\n\n¿Cuál es tu nombre completo?`
      );
    } else if (currentState.step === 'name') {
      // Segundo paso: pedir DNI
      const name = message.trim();
      if (name.length < 2) {
        await sendTextMessage(
          phoneNumberId,
          to,
          '❌ Por favor, ingresa un nombre válido (mínimo 2 caracteres).'
        );
        return;
      }
      
      await updateRegistrationState(to, { 
        step: 'dni', 
        data: { ...currentState.data, name } 
      });
      await sendTextMessage(
        phoneNumberId,
        to,
        `✅ Nombre guardado: *${name}*\n\n📝 *Paso 2/3:*\n\n¿Cuál es tu DNI?`
      );
    } else if (currentState.step === 'dni') {
      // Tercer paso: pedir código de estudiante
      const dni = message.trim();
      if (!/^\d{8}$/.test(dni)) {
        await sendTextMessage(
          phoneNumberId,
          to,
          '❌ Por favor, ingresa un DNI válido (8 dígitos).'
        );
        return;
      }
      
      await updateRegistrationState(to, { 
        step: 'studentCode', 
        data: { ...currentState.data, dni } 
      });
      
      // Enviar mensaje con botón para "No tengo código"
      const studentCodeMessage = `✅ DNI guardado: *${dni}*\n\n📝 *Paso 3/3:*\n\n¿Cuál es tu código de estudiante?`;
      const buttons = [
        { title: '❌ No tengo código' }
      ];
      
      try {
        await sendButtonMessage(phoneNumberId, to, studentCodeMessage, buttons);
      } catch (error) {
        console.error('Error al enviar botón, enviando mensaje de texto:', error);
        await sendTextMessage(
          phoneNumberId,
          to,
          `${studentCodeMessage}\n\nSi no tienes código, escribe: *no tengo*`
        );
      }
    } else if (currentState.step === 'studentCode') {
      // Completar registro
      let studentCode = message.trim();
      
      // Verificar si el usuario presionó "No tengo código" o escribió algo similar
      const lowerMessage = message.toLowerCase().trim();
      if (lowerMessage === 'no tengo código' || lowerMessage === 'no tengo codigo' || lowerMessage === 'no tengo' || lowerMessage.includes('no tengo')) {
        studentCode = ''; // String vacío si no tiene código
      } else if (studentCode.length > 0 && studentCode.length < 3) {
        await sendTextMessage(
          phoneNumberId,
          to,
          '❌ Por favor, ingresa un código de estudiante válido (mínimo 3 caracteres) o presiona "No tengo código".'
        );
        return;
      }
      
      // Completar el registro
      const registrationData = {
        ...currentState.data,
        studentCode: studentCode || '' // Asegurar que sea string vacío si no hay código
      };
      
      await completeRegistration(to, registrationData);
      
      // Construir mensaje de confirmación (solo mostrar código si tiene valor)
      let confirmationMessage = `¡Perfecto! ✅\n\nTe has registrado exitosamente:\n\n👤 *Nombre:* ${registrationData.name}\n🆔 *DNI:* ${registrationData.dni}`;
      
      if (registrationData.studentCode && registrationData.studentCode.trim().length > 0) {
        confirmationMessage += `\n🎓 *Código:* ${registrationData.studentCode}`;
      }
      
      confirmationMessage += `\n\n¡Ahora ya puedes consultar los eventos culturales!`;
      
      await sendTextMessage(
        phoneNumberId,
        to,
        confirmationMessage
      );
      
      // Enviar botón de eventos después del registro
      await sendEventButton(phoneNumberId, to);
    }
    
  } catch (error) {
    console.error('Error en registro paso a paso:', error);
    await sendTextMessage(
      phoneNumberId,
      to,
      '❌ Hubo un error en el registro. Intenta nuevamente escribiendo "hola".'
    );
  }
};

// Enviar botón para consultar eventos
const sendEventButton = async (phoneNumberId, to) => {
  try {
    console.log(`[BUTTON] Enviando botón de eventos a ${to}`);
    const message = `¡Hola! 👋\n\nSoy el bot de eventos culturales de la UPC. Para ver los próximos eventos, usa el botón de abajo:`;
    
    const buttons = [
      { title: '📅 Ver Eventos' },
      { title: '⚙️ Configuración' }
    ];
    
    await sendButtonMessage(phoneNumberId, to, message, buttons);
    console.log(`[BUTTON] ✅ Botón enviado exitosamente a ${to}`);
    
  } catch (error) {
    console.error('Error al enviar botón de eventos:', error);
    console.log(`[BUTTON] Fallback: enviando mensaje de texto a ${to}`);
    // Fallback: enviar mensaje de texto simple
    await sendTextMessage(
      phoneNumberId, 
      to, 
      '¡Hola! 👋\n\nSoy el bot de eventos culturales de la UPC.\n\nPara ver los próximos eventos, escribe: *eventos*'
    );
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
