export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Transaction {
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
