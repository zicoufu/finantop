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
  type?: string;
  categoryId: number;
  isRecurring: boolean;
  expenseType?: string;
}

export interface Account {
  id: number;
  name: string;
  balance: string;
  type?: string;
}
