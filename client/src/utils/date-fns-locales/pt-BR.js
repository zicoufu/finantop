// Simplified version of pt-BR locale for date-fns
// Contains only what's necessary for basic functionality

const formatDistance = {
  lessThanXSeconds: {
    one: 'menos de um segundo',
    other: 'menos de {{count}} segundos'
  },
  xSeconds: {
    one: '1 segundo',
    other: '{{count}} segundos'
  },
  halfAMinute: 'meio minuto',
  lessThanXMinutes: {
    one: 'menos de um minuto',
    other: 'menos de {{count}} minutos'
  },
  xMinutes: {
    one: '1 minuto',
    other: '{{count}} minutos'
  },
  aboutXHours: {
    one: 'cerca de 1 hora',
    other: 'cerca de {{count}} horas'
  },
  xHours: {
    one: '1 hora',
    other: '{{count}} horas'
  },
  xDays: {
    one: '1 dia',
    other: '{{count}} dias'
  },
  aboutXWeeks: {
    one: 'cerca de 1 semana',
    other: 'cerca de {{count}} semanas'
  },
  xWeeks: {
    one: '1 semana',
    other: '{{count}} semanas'
  },
  aboutXMonths: {
    one: 'cerca de 1 mês',
    other: 'cerca de {{count}} meses'
  },
  xMonths: {
    one: '1 mês',
    other: '{{count}} meses'
  },
  aboutXYears: {
    one: 'cerca de 1 ano',
    other: 'cerca de {{count}} anos'
  },
  xYears: {
    one: '1 ano',
    other: '{{count}} anos'
  },
  overXYears: {
    one: 'mais de 1 ano',
    other: 'mais de {{count}} anos'
  },
  almostXYears: {
    one: 'quase 1 ano',
    other: 'quase {{count}} anos'
  }
};

const formatLong = {
  date: (options) => {
    return "dd/MM/yyyy";
  },
  time: (options) => {
    return "HH:mm";
  },
  dateTime: (options) => {
    return "dd/MM/yyyy 'às' HH:mm";
  }
};

const formatRelative = (token) => {
  const formatRelativeTokens = {
    lastWeek: "'na última' eeee 'às' p",
    yesterday: "'ontem às' p",
    today: "'hoje às' p",
    tomorrow: "'amanhã às' p",
    nextWeek: "eeee 'às' p",
    other: 'P'
  };
  return formatRelativeTokens[token];
};

const localize = {
  ordinalNumber: (number) => {
    return `${number}º`;
  },
  weekday: (weekday) => {
    const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return weekdays[weekday];
  },
  month: (month) => {
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return months[month];
  }
};

const match = {
  ordinalNumber: (string) => {
    return string.match(/^(\d+)(º|ª)?$/i);
  },
  weekday: (string) => {
    const weekdays = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
    return weekdays.findIndex(day => day.toLowerCase() === string.toLowerCase());
  },
  month: (string) => {
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return months.findIndex(month => month.toLowerCase() === string.toLowerCase());
  }
};

const ptBR = {
  code: 'pt-BR',
  formatDistance: (token, count, options) => {
    let result;
    const tokenValue = formatDistance[token];

    if (typeof tokenValue === 'string') {
      result = tokenValue;
    } else if (count === 1) {
      result = tokenValue.one;
    } else {
      result = tokenValue.other.replace('{{count}}', String(count));
    }

    if (options?.addSuffix) {
      if (options.comparison && options.comparison > 0) {
        return 'em ' + result;
      } else {
        return 'há ' + result;
      }
    }

    return result;
  },
  formatLong,
  formatRelative,
  localize,
  match,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};

export default ptBR;
