const contentful = require('contentful');

// Verificar si tenemos credenciales de Contentful
const hasContentfulCredentials = process.env.CONTENTFUL_SPACE_ID && process.env.CONTENTFUL_ACCESS_TOKEN;

let client = null;

// Crear cliente de Contentful solo si tenemos credenciales
if (hasContentfulCredentials) {
  client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    environment: process.env.CONTENTFUL_ENVIRONMENT || 'master',
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
  });
  console.log('✅ Usando Contentful con credenciales configuradas');
} else {
  console.log('⚠️  No se encontraron credenciales de Contentful. Usando datos de prueba.');
}

// Obtener los próximos eventos culturales (solo eventos futuros)
const getUpcomingEvents = async () => {
  if (!client) {
    console.log('⚠️  No hay cliente de Contentful configurado');
    return [];
  }

  try {
    const now = new Date().toISOString();
    
    // Obtener solo eventos futuros ordenados por fecha (más próximos primero)
    const futureEvents = await client.getEntries({
      content_type: 'event',
      'fields.date[gte]': now, // Solo eventos con fecha mayor o igual a hoy
      order: 'fields.date', // Orden ascendente (más próximos primero)
      limit: 10 // Aumentar el límite para mostrar más eventos
    });

    if (futureEvents.items.length > 0) {
      console.log(`✅ Se encontraron ${futureEvents.items.length} eventos futuros`);
      return futureEvents.items.map(formatEvent);
    }

    console.log('ℹ️  No hay eventos futuros disponibles');
    return [];
    
  } catch (error) {
    console.error('❌ Error al obtener eventos de Contentful:', error);
    return [];
  }
};

// Formatear un evento para la respuesta
const formatEvent = (item) => {
  const fields = item.fields || {};
  const imageUrl = fields.image?.fields?.file?.url ? 
    `https:${fields.image.fields.file.url}` : 
    null;
    
  // Generar slug a partir del título manteniendo todas las palabras
  const generateSlug = (title) => {
    if (!title) return '';
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .replace(/[^a-z0-9.]+/g, '-') // Reemplazar caracteres especiales con guiones, excepto puntos
      .replace(/\.+/g, '.') // Reemplazar múltiples puntos por uno solo
      .replace(/(^\.+|\.+$)/g, '') // Eliminar puntos al inicio y final
      .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
      .trim();
  };

  const title = fields.title || 'Evento sin título';
  const slug = generateSlug(title);
  
  // Construir la URL completa con el formato cultural.upc.edu.pe/agenda/[slug]
  const eventUrl = `https://cultural.upc.edu.pe/agenda/${slug}`;
  
  const eventDate = fields.date ? new Date(fields.date) : null;
  
  return {
    id: item.sys?.id || '',
    title: title,
    description: fields.description || 'Sin descripción disponible',
    date: eventDate ? eventDate.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima'
    }) : 'Fecha por confirmar',
    time: eventDate ? eventDate.toLocaleTimeString('es-PE', { 
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    }) : 'Horario por confirmar',
    location: fields.address || 'Ubicación por confirmar',
    price: typeof fields.price === 'number' ? `S/ ${fields.price.toFixed(2)}` : 'Gratis',
    link: eventUrl,
    imageUrl: imageUrl
  }
};


module.exports = {
  getUpcomingEvents
};
