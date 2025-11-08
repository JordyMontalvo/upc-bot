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
    .replace(/[^a-z0-9.:\-]+/g, '-') // Permitir letras, números, puntos, dos puntos y guiones
    .replace(/-{2,}/g, '-') // Reemplazar múltiples guiones seguidos
    .replace(/:{2,}/g, ':') // Normalizar múltiples dos puntos
    .replace(/\.+/g, '.') // Reemplazar múltiples puntos por uno solo
    .replace(/(^[:.\-]+|[:.\-]+$)/g, '') // Eliminar puntos, guiones o dos puntos al inicio y final
    .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
    .trim();
};

const parseDateValue = (value) => {
  if (!value) return { date: null, raw: null };

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { date: value, raw: value.toISOString() };
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return { date: null, raw: null };

    let parsedDate = null;

    const isoMatch = trimmed.match(
      /^(\d{4})-(\d{2})-(\d{2})([T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+\-]\d{2}:\d{2})?)?$/
    );

    if (isoMatch) {
      parsedDate = new Date(trimmed);
      if (Number.isNaN(parsedDate.getTime()) && !isoMatch[4]) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]) - 1;
        const day = Number(isoMatch[3]);
        parsedDate = new Date(Date.UTC(year, month, day));
      }
    }

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      parsedDate = new Date(trimmed.replace(/\s+/g, ' '));
    }

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      return { date: null, raw: trimmed };
    }

    return { date: parsedDate, raw: trimmed };
  }

  return { date: null, raw: null };
};

const normalizeManualTime = (timeValue) => {
  if (!timeValue) return null;

  const stringValue = String(timeValue).trim();
  if (!stringValue) return null;

  const lowerValue = stringValue.toLowerCase();
  if (lowerValue === 'por confirmar' || lowerValue === 'por definirse') {
    return 'Horario por confirmar';
  }

  let normalized = stringValue
    .replace(/hrs?\.?/gi, '')
    .replace(/horas?\.?/gi, '')
    .replace(/[\.]/g, ':')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const fourDigitMatch = normalized.match(/^(\d{1,2})(\d{2})$/);
  if (fourDigitMatch) {
    normalized = `${fourDigitMatch[1].padStart(2, '0')}:${fourDigitMatch[2]}`;
  }

  const basicTimeMatch = normalized.match(/^(\d{1,2})(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
  if (basicTimeMatch) {
    const hour = basicTimeMatch[1].padStart(2, '0');
    const minutes = basicTimeMatch[2] ? basicTimeMatch[2] : ':00';
    const meridiem = basicTimeMatch[3] ? basicTimeMatch[3].toLowerCase() : '';

    if (meridiem) {
      return `${hour}${minutes} ${meridiem.replace('.', '').replace('am', 'a. m.').replace('pm', 'p. m.')}`;
    }

    return `${hour}${minutes}`;
  }

  return normalized;
};

const getEventDateInfo = (fields) => {
  const dateCandidates = [
    fields.date,
    fields.eventDate,
    fields.startDate,
    fields.startDateTime,
    fields.datetime,
    fields.fecha,
    fields.fechaHora
  ];

  let parsed = { date: null, raw: null };

  for (const candidate of dateCandidates) {
    parsed = parseDateValue(candidate);
    if (parsed.date) break;
  }

  let formattedDate = 'Fecha por confirmar';
  let formattedTime = 'Horario por confirmar';
  let rawDate = parsed.raw;

  let rawTimeFromDate = null;

  if (typeof rawDate === 'string') {
    const rawMatch = rawDate.match(/T(\d{2}):(\d{2})/);
    if (rawMatch) {
      rawTimeFromDate = `${rawMatch[1]}:${rawMatch[2]}`;
    }
  }

  if (parsed.date && !Number.isNaN(parsed.date.getTime())) {
    formattedDate = parsed.date.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima'
    });

    formattedTime = parsed.date.toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Lima'
    });

    if (formattedTime === '00:00') {
      formattedTime = 'Horario por confirmar';
    }
  }

  const manualTimeCandidates = [
    fields.time,
    fields.startTime,
    fields.startHour,
    fields.schedule,
    fields.hour,
    fields.eventTime,
    fields.timeRange,
    fields.horario,
    fields.hora,
    rawTimeFromDate
  ];

  for (const manual of manualTimeCandidates) {
    const normalized = normalizeManualTime(manual);
    if (normalized) {
      formattedTime = normalized;
      break;
    }
  }

  return { formattedDate, formattedTime };
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

  const slugFields = [
    fields.slug,
    fields.urlSlug,
    fields.culturalSlug,
    fields.permalink
  ].filter(value => typeof value === 'string' && value.trim().length > 0);

  let eventUrl = null;

  for (const slugCandidate of slugFields) {
    const trimmed = slugCandidate.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      eventUrl = normalizeUrl(trimmed);
      break;
    } else if (trimmed.startsWith('/')) {
      eventUrl = `https://cultural.upc.edu.pe${trimmed}`;
      break;
    } else {
      eventUrl = `https://cultural.upc.edu.pe/agenda/${trimmed}`;
      break;
    }
  }

  if (!eventUrl) {
    const culturalCandidate = candidateUrls.find(url => typeof url === 'string' && url.includes('cultural.upc.edu.pe'));
    if (culturalCandidate) {
      eventUrl = culturalCandidate;
    }
  }

  if (!eventUrl) {
    const fallbackSlug = generateSlug(title);
    eventUrl = `https://cultural.upc.edu.pe/agenda/${fallbackSlug}`;
  }

  const { formattedDate, formattedTime } = getEventDateInfo(fields);

  return {
    id: item.sys?.id || '',
    title: title,
    description: fields.description || 'Sin descripción disponible',
    date: formattedDate,
    time: formattedTime,
    location: fields.address || 'Ubicación por confirmar',
    price: typeof fields.price === 'number' ? `S/ ${fields.price.toFixed(2)}` : 'Gratis',
    link: eventUrl,
    imageUrl: imageUrl
  }
};


module.exports = {
  getUpcomingEvents
};
