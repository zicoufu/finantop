import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Category, Transaction } from "@/lib/types";
import { formatDate } from "@/lib/date";
import { Plus, Edit, Trash2, CreditCard, Filter } from "lucide-react";
import ExpenseFormNew from "@/components/forms/expense-form-new";
import { formatCurrency } from "@/lib/currency";
import { useTranslation } from "react-i18next";
import "@/styles/category-colors.css";

export default function Expenses() {
      const { t } = useTranslation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Transaction | null>(null);
  const [expenseTypeFilter, setExpenseTypeFilter] = useState<"all" | "fixed" | "variable">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1); // 1-12

  const startDateObj = new Date(Date.UTC(selectedYear, selectedMonth - 1, 1));
  const endDateObj = new Date(Date.UTC(selectedYear, selectedMonth, 0));
  const startDateStr = startDateObj.toISOString().split('T')[0];
  const endDateStr = endDateObj.toISOString().split('T')[0];

  const { data: expenses, isLoading: expensesLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions", "expense", selectedYear, selectedMonth],
    queryFn: () => api(`/api/transactions?type=expense&startDate=${startDateStr}&endDate=${endDateStr}`),
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["categories", "expense"],
    queryFn: () => api('/api/categories?type=expense'),
  });

  useEffect(() => {
    if (categories) {
      console.log("Categorias de Despesas Carregadas:", categories);
    }
  }, [categories]);

  const deleteExpenseMutation = useMutation({
    
    mutationFn: (id: number) => api(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", "expense"] });
      // Atualiza Relatórios (usa key "/api/transactions")
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({
        title: t('expenses.deleteSuccess.title'),
        description: t('expenses.deleteSuccess.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('expenses.deleteError'),
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      api(`/api/transactions/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", "expense"] });
      // Atualiza Relatórios (usa key "/api/transactions")
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({
        title: t('expenses.statusUpdate.title'),
        description: t('expenses.statusUpdate.description'),
      });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('expenses.statusUpdateError'),
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
            <h2 className="text-2xl font-bold text-gray-800">{t('expenses.title')}</h2>
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
            <h2 className="text-2xl font-bold text-gray-800">{t('expenses.title')}</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('expenses.newExpense')}
            </Button>
          </div>
        </header>
        <div className="p-6 flex-1">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                {t('expenses.loadError')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getCategoryName = (categoryId: number): string => {
    const category = categories?.find((c: Category) => c.id === categoryId);
    if (!category) {
      return t('categories.other');
    }

    const categoryName = category.name;

    const categoryKeyMap: Record<string, string> = {
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
      "Outras Despesas": "other"
    };

    const key = categoryKeyMap[categoryName];
    return key ? t(`categories.${key}`) : categoryName;
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
        return t('transactions.status.paid');
      case 'pending':
        return t('transactions.status.pending');
      case 'overdue':
        return t('transactions.status.overdue');
      default:
        return status;
    }
  };

  const handleStatusToggle = (expense: Transaction) => {
    const newStatus = expense.status === 'paid' ? 'pending' : 'paid';
    updateStatusMutation.mutate({ id: expense.id, status: newStatus });
  };

  const handleDelete = (id: number) => {
    if (confirm(t('expenses.confirmDelete'))) {
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
            <h2 className="text-2xl font-bold text-gray-800">{t('expenses.title')}</h2>
            <div className="flex space-x-6 mt-2">
              <span className="text-sm text-gray-600">
                {t('expenses.totalPaid')}: <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
              </span>
              <span className="text-sm text-gray-600">
                {t('expenses.pending')}: <span className="font-semibold text-orange-600">{formatCurrency(pendingExpenses)}</span>
              </span>
              <span className="text-sm text-gray-600">
                {t('expenses.fixed')}: <span className="font-semibold text-blue-600">{formatCurrency(fixedExpenses)}</span>
              </span>
              <span className="text-sm text-gray-600">
                {t('expenses.variable')}: <span className="font-semibold text-green-600">{formatCurrency(variableExpenses)}</span>
              </span>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                {t('expenses.newExpense')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('expenses.newExpense')}</DialogTitle>
              </DialogHeader>
              <ExpenseFormNew
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["transactions", "expense"] });
                  // Atualiza Relatórios (usa key "/api/transactions")
                  queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
                  queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
                }}
                categories={categories || []}
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
                {t('expenses.list')}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  aria-label={t('expenses.filterByType')}
                  value={expenseTypeFilter}
                  onChange={(e) => setExpenseTypeFilter(e.target.value as "all" | "fixed" | "variable")}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('expenses.filters.all')}</option>
                  <option value="fixed">{t('expenses.filters.fixed')}</option>
                  <option value="variable">{t('expenses.filters.variable')}</option>
                </select>
                <select
                  aria-label="Mês"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>
                <select
                  aria-label="Ano"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('expenses.empty.title')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {t('expenses.empty.description')}
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('expenses.add')}
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
                          className={`category-indicator category-color-${expense.categoryId}`}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{expense.description}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatDate(expense.date)}</span>
                            <span>{getCategoryName(expense.categoryId)}</span>
                            {expense.dueDate && (
                                                            <span>{t('expenses.due')}: {formatDate(expense.dueDate)}</span>
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
                                {expense.expenseType === 'fixed' ? t('expenses.types.fixed') : t('expenses.types.variable')}
                              </Badge>
                            )}
                            {expense.isRecurring && (
                              <Badge variant="outline" className="text-xs">
                                {t('expenses.recurring')}
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingExpense ? t('expenses.edit') : t('expenses.create')}</DialogTitle>
              <DialogDescription>
                {editingExpense ? t('expenses.editDescription') : t('expenses.createDescription')}
              </DialogDescription>
            </DialogHeader>
            <ExpenseFormNew
              initialData={editingExpense}
              onSuccess={() => {
                setEditingExpense(null);
                queryClient.invalidateQueries({ queryKey: ["transactions", "expense"] });
                // Atualiza Relatórios (usa key "/api/transactions")
                queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
                queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
              }}
              categories={categories}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
