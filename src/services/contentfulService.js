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

// Obtener los próximos eventos culturales (considerando fecha de inicio y fecha de fin)
const getUpcomingEvents = async () => {
  if (!client) {
    console.log('⚠️  No hay cliente de Contentful configurado');
    return [];
  }

  try {
    const now = new Date();
    const nowISO = now.toISOString();
    
    // Obtener eventos que puedan estar activos (incluyendo los que tienen fecha de fin)
    // Obtenemos eventos que tengan fecha de inicio reciente o fecha de fin futura
    const allEvents = await client.getEntries({
      content_type: 'event',
      order: 'fields.date', // Orden ascendente (más próximos primero)
      limit: 100 // Aumentar el límite para incluir todos los eventos posibles
    });

    console.log(`[FILTRO] Total de eventos obtenidos de Contentful: ${allEvents.items.length}`);
    console.log(`[FILTRO] Fecha actual: ${now.toISOString()}`);
    
    // Filtrar eventos manualmente considerando fecha de inicio y fecha de fin
    const validEvents = allEvents.items.filter(item => {
      const fields = item.fields || {};
      const title = fields.title || 'sin título';
      
      // Log para ver todos los eventos
      console.log(`[FILTRO] Procesando evento: "${title}"`);
      
      // Obtener fecha de inicio
      const startDateCandidates = [
        fields.date,
        fields.eventDate,
        fields.startDate,
        fields.startDateTime,
        fields.datetime,
        fields.fecha,
        fields.fechaHora
      ];

      let startDate = null;
      for (const candidate of startDateCandidates) {
        const parsed = parseDateValue(candidate);
        if (parsed.date && !Number.isNaN(parsed.date.getTime())) {
          startDate = parsed.date;
          break;
        }
      }

      if (!startDate) {
        console.log(`[FILTRO] Evento "${title}" sin fecha de inicio - descartado`);
        return false; // Si no tiene fecha de inicio, no lo mostramos
      }

      // Obtener fecha de fin
      const endDate = getEventEndDate(fields);
      
      // Log para depuración: mostrar campos disponibles del evento
      if (title.includes('Noche MALI') || title.includes('Acción Climática')) {
        console.log(`[DEBUG] Evento "${title}" - Campos disponibles:`, Object.keys(fields));
        console.log(`[DEBUG] Evento "${title}" - Fecha inicio:`, startDate);
        console.log(`[DEBUG] Evento "${title}" - Fecha fin encontrada:`, endDate);
        // Buscar cualquier campo que contenga "end", "fin", "to", "until"
        const dateFields = Object.keys(fields).filter(key => 
          /end|fin|to|until/i.test(key) && fields[key]
        );
        if (dateFields.length > 0) {
          console.log(`[DEBUG] Evento "${title}" - Campos de fecha relacionados:`, dateFields.map(key => ({ [key]: fields[key] })));
        }
      }

      // Normalizar fechas para comparación por día (sin hora)
      // Usar UTC para evitar problemas de zona horaria
      const startOfDay = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        0, 0, 0, 0
      ));
      const nowStartOfDay = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));

      // Si tiene fecha de fin: mostrar si la fecha actual es menor o igual a la fecha de fin
      // (es decir, el evento aún no ha terminado, puede estar en curso o ser futuro)
      if (endDate) {
        const endOfDayStart = new Date(Date.UTC(
          endDate.getUTCFullYear(),
          endDate.getUTCMonth(),
          endDate.getUTCDate(),
          0, 0, 0, 0
        ));
        // Mostrar si hoy es menor o igual a la fecha de fin (el evento aún no ha terminado)
        const isValid = nowStartOfDay.getTime() <= endOfDayStart.getTime();
        console.log(`[FILTRO] Evento "${title}" con fecha fin: inicio=${startOfDay.toISOString()}, fin=${endOfDayStart.toISOString()}, ahora=${nowStartOfDay.toISOString()}, válido=${isValid}`);
        return isValid;
      }

      // Si NO tiene fecha de fin: mostrar solo si la fecha actual es menor o igual a la fecha de inicio
      // (es decir, solo el día del evento o antes, no después)
      const isValid = nowStartOfDay.getTime() <= startOfDay.getTime();
      console.log(`[FILTRO] Evento "${title}" sin fecha fin: inicio=${startOfDay.toISOString()}, ahora=${nowStartOfDay.toISOString()}, válido=${isValid}`);
      return isValid;
    });

    // Limitar a los primeros 10 eventos más próximos
    const limitedEvents = validEvents.slice(0, 10);

    if (limitedEvents.length > 0) {
      console.log(`✅ Se encontraron ${limitedEvents.length} eventos válidos (de ${allEvents.items.length} totales)`);
      return limitedEvents.map(formatEvent);
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

// Normalizar string para formar URLs (slug)
const normalize = (str) => {
  if (!str) return '';
  
  var from = "ÃÀÁÄÂÈÉËÊÌÍÏÎÒÓÖÔÙÚÜÛãàáäâèéëêìíïîòóöôùúüûÑñÇç,#¿?",
    to = "AAAAAEEEEIIIIOOOOUUUUaaaaaeeeeiiiioooouuuunncc",
    mapping = {};

  for (var i = 0, j = from.length; i < j; i++)
    mapping[from.charAt(i)] = to.charAt(i);

  var ret = [];

  for (var x = 0, y = str.length; x < y; x++) {
    var c = str.charAt(x);
    if (mapping.hasOwnProperty(str.charAt(x)))
      ret.push(mapping[c]);
    else if ((str[x] === " "))
      ret.push('-');
    else if ((str.length - 1 === x) && (str[str.length - 1] === " "))
      ret.push('-');
    else
      ret.push(c);
  }

  return ret.join('').toLocaleLowerCase().trim();
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

// Obtener fecha de fin del evento
const getEventEndDate = (fields) => {
  const endDateCandidates = [
    fields.endDate,
    fields.end_date,
    fields.fechaFin,
    fields.fecha_fin,
    fields.finishDate,
    fields.finish_date,
    fields.eventEndDate,
    fields.event_end_date,
    fields.endDateTime,
    fields.end_date_time,
    fields.fechaFinEvento,
    fields.fecha_fin_evento,
    fields.toDate,
    fields.to_date,
    fields.dateTo,
    fields.date_to,
    fields.untilDate,
    fields.until_date
  ];

  for (const candidate of endDateCandidates) {
    if (candidate) {
      const parsed = parseDateValue(candidate);
      if (parsed.date && !Number.isNaN(parsed.date.getTime())) {
        return parsed.date;
      }
    }
  }

  return null;
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
      const normalizedSlug = normalize(trimmed.substring(1)); // Normalizar sin el /
      eventUrl = `https://cultural.upc.edu.pe/${normalizedSlug}`;
      break;
    } else {
      const normalizedSlug = normalize(trimmed);
      eventUrl = `https://cultural.upc.edu.pe/agenda/${normalizedSlug}`;
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
    const fallbackSlug = normalize(title);
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
