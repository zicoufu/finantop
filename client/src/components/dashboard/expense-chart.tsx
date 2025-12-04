import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Doughnut } from "react-chartjs-2";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface BalanceItem {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

interface ChartData {
  expensesByCategory: ChartDataItem[];
  balanceEvolution: BalanceItem[];
  hasData: boolean;
}

interface DashboardFilters {
  startDate: string;
  endDate: string;
  year: string;
  month: string;
}

interface ExpenseChartProps {
  filters: DashboardFilters;
}

export default function ExpenseChart({ filters }: ExpenseChartProps) {
  const { t } = useTranslation();
  const { data: chartData, isLoading, isError } = useQuery<ChartData>({
    queryKey: ["reports", "charts"],
    queryFn: () => api("/api/reports/charts"),
  });

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            {t('dashboard.expensesByCategory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>{t('dashboard.expensesByCategory')}</CardTitle>
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

  if (!chartData || !chartData.hasData || chartData.expensesByCategory.length === 0) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>{t('dashboard.expensesByCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            {t('dashboard.charts.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Use formatted data from the API and apply simple year/month filtering if needed in the future
  const expensesByCategory = chartData.expensesByCategory;

  // Translate category names
  const translateCategoryName = (name: string) => {
    // Check if the category name corresponds to a translation key
    // Example: "Mercado e Habitação" -> "categories.marketAndHousing"
    const key = name.toLowerCase()
      .replace(/\s+e\s+/g, 'And') // Replace ' e ' with 'And'
      .replace(/\s+/g, '') // Remove spaces
      .replace(/[áàâãä]/g, 'a') // Normalize accents
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ç]/g, 'c');
    
    // Try to translate using the specific category key
    const translationKey = `categories.${key}`;
    const translated = t(translationKey);
    
    // If the translation returns the key itself, it means it wasn't found
    // In this case, return the original name
    return translated === translationKey ? name : translated;
  };
  
  const chartDataConfig = {
    labels: expensesByCategory.map((item: ChartDataItem) => translateCategoryName(item.name)),
    datasets: [
      {
        data: expensesByCategory.map((item: ChartDataItem) => item.value),
        backgroundColor: expensesByCategory.map((item: ChartDataItem) => item.color),
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            family: 'Inter',
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed;
            // Usar formatCurrency para garantir consistência na formatação de moeda
            const formattedValue = formatCurrency(value);
            return `${context.label}: ${formattedValue}`;
          },
        },
      },
    },
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-lg font-semibold text-gray-800">
          {t('dashboard.expensesByCategory')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {expensesByCategory.length > 0 ? (
            <Doughnut 
              data={chartDataConfig as any} 
              options={options} 
            />
          ) : (
            <div className="text-gray-500">{t('dashboard.charts.noExpenses')}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
