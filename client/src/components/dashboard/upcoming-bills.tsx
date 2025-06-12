import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { formatDateRelative } from "@/lib/date";
import { CreditCard, Home, Zap, Car, ShoppingCart } from "lucide-react";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  dueDate: string;
  status: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  icon: string;
}

const iconMap: { [key: string]: any } = {
  "fas fa-credit-card": CreditCard,
  "fas fa-home": Home,
  "fas fa-bolt": Zap,
  "fas fa-car": Car,
  "fas fa-shopping-cart": ShoppingCart,
};

export default function UpcomingBills() {
  const { data: upcomingBills, isLoading: billsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions?upcoming=7"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const isLoading = billsLoading || categoriesLoading;

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Próximas Contas
          </CardTitle>
          <Skeleton className="h-4 w-16" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!upcomingBills || !categories) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Próximas Contas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Nenhuma conta próxima ao vencimento
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'paid':
        return 'Pago';
      case 'overdue':
        return 'Vencido';
      default:
        return status;
    }
  };

  const getCategoryIcon = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    const IconComponent = category ? iconMap[category.icon] || CreditCard : CreditCard;
    return IconComponent;
  };

  const getIconColor = (categoryId: number) => {
    // Different colors for different categories
    const colors = [
      'text-red-500 bg-red-50',
      'text-blue-500 bg-blue-50',
      'text-green-500 bg-green-50',
      'text-yellow-500 bg-yellow-50',
      'text-purple-500 bg-purple-50',
    ];
    return colors[categoryId % colors.length];
  };

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between pb-6">
        <CardTitle className="text-lg font-semibold text-gray-800">
          Próximas Contas
        </CardTitle>
        <a href="/expenses" className="text-primary text-sm font-medium hover:text-primary/80">
          Ver todas
        </a>
      </CardHeader>
      <CardContent>
        {upcomingBills.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma conta próxima ao vencimento
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingBills.slice(0, 3).map((bill) => {
              const IconComponent = getCategoryIcon(bill.categoryId);
              const iconColorClass = getIconColor(bill.categoryId);
              
              return (
                <div key={bill.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColorClass}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{bill.description}</p>
                      <p className="text-sm text-gray-500">
                        {bill.dueDate ? formatDateRelative(bill.dueDate) : 'Data não definida'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(parseFloat(bill.amount))}
                    </p>
                    <Badge className={`text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {getStatusText(bill.status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
