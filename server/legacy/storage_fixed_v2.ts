import { 
  users, categories, transactions, goals, investments, alerts,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Goal, type InsertGoal,
  type Investment, type InsertInvestment,
  type Alert, type InsertAlert
} from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";

// Interface IStorage
interface IStorage {
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

  // Sample Data
  initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }>;
}

class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const { updatedAt, ...userWithoutUpdatedAt } = userData as any;
    await db.insert(users).values(userWithoutUpdatedAt);
    
    const [newUser] = await db.select()
      .from(users)
      .where(eq(users.username, userData.username));
      
    if (!newUser) throw new Error('Failed to create user');
    return newUser;
  }

  // Categories
  async getCategories(userId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId));
  }

  async getCategoriesByType(userId: number, type: string): Promise<Category[]> {
    return db.select()
      .from(categories)
      .where(and(
        eq(categories.userId, userId),
        eq(categories.type, type)
      ));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const { updatedAt, ...categoryWithoutUpdatedAt } = category as any;
    await db.insert(categories).values(categoryWithoutUpdatedAt);
    
    const [newCategory] = await db.select()
      .from(categories)
      .orderBy(desc(categories.id))
      .limit(1);
      
    if (!newCategory) throw new Error('Failed to create category');
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const { updatedAt, ...categoryWithoutUpdatedAt } = category as any;
    await db.update(categories)
      .set(categoryWithoutUpdatedAt)
      .where(eq(categories.id, id));
    
    const [updated] = await db.select()
      .from(categories)
      .where(eq(categories.id, id));
    
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Transactions
  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async getTransactionsByDateRange(userId: number, startDate: string, endDate: string): Promise<Transaction[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, start),
        lte(transactions.date, end)
      ))
      .orderBy(asc(transactions.date));
  }

  async getTransactionsByType(userId: number, type: string): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, type)
      ))
      .orderBy(desc(transactions.date));
  }

  async getUpcomingTransactions(userId: number, days: number): Promise<Transaction[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    futureDate.setHours(23, 59, 59, 999);
    
    return db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.date, today),
        lte(transactions.date, futureDate)
      ))
      .orderBy(asc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    if (transaction.categoryId === undefined) {
      throw new Error('categoryId is required');
    }
    
    const { updatedAt, ...transactionWithoutUpdatedAt } = transaction as any;
    await db.insert(transactions).values(transactionWithoutUpdatedAt);
    
    const [newTransaction] = await db.select()
      .from(transactions)
      .orderBy(desc(transactions.id))
      .limit(1);
      
    if (!newTransaction) throw new Error('Failed to create transaction');
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const { updatedAt, ...transactionWithoutUpdatedAt } = transaction as any;
    await db.update(transactions)
      .set(transactionWithoutUpdatedAt)
      .where(eq(transactions.id, id));
    
    const [updated] = await db.select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    return updated;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    await db.delete(transactions).where(eq(transactions.id, id));
    return true;
  }

  // Goals
  async getGoals(userId: number): Promise<Goal[]> {
    return db.select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const { updatedAt, ...goalWithoutUpdatedAt } = goal as any;
    await db.insert(goals).values(goalWithoutUpdatedAt);
    
    const [newGoal] = await db.select()
      .from(goals)
      .orderBy(desc(goals.id))
      .limit(1);
      
    if (!newGoal) throw new Error('Failed to create goal');
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const { updatedAt, ...goalWithoutUpdatedAt } = goal as any;
    await db.update(goals)
      .set(goalWithoutUpdatedAt)
      .where(eq(goals.id, id));
    
    const [updated] = await db.select()
      .from(goals)
      .where(eq(goals.id, id));
    
    return updated;
  }

  async deleteGoal(id: number): Promise<boolean> {
    await db.delete(goals).where(eq(goals.id, id));
    return true;
  }

  // Investments
  async getInvestments(userId: number): Promise<Investment[]> {
    return db.select()
      .from(investments)
      .where(eq(investments.userId, userId))
      .orderBy(desc(investments.createdAt));
  }

  async createInvestment(investment: InsertInvestment): Promise<Investment> {
    const investmentWithDefaults = {
      maturityDate: null,
      notes: null,
      ...investment,
    };
    
    const { updatedAt, ...investmentWithoutUpdatedAt } = investmentWithDefaults as any;
    await db.insert(investments).values(investmentWithoutUpdatedAt);
    
    const [newInvestment] = await db.select()
      .from(investments)
      .orderBy(desc(investments.id))
      .limit(1);
      
    if (!newInvestment) throw new Error('Failed to create investment');
    return newInvestment;
  }

  async updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const { updatedAt, ...investmentWithoutUpdatedAt } = investment as any;
    await db.update(investments)
      .set(investmentWithoutUpdatedAt)
      .where(eq(investments.id, id));
    
    const [updated] = await db.select()
      .from(investments)
      .where(eq(investments.id, id));
    
    return updated;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    await db.delete(investments).where(eq(investments.id, id));
    return true;
  }

  // Alerts
  async getAlerts(userId: number): Promise<Alert[]> {
    return db.select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return db.select()
      .from(alerts)
      .where(and(
        eq(alerts.userId, userId),
        eq(alerts.isRead, false)
      ))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const alertWithDefaults = {
      isRead: false,
      referenceId: null,
      referenceType: null,
      ...alert,
    };
    
    const { updatedAt, ...alertWithoutUpdatedAt } = alertWithDefaults as any;
    await db.insert(alerts).values(alertWithoutUpdatedAt);
    
    const [newAlert] = await db.select()
      .from(alerts)
      .orderBy(desc(alerts.id))
      .limit(1);
      
    if (!newAlert) throw new Error('Failed to create alert');
    return newAlert;
  }

  async markAlertAsRead(id: number): Promise<boolean> {
    await db.update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id));
    return true;
  }

  async deleteAlert(id: number): Promise<boolean> {
    await db.delete(alerts).where(eq(alerts.id, id));
    return true;
  }

  // Sample Data
  async initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }> {
    try {
      console.log('[DatabaseStorage] Inicializando dados de exemplo...');
      
      // Verifica se já existem usuários
      const existingUsers = await db.select().from(users);
      if (existingUsers.length === 0) {
        // Adiciona um usuário de exemplo
        await db.insert(users).values({
          username: 'usuario_teste',
          password: 'senha123', // Em produção, use hash seguro
          email: 'teste@example.com',
          name: 'Usuário Teste',
          createdAt: new Date()
        });
        
        const [user] = await db.select()
          .from(users)
          .where(eq(users.username, 'usuario_teste'));
          
        if (!user) {
          throw new Error('Falha ao recuperar o usuário criado');
        }
        
        // Adiciona categorias de exemplo
        const demoCategories = [
          { name: 'Alimentação', type: 'expense', icon: '🍔', color: '#FF6B6B', userId: user.id },
          { name: 'Transporte', type: 'expense', icon: '🚗', color: '#2196F3', userId: user.id },
          { name: 'Lazer', type: 'expense', icon: '🎮', color: '#9C27B0', userId: user.id },
          { name: 'Salário', type: 'income', icon: '💰', color: '#4CAF50', userId: user.id },
          { name: 'Freelance', type: 'income', icon: '💻', color: '#FF9800', userId: user.id }
        ];
        
        for (const category of demoCategories) {
          await this.createCategory(category);
        }
        
        // Busca as categorias recém-criadas
        const userCategories = await this.getCategories(user.id);
        
        // Adiciona transações de exemplo
        const today = new Date();
        const demoTransactions = [
          {
            userId: user.id,
            description: 'Supermercado',
            amount: '250.75',
            type: 'expense',
            categoryId: userCategories.find(c => c.name === 'Alimentação')?.id,
            date: today,
            status: 'completed',
            isRecurring: false
          },
          {
            userId: user.id,
            description: 'Salário',
            amount: '5000.00',
            type: 'income',
            categoryId: userCategories.find(c => c.name === 'Salário')?.id,
            date: today,
            status: 'completed',
            isRecurring: true
          }
        ];
        
        for (const transaction of demoTransactions) {
          if (transaction.categoryId) {
            await this.createTransaction(transaction as InsertTransaction);
          }
        }
        
        return { success: true, userId: user.id };
      } else {
        return { success: false, message: 'Dados já inicializados' };
      }
    } catch (error) {
      console.error('[DatabaseStorage] Erro ao inicializar dados de exemplo:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }
}

export const storage = new DatabaseStorage();
