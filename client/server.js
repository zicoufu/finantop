// Servidor Express simples para servir a aplicação React em ambiente de desenvolvimento
// com suporte adequado para SPA (Single Page Application)
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Definir porta para o servidor
const PORT = process.env.PORT || 5173;

// Configurar proxy para redirecionar requisições /api para o backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
}));

// Servir os arquivos estáticos da pasta raiz (em desenvolvimento)
app.use(express.static(__dirname));

// Permitir CORS para desenvolvimento
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.status(200).json({});
  }
  next();
});

// Middleware para lidar com rotas SPA - IMPORTANTE para React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
  console.log(`Redirecionando ${req.path} para index.html`);
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor frontend rodando em http://localhost:${PORT}`);
  console.log('Todas as rotas serão redirecionadas para index.html para suportar SPA');
  console.log('Requisições /api serão redirecionadas para o backend em http://localhost:3001');
});
