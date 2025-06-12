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
import { Plus, Edit, Trash2, Coins } from "lucide-react";
import IncomeForm from "@/components/forms/income-form";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  status: string;
  categoryId: number;
  isRecurring: boolean;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

export default function Income() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const { data: incomes, isLoading: incomesLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions?type=income"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories?type=income"],
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Receita excluída",
        description: "A receita foi excluída com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a receita.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PUT", `/api/transactions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=income"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      toast({
        title: "Status atualizado",
        description: "O status da receita foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da receita.",
        variant: "destructive",
      });
    },
  });

  const isLoading = incomesLoading || categoriesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Receitas</h2>
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

  if (!incomes || !categories) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Receitas</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </div>
        </header>
        <div className="p-6 flex-1">
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8 text-gray-500">
                Erro ao carregar receitas
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
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received':
        return 'Recebido';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  const handleStatusToggle = (income: Transaction) => {
    const newStatus = income.status === 'received' ? 'pending' : 'received';
    updateStatusMutation.mutate({ id: income.id, status: newStatus });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta receita?')) {
      deleteIncomeMutation.mutate(id);
    }
  };

  const totalReceived = incomes
    .filter(i => i.status === 'received')
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  const pendingIncome = incomes
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + parseFloat(i.amount), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Receitas</h2>
            <div className="flex space-x-6 mt-2">
              <span className="text-sm text-gray-600">
                Total Recebido: <span className="font-semibold text-green-600">{formatCurrency(totalReceived)}</span>
              </span>
              <span className="text-sm text-gray-600">
                Pendente: <span className="font-semibold text-orange-600">{formatCurrency(pendingIncome)}</span>
              </span>
            </div>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Receita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Receita</DialogTitle>
              </DialogHeader>
              <IncomeForm
                onSuccess={() => {
                  setIsCreateOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=income"] });
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
            <CardTitle className="flex items-center">
              <Coins className="h-5 w-5 mr-2" />
              Lista de Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomes.length === 0 ? (
              <div className="text-center py-12">
                <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma receita cadastrada
                </h3>
                <p className="text-gray-500 mb-4">
                  Comece adicionando sua primeira receita.
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Receita
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {incomes
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((income) => (
                    <div key={income.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(income.categoryId) }}
                        />
                        <div>
                          <h3 className="font-medium text-gray-900">{income.description}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{formatDate(income.date)}</span>
                            <span>{getCategoryName(income.categoryId)}</span>
                            {income.isRecurring && (
                              <Badge variant="outline" className="text-xs">
                                Recorrente
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold text-lg text-green-600">
                          +{formatCurrency(parseFloat(income.amount))}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggle(income)}
                          className={getStatusColor(income.status)}
                        >
                          {getStatusText(income.status)}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingIncome(income);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(income.id)}
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
      {editingIncome && (
        <Dialog open={!!editingIncome} onOpenChange={() => setEditingIncome(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Receita</DialogTitle>
            </DialogHeader>
            <IncomeForm
              initialData={editingIncome}
              onSuccess={() => {
                setEditingIncome(null);
                queryClient.invalidateQueries({ queryKey: ["/api/transactions?type=income"] });
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
