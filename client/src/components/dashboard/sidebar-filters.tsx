import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

interface Account {
  id: number;
  name: string;
  type: string;
  balance: string | number;
}

interface DashboardFilters {
  startDate: string;
  endDate: string;
  year: string;
  month: string;
}

interface SidebarFiltersProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onResetFilters: () => void;
}

export default function SidebarFilters({ filters, onFiltersChange, onResetFilters }: SidebarFiltersProps) {
  const { data: accounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => api("/api/accounts"),
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());
  return (
    <aside className="w-80 flex-shrink-0 bg-white dark:bg-gray-900 p-6 border-r border-gray-200 dark:border-gray-800 h-full overflow-y-auto">
      <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6" />

      <div className="space-y-6">
        <div>
          <label htmlFor="filter-account" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Conta</label>
          <Select>
            <SelectTrigger id="filter-account" aria-label="Conta">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
            <span>Contas bancárias</span>
          </div>
          {isLoadingAccounts ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Carregando contas...
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Nenhuma conta cadastrada ainda.
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
              {accounts.map((account) => {
                const numericBalance = typeof account.balance === "string" ? Number(account.balance) : account.balance;
                const isPositive = numericBalance >= 0;
                return (
                  <li key={account.id} className="flex justify-between items-center">
                    <span>{account.name}</span>
                    <div className="flex items-center space-x-2">
                      <span>{formatCurrency(numericBalance)}</span>
                      <span
                        className={`w-3 h-3 rounded-full ${isPositive ? "bg-green-500" : "bg-red-500"}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Período</label>
          <div className="flex space-x-2">
            <div className="relative w-1/2">
              <input
                id="period-start"
                aria-label="Data inicial"
                placeholder="dd/mm/aaaa"
                className="w-full pl-3 pr-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm h-9"
                type="text"
                value={filters.startDate}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
              />
              <Calendar aria-hidden className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
            <div className="relative w-1/2">
              <input
                id="period-end"
                aria-label="Data final"
                placeholder="dd/mm/aaaa"
                className="w-full pl-3 pr-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm h-9"
                type="text"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
              />
              <Calendar aria-hidden className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="filter-year" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ano</label>
          <input
            id="filter-year"
            type="number"
            min="1900"
            max="2100"
            className="w-full pl-3 pr-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm h-9"
            value={filters.year}
            onChange={(e) => onFiltersChange({ ...filters, year: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="filter-month" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mês</label>
          <Select
            value={filters.month}
            onValueChange={(value) => onFiltersChange({ ...filters, month: value })}
          >
            <SelectTrigger id="filter-month" aria-label="Mês">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={onResetFilters}
        >
          Limpar filtros
        </Button>
      </div>
    </aside>
  );
}

