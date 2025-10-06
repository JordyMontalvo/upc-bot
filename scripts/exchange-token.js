async function exchangeWhatsAppToken(shortLivedToken, appId, appSecret) {
  const url = `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.access_token) {
      console.log('Token de larga duración:', data.access_token);
      console.log('El token expira en:', data.expires_in, 'segundos');
    } else {
      console.error('Error al obtener el token:', data.error.message);
    }
  } catch (error) {
    console.error('Error al intercambiar el token:', error);
  }
}

// Reemplaza estos valores con tus credenciales
const shortLivedToken = 'EAFXpPZBHV80oBPYQovMpJw3J6HkXA3ZA2NkirDdYwAwuxTbRZB32VGfCqwItFmQ2cZAcdPsjuZAnxJISlJPRTsbowSGwmYKtqmK05poriluuqfZBLaRIeZBa5fNDFMae2Q33El1CABeZCPFILbWZALLUYbz1ACBDn9dSZAEO4PMZBdspeCGOZBoZC1UknRbGfphRA9yphSwihHjjeL9mwZAxKiK8Pu6jp1JgSgmpcoigICbZAxoOhq8B68O0NFz4F021Mc8ZAQZDZD';
const appId = '1352981949949720';
const appSecret = '70d7658f7480bc9c2ed9c11226b43ca4';

exchangeWhatsAppToken(shortLivedToken, appId, appSecret);
