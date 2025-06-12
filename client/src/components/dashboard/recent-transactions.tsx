import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { Briefcase, ShoppingCart, Car, Home, Utensils } from "lucide-react";

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

const iconMap: { [key: string]: any } = {
  "fas fa-briefcase": Briefcase,
  "fas fa-shopping-cart": ShoppingCart,
  "fas fa-car": Car,
  "fas fa-home": Home,
  "fas fa-utensils": Utensils,
};

export default function RecentTransactions() {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isLoading = transactionsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="flex items-center justify-between pb-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Transações Recentes
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
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Descrição</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Categoria</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Data</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Valor</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
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
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Nenhuma transação encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredTransactions = transactions
    .filter(t => filter === "all" || t.type === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const getCategoryName = (categoryId: number): string => {
    return categories.find(c => c.id === categoryId)?.name || "Outros";
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
        return 'Recebido';
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="flex items-center justify-between pb-6">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Transações Recentes
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-sm"
          >
            Todas
          </Button>
          <Button
            variant={filter === "income" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("income")}
            className="text-sm"
          >
            Receitas
          </Button>
          <Button
            variant={filter === "expense" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("expense")}
            className="text-sm"
          >
            Despesas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma transação encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Descrição</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Categoria</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Data</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Valor</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
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
