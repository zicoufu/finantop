import i18next from 'i18next';

export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  // Usar o idioma atual do usuário em vez de forçar português
  const locale = i18next.language || 'pt-BR';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BRL',
  }).format(numAmount);
}

export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) || 0;
}
