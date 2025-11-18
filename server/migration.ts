import 'dotenv/config';
import mysql from 'mysql2/promise';
import { userPreferences } from '../shared/schema.js';

async function runMigration() {
  console.log('Iniciando migração do banco de dados...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está definida no arquivo .env');
  }
  
  // Extrai as informações da URL de conexão
  const url = new URL(process.env.DATABASE_URL);
  
  // Extrai os parâmetros da URL
  const params = new URLSearchParams(url.search);
  const user = params.get('user') || url.username || 'root';
  const password = params.get('password') || url.password || '';
  const database = url.pathname.replace(/^\//, '') || 'financeiro';
  
  const dbConfig = {
    host: url.hostname || 'localhost',
    port: parseInt(url.port) || 3306,
    user,
    password,
    database,
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
    connectTimeout: 10000
  };
  
  console.log('Tentando conectar ao banco de dados com a configuração:', {
    ...dbConfig,
    password: '***' // Não logar a senha real
  });
  
  // Cria a conexão
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    
    // Verifica se a tabela user_preferences existe
    const [rows] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'user_preferences'
    `);
    
    const tableExists = (rows as any)[0].count > 0;
    
    if (tableExists) {
      console.log('A tabela user_preferences já existe. Pulando criação.');
    } else {
      console.log('Criando tabela user_preferences...');
      
      // Cria a tabela user_preferences
      await connection.query(`
        CREATE TABLE user_preferences (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
          theme VARCHAR(20) NOT NULL DEFAULT 'light',
          currency VARCHAR(5) NOT NULL DEFAULT 'BRL',
          date_format VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      
      console.log('Tabela user_preferences criada com sucesso!');
    }
    
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a migração:', error);
    throw error;
  } finally {
    // Fecha a conexão
    await connection.end();
  }
}

// Executa a migração
runMigration()
  .then(() => {
    console.log('Processo de migração finalizado.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Falha na migração:', error);
    process.exit(1);
  });
