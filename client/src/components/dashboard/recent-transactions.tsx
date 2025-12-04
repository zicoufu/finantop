import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { api } from "@/lib/api";
import { Briefcase, ShoppingCart, Car, Home, Utensils } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  type: string;
  status: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  type: string;
}

interface DashboardFilters {
  startDate: string;
  endDate: string;
  year: string;
  month: string;
}

const iconMap: { [key: string]: any } = {
  "fas fa-briefcase": Briefcase,
  "fas fa-shopping-cart": ShoppingCart,
  "fas fa-car": Car,
  "fas fa-home": Home,
  "fas fa-utensils": Utensils,
};

interface RecentTransactionsProps {
  filters: DashboardFilters;
}

export default function RecentTransactions({ filters }: RecentTransactionsProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => api("/api/transactions"),
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api("/api/categories"),
  });

  const isLoading = transactionsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="flex items-center justify-between pb-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            {t('dashboard.recentTransactions')}
          </CardTitle>
          <div className="flex space-x-2">
            {["Todas", "Receitas", "Despesas"].map((label) => (
              <Skeleton key={label} className="h-6 w-16" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">{t('transactions.description')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">{t('transactions.category')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">{t('transactions.date')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">{t('transactions.amount')}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">{t('transactions.status.label')}</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Skeleton className="h-5 w-16 mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!transactions || !categories) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>{t('dashboard.recentTransactions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            {t('dashboard.noTransactions')}
          </div>
        </CardContent>
      </Card>
    );
  }

  const parseFilterDate = (value: string) => {
    if (!value) return null;
    const [day, month, year] = value.split("/");
    if (!day || !month || !year) return null;
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const startFilterDate = parseFilterDate(filters.startDate);
  const endFilterDate = parseFilterDate(filters.endDate);

  const filteredTransactions = transactions
    .filter(t => filter === "all" || t.type === filter)
    .filter(t => {
      const txDate = new Date(t.date);

      if (filters.year && txDate.getFullYear().toString() !== filters.year) {
        return false;
      }

      if (filters.month !== "all" && filters.month) {
        const monthIndex = txDate.getMonth() + 1;
        const monthString = monthIndex.toString().padStart(2, "0");
        if (monthString !== filters.month) {
          return false;
        }
      }

      if (startFilterDate && txDate < startFilterDate) {
        return false;
      }

      if (endFilterDate && txDate > endFilterDate) {
        return false;
      }

      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // Function to translate category names
  const translateCategoryName = (categoryName: string): string => {
    // Direct mapping for exact category names
    const exactCategoryMap: Record<string, string> = {
      "Moradia e Habitação": "housing",
      "Alimentação": "food",
      "Transporte": "transportation",
      "Saúde e Bem-estar": "healthWellness",
      "Educação": "education",
      "Entretenimento": "entertainment",
      "Vestuário e Cuidados Pessoais": "clothing",
      "Serviços Domésticos": "homeServices",
      "Animais de Estimação": "pets",
      "Despesas Financeiras": "financial",
      "Impostos e Taxas": "taxes",
      "Outras Despesas": "other",
      "Salário": "salary",
      "Freelance": "freelance",
      "Investimentos": "investments",
      "Bônus": "bonus",
      "Outros": "others"
    };
    
    // Check for exact match first
    if (exactCategoryMap[categoryName]) {
      return t(`categories.${exactCategoryMap[categoryName]}`);
    }
    
    // If no exact match, try pattern matching
    const normalizedName = categoryName.toLowerCase();
    
    if (normalizedName.includes('moradia') || normalizedName.includes('habitação')) {
      return t('categories.housing');
    } else if (normalizedName.includes('alimentação')) {
      return t('categories.food');
    } else if (normalizedName.includes('transporte')) {
      return t('categories.transportation');
    } else if (normalizedName.includes('saúde') || normalizedName.includes('bem-estar')) {
      return t('categories.healthWellness');
    } else if (normalizedName.includes('educação')) {
      return t('categories.education');
    } else if (normalizedName.includes('lazer') || normalizedName.includes('entretenimento')) {
      return t('categories.entertainment');
    } else if (normalizedName.includes('vestuário') || normalizedName.includes('cuidados pessoais')) {
      return t('categories.clothing');
    } else if (normalizedName.includes('serviços domésticos')) {
      return t('categories.homeServices');
    } else if (normalizedName.includes('animais') || normalizedName.includes('pet')) {
      return t('categories.pets');
    } else if (normalizedName.includes('financeira')) {
      return t('categories.financial');
    } else if (normalizedName.includes('impostos') || normalizedName.includes('taxas')) {
      return t('categories.taxes');
    } else if (normalizedName.includes('salário')) {
      return t('categories.salary');
    } else if (normalizedName.includes('freelance')) {
      return t('categories.freelance');
    } else if (normalizedName.includes('investimento')) {
      return t('categories.investments');
    } else if (normalizedName.includes('bônus') || normalizedName.includes('bonus')) {
      return t('categories.bonus');
    } else if (normalizedName.includes('outro')) {
      return t('categories.others');
    } else {
      // Try to find a matching category key or return the original name
      return t(`categories.${normalizedName}`, { defaultValue: categoryName });
    }
  };
  
  const getCategoryName = (categoryId: number): string => {
    const categoryName = categories.find(c => c.id === categoryId)?.name || t('categories.others');
    return translateCategoryName(categoryName);
  };

  const getCategoryIcon = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    const IconComponent = category ? iconMap[category.icon] || Briefcase : Briefcase;
    return IconComponent;
  };

  const getIconColor = (type: string) => {
    return type === 'income' 
      ? 'text-green-500 bg-green-50' 
      : 'text-red-500 bg-red-50';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string, type: string) => {
    switch (status) {
      case 'received':
        return t('transactions.status.received');
      case 'paid':
        return t('transactions.status.paid');
      case 'pending':
        return t('transactions.status.pending');
      case 'overdue':
        return t('transactions.status.overdue');
      default:
        return status;
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="flex items-center justify-between pb-6">
        <CardTitle className="text-lg font-semibold text-gray-800">
          {t('dashboard.recentTransactions')}
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-sm"
          >
            {t('transactions.filters.all')}
          </Button>
          <Button
            variant={filter === "income" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("income")}
            className="text-sm"
          >
            {t('transactions.filters.income')}
          </Button>
          <Button
            variant={filter === "expense" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("expense")}
            className="text-sm"
          >
            {t('transactions.filters.expense')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('dashboard.noTransactions')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">{t('transactions.description')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">{t('transactions.category')}</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">{t('transactions.date')}</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">{t('transactions.amount')}</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">{t('transactions.status.label')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const IconComponent = getCategoryIcon(transaction.categoryId);
                  const iconColorClass = getIconColor(transaction.type);
                  const amountFormatted = formatCurrency(parseFloat(transaction.amount));
                  const amountWithSign = transaction.type === 'income' ? `+${amountFormatted}` : `-${amountFormatted}`;
                  const amountColor = transaction.type === 'income' ? 'text-green-600' : 'text-red-600';

                  return (
                    <tr key={transaction.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColorClass}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-gray-900">{transaction.description}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {getCategoryName(transaction.categoryId)}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {formatDate(transaction.date)}
                      </td>
                      <td className={`py-4 px-4 text-right font-semibold ${amountColor}`}>
                        {amountWithSign}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={`text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusText(transaction.status, transaction.type)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
