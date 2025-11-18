// Script para inserir categorias diretamente no banco de dados
import { db } from '../db.ts';
import { categories } from '../../shared/schema.js';

async function insertCategories() {
  try {
    console.log('Inserindo categorias de exemplo...');
    
    const demoCategories = [
      { name: 'Alimentação', type: 'expense', icon: '🍔', color: '#FF6B6B', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Transporte', type: 'expense', icon: '🚗', color: '#2196F3', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Moradia', type: 'expense', icon: '🏠', color: '#FFC107', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Saúde', type: 'expense', icon: '❤️', color: '#E91E63', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Lazer', type: 'expense', icon: '🎮', color: '#9C27B0', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Salário', type: 'income', icon: '💰', color: '#4CAF50', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Freelance', type: 'income', icon: '💻', color: '#FF9800', createdAt: new Date(), updatedAt: new Date() },
      { name: 'Investimentos', type: 'income', icon: '📈', color: '#00BCD4', createdAt: new Date(), updatedAt: new Date() }
    ];
    
    // Inserir cada categoria individualmente
    for (const category of demoCategories) {
      try {
        await db.insert(categories).values(category);
        console.log(`Categoria ${category.name} inserida com sucesso.`);
      } catch (error) {
        console.error(`Erro ao inserir categoria ${category.name}:`, error);
      }
    }
    
    console.log('Processo de inserção de categorias concluído.');
  } catch (error) {
    console.error('Erro ao inserir categorias:', error);
  } finally {
    process.exit(0);
  }
}

insertCategories();
