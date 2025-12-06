import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

interface DashboardSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export default function KPIHero() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => api("/api/dashboard/summary"),
  });

  const currentBalance = data?.currentBalance ?? 0;
  const monthlyIncome = data?.monthlyIncome ?? 0;
  const monthlyExpenses = data?.monthlyExpenses ?? 0;
  const percent = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0;
  const percentText = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(percent) + '%';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Saldo - gradiente */}
      <div className={cn("bg-gradient-to-br from-orange-500 to-red-600 text-white px-5 py-4 rounded-lg col-span-1")}> 
        <p className="text-xs opacity-80">Saldo</p>
        <p className="text-3xl font-bold mt-1">{isLoading ? "..." : formatCurrency(currentBalance)}</p>
      </div>

      {/* Entradas */}
      <div className="bg-white dark:bg-gray-900 px-5 py-4 rounded-lg border border-gray-200 dark:border-gray-800 col-span-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">Entradas</p>
        <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-gray-100">{isLoading ? "..." : formatCurrency(monthlyIncome)}</p>
      </div>

      {/* Despesas */}
      <div className="bg-white dark:bg-gray-900 px-5 py-4 rounded-lg border border-gray-200 dark:border-gray-800 col-span-1">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Despesas</p>
            <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-gray-100">{isLoading ? "..." : formatCurrency(monthlyExpenses)}</p>
          </div>
          <span
            className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full"
            title="Percentual de despesas sobre entradas"
          >
            {isLoading ? "..." : percentText}
          </span>
        </div>
      </div>
    </div>
  );
}
