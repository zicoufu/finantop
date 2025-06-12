import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const incomeSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.string().min(1, "Valor é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  status: z.enum(["pending", "received"]),
  isRecurring: z.boolean().optional(),
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface Category {
  id: number;
  name: string;
  color: string;
}

interface Transaction {
  id: number;
  description: string;
  amount: string;
  date: string;
  status: string;
  categoryId: number;
  isRecurring: boolean;
}

interface IncomeFormProps {
  initialData?: Transaction;
  onSuccess: () => void;
  categories: Category[];
}

export default function IncomeForm({ initialData, onSuccess, categories }: IncomeFormProps) {
  const { toast } = useToast();
  
  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || "",
      date: initialData?.date || new Date().toISOString().split('T')[0],
      categoryId: initialData?.categoryId?.toString() || "",
      status: (initialData?.status as any) || "pending",
      isRecurring: initialData?.isRecurring || false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
        type: "income",
      };
      return apiRequest("POST", "/api/transactions", payload);
    },
    onSuccess: () => {
      toast({
        title: "Receita criada",
        description: "A receita foi criada com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a receita.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      const payload = {
        ...data,
        amount: parseFloat(data.amount).toString(),
        categoryId: parseInt(data.categoryId),
      };
      return apiRequest("PUT", `/api/transactions/${initialData!.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Receita atualizada",
        description: "A receita foi atualizada com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a receita.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IncomeFormData) => {
    if (initialData) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          {...form.register("description")}
          placeholder="Ex: Salário mensal"
        />
        {form.formState.errors.description && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">Valor</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...form.register("amount")}
          placeholder="0,00"
        />
        {form.formState.errors.amount && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.amount.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="categoryId">Categoria</Label>
        <Select value={form.watch("categoryId")} onValueChange={(value) => form.setValue("categoryId", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.categoryId && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.categoryId.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="date">Data</Label>
        <Input
          id="date"
          type="date"
          {...form.register("date")}
        />
        {form.formState.errors.date && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.date.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={form.watch("status")} onValueChange={(value) => form.setValue("status", value as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="received">Recebido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isRecurring"
          checked={form.watch("isRecurring")}
          onCheckedChange={(checked) => form.setValue("isRecurring", checked)}
        />
        <Label htmlFor="isRecurring">Receita recorrente</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : initialData ? "Atualizar" : "Criar"}
        </Button>
      </div>
    </form>
  );
}
