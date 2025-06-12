import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const goalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  targetAmount: z.string().min(1, "Valor da meta é obrigatório"),
  currentAmount: z.string().optional(),
  targetDate: z.string().optional(),
  description: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface Goal {
  id: number;
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate?: string;
  description?: string;
}

interface GoalFormProps {
  initialData?: Goal;
  onSuccess: () => void;
}

export default function GoalForm({ initialData, onSuccess }: GoalFormProps) {
  const { toast } = useToast();
  
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initialData?.name || "",
      targetAmount: initialData?.targetAmount || "",
      currentAmount: initialData?.currentAmount || "0",
      targetDate: initialData?.targetDate || "",
      description: initialData?.description || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = {
        ...data,
        targetAmount: parseFloat(data.targetAmount).toString(),
        currentAmount: parseFloat(data.currentAmount || "0").toString(),
        targetDate: data.targetDate || null,
      };
      return apiRequest("POST", "/api/goals", payload);
    },
    onSuccess: () => {
      toast({
        title: "Meta criada",
        description: "A meta foi criada com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar a meta.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = {
        ...data,
        targetAmount: parseFloat(data.targetAmount).toString(),
        currentAmount: parseFloat(data.currentAmount || "0").toString(),
        targetDate: data.targetDate || null,
      };
      return apiRequest("PUT", `/api/goals/${initialData!.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Meta atualizada",
        description: "A meta foi atualizada com sucesso.",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a meta.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GoalFormData) => {
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
        <Label htmlFor="name">Nome da Meta</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder="Ex: Carro novo, Casa própria"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="targetAmount">Valor da Meta</Label>
        <Input
          id="targetAmount"
          type="number"
          step="0.01"
          {...form.register("targetAmount")}
          placeholder="50000"
        />
        {form.formState.errors.targetAmount && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.targetAmount.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="currentAmount">Valor Atual (opcional)</Label>
        <Input
          id="currentAmount"
          type="number"
          step="0.01"
          {...form.register("currentAmount")}
          placeholder="0"
        />
      </div>

      <div>
        <Label htmlFor="targetDate">Data Meta (opcional)</Label>
        <Input
          id="targetDate"
          type="date"
          {...form.register("targetDate")}
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder="Descreva sua meta..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : initialData ? "Atualizar" : "Criar Meta"}
        </Button>
      </div>
    </form>
  );
}
