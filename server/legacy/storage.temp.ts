import { 
  users, categories, transactions, goals, investments, alerts, userPreferences,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Transaction, type InsertTransaction,
  type Goal, type InsertGoal,
  type Investment, type InsertInvestment,
  type Alert, type InsertAlert,
  type UserPreference, type InsertUserPreference,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import { type MySqlTransaction } from 'drizzle-orm/mysql-core';
import bcrypt from 'bcrypt';

// Tipagem para o cliente de transação do Drizzle
type TransactionClient = MySqlTransaction<any, any, any, any>;

// Renomeando a interface para evitar conflito com a interface Storage do DOM
export interface IAppStorage {
  runInTransaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T>;
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(user: InsertUser, tx?: TransactionClient): Promise<User>;
  getCategories(userId: number): Promise<Category[]>;
  getDefaultCategories(): Promise<Category[]>;
  createManyCategories(categories: InsertCategory[], tx?: TransactionClient): Promise<void>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  getTransactions(userId: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  getGoals(userId: number): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  getAlerts(userId: number): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  getUserPreferences(userId: number): Promise<UserPreference | undefined>;
  createUserPreferences(preferences: Omit<InsertUserPreference, 'id' | 'createdAt' | 'updatedAt'>, tx?: TransactionClient): Promise<UserPreference>;
  initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }>;
}

class DatabaseStorage implements IAppStorage {
  async runInTransaction<T>(callback: (tx: TransactionClient) => Promise<T>): Promise<T> {
    return db.transaction(callback);
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.id));
  }

  async getUser(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async createUser(data: InsertUser, tx?: TransactionClient): Promise<User> {
    const dbClient = tx || db;
    const result = await dbClient.insert(users).values(data);
    const newUserId = result[0].insertId;
    const [newUser] = await dbClient.select().from(users).where(eq(users.id, newUserId));
    if (!newUser) {
      throw new Error("Failed to retrieve new user after creation.");
    }
    return newUser;
  }

  async getCategories(userId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId));
  }

  async getDefaultCategories(): Promise<Category[]> {
    const DEMO_USER_ID = 1;
    return db.select().from(categories).where(eq(categories.userId, DEMO_USER_ID));
  }

  async createManyCategories(data: InsertCategory[], tx?: TransactionClient): Promise<void> {
    const dbClient = tx || db;
    if (data.length === 0) return;
    await dbClient.insert(categories).values(data);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    if (!category.userId) {
      throw new Error('UserID é obrigatório para criar uma categoria.');
    }
    const result = await db.insert(categories).values(category);
    const [newCategory] = await db.select().from(categories).where(eq(categories.id, result[0].insertId));
    if (!newCategory) throw new Error('Failed to create category');
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    await db.update(categories).set(category).where(eq(categories.id, id));
    const [updated] = await db.select().from(categories).where(eq(categories.id, id));
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.date));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction);
    const [newTransaction] = await db.select().from(transactions).where(eq(transactions.id, result[0].insertId));
    if (!newTransaction) throw new Error('Failed to create transaction');
    await this.createAlertIfNeeded(newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    await db.update(transactions).set(transaction).where(eq(transactions.id, id));
    const [updated] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (updated) {
      await this.createAlertIfNeeded(updated);
    }
    return updated;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    await db.delete(transactions).where(eq(transactions.id, id));
    return true;
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async getGoals(userId: number): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const result = await db.insert(goals).values(goal);
    const [newGoal] = await db.select().from(goals).where(eq(goals.id, result[0].insertId));
    if (!newGoal) throw new Error('Failed to create goal');
    return newGoal;
  }

  async updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    await db.update(goals).set(goal).where(eq(goals.id, id));
    const [updated] = await db.select().from(goals).where(eq(goals.id, id));
    return updated;
  }

  async deleteGoal(id: number): Promise<boolean> {
    await db.delete(goals).where(eq(goals.id, id));
    return true;
  }

  async getAlerts(userId: number): Promise<Alert[]> {
    return db.select().from(alerts).where(eq(alerts.userId, userId)).orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert);
    const [newAlert] = await db.select().from(alerts).where(eq(alerts.id, result[0].insertId));
    if (!newAlert) throw new Error('Failed to create alert');
    return newAlert;
  }

  async getUserPreferences(userId: number): Promise<UserPreference | undefined> {
    const [preference] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return preference;
  }

  async createUserPreferences(preferences: Omit<InsertUserPreference, 'id' | 'createdAt' | 'updatedAt'>, tx?: TransactionClient): Promise<UserPreference> {
    const dbClient = tx || db;
    const result = await dbClient.insert(userPreferences).values(preferences);
    const [newUserPreference] = await dbClient.select().from(userPreferences).where(eq(userPreferences.id, result[0].insertId));
    if (!newUserPreference) throw new Error("Failed to retrieve new user preference after creation.");
    return newUserPreference;
  }

  private async createAlertIfNeeded(transaction: Transaction): Promise<void> {
    if (transaction.type === 'expense' && transaction.dueDate) {
      const dueDate = new Date(transaction.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
      const dayDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      if (dayDiff <= 7) { 
        let alertMessage = `A despesa "${transaction.description}" vence em ${dayDiff} dia(s).`;
        if (dayDiff < 0) {
          alertMessage = `A despesa "${transaction.description}" venceu há ${Math.abs(dayDiff)} dia(s).`;
        } else if (dayDiff === 0) {
          alertMessage = `A despesa "${transaction.description}" vence hoje.`;
        }
        
        const alertData: InsertAlert = {
          userId: transaction.userId,
          message: alertMessage,
          type: 'due_date',
          referenceId: transaction.id,
          referenceType: 'transaction',
          isRead: false,
        };
        await this.createAlert(alertData);
      }
    }
  }

  async initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }> {
    try {
      const demoUserEmail = 'demo@example.com';
      let user = await this.getUserByEmail(demoUserEmail);

      if (user) {
        return { success: true, userId: user.id, message: 'Sample data already exists.' };
      }

      const hashedPassword = await bcrypt.hash('demopassword', 10);
      user = await this.createUser({
        name: 'Usuário Demo',
        username: 'demouser',
        email: demoUserEmail,
        password: hashedPassword,
      });
      const newUserId = user.id;

      const sampleCategoriesData = [
        { name: 'Salário', type: 'income', icon: 'cash', color: '#2ecc71' },
        { name: 'Moradia', type: 'expense', icon: 'home', color: '#e74c3c' },
        { name: 'Alimentação', type: 'expense', icon: 'food', color: '#f1c40f' },
      ];

      const categoriesToInsert = sampleCategoriesData.map(c => ({ ...c, userId: newUserId }));
      await this.createManyCategories(categoriesToInsert);

      return { success: true, userId: newUserId };
    } catch (error) {
      const err = error as Error;
      console.error('Error initializing sample data:', err);
      return { success: false, message: err.message };
    }
  }
}

export const storage: IAppStorage = new DatabaseStorage();
