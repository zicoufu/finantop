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
    <aside className="w-80 flex-shrink-0 bg-dark-surface p-6 border-r border-dark-border h-full overflow-y-auto">
      <div className="flex items-center justify-between p-3 bg-[#111827] rounded-lg mb-6 text-sm text-gray-300">
        <span>Filtros do painel</span>
      </div>

      <div className="space-y-6 text-gray-200">
        <div>
          <label htmlFor="filter-account" className="block text-sm font-medium text-gray-400 mb-1">Conta</label>
          <Select>
            <SelectTrigger id="filter-account" aria-label="Conta" className="bg-[#020617] border-dark-border text-gray-100">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 bg-[#020617] rounded-lg border border-dark-border/70">
          <div className="flex items-center text-sm font-semibold text-gray-400 mb-3">
            <span>Contas bancárias</span>
          </div>
          {isLoadingAccounts ? (
            <div className="text-sm text-gray-500">
              Carregando contas...
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-sm text-gray-500">
              Nenhuma conta cadastrada ainda.
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-gray-100">
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
          <label className="block text-sm font-medium text-gray-400 mb-1">Período</label>
          <div className="flex space-x-2">
            <div className="relative w-1/2">
              <input
                id="period-start"
                aria-label="Data inicial"
                placeholder="dd/mm/aaaa"
                className="w-full pl-3 pr-8 bg-[#020617] border border-dark-border rounded-md text-sm h-9 text-gray-100 placeholder:text-gray-500"
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
                className="w-full pl-3 pr-8 bg-[#020617] border border-dark-border rounded-md text-sm h-9 text-gray-100 placeholder:text-gray-500"
                type="text"
                value={filters.endDate}
                onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
              />
              <Calendar aria-hidden className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="filter-year" className="block text-sm font-medium text-gray-400 mb-1">Ano</label>
          <input
            id="filter-year"
            type="number"
            min="1900"
            max="2100"
            className="w-full pl-3 pr-3 bg-[#020617] border border-dark-border rounded-md text-sm h-9 text-gray-100 placeholder:text-gray-500"
            placeholder="Ex: 2025"
            value={filters.year}
            onChange={(e) => onFiltersChange({ ...filters, year: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="filter-month" className="block text-sm font-medium text-gray-400 mb-1">Mês</label>
          <Select
            value={filters.month}
            onValueChange={(value) => onFiltersChange({ ...filters, month: value })}
          >
            <SelectTrigger id="filter-month" aria-label="Mês" className="bg-[#020617] border border-dark-border text-gray-100">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="1">Janeiro</SelectItem>
              <SelectItem value="2">Fevereiro</SelectItem>
              <SelectItem value="3">Março</SelectItem>
              <SelectItem value="4">Abril</SelectItem>
              <SelectItem value="5">Maio</SelectItem>
              <SelectItem value="6">Junho</SelectItem>
              <SelectItem value="7">Julho</SelectItem>
              <SelectItem value="8">Agosto</SelectItem>
              <SelectItem value="9">Setembro</SelectItem>
              <SelectItem value="10">Outubro</SelectItem>
              <SelectItem value="11">Novembro</SelectItem>
              <SelectItem value="12">Dezembro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          className="w-full border-dark-border text-gray-200 hover:bg-[#111827]"
          onClick={onResetFilters}
        >
          Limpar filtros
        </Button>
      </div>
    </aside>
  );
}
