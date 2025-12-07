import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Saldo total */}
      <div className="bg-dark-surface p-6 rounded-2xl shadow-lg border border-dark-border relative overflow-hidden group hover:border-orange-500/40 transition-all duration-300">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all" />
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Wallet className="w-16 h-16 text-orange-500" />
        </div>
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Total</p>
            <p className="mt-1 text-2xl lg:text-3xl font-bold text-white">
              {isLoading ? "..." : formatCurrency(currentBalance)}
            </p>
          </div>
          <span className="flex items-center text-xs font-semibold px-2 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
            <TrendingUp className="w-3 h-3 mr-1" />
            Ativo
          </span>
        </div>
        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden relative z-10">
          <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 w-[70%] rounded-full shadow-[0_0_10px_#f97316]" />
        </div>
      </div>

      {/* Entradas */}
      <div className="relative bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-sm col-span-1 overflow-hidden">
        <div className="absolute -top-6 -right-4 w-16 h-16 bg-emerald-500/10 rounded-full" />
        <div className="flex justify-between items-start mb-3 relative">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Entradas</p>
            <p className="mt-1 text-2xl lg:text-3xl font-bold text-white">
              {isLoading ? "..." : formatCurrency(monthlyIncome)}
            </p>
          </div>
          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
            Mês atual
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Total de rendas recebidas no período selecionado.
        </p>
      </div>

      {/* Despesas */}
      <div className="relative bg-dark-surface p-6 rounded-2xl border border-dark-border shadow-sm col-span-1 overflow-hidden">
        <div className="absolute -top-6 -right-4 w-16 h-16 bg-rose-500/10 rounded-full" />
        <div className="flex justify-between items-start mb-3 relative">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Despesas</p>
            <p className="mt-1 text-2xl lg:text-3xl font-bold text-white">
              {isLoading ? "..." : formatCurrency(monthlyExpenses)}
            </p>
          </div>
          <span
            className="inline-flex items-center text-[11px] font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
            title="Percentual de despesas sobre entradas"
          >
            {isLoading ? "..." : percentText}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Comparativo simples das despesas em relação às entradas deste mês.
        </p>
      </div>
    </div>
  );
}
