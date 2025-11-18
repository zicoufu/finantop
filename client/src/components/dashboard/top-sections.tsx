import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TopIncomeCategories() {
  const [limit, setLimit] = useState<string>("all");
  const { data, isLoading, isError } = useQuery<{ items: { name: string; value: number; color: string }[]; hasData: boolean }>({
    queryKey: ["reports", "top-income-by-category", limit],
    queryFn: () => api(`/api/reports/top-income-by-category${limit !== 'all' ? `?limit=${limit}` : ''}`),
  });

  const items = data?.items || [];
  const max = items.reduce((m, i) => Math.max(m, i.value), 0) || 1;
  const heightClass = (v: number) => {
    const pct = (v / max) * 100;
    if (pct >= 80) return "h-full";       // ~100%
    if (pct >= 60) return "h-4/5";        // ~80%
    if (pct >= 40) return "h-3/5";        // ~60%
    if (pct >= 20) return "h-2/5";        // ~40%
    return "h-1/5";                        // ~20%
  };
  const cyanPalette = ["bg-cyan-400","bg-cyan-500","bg-cyan-600","bg-cyan-700","bg-cyan-800"];

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Entradas por categoria</h2>
        <div className="w-40">
          <Select value={limit} onValueChange={setLimit}>
            <SelectTrigger aria-label="Filtro de quantidade">
              <SelectValue placeholder="Quantidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {isLoading ? (
        <div className="h-48 flex items-end justify-around space-x-4">
          {[0,1,2].map((i) => (
            <div key={i} className="flex flex-col items-center flex-1 animate-pulse">
              <span className="text-xs text-gray-400">&nbsp;</span>
              <div className="w-16 bg-cyan-500/40 h-3/5 rounded-t-md" />
              <span className="text-xs mt-2 text-gray-400">&nbsp;</span>
            </div>
          ))}
        </div>
      ) : !items.length || isError ? (
        <div className="text-sm text-gray-500">Sem dados de entradas por categoria.</div>
      ) : (
        <div className="flex items-end h-48 space-x-3 overflow-x-auto">
          {items.map((it, idx) => (
            <TooltipProvider key={it.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center w-16 flex-shrink-0 cursor-default">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(it.value)}</span>
                    <div className={`w-16 ${cyanPalette[idx % cyanPalette.length]} ${heightClass(it.value)} rounded-t-md`} />
                    <span className="text-xs mt-2 text-center truncate w-16">{it.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">{it.name}</div>
                    <div>{formatCurrency(it.value)}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopExpenseCategories() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <h2 className="text-lg font-semibold mb-4">Top 5 Despesas por categoria</h2>
      <div className="flex items-center space-x-6">
        <div className="w-36 h-36 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {/* Placeholder pizza chart */}
          <div className="w-28 h-28 rounded-full border-[10px] border-red-500 border-t-orange-500 border-r-sky-500 border-b-teal-400 rotate-45"></div>
        </div>
        <div className="text-xs space-y-2">
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></span>Supermercado</p>
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full mr-2"></span>Cartão de crédito</p>
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-blue-700 rounded-full mr-2"></span>Plano de saúde</p>
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-sky-500 rounded-full mr-2"></span>Prestação da casa</p>
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-teal-400 rounded-full mr-2"></span>Presentes</p>
        </div>
      </div>
    </div>
  );
}

export function EvolutionMonthly() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 lg:col-span-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Evolução mensal despesas vs entradas</h2>
        <div className="flex items-center space-x-4 text-xs">
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-2"></span>Despesas</p>
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-cyan-500 rounded-full mr-2"></span>Entradas</p>
          <p className="flex items-center"><span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-600 rounded-full mr-2"></span>Saldo Acumulado</p>
        </div>
      </div>
      <div className="relative h-56">
        {/* Placeholder combined chart */}
        <img
          alt="Gráfico de barras e linha da evolução mensal"
          className="w-full h-full object-contain"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKT6WAPJxnAgp25XF2r6p_4nVYun9Jrq9L5E7F3buQaNt7rremycMSXc5qRdO6wS7vIVFl35tRQijjyUBtf29d1F4Ligk8YlsJiBHy6-HaB46vCPFOlk8Qkaog2qlNN2_AmM6nQtKw1t-AUC5162AeHzCHPRlJC_1StF_T601eKniW5CMV8fwqe3cpJYHV68Y9su21ngo44hPpqwgLimAu11H-Tfc1w3o5jFsri4NLQRu8qfHVf3EGtAXrl1avKEqfN7g81adyZxM"
        />
      </div>
    </div>
  );
}

export function CategoryKPIsGrid() {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-orange-500/20 rounded-lg">
          <span className="material-icons-outlined text-orange-500">home</span>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Moradia</p>
          <p className="text-xl font-bold">R$ 2.929</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-yellow-500/20 rounded-lg">
          <span className="material-icons-outlined text-yellow-500">celebration</span>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Lazer</p>
          <p className="text-xl font-bold">R$ 900</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-indigo-500/20 rounded-lg">
          <span className="material-icons-outlined text-indigo-500">credit_card</span>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cartão</p>
          <p className="text-xl font-bold">R$ 1.800</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-teal-500/20 rounded-lg">
          <span className="material-icons-outlined text-teal-500">directions_car</span>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Transporte</p>
          <p className="text-xl font-bold">R$ 1.500</p>
        </div>
      </div>
    </div>
  );
}
