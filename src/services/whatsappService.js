const axios = require('axios');
const FormData = require('form-data');
const { getWhatsAppImage, saveWhatsAppImage } = require('../db/contacts');

// Enviar un mensaje de texto a través de la API de WhatsApp
const sendTextMessage = async (phoneNumberId, to, text) => {
  console.log(`[WHATSAPP] Enviando mensaje de texto a ${to}: ${text}`);
  
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { 
          body: text
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`[WHATSAPP] ✅ Mensaje enviado exitosamente a ${to}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al enviar mensaje por WhatsApp:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    throw error;
  }
};

// Subir un archivo multimedia a WhatsApp (con cache)
const uploadMedia = async (url) => {
  console.log(`[WHATSAPP] Verificando cache para: ${url}`);
  
  try {
    // Verificar si ya está en cache
    const cachedImageId = await getWhatsAppImage(url);
    if (cachedImageId) {
      console.log(`[WHATSAPP] ✅ Usando imagen desde cache: ${cachedImageId}`);
      return cachedImageId;
    }
    
    // Si no está en cache, subir a WhatsApp
    console.log(`[WHATSAPP] Subiendo imagen nueva a WhatsApp: ${url}`);
    
    // Descargar la imagen
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    // Crear form-data
    const form = new FormData();
    form.append('file', response.data, {
      filename: `event-${Date.now()}.jpg`,
      contentType: 'image/jpeg'
    });
    form.append('messaging_product', 'whatsapp');
    form.append('type', 'image/jpeg');

    // Subir a WhatsApp
    const uploadResponse = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
        }
      }
    );
    
    const whatsappImageId = uploadResponse.data.id;
    console.log(`[WHATSAPP] ✅ Media subido exitosamente. ID: ${whatsappImageId}`);
    
    // Guardar en cache
    await saveWhatsAppImage(url, whatsappImageId);
    
    return whatsappImageId;
  } catch (error) {
    console.error('❌ Error al subir medio a WhatsApp:', error.response?.data || error.message);
    throw error;
  }
};

// Enviar mensaje con imagen
const sendImageMessage = async (phoneNumberId, to, imageId, caption = '') => {
  console.log(`[WHATSAPP] Enviando imagen con ID: ${imageId} a ${to}`);
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          id: imageId,
          caption: caption
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`[WHATSAPP] ✅ Imagen enviada exitosamente a ${to}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al enviar imagen por WhatsApp:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    throw error;
  }
};

// Enviar mensaje con botones
const sendButtonMessage = async (phoneNumberId, to, text, buttons) => {
  console.log(`[WHATSAPP] Enviando mensaje con botones a ${to}`);
  
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: text
          },
          action: {
            buttons: buttons.map((button, index) => ({
              type: 'reply',
              reply: {
                id: `btn_${index}`,
                title: button.title
              }
            }))
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`[WHATSAPP] ✅ Mensaje con botones enviado exitosamente a ${to}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al enviar mensaje con botones:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    throw error;
  }
};

module.exports = {
  sendTextMessage,
  uploadMedia,
  sendImageMessage,
  sendButtonMessage
};
