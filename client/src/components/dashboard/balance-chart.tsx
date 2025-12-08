import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface BalanceItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface ChartData {
  expensesByCategory: {
    name: string;
    value: number;
    color: string;
  }[];
  balanceEvolution: BalanceItem[];
  hasData: boolean;
}

interface DashboardFilters {
  startDate: string;
  endDate: string;
  year: string;
  month: string;
}

interface BalanceChartProps {
  filters: DashboardFilters;
}

export default function BalanceChart({ filters }: BalanceChartProps) {
  const { t } = useTranslation();
  
  const buildQueryUrl = () => {
    const params = new URLSearchParams();

    const parseFilterDateToIso = (value: string) => {
      if (!value) return null;
      const [day, month, year] = value.split("/");
      if (!day || !month || !year) return null;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    };

    const startIso = parseFilterDateToIso(filters.startDate);
    const endIso = parseFilterDateToIso(filters.endDate);

    if (startIso) params.set("startDate", startIso);
    if (endIso) params.set("endDate", endIso);
    if (filters.year) params.set("year", filters.year);
    if (filters.month && filters.month !== "all") params.set("month", filters.month);

    const queryString = params.toString();
    return queryString ? `/api/reports/charts?${queryString}` : "/api/reports/charts";
  };

  const { data: chartData, isLoading, isError } = useQuery<ChartData>({
    queryKey: ["reports", "charts", filters],
    queryFn: () => api(buildQueryUrl()),
  });

  if (isLoading) {
    return (
      <Card className="bg-dark-surface shadow-sm border border-dark-border">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Fluxo de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card className="bg-dark-surface shadow-sm border border-dark-border">
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500 flex-col">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p>{t('dashboard.charts.errorLoading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || !chartData.hasData || chartData.balanceEvolution.length === 0) {
    return (
      <Card className="bg-dark-surface shadow-sm border border-dark-border">
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            {t('dashboard.charts.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usar os dados de evolução de saldo da API
  const balanceEvolution = chartData.balanceEvolution;
  
  // Função para traduzir os nomes dos meses
  const translateMonth = (month: string) => {
    // Extrair o nome do mês e o ano (assumindo formato "mmm. de yyyy" ou similar)
    const monthMatch = month.match(/^([a-zA-Zçãõáéíóúâêîôûàèìòù]+)\. de (\d{4})$/i);
    if (monthMatch && monthMatch[1] && monthMatch[2]) {
      const monthAbbr = monthMatch[1].toLowerCase();
      const year = monthMatch[2];
      
      // Mapear abreviações em português para chaves de tradução
      const monthMap: Record<string, string> = {
        'jan': 'jan',
        'fev': 'feb',
        'mar': 'mar',
        'abr': 'apr',
        'mai': 'may',
        'jun': 'jun',
        'jul': 'jul',
        'ago': 'aug',
        'set': 'sep',
        'out': 'oct',
        'nov': 'nov',
        'dez': 'dec'
      };
      
      const key = monthMap[monthAbbr] || monthAbbr;
      const translatedMonth = t(`months.${key}`);
      
      // Retornar o formato traduzido: "Jan 2025" em vez de "jan. de 2025"
      return `${translatedMonth} ${year}`;
    }
    
    // Tentar apenas traduzir a abreviação do mês se o formato completo não for reconhecido
    const simpleMonthMatch = month.match(/^([a-zA-Zçãõáéíóúâêîôûàèìòù]+)\./i);
    if (simpleMonthMatch && simpleMonthMatch[1]) {
      const monthAbbr = simpleMonthMatch[1].toLowerCase();
      
      const monthMap: Record<string, string> = {
        'jan': 'jan',
        'fev': 'feb',
        'mar': 'mar',
        'abr': 'apr',
        'mai': 'may',
        'jun': 'jun',
        'jul': 'jul',
        'ago': 'aug',
        'set': 'sep',
        'out': 'oct',
        'nov': 'nov',
        'dez': 'dec'
      };
      
      const key = monthMap[monthAbbr] || monthAbbr;
      const translatedMonth = t(`months.${key}`);
      
      return month.replace(simpleMonthMatch[1], translatedMonth);
    }
    
    return month; // Retornar o original se não conseguir traduzir
  };
  
  const months = balanceEvolution.map(item => translateMonth(item.month));
  const incomeData = balanceEvolution.map(item => item.income);
  const expenseData = balanceEvolution.map(item => item.expenses);

  const chartDataConfig = {
    labels: months,
    datasets: [
      {
        label: 'Entradas',
        data: incomeData,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
      },
      {
        label: 'Saídas',
        data: expenseData,
        borderColor: 'rgba(248, 113, 113, 1)',
        backgroundColor: 'rgba(248, 113, 113, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(248, 113, 113, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          color: '#e5e7eb',
          font: {
            family: 'Inter',
            size: 11,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            const value = context.parsed.y;
            const formattedValue = formatCurrency(value);
            return `${context.dataset.label}: ${formattedValue}`;
          },
        },
      },
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return formatCurrency(value);
          },
          font: {
            family: 'Inter',
          },
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.15)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Inter',
          },
        },
      },
    },
  };

  return (
    <Card className="bg-dark-surface shadow-sm border border-dark-border">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Fluxo de Caixa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Line data={chartDataConfig as any} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
