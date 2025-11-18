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
import { eq, and, gte, lte, desc } from "drizzle-orm";

// ... (código existente da interface IStorage e classe MemStorage)

class DatabaseStorage {
  // ... (métodos existentes)


  /**
   * Inicializa dados de exemplo para demonstração
   * @returns Objeto com status da operação
   */
  async initializeSampleData(): Promise<{ success: boolean; userId?: number; message?: string }> {
    try {
      console.log('[DatabaseStorage] Inicializando dados de exemplo...');
      
      // Verifica se já existem usuários
      const existingUsers = await db.select().from(users);
      if (existingUsers.length === 0) {
        // Adiciona um usuário de exemplo
        const [newUser] = await db.insert(users).values({
          username: 'usuario_teste',
          password: 'senha123', // Em produção, use hash seguro
          name: 'Usuário Teste',
          email: 'teste@example.com'
        });
        
        console.log(`[DatabaseStorage] Usuário de exemplo criado com ID: ${newUser.insertId}`);
        
        // Busca o ID do usuário inserido
        const [user] = await db.select().from(users).where(eq(users.username, 'usuario_teste'));
        
        if (!user) {
          throw new Error('Falha ao recuperar o usuário criado');
        }
        
        // Adiciona categorias de exemplo
        const demoCategories = [
          { name: 'Alimentação', type: 'expense', icon: '🍔', color: '#FF6B6B', userId: user.id },
          { name: 'Transporte', type: 'expense', icon: '🚗', color: '#2196F3', userId: user.id },
          { name: 'Lazer', type: 'expense', icon: '🎮', color: '#9C27B0', userId: user.id },
          { name: 'Salário', type: 'income', icon: '💰', color: '#4CAF50', userId: user.id },
          { name: 'Freelance', type: 'income', icon: '💼', color: '#FF9800', userId: user.id }
        ];
        
        await db.insert(categories).values(demoCategories);
        console.log('[DatabaseStorage] Categorias de exemplo adicionadas');
        
        // Busca as categorias inseridas
        // O schema atual de categories não tem userId. Buscar todas as categorias.
        // Se adicionar userId no futuro, ajuste este filtro.
        const userCategories = await db.select().from(categories);
        
        // Encontra os IDs das categorias
        const alimentacaoCat = userCategories.find(c => c.name === 'Alimentação');
        const transporteCat = userCategories.find(c => c.name === 'Transporte');
        const salarioCat = userCategories.find(c => c.name === 'Salário');
        
        if (!alimentacaoCat || !transporteCat || !salarioCat) {
          throw new Error('Falha ao recuperar categorias de exemplo');
        }
        
        // Adiciona transações de exemplo
        const today = new Date();
        const demoTransactions = [
          {
            userId: user.id,
            description: 'Supermercado',
            amount: '250.75',
            type: 'expense',
            categoryId: alimentacaoCat.id,
            date: today,
            status: 'paid',
            isRecurring: false
          },
          {
            userId: user.id,
            description: 'Ônibus',
            amount: '5.50',
            type: 'expense',
            categoryId: transporteCat.id,
            date: today,
            status: 'paid',
            isRecurring: true
          },
          {
            userId: user.id,
            description: 'Salário',
            amount: '5000.00',
            type: 'income',
            categoryId: salarioCat.id,
            date: today,
            status: 'received',
            isRecurring: true
          }
        ];
        
        await db.insert(transactions).values(demoTransactions);
        console.log('[DatabaseStorage] Transações de exemplo adicionadas');
        
        return { success: true, userId: user.id };
      } else {
        console.log('[DatabaseStorage] Dados de exemplo já inicializados');
        return { success: false, message: 'Dados já inicializados' };
      }
    } catch (error) {
      console.error('[DatabaseStorage] Erro ao inicializar dados de exemplo:', error);
      throw error;
    }
  }

  // ... (outros métodos da classe DatabaseStorage)
}

export const storage = new DatabaseStorage();
