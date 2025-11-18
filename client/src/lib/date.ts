import { format, parseISO, differenceInDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import i18next from 'i18next';

// Variável global para armazenar o formato de data atual
let currentDateFormat: string | null = null;

// Adicionar listener para o evento de mudança de formato de data
if (typeof window !== 'undefined') {
  window.addEventListener('dateFormatChanged', ((event: CustomEvent) => {
    if (event.detail && event.detail.format) {
      currentDateFormat = event.detail.format;
      console.log('Formato de data atualizado para:', currentDateFormat);
    }
  }) as EventListener);
}

/**
 * Converte uma data do formato do usuário para o formato ISO (YYYY-MM-DD)
 * @param dateStr Data no formato do usuário (DD/MM/YYYY, MM/DD/YYYY ou YYYY-MM-DD)
 * @param userFormat Formato de data do usuário
 * @returns Data no formato ISO (YYYY-MM-DD)
 */
export function convertToISOFormat(dateStr: string, userFormat: string = currentDateFormat || 'YYYY-MM-DD'): string {
  if (!dateStr) return '';
  
  // Se já estiver no formato ISO, retorna como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  try {
    let day: number, month: number, year: number;

    // Detectar entradas com barras mesmo quando userFormat não foi ajustado ainda
    const isSlash = /^(\d{2})\/(\d{2})\/(\d{4})$/.test(dateStr);
    if (isSlash) {
      const parts = dateStr.split('/').map(Number);
      const currentLanguage = i18next.language || 'pt-BR';

      // 1) Se userFormat explicitamente define, obedecer
      if (userFormat === 'DD/MM/YYYY') {
        [day, month, year] = parts;
      } else if (userFormat === 'MM/DD/YYYY') {
        [month, day, year] = parts;
      } else {
        // 2) Heurística por idioma: pt => DD/MM, en => MM/DD, fallback DD/MM
        if (currentLanguage.startsWith('en')) {
          [month, day, year] = parts;
        } else {
          [day, month, year] = parts;
        }
      }

      // Sanitização básica
      if (!year || !month || !day) return dateStr;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // Último recurso: tentar construir Date; se válido, retornar no formato YYYY-MM-DD
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }

    // Formato desconhecido, retorna como está
    return dateStr;
  } catch (error) {
    console.error('Erro ao converter data para formato ISO:', error);
    return dateStr;
  }
}

/**
 * Converte uma data do formato ISO (YYYY-MM-DD) para o formato do usuário
 * @param isoDateStr Data no formato ISO (YYYY-MM-DD)
 * @param userFormat Formato de data do usuário
 * @returns Data no formato do usuário
 */
