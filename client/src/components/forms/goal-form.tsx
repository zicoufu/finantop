import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Goal as SharedGoal } from "../../../../shared/schema"; 
import { handleApiFormError } from "@/lib/formError";

const formatDateForInput = (date: Date | null | undefined): string => {
  if (!date) return "";
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error formatting date:", date, error);
    return ""; 
  }
};

import { useTranslation } from "react-i18next";

const createGoalSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t("goals.validation.nameRequired")),
  targetAmount: z.string().min(1, t("goals.validation.targetAmountRequired")),
  currentAmount: z.string().optional(),
  targetDate: z.string().optional(),
  description: z.string().optional(),
  monthlyContribution: z.coerce.number().min(0, t("goals.validation.contributionPositive")).optional().default(0),
  annualInterestRate: z.coerce.number().min(0, t("goals.validation.interestRateMin")).max(100, t("goals.validation.interestRateMax")),
});

type GoalFormData = z.infer<ReturnType<typeof createGoalSchema>>;

interface GoalFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SharedGoal; 
  onSubmitSuccess?: () => void;
}

export default function GoalForm({ initialData, onSubmitSuccess }: GoalFormProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const goalSchema = createGoalSchema(t);
  
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initialData?.name || "",
      targetAmount: initialData?.targetAmount || "",
      currentAmount: initialData?.currentAmount || "0",
      targetDate: initialData?.targetDate ? formatDateForInput(initialData.targetDate) : "",
      description: initialData?.description || "",
      monthlyContribution: initialData?.monthlyContribution ? parseFloat(initialData.monthlyContribution) : 0,
      annualInterestRate: initialData?.annualInterestRate ? parseFloat(initialData.annualInterestRate) : 0, // Always initialize as a number
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = {
        ...data,
        targetAmount: parseFloat(data.targetAmount).toString(),
        currentAmount: parseFloat(data.currentAmount || "0").toString(),
        targetDate: data.targetDate || null,
        monthlyContribution: (data.monthlyContribution ?? 0).toString(),
        annualInterestRate: (data.annualInterestRate ?? 0).toString(),
      };
      return api("/api/goals", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({ title: t("goals.messages.createSuccess") });
      onSubmitSuccess?.();
    },
    onError: (error) => {
      const msg = handleApiFormError<GoalFormData>(error, form.setError, t, { defaultMessageKey: 'goals.messages.createError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = {
        ...data,
        targetAmount: parseFloat(data.targetAmount).toString(),
        currentAmount: parseFloat(data.currentAmount || "0").toString(),
        targetDate: data.targetDate || null,
        monthlyContribution: (data.monthlyContribution ?? 0).toString(),
        annualInterestRate: (data.annualInterestRate ?? 0).toString(),
      };
      return api(`/api/goals/${initialData!.id}`, { method: "PUT", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      toast({ title: t("goals.messages.updateSuccess") });
      onSubmitSuccess?.();
    },
    onError: (error) => {
      const msg = handleApiFormError<GoalFormData>(error, form.setError, t, { defaultMessageKey: 'goals.messages.updateError' });
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
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
        <Label htmlFor="name">{t("goals.form.name")}</Label>
        <Input
          id="name"
          {...form.register("name")}
          placeholder={t("goals.form.namePlaceholder")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="targetAmount">{t("goals.form.targetAmount")}</Label>
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
        <Label htmlFor="currentAmount">{t("goals.form.currentAmount")}</Label>
        <Input
          id="currentAmount"
          type="number"
          step="0.01"
          {...form.register("currentAmount")}
          placeholder="0"
        />
      </div>

      <div>
        <Label htmlFor="targetDate">{t("goals.form.targetDate")}</Label>
        <Input
          id="targetDate"
          type="date"
          {...form.register("targetDate")}
        />
      </div>

      <div>
        <Label htmlFor="monthlyContribution">{t("goals.form.monthlyContribution")}</Label>
        <Input
          id="monthlyContribution"
          type="number"
          step="0.01"
          {...form.register("monthlyContribution")}
          placeholder="300"
        />
        {form.formState.errors.monthlyContribution && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.monthlyContribution.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="annualInterestRate">{t("goals.form.annualInterestRate")}</Label>
        <Input
          id="annualInterestRate"
          type="number"
          step="0.01"
          {...form.register("annualInterestRate")}
          placeholder="10"
        />
        {form.formState.errors.annualInterestRate && (
          <p className="text-sm text-red-600 mt-1">
            {form.formState.errors.annualInterestRate.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="description">{t("goals.form.description")}</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          placeholder={t("goals.form.descriptionPlaceholder")}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("common.saving") : initialData ? t("common.update") : t("goals.form.create")}
        </Button>
      </div>
    </form>
  );
}
