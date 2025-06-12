import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { Plus, Edit, Trash2, CreditCard, Filter } from "lucide-react";
import ExpenseForm from "@/components/forms/expense-form";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  dueDate?: string;
  status: string;
  categoryId: number;
  isRecurring: boolean;
  expenseType?: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

export default function Expenses() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<"all" | "fixed" | "variable">("all");
  const { toast } = useToast();

  const { data: expenses, isLoading: expensesLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions?type=expense"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories?type=expense"],
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=expense"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Despesa excluída",
        description: "A despesa foi excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a despesa.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PUT", `/api/transactions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=expense"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Status atualizado",
        description: "O status da despesa foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da despesa.",
        variant: "destructive",
      });
    },
  });

  const isLoading = expensesLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Despesas</h2>
            <Skeleton className="h-10 w-32" />
          </div>
        </header>
        <div className="p-6 flex-1">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!expenses || !categories) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Despesas</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          </div>
        </header>
        <div className="p-6 flex-1">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                Erro ao carregar despesas
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getCategoryName = (categoryId: number): string => {
    return categories.find(c => c.id === categoryId)?.name || "Outros";
  };

  const getCategoryColor = (categoryId: number): string => {
    return categories.find(c => c.id === categoryId)?.color || "#6b7280";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getStatusText = (status: string) => {
    switch (status) {
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

  const handleStatusToggle = (expense: Transaction) => {
    const newStatus = expense.status === 'paid' ? 'pending' : 'paid';
    updateStatusMutation.mutate({ id: expense.id, status: newStatus });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta despesa?')) {
      deleteExpenseMutation.mutate(id);
    }
  };

  // Filter expenses based on type filter
  const filteredExpenses = expenses?.filter(expense => {
    if (expenseTypeFilter === "all") return true;
    return expense.expenseType === expenseTypeFilter;
  }) || [];

  const totalExpenses = expenses
    ?.filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

  const pendingExpenses = expenses
    ?.filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

  const fixedExpenses = expenses
    ?.filter(e => e.expenseType === 'fixed' && e.status === 'paid')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

  const variableExpenses = expenses
    ?.filter(e => e.expenseType === 'variable' && e.status === 'paid')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Despesas</h2>
            <div className="flex space-x-6 mt-2">
              <span className="text-sm text-gray-600">
                Total Pago: <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
              </span>
              <span className="text-sm text-gray-600">
                Pendente: <span className="font-semibold text-orange-600">{formatCurrency(pendingExpenses)}</span>
              </span>
              <span className="text-sm text-gray-600">
                Fixas: <span className="font-semibold text-blue-600">{formatCurrency(fixedExpenses)}</span>
              </span>
              <span className="text-sm text-gray-600">
                Variáveis: <span className="font-semibold text-green-600">{formatCurrency(variableExpenses)}</span>
              </span>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Despesa</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=expense"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
                }}
                categories={categories}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Lista de Despesas
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={expenseTypeFilter}
                  onChange={(e) => setExpenseTypeFilter(e.target.value as "all" | "fixed" | "variable")}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas as Despesas</option>
                  <option value="fixed">Despesas Fixas</option>
                  <option value="variable">Despesas Variáveis</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma despesa cadastrada
                </h3>
                <p className="text-gray-500 mb-4">
                  Comece adicionando sua primeira despesa.
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Despesa
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(expense.categoryId) }}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{expense.description}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatDate(expense.date)}</span>
                            <span>{getCategoryName(expense.categoryId)}</span>
                            {expense.dueDate && (
                              <span>Vence: {formatDate(expense.dueDate)}</span>
                            )}
                            {expense.expenseType && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  expense.expenseType === 'fixed' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-green-50 text-green-700 border-green-200'
                                }`}
                              >
                                {expense.expenseType === 'fixed' ? 'Despesa Fixa' : 'Despesa Variável'}
                              </Badge>
                            )}
                            {expense.isRecurring && (
                              <Badge variant="outline" className="text-xs">
                                Recorrente
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold text-lg text-gray-900">
                          {formatCurrency(parseFloat(expense.amount))}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggle(expense)}
                          className={getStatusColor(expense.status)}
                        >
                          {getStatusText(expense.status)}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingExpense(expense);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {editingExpense && (
        <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Despesa</DialogTitle>
            </DialogHeader>
            <ExpenseForm
              initialData={editingExpense}
              onSuccess={() => {
                setEditingExpense(null);
                queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=expense"] });
                queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
              }}
              categories={categories}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
