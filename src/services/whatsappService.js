const axios = require('axios');
const FormData = require('form-data');

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

// Subir un archivo multimedia a WhatsApp
const uploadMedia = async (url) => {
  console.log(`[WHATSAPP] Subiendo media desde: ${url}`);
  try {
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
    console.log('[WHATSAPP] Iniciando subida de archivo a WhatsApp...');
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
    
    console.log(`[WHATSAPP] ✅ Media subido exitosamente. ID: ${uploadResponse.data.id}`);
    return uploadResponse.data.id;
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

module.exports = {
  sendTextMessage,
  uploadMedia,
  sendImageMessage
};
