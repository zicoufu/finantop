import { 
  users, categories, transactions, goals, investments, alerts,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Goal, type InsertGoal,
  type Investment, type InsertInvestment,
  type Alert, type InsertAlert
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Categories
  getCategories(userId: number): Promise<Category[]>;
  getCategoriesByType(userId: number, type: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  // Transactions
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionsByDateRange(userId: number, startDate: string, endDate: string): Promise<Transaction[]>;
  getTransactionsByType(userId: number, type: string): Promise<Transaction[]>;
  getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Goals
  getGoals(userId: number): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;

  // Investments
  getInvestments(userId: number): Promise<Investment[]>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: number): Promise<boolean>;

  // Alerts
  getAlerts(userId: number): Promise<Alert[]>;
  getUnreadAlerts(userId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<boolean>;
  deleteAlert(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private goals: Map<number, Goal>;
  private investments: Map<number, Investment>;
  private alerts: Map<number, Alert>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.goals = new Map();
    this.investments = new Map();
    this.alerts = new Map();
    this.currentId = 1;

    // Initialize with demo user and default categories
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Create demo user
    const demoUser: User = {
      id: 1,
      username: "demo",
      password: "demo123",
      name: "João Silva",
      email: "joao@example.com",
      createdAt: new Date()
    };
    this.users.set(1, demoUser);

    // Default expense categories
    const defaultExpenseCategories: Category[] = [
      { id: 2, name: "Alimentação", type: "expense", color: "#ef4444", icon: "fas fa-utensils", userId: 1 },
      { id: 3, name: "Transporte", type: "expense", color: "#3b82f6", icon: "fas fa-car", userId: 1 },
      { id: 4, name: "Moradia", type: "expense", color: "#10b981", icon: "fas fa-home", userId: 1 },
      { id: 5, name: "Lazer", type: "expense", color: "#f59e0b", icon: "fas fa-gamepad", userId: 1 },
      { id: 6, name: "Saúde", type: "expense", color: "#8b5cf6", icon: "fas fa-heart", userId: 1 },
      { id: 7, name: "Educação", type: "expense", color: "#6366f1", icon: "fas fa-book", userId: 1 },
      { id: 8, name: "Outros", type: "expense", color: "#6b7280", icon: "fas fa-ellipsis-h", userId: 1 },
    ];

    // Default income categories
    const defaultIncomeCategories: Category[] = [
      { id: 9, name: "Salário", type: "income", color: "#059669", icon: "fas fa-briefcase", userId: 1 },
      { id: 10, name: "Freelance", type: "income", color: "#0891b2", icon: "fas fa-laptop", userId: 1 },
      { id: 11, name: "Investimentos", type: "income", color: "#7c3aed", icon: "fas fa-chart-line", userId: 1 },
      { id: 12, name: "Outros", type: "income", color: "#6b7280", icon: "fas fa-coins", userId: 1 },
    ];

    [...defaultExpenseCategories, ...defaultIncomeCategories].forEach(cat => {
      this.categories.set(cat.id, cat);
    });

    this.currentId = 13;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Categories
  async getCategories(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(cat => cat.userId === userId);
  }

  async getCategoriesByType(userId: number, type: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(cat => cat.userId === userId && cat.type === type);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existing = this.categories.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...category };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Transactions
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => t.userId === userId);
  }

  async getTransactionsByDateRange(userId: number, startDate: string, endDate: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => 
      t.userId === userId && 
      t.date >= startDate && 
      t.date <= endDate
    );
  }

  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(t => t.userId === userId && t.type === type);
  }

  async getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]> {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    return Array.from(this.transactions.values()).filter(t => 
      t.userId === userId && 
      t.dueDate && 
      t.dueDate >= todayStr && 
      t.dueDate <= futureDateStr &&
      t.status === 'pending'
    );
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId++;
    const newTransaction: Transaction = { 
      ...transaction, 
      id, 
      createdAt: new Date(),
      isRecurring: transaction.isRecurring || false,
      dueDate: transaction.dueDate || null,
      expenseType: transaction.expenseType || null
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...transaction };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Goals
  async getGoals(userId: number): Promise<Goal[]> {
    return Array.from(this.goals.values()).filter(g => g.userId === userId);
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const id = this.currentId++;
    const newGoal: Goal = { 
      ...goal, 
      id, 
      createdAt: new Date() 
    };
    this.goals.set(id, newGoal);
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const existing = this.goals.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...goal };
    this.goals.set(id, updated);
    return updated;
  }

  async deleteGoal(id: number): Promise<boolean> {
    return this.goals.delete(id);
  }

  // Investments
  async getInvestments(userId: number): Promise<Investment[]> {
    return Array.from(this.investments.values()).filter(i => i.userId === userId);
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const id = this.currentId++;
    const newInvestment: Investment = { 
      ...investment, 
      id, 
      createdAt: new Date() 
    };
    this.investments.set(id, newInvestment);
    return newInvestment;
  }

  async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const existing = this.investments.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...investment };
    this.investments.set(id, updated);
    return updated;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    return this.investments.delete(id);
  }

  // Alerts
  async getAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(a => a.userId === userId);
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(a => a.userId === userId && !a.isRead);
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const id = this.currentId++;
    const newAlert: Alert = { 
      ...alert, 
      id, 
      createdAt: new Date() 
    };
    this.alerts.set(id, newAlert);
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;
    
    alert.isRead = true;
    this.alerts.set(id, alert);
    return true;
  }

  async deleteAlert(id: number): Promise<boolean> {
    return this.alerts.delete(id);
  }
}

export const storage = new MemStorage();
