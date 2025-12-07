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
  
  // Warm palette similar to the mock; fallback if API does not send colors
  const warmPalette = [
    "#f97316", // orange
    "#ec4899", // pink
    "#eab308", // yellow
    "#10b981", // emerald
    "#6366f1", // indigo
    "#22c55e", // green
  ];

  const chartDataConfig = {
    labels: expensesByCategory.map((item: ChartDataItem) => translateCategoryName(item.name)),
    datasets: [
      {
        data: expensesByCategory.map((item: ChartDataItem) => item.value),
        backgroundColor: expensesByCategory.map(
          (item: ChartDataItem, idx: number) => item.color || warmPalette[idx % warmPalette.length]
        ),
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
        display: false,
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
          Onde você está gastando mais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-1/2 h-56">
            {expensesByCategory.length > 0 ? (
              <Doughnut data={chartDataConfig as any} options={options} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                {t('dashboard.charts.noExpenses')}
              </div>
            )}
          </div>

          {expensesByCategory.length > 0 && (
            <div className="w-full md:w-1/2 space-y-3">
              {(() => {
                const total = expensesByCategory.reduce(
                  (sum, item) => sum + (item.value || 0),
                  0
                );
                return expensesByCategory.map((item, idx) => {
                  const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  const color =
                    (chartDataConfig.datasets[0] as any).backgroundColor[idx] || warmPalette[idx % warmPalette.length];
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between min-w-[150px]"
                    >
                      <div className="flex items-center">
                        <span
                          className="w-3 h-3 rounded-full mr-2 shadow-sm"
                          style={{ backgroundColor: color, boxShadow: `${color}40 0 0 8px` }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-100">
                            {translateCategoryName(item.name)}
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {formatCurrency(item.value || 0)}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-50 ml-4">
                        {percent}%
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