export function convertFromISOFormat(isoDateStr: string, userFormat: string = currentDateFormat || 'YYYY-MM-DD'): string {
  if (!isoDateStr) return '';
  
  try {
    const [year, month, day] = isoDateStr.split('-').map(Number);
    
    if (userFormat === 'DD/MM/YYYY') {
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } else if (userFormat === 'MM/DD/YYYY') {
      return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year}`;
    } else {
      // Formato YYYY-MM-DD ou desconhecido, retorna como está
      return isoDateStr;
    }
  } catch (error) {
    console.error('Erro ao converter data do formato ISO:', error);
    return isoDateStr;
  }
}

// Função para obter as preferências do usuário do localStorage
function getUserPreferences() {
  try {
    const storedPrefs = localStorage.getItem('userPreferences');
    if (storedPrefs) {
      return JSON.parse(storedPrefs);
    }
  } catch (error) {
    console.error('Error reading user preferences:', error);
  }
  return null;
}

export function formatDate(dateInput: string | Date): string {
  if (!dateInput) return ''; // Returns empty string if date is null or undefined

  try {
    // Creates a Date object. Strings like '2025-06-10' are interpreted as UTC.
    const date = new Date(dateInput);

    // getTimezoneOffset() returns the difference in minutes between UTC and local time.
    // For Brazil (UTC-3), this is 180.
    // Multiply by 60000 to convert minutes to milliseconds.
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;

    // We create a new date by adding the offset. This effectively "moves" the date from UTC
    // to the local timezone, ensuring that the day of the month is correct.
    // Ex: '2025-06-10T00:00:00Z' (midnight UTC) becomes '2025-06-10T00:00:00-03:00' (local midnight)
    const correctedDate = new Date(date.getTime() + userTimezoneOffset);

    // Obter preferências do usuário ou usar o idioma atual como fallback
    const userPrefs = getUserPreferences();
    const currentLanguage = i18next.language || 'pt-BR';
    
    // Determinar o formato de data com base na variável global, preferências ou idioma
    let dateFormat = currentDateFormat || userPrefs?.dateFormat || (currentLanguage.startsWith('en') ? 'YYYY-MM-DD' : 'DD/MM/YYYY');
    
    // Atualizar a variável global se ainda não estiver definida
    if (!currentDateFormat && userPrefs?.dateFormat) {
      currentDateFormat = userPrefs.dateFormat;
    }
    
    // Format the date according to user preferences
    const day = String(correctedDate.getDate()).padStart(2, '0');
    const month = String(correctedDate.getMonth() + 1).padStart(2, '0'); // +1 because months start at 0
    const year = correctedDate.getFullYear();
    
    if (dateFormat === 'YYYY-MM-DD') {
      return `${year}-${month}-${day}`;
    } else {
      return `${day}/${month}/${year}`;
    }
  } catch (error) {
    // console.error("Error formatting date:", dateInput, error);
    return "Invalid date";
  }
}

// i18next já importado acima

// Função para converter uma data para o formato de entrada HTML (YYYY-MM-DD)
export function formatDateForInput(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  
  try {
    const date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
}

// Função para converter uma string de data do formato do usuário para o formato YYYY-MM-DD
export function parseUserDateInput(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    // Obter preferências do usuário ou usar o idioma atual como fallback
    const userPrefs = getUserPreferences();
    const currentLanguage = i18next.language || 'pt-BR';
    const dateFormat = currentDateFormat || userPrefs?.dateFormat || (currentLanguage.startsWith('en') ? 'YYYY-MM-DD' : 'DD/MM/YYYY');
    
    // Atualizar a variável global se ainda não estiver definida
    if (!currentDateFormat && userPrefs?.dateFormat) {
      currentDateFormat = userPrefs.dateFormat;
    }
    
    // Se já estiver no formato YYYY-MM-DD, retornar como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Se estiver no formato DD/MM/YYYY, converter para YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`;
    }
    
    // Tentar converter outros formatos possíveis
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return formatDateForInput(date);
    }
    
    return '';
  } catch (error) {
    console.error('Error parsing user date input:', error);
    return '';
  }
}

export function formatDateRelative(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const t = i18next.t;
  
  if (isToday(dateObj)) {
    return t('dates.today');
  } else if (isTomorrow(dateObj)) {
    return t('dates.tomorrow');
  } else if (isYesterday(dateObj)) {
    return t('dates.yesterday');
  } else {
    const days = differenceInDays(dateObj, new Date());
    if (days > 0) {
      return t('dates.inDays', { count: days });
    } else {
      return t('dates.daysAgo', { count: Math.abs(days) });
    }
  }
}

export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // +1 because months start at 0
  return `${year}-${month}`;
}

export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Format the date manually to 'yyyy-MM-dd' format
  const startMonth = String(month + 1).padStart(2, '0'); // +1 because months start at 0
  const startDate = `${year}-${startMonth}-01`;
  
  // Calculate the last day of the month
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const endDay = String(lastDayOfMonth.getDate()).padStart(2, '0');
  const endMonth = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
  const endDate = `${year}-${endMonth}-${endDay}`;
  
  return { startDate, endDate };
}
