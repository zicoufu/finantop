import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Extract connection URL information
let dbConfig;

try {
  const url = new URL(process.env.DATABASE_URL);
  
  // Extract URL parameters
  const params = new URLSearchParams(url.search);
  const user = params.get('user') || url.username || 'root';
  const password = params.get('password') || url.password || '';
  const database = url.pathname.replace(/^\//, '') || 'financeiro';
  
  dbConfig = {
    host: url.hostname || 'localhost',
    port: parseInt(url.port) || 3306,
    user,
    password,
    database,
    timezone: 'Z', // Ensure dates are handled in UTC
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Habilita logs detalhados
    debug: false,
    // Habilita múltiplos statements
    multipleStatements: true,
    // Configuração de timeouts
    connectTimeout: 10000,
    // Habilita SSL se necessário
    ssl: process.env.DB_SSL === 'true' 
      ? { rejectUnauthorized: false }
      : undefined
  };

  console.log('Tentando conectar ao banco de dados com a configuração:', {
    ...dbConfig,
    password: '***' // Não logar a senha real
  });

} catch (error) {
  const err = error as Error;
  console.error('Erro ao analisar a URL do banco de dados:', err);
  throw new Error(`Configuração de banco de dados inválida. Verifique a DATABASE_URL. Detalhes: ${err.message}`);
}

// Cria o pool de conexões
const connection = mysql.createPool(dbConfig);

// Função para testar a conexão
async function testDatabaseConnection() {
  let testConnection;
  try {
    testConnection = await connection.getConnection();
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao conectar ao banco de dados:', error);
    throw new Error(`Falha ao conectar ao banco de dados: ${errorMessage}`);
  } finally {
    if (testConnection) {
      testConnection.release();
    }
  }
}

// Testa a conexão imediatamente
testDatabaseConnection().catch(error => {
  console.error('Erro crítico durante o teste de conexão inicial em db.ts (este erro será relançado):', error);
  // Em vez de process.exit(1), vamos relançar o erro.
  // Se isso acontecer durante a carga inicial do módulo e não for pego, Node.js terminará
  // com um erro de promessa não tratada, o que é mais informativo.
  throw error;
});

// Configura o Drizzle ORM
const db = drizzle(connection, { 
  schema, 
  mode: 'default',
  logger: process.env.NODE_ENV === 'development' 
    ? { logQuery: (query, params) => console.log({ query, params }) } 
    : false
});

export { db, connection };