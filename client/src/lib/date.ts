import { format, parseISO, differenceInDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateRelative(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return 'Hoje';
  } else if (isTomorrow(dateObj)) {
    return 'Amanhã';
  } else if (isYesterday(dateObj)) {
    return 'Ontem';
  } else {
    const days = differenceInDays(dateObj, new Date());
    if (days > 0) {
      return `Em ${days} dias`;
    } else {
      return `${Math.abs(days)} dias atrás`;
    }
  }
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
  const endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
  
  return { startDate, endDate };
}
