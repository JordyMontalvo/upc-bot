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

// Normalizar URLs provenientes de Contentful
const normalizeUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (trimmed.startsWith('/')) {
    return `https://cultural.upc.edu.pe${trimmed}`;
  }

  return `https://${trimmed}`;
};

const extractUrlFromField = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    return normalizeUrl(value);
  }

  if (typeof value === 'object') {
    const nestedCandidates = [
      value.url,
      value.uri,
      value.href,
      value.link,
      value.fields?.url,
      value.fields?.uri,
      value.fields?.href,
      value.fields?.link,
      value.fields?.file?.url
    ];

    for (const candidate of nestedCandidates) {
      const normalized = normalizeUrl(candidate);
      if (normalized) return normalized;
    }
  }

  return null;
};

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

// Formatear un evento para la respuesta
const formatEvent = (item) => {
  const fields = item.fields || {};
  const imageUrl = fields.image?.fields?.file?.url ? 
    `https:${fields.image.fields.file.url}` : 
    null;

  const title = fields.title || 'Evento sin título';

  const candidateUrls = [
    extractUrlFromField(fields.link),
    extractUrlFromField(fields.url),
    extractUrlFromField(fields.eventUrl),
    extractUrlFromField(fields.externalLink),
    extractUrlFromField(fields.buttonLink),
    extractUrlFromField(fields.ctaLink),
    extractUrlFromField(fields.pageUrl)
  ].filter(Boolean);

  let eventUrl = candidateUrls.length > 0 ? candidateUrls[0] : null;

  if (!eventUrl && typeof fields.slug === 'string' && fields.slug.trim().length > 0) {
    const slugValue = fields.slug.trim();
    if (/^https?:\/\//i.test(slugValue)) {
      eventUrl = slugValue;
    } else if (slugValue.startsWith('/')) {
      eventUrl = `https://cultural.upc.edu.pe${slugValue}`;
    } else {
      eventUrl = `https://cultural.upc.edu.pe/agenda/${slugValue}`;
    }
  }

  if (!eventUrl) {
    const fallbackSlug = generateSlug(title);
    eventUrl = `https://cultural.upc.edu.pe/agenda/${fallbackSlug}`;
  }
  
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
