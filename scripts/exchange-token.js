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
const shortLivedToken = 'EAATOh6iDpxgBP0JIWjG5csw0H64ZBERBAaRCbEwEGHy5JdkLVdyS5sgQMpT9uKHeNWLzIBWEW56An4n7CgJWKSMxviHErpsdihtZBy5cBOEmLT9lM17KBxMRxRHZAWoZBusiN8q9eU2mDb4AlRbmVjwa7OgwBvhoxqyIFu3GeREWV7kcyvcOgx0AGXmov1PsJeeAPZCSXcyF2rh7NDjHa5JXqjO9XKj015bG3P2Ok0RVZAR30iO0J0jS5w1klw95f6TRUNwNWYDEs63PmYagQz46hKRWhLHIy8HDtOmQZDZD';
const appId = '1352981949949720';
const appSecret = '70d7658f7480bc9c2ed9c11226b43ca4';

exchangeWhatsAppToken(shortLivedToken, appId, appSecret);

// token de larga duracion 
 // EAATOh6iDpxgBP4RXNF3iLDTo4UyPIPLeepXBkZBxumtULLkf0Dbe486E7yYxry5MnpSA7WyTuTgS3V1GdqNMA3Wm8ZCnhui8PZAM9C410wN8T1Xpc6168uoP2n4K2RyV7Rr8kaLZCmJ5CZAm0fTbh3jtWiqxzc2vZCCeCKK4sKRXSp1gjrrKzDrCW2agBylUZCC4HlpA1FFi6iVpDMm