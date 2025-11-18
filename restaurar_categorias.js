// Script para restaurar categorias em português no banco de dados
import mysql from 'mysql2/promise';

// Configurações do banco de dados (obtidas do arquivo .env)
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'Cozinha85',
  database: 'financeiro',
};

async function restaurarCategorias() {
  console.log('Conectando ao banco de dados...');
  
  // Estabelecer conexão
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('Conexão estabelecida!');
  
  try {
    console.log('Verificando usuários existentes...');
    let [users] = await connection.query('SELECT * FROM users');
    
    // Se não houver usuários, criar o usuário demo
    let userId = null;
    if (users.length === 0) {
      console.log('Criando usuário de demonstração...');
      await connection.query(`
        INSERT INTO users (username, password, email, name) 
        VALUES ('demouser', '$2b$10$CWnT5vKRKNl.E2A8kXRQcebuYe6gz7t6YXVKcqXYqXYKaU3wR7dE.', 'demo@example.com', 'Usuário de Demonstração')
      `);
      
      [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['demouser']);
      userId = users[0].id;
    } else {
      userId = users[0].id;
    }
    
    console.log(`Usando o usuário com ID: ${userId}`);
    
    // Verificar estrutura da tabela categories para entender os campos necessários
    console.log('Verificando estrutura da tabela categorias...');
    const [columns] = await connection.query('SHOW COLUMNS FROM categories');
    const columnNames = columns.map(col => col.Field);
    console.log('Colunas encontradas:', columnNames.join(', '));

    // Remover categorias existentes
    console.log('Removendo categorias existentes...');
    await connection.query('DELETE FROM categories');
    
    // Data atual para os campos created_at e updated_at
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Lista completa de categorias em português
    const categorias = [
      // DESPESAS
      { name: 'Moradia', type: 'expense', icon: 'home', color: '#22c55e' },
      { name: 'Aluguel', type: 'expense', icon: 'key', color: '#22c55e' },
      { name: 'Condomínio', type: 'expense', icon: 'building', color: '#22c55e' },
      { name: 'IPTU', type: 'expense', icon: 'file-invoice-dollar', color: '#22c55e' },
      { name: 'Conta de Luz', type: 'expense', icon: 'bolt', color: '#22c55e' },
      { name: 'Conta de Água', type: 'expense', icon: 'water', color: '#22c55e' },
      { name: 'Conta de Gás', type: 'expense', icon: 'fire', color: '#22c55e' },
      { name: 'Internet', type: 'expense', icon: 'wifi', color: '#22c55e' },
      { name: 'Manutenção', type: 'expense', icon: 'tools', color: '#22c55e' },
      
      { name: 'Alimentação', type: 'expense', icon: 'utensils', color: '#f97316' },
      { name: 'Supermercado', type: 'expense', icon: 'shopping-cart', color: '#f97316' },
      { name: 'Restaurantes', type: 'expense', icon: 'utensils', color: '#f97316' },
      { name: 'Delivery', type: 'expense', icon: 'motorcycle', color: '#f97316' },
      { name: 'Lanches', type: 'expense', icon: 'hamburger', color: '#f97316' },
      
      { name: 'Transporte', type: 'expense', icon: 'bus', color: '#84cc16' },
      { name: 'Combustível', type: 'expense', icon: 'gas-pump', color: '#84cc16' },
      { name: 'Transporte Público', type: 'expense', icon: 'bus', color: '#84cc16' },
      { name: 'Uber/Táxi', type: 'expense', icon: 'taxi', color: '#84cc16' },
      { name: 'Estacionamento', type: 'expense', icon: 'parking', color: '#84cc16' },
      { name: 'Manutenção Veículo', type: 'expense', icon: 'car', color: '#84cc16' },
      { name: 'IPVA', type: 'expense', icon: 'file-invoice-dollar', color: '#84cc16' },
      
      { name: 'Saúde e Bem-estar', type: 'expense', icon: 'heartbeat', color: '#ef4444' },
      { name: 'Plano de Saúde', type: 'expense', icon: 'heart', color: '#ef4444' },
      { name: 'Consultas Médicas', type: 'expense', icon: 'user-md', color: '#ef4444' },
      { name: 'Medicamentos', type: 'expense', icon: 'pills', color: '#ef4444' },
      { name: 'Academia', type: 'expense', icon: 'dumbbell', color: '#ef4444' },
      { name: 'Terapia', type: 'expense', icon: 'brain', color: '#ef4444' },
      
      { name: 'Educação', type: 'expense', icon: 'book', color: '#a855f7' },
      { name: 'Mensalidade Escolar', type: 'expense', icon: 'school', color: '#a855f7' },
      { name: 'Cursos', type: 'expense', icon: 'graduation-cap', color: '#a855f7' },
      { name: 'Material Escolar', type: 'expense', icon: 'book', color: '#a855f7' },
      { name: 'Livros', type: 'expense', icon: 'book-open', color: '#a855f7' },
      
      { name: 'Lazer e Entretenimento', type: 'expense', icon: 'film', color: '#f59e0b' },
      { name: 'Cinema', type: 'expense', icon: 'film', color: '#f59e0b' },
      { name: 'Shows', type: 'expense', icon: 'music', color: '#f59e0b' },
      { name: 'Streaming', type: 'expense', icon: 'tv', color: '#f59e0b' },
      { name: 'Jogos', type: 'expense', icon: 'gamepad', color: '#f59e0b' },
      { name: 'Viagens', type: 'expense', icon: 'plane', color: '#f59e0b' },
      { name: 'Hobbies', type: 'expense', icon: 'palette', color: '#f59e0b' },
      
      { name: 'Vestuário e Cuidados Pessoais', type: 'expense', icon: 'tshirt', color: '#d946ef' },
      { name: 'Roupas', type: 'expense', icon: 'tshirt', color: '#d946ef' },
      { name: 'Calçados', type: 'expense', icon: 'shoe-prints', color: '#d946ef' },
      { name: 'Acessórios', type: 'expense', icon: 'glasses', color: '#d946ef' },
      { name: 'Produtos de Higiene', type: 'expense', icon: 'shower', color: '#d946ef' },
      { name: 'Salão de Beleza', type: 'expense', icon: 'cut', color: '#d946ef' },
      
      { name: 'Serviços Domésticos', type: 'expense', icon: 'concierge-bell', color: '#14b8a6' },
      { name: 'Diarista', type: 'expense', icon: 'broom', color: '#14b8a6' },
      { name: 'Lavanderia', type: 'expense', icon: 'tshirt', color: '#14b8a6' },
      
      { name: 'Animais de Estimação', type: 'expense', icon: 'paw', color: '#6d28d9' },
      { name: 'Ração', type: 'expense', icon: 'bone', color: '#6d28d9' },
      { name: 'Veterinário', type: 'expense', icon: 'clinic-medical', color: '#6d28d9' },
      { name: 'Produtos Pet', type: 'expense', icon: 'paw', color: '#6d28d9' },
      
      { name: 'Despesas Financeiras', type: 'expense', icon: 'credit-card', color: '#db2777' },
      { name: 'Tarifas Bancárias', type: 'expense', icon: 'university', color: '#db2777' },
      { name: 'Juros', type: 'expense', icon: 'percentage', color: '#db2777' },
      { name: 'IOF', type: 'expense', icon: 'hand-holding-usd', color: '#db2777' },
      { name: 'Multas', type: 'expense', icon: 'exclamation-triangle', color: '#db2777' },
      
      { name: 'Impostos e Taxas', type: 'expense', icon: 'file-invoice-dollar', color: '#78716c' },
      { name: 'Imposto de Renda', type: 'expense', icon: 'file-invoice', color: '#78716c' },
      
      { name: 'Outras Despesas', type: 'expense', icon: 'question-circle', color: '#6b7280' },
      { name: 'Doações', type: 'expense', icon: 'hand-holding-heart', color: '#6b7280' },
      { name: 'Presentes', type: 'expense', icon: 'gift', color: '#6b7280' },
      
      // RECEITAS
      { name: 'Salário', type: 'income', icon: 'dollar-sign', color: '#16a34a' },
      { name: 'Salário Líquido', type: 'income', icon: 'money-bill-wave', color: '#16a34a' },
      { name: 'Adiantamento', type: 'income', icon: 'calendar-minus', color: '#16a34a' },
      { name: 'Férias', type: 'income', icon: 'umbrella-beach', color: '#16a34a' },
      { name: 'Décimo Terceiro', type: 'income', icon: 'gift', color: '#16a34a' },
      { name: 'PLR/Bônus', type: 'income', icon: 'trophy', color: '#16a34a' },
      
      { name: 'Freelance', type: 'income', icon: 'briefcase', color: '#4f46e5' },
      { name: 'Trabalho Freelance', type: 'income', icon: 'briefcase', color: '#4f46e5' },
      { name: 'Consultoria', type: 'income', icon: 'comments-dollar', color: '#4f46e5' },
      
      { name: 'Investimentos', type: 'income', icon: 'chart-line', color: '#f59e0b' },
      { name: 'Dividendos', type: 'income', icon: 'money-bill', color: '#f59e0b' },
      { name: 'Juros', type: 'income', icon: 'percentage', color: '#f59e0b' },
      { name: 'Aluguel', type: 'income', icon: 'home', color: '#f59e0b' },
      { name: 'Venda de Bens', type: 'income', icon: 'tag', color: '#f59e0b' },
      
      { name: 'Outros', type: 'income', icon: 'ellipsis-h', color: '#64748b' },
      { name: 'Reembolsos', type: 'income', icon: 'undo', color: '#64748b' },
      { name: 'Presentes', type: 'income', icon: 'gift', color: '#64748b' }
    ];

    // Inserir categorias com os campos de data
    console.log('Inserindo categorias em português...');
    
    for (const categoria of categorias) {
      try {
        await connection.query(`
          INSERT INTO categories (name, type, icon, color, user_id, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [categoria.name, categoria.type, categoria.icon, categoria.color, userId, now, now]);
        console.log(`✅ Categoria inserida: ${categoria.name}`);
      } catch (err) {
        console.error(`❌ Erro ao inserir categoria ${categoria.name}:`, err.message);
      }
    }

    // Verificar quantas categorias foram inseridas
    const [result] = await connection.query('SELECT COUNT(*) as total FROM categories');
    console.log(`✅ ${result[0].total} categorias inseridas com sucesso!`);
    
    console.log('✅ Restauração de categorias concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a restauração:', error);
  } finally {
    await connection.end();
    console.log('Conexão com o banco encerrada.');
  }
}

// Executar função principal
restaurarCategorias().catch(console.error);
